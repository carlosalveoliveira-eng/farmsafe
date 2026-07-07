import { supabase } from '../supabase'
import { getEmpresaUsuario } from '../auth'

import type {
  DocumentoFiscal,
  DocumentoFiscalItem,
  DocumentoFiscalPagamento,
  EmpresaDocumentoFiscal,
  TipoDocumentoFiscalEmpresa,
} from '../supabase'

import type { NFeParseada } from './NFeParser'

const db = supabase
const DOCUMENTOS_FISCAIS_BUCKET = 'documentos-fiscais'

export type ResultadoImportacaoNFe =
  | {
      status: 'validada'
      mensagem: string
      documento: DocumentoFiscal
      itens: DocumentoFiscalItem[]
      pagamentos: DocumentoFiscalPagamento[]
    }
  | {
      status: 'duplicada'
      mensagem: string
      documento: DocumentoFiscal
    }
  | {
      status: 'rejeitada'
      mensagem: string
      motivo: string
    }

export type DocumentoFiscalPermitidoPayload = {
  tipo_documento?: TipoDocumentoFiscalEmpresa
  documento: string
  nome_razao_social?: string | null
  inscricao_estadual?: string | null
  uf?: string | null
  municipio?: string | null
  principal?: boolean
  ativo?: boolean
  observacao?: string | null
}

function somenteDigitos(value: string | null | undefined) {
  return value?.replace(/\D/g, '') ?? ''
}

function detectarTipoDocumento(documento: string): TipoDocumentoFiscalEmpresa {
  const digits = somenteDigitos(documento)

  if (digits.length === 11) return 'cpf'
  if (digits.length === 14) return 'cnpj'

  throw new Error('Documento fiscal inválido. Informe CPF ou CNPJ.')
}

function normalizarDocumentoFiscal(documento: string) {
  const digits = somenteDigitos(documento)

  if (digits.length !== 11 && digits.length !== 14) {
    throw new Error('Documento fiscal inválido. Informe CPF ou CNPJ.')
  }

  return digits
}

function formatarDocumentoFiscal(documento: string | null | undefined) {
  const digits = somenteDigitos(documento)

  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  if (digits.length === 14) {
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5'
    )
  }

  return documento ?? '—'
}

function getAnoReferenciaNFe(nfe: NFeParseada) {
  const data = nfe.documento.data_emissao
    ? new Date(nfe.documento.data_emissao)
    : new Date()

  if (Number.isNaN(data.getTime())) {
    return String(new Date().getFullYear())
  }

  return String(data.getFullYear())
}

function criarStoragePath(params: {
  empresaId: string
  chaveAcesso: string
  ano: string
}) {
  return `${params.empresaId}/documentos-fiscais/${params.ano}/${params.chaveAcesso}.xml`
}

async function getEmpresaId() {
  const usuario = await getEmpresaUsuario()
  const empresa = usuario.empresa as { id?: string } | null

  if (!empresa?.id) {
    throw new Error('Empresa não encontrada.')
  }

  return empresa.id
}

async function getUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.id ?? null
}

export { formatarDocumentoFiscal }

export async function listarDocumentosFiscaisPermitidos(): Promise<
  EmpresaDocumentoFiscal[]
> {
  const { data, error } = await db
    .from('empresa_documentos_fiscais')
    .select('*')
    .order('principal', { ascending: false })
    .order('nome_razao_social', { ascending: true })

  if (error) {
    throw new Error(`Erro ao listar documentos fiscais: ${error.message}`)
  }

  return (data as EmpresaDocumentoFiscal[]) ?? []
}

export async function buscarDocumentoFiscalPermitidoPorDocumento(
  documento: string
): Promise<EmpresaDocumentoFiscal | null> {
  const documentoNormalizado = normalizarDocumentoFiscal(documento)

  const { data, error } = await db
    .from('empresa_documentos_fiscais')
    .select('*')
    .eq('documento', documentoNormalizado)
    .eq('ativo', true)
    .maybeSingle()

  if (error) {
    throw new Error(
      `Erro ao validar documento fiscal autorizado: ${error.message}`
    )
  }

  return data as EmpresaDocumentoFiscal | null
}

export async function salvarDocumentoFiscalPermitido(
  params: DocumentoFiscalPermitidoPayload
): Promise<EmpresaDocumentoFiscal> {
  const empresaId = await getEmpresaId()
  const userId = await getUserId()

  const documento = normalizarDocumentoFiscal(params.documento)
  const tipoDocumento = params.tipo_documento ?? detectarTipoDocumento(documento)

  if (params.principal) {
    await db
      .from('empresa_documentos_fiscais')
      .update({
        principal: false,
        updated_at: new Date().toISOString(),
      })
      .eq('empresa_id', empresaId)
  }

  const payload = {
    empresa_id: empresaId,
    tipo_documento: tipoDocumento,
    documento,

    nome_razao_social: params.nome_razao_social?.trim() || null,
    inscricao_estadual: params.inscricao_estadual?.trim() || null,
    uf: params.uf?.trim().toUpperCase() || null,
    municipio: params.municipio?.trim() || null,

    principal: params.principal ?? false,
    ativo: params.ativo ?? true,

    observacao: params.observacao?.trim() || null,

    created_by: userId,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await db
    .from('empresa_documentos_fiscais')
    .upsert(payload, {
      onConflict: 'empresa_id,documento',
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(`Erro ao salvar documento fiscal: ${error.message}`)
  }

  return data as EmpresaDocumentoFiscal
}

export async function buscarDocumentoFiscalPorChave(
  chaveAcesso: string
): Promise<DocumentoFiscal | null> {
  const chave = chaveAcesso.replace(/\D/g, '')

  if (!/^[0-9]{44}$/.test(chave)) {
    throw new Error('Chave de acesso da NF-e inválida.')
  }

  const { data, error } = await db
    .from('documentos_fiscais')
    .select('*')
    .eq('chave_acesso', chave)
    .maybeSingle()

  if (error) {
    throw new Error(`Erro ao buscar NF-e por chave: ${error.message}`)
  }

  return data as DocumentoFiscal | null
}

async function salvarXmlNoStorage(params: {
  empresaId: string
  nfe: NFeParseada
}) {
  const ano = getAnoReferenciaNFe(params.nfe)
  const path = criarStoragePath({
    empresaId: params.empresaId,
    chaveAcesso: params.nfe.documento.chave_acesso,
    ano,
  })

  const blob = new Blob([params.nfe.xmlText], {
    type: 'application/xml',
  })

  const { error } = await supabase.storage
    .from(DOCUMENTOS_FISCAIS_BUCKET)
    .upload(path, blob, {
      contentType: 'application/xml',
      upsert: false,
    })

  if (error) {
    throw new Error(`Erro ao salvar XML da NF-e: ${error.message}`)
  }

  return {
    bucket: DOCUMENTOS_FISCAIS_BUCKET,
    path,
  }
}

export async function importarNFeParseada(
  nfe: NFeParseada
): Promise<ResultadoImportacaoNFe> {
  const empresaId = await getEmpresaId()
  const userId = await getUserId()

  const destinatarioDocumento = nfe.documento.destinatario_documento

  if (!destinatarioDocumento) {
    return {
      status: 'rejeitada',
      motivo: 'destinatario_sem_documento',
      mensagem:
        'A NF-e não possui CPF/CNPJ do destinatário. A importação foi bloqueada.',
    }
  }

  const documentoPermitido =
    await buscarDocumentoFiscalPermitidoPorDocumento(destinatarioDocumento)

  if (!documentoPermitido) {
    return {
      status: 'rejeitada',
      motivo: 'destinatario_nao_autorizado',
      mensagem: `A NF-e pertence ao documento ${formatarDocumentoFiscal(
        destinatarioDocumento
      )}, que não está autorizado nesta empresa. A importação foi bloqueada e nenhum estoque foi gerado.`,
    }
  }

  const documentoExistente = await buscarDocumentoFiscalPorChave(
    nfe.documento.chave_acesso
  )

  if (documentoExistente) {
    return {
      status: 'duplicada',
      documento: documentoExistente,
      mensagem:
        'Esta NF-e já foi importada anteriormente. Nenhuma nova entrada de estoque foi gerada.',
    }
  }

  let storageInfo: {
    bucket: string
    path: string
  } | null = null

  try {
    storageInfo = await salvarXmlNoStorage({
      empresaId,
      nfe,
    })

    const documentoPayload = {
      empresa_id: empresaId,
      documento_fiscal_permitido_id: documentoPermitido.id,

      ...nfe.documento,

      status: 'validada' as const,

      xml_storage_bucket: storageInfo.bucket,
      xml_storage_path: storageInfo.path,

      validado_por: userId,
      validado_em: new Date().toISOString(),

      rejeitado_motivo: null,

      created_by: userId,
      updated_at: new Date().toISOString(),
    }

    const { data: documentoData, error: documentoError } = await db
      .from('documentos_fiscais')
      .insert(documentoPayload)
      .select('*')
      .single()

    if (documentoError) {
      throw new Error(`Erro ao salvar NF-e: ${documentoError.message}`)
    }

    const documento = documentoData as DocumentoFiscal

    const itensPayload = nfe.itens.map((item) => ({
      empresa_id: empresaId,
      documento_fiscal_id: documento.id,
      ...item,
      created_by: userId,
      updated_at: new Date().toISOString(),
    }))

    const { data: itensData, error: itensError } = await db
      .from('documentos_fiscais_itens')
      .insert(itensPayload)
      .select('*')

    if (itensError) {
      throw new Error(`Erro ao salvar itens da NF-e: ${itensError.message}`)
    }

    let pagamentos: DocumentoFiscalPagamento[] = []

    if (nfe.pagamentos.length > 0) {
      const pagamentosPayload = nfe.pagamentos.map((pagamento) => ({
        empresa_id: empresaId,
        documento_fiscal_id: documento.id,
        ...pagamento,
        created_by: userId,
      }))

      const { data: pagamentosData, error: pagamentosError } = await db
        .from('documentos_fiscais_pagamentos')
        .insert(pagamentosPayload)
        .select('*')

      if (pagamentosError) {
        throw new Error(
          `Erro ao salvar pagamentos da NF-e: ${pagamentosError.message}`
        )
      }

      pagamentos = (pagamentosData as DocumentoFiscalPagamento[]) ?? []
    }

    return {
      status: 'validada',
      mensagem:
        'NF-e importada e validada com sucesso. Os itens já podem ser vinculados aos insumos.',
      documento,
      itens: (itensData as DocumentoFiscalItem[]) ?? [],
      pagamentos,
    }
  } catch (error) {
    if (storageInfo?.path) {
      await supabase.storage
        .from(DOCUMENTOS_FISCAIS_BUCKET)
        .remove([storageInfo.path])
    }

    throw error
  }
}

export async function listarDocumentosFiscais(params?: {
  status?: string
  limite?: number
}): Promise<DocumentoFiscal[]> {
  let query = db
    .from('documentos_fiscais')
    .select('*')
    .order('data_emissao', { ascending: false })
    .order('created_at', { ascending: false })

  if (params?.status) {
    query = query.eq('status', params.status)
  }

  if (params?.limite) {
    query = query.limit(params.limite)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Erro ao listar NF-e importadas: ${error.message}`)
  }

  return (data as DocumentoFiscal[]) ?? []
}

export async function listarItensDocumentoFiscal(
  documentoFiscalId: string
): Promise<DocumentoFiscalItem[]> {
  const { data, error } = await db
    .from('documentos_fiscais_itens')
    .select(
      `
      *,
      insumo:insumos(
        id,
        nome,
        categoria,
        unidade,
        estoque_minimo_kg,
        estoque_maximo_kg,
        ativo
      )
    `
    )
    .eq('documento_fiscal_id', documentoFiscalId)
    .order('numero_item', { ascending: true })

  if (error) {
    throw new Error(`Erro ao listar itens da NF-e: ${error.message}`)
  }

  return (data as DocumentoFiscalItem[]) ?? []
}

export async function listarPagamentosDocumentoFiscal(
  documentoFiscalId: string
): Promise<DocumentoFiscalPagamento[]> {
  const { data, error } = await db
    .from('documentos_fiscais_pagamentos')
    .select('*')
    .eq('documento_fiscal_id', documentoFiscalId)
    .order('vencimento', { ascending: true })

  if (error) {
    throw new Error(`Erro ao listar pagamentos da NF-e: ${error.message}`)
  }

  return (data as DocumentoFiscalPagamento[]) ?? []
}

export async function vincularItemDocumentoFiscalAoInsumo(params: {
  itemId: string
  insumoId: string
  fatorConversaoKg?: number | null
  quantidadeConvertidaKg?: number | null
  observacao?: string | null
}): Promise<DocumentoFiscalItem> {
  const { data: itemAtual, error: itemError } = await db
    .from('documentos_fiscais_itens')
    .select('*')
    .eq('id', params.itemId)
    .single()

  if (itemError) {
    throw new Error(`Erro ao buscar item da NF-e: ${itemError.message}`)
  }

  const item = itemAtual as DocumentoFiscalItem

  let quantidadeConvertidaKg = params.quantidadeConvertidaKg ?? null
  const fatorConversaoKg = params.fatorConversaoKg ?? null

  if (quantidadeConvertidaKg === null && fatorConversaoKg !== null) {
    const quantidadeBase =
      item.quantidade_comercial ?? item.quantidade_tributavel ?? null

    if (quantidadeBase === null) {
      throw new Error(
        'Não foi possível calcular a quantidade em kg. Informe a quantidade convertida manualmente.'
      )
    }

    quantidadeConvertidaKg = Number(
      (Number(quantidadeBase) * fatorConversaoKg).toFixed(3)
    )
  }

  if (
    quantidadeConvertidaKg === null ||
    !Number.isFinite(quantidadeConvertidaKg) ||
    quantidadeConvertidaKg < 0
  ) {
    throw new Error('Informe uma quantidade convertida em kg válida.')
  }

  if (
    fatorConversaoKg !== null &&
    (!Number.isFinite(fatorConversaoKg) || fatorConversaoKg <= 0)
  ) {
    throw new Error('Informe um fator de conversão para kg válido.')
  }

  const { data, error } = await db
    .from('documentos_fiscais_itens')
    .update({
      insumo_id: params.insumoId,
      fator_conversao_kg: fatorConversaoKg,
      quantidade_convertida_kg: quantidadeConvertidaKg,
      status: 'vinculado',
      observacao: params.observacao?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.itemId)
    .select('*')
    .single()

  if (error) {
    throw new Error(`Erro ao vincular item ao insumo: ${error.message}`)
  }

  return data as DocumentoFiscalItem
}

export async function ignorarItemDocumentoFiscal(params: {
  itemId: string
  observacao?: string | null
}): Promise<DocumentoFiscalItem> {
  const { data, error } = await db
    .from('documentos_fiscais_itens')
    .update({
      insumo_id: null,
      fator_conversao_kg: null,
      quantidade_convertida_kg: null,
      status: 'ignorado',
      observacao: params.observacao?.trim() || 'Item ignorado na entrada de estoque.',
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.itemId)
    .select('*')
    .single()

  if (error) {
    throw new Error(`Erro ao ignorar item da NF-e: ${error.message}`)
  }

  return data as DocumentoFiscalItem
}

export async function reabrirItemDocumentoFiscal(
  itemId: string
): Promise<DocumentoFiscalItem> {
  const { data, error } = await db
    .from('documentos_fiscais_itens')
    .update({
      insumo_id: null,
      fator_conversao_kg: null,
      quantidade_convertida_kg: null,
      status: 'pendente',
      observacao: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select('*')
    .single()

  if (error) {
    throw new Error(`Erro ao reabrir item da NF-e: ${error.message}`)
  }

  return data as DocumentoFiscalItem
}

export type ProcessarDocumentoFiscalEstoqueResult = {
  documento_fiscal_id: string
  movimentacoes_criadas: number
  quantidade_total_kg: number
}

export async function processarDocumentoFiscalParaEstoque(params: {
  documentoFiscalId: string
  fazendaId?: string | null
  retiroId?: string | null
}): Promise<ProcessarDocumentoFiscalEstoqueResult> {
  const { data, error } = await db.rpc('processar_documento_fiscal_estoque', {
    p_documento_fiscal_id: params.documentoFiscalId,
    p_fazenda_id: params.fazendaId ?? null,
    p_retiro_id: params.retiroId ?? null,
  })

  if (error) {
    throw new Error(`Erro ao processar NF-e no estoque: ${error.message}`)
  }

  return data as ProcessarDocumentoFiscalEstoqueResult
}