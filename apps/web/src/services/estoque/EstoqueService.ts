import {
  supabase,
  type CategoriaInsumo,
  type EstoqueMovimentacao,
  type Insumo,
  type OrigemMovimentacaoEstoque,
  type TipoMovimentacaoEstoque,
} from '../supabase'

import { getEmpresaUsuario } from '../auth'

const db = supabase

export type StatusEstoque = 'normal' | 'abaixo_minimo' | 'acima_maximo'

export type SaldoInsumo = {
  id: string
  empresa_id: string
  nome: string
  categoria: CategoriaInsumo
  unidade: 'kg'
  estoque_minimo_kg: number | null
  estoque_maximo_kg: number | null
  ativo: boolean
  saldo_kg: number
  entradas_kg: number
  saidas_kg: number
  status_estoque: StatusEstoque
  updated_at: string | null
}

export type SalvarInsumoPayload = {
  id?: string
  nome: string
  categoria: CategoriaInsumo
  estoque_minimo_kg?: number | null
  estoque_maximo_kg?: number | null
  ativo?: boolean
}

export type RegistrarMovimentacaoPayload = {
  insumoId: string
  tipo: TipoMovimentacaoEstoque
  quantidadeKg: number

  dataMovimentacao: string

  fazendaId?: string | null
  retiroId?: string | null

  documentoReferencia?: string | null
  pessoaReferencia?: string | null

  valorUnitario?: number | null
  valorTotal?: number | null

  origem?: OrigemMovimentacaoEstoque
  observacao?: string | null
}

const TIPOS_MOVIMENTACAO_MANUAL_PERMITIDOS = new Set<TipoMovimentacaoEstoque>([
  'entrada',
  'saida',
])

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

function normalizarNumero(value: number | null | undefined) {
  if (value === null || value === undefined) return null

  if (!Number.isFinite(value)) return null

  return Number(value.toFixed(2))
}

function normalizarDinheiro2(value: number | null | undefined) {
  if (value === null || value === undefined) return null

  if (!Number.isFinite(value)) return null

  return Number(value.toFixed(2))
}

function normalizarDinheiro4(value: number | null | undefined) {
  if (value === null || value === undefined) return null

  if (!Number.isFinite(value)) return null

  return Number(value.toFixed(4))
}

function textoOuNull(value: string | null | undefined) {
  const text = value?.trim()

  return text ? text : null
}

function normalizarDataMovimentacao(value: string) {
  if (!value?.trim()) {
    throw new Error('Informe a data da movimentação.')
  }

  const data = new Date(value)

  if (Number.isNaN(data.getTime())) {
    throw new Error('Data da movimentação inválida.')
  }

  const agora = new Date()
  const toleranciaMinutos = 5
  const limiteFuturo = new Date(
    agora.getTime() + toleranciaMinutos * 60 * 1000
  )

  if (data.getTime() > limiteFuturo.getTime()) {
    throw new Error('A data da movimentação não pode estar no futuro.')
  }

  return data.toISOString()
}

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean))) as string[]
}

function calcularValores(params: {
  quantidadeKg: number
  valorUnitario?: number | null
  valorTotal?: number | null
}) {
  let valorUnitario = normalizarDinheiro4(params.valorUnitario)
  let valorTotal = normalizarDinheiro2(params.valorTotal)

  if (valorUnitario !== null && valorUnitario < 0) {
    throw new Error('O valor unitário não pode ser negativo.')
  }

  if (valorTotal !== null && valorTotal < 0) {
    throw new Error('O valor total não pode ser negativo.')
  }

  if (valorTotal === null && valorUnitario !== null) {
    valorTotal = normalizarDinheiro2(valorUnitario * params.quantidadeKg)
  }

  if (valorUnitario === null && valorTotal !== null && params.quantidadeKg > 0) {
    valorUnitario = normalizarDinheiro4(valorTotal / params.quantidadeKg)
  }

  return {
    valorUnitario,
    valorTotal,
  }
}

export function formatarKg(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return '—'
  }

  return `${Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} kg`
}

export function formatarMoeda(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return '—'
  }

  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function labelCategoriaInsumo(categoria: CategoriaInsumo) {
  const labels: Record<CategoriaInsumo, string> = {
    sal: 'Sal',
    racao: 'Ração',
    suplemento: 'Suplemento',
    mineral: 'Mineral',
    nucleo: 'Núcleo',
    outro: 'Outro',
  }

  return labels[categoria] ?? categoria
}

export function labelTipoMovimentacao(tipo: TipoMovimentacaoEstoque) {
  const labels: Record<TipoMovimentacaoEstoque, string> = {
    saldo_inicial: 'Saldo inicial',
    entrada: 'Entrada manual',
    saida: 'Saída manual',
    consumo: 'Consumo',
    ajuste_entrada: 'Ajuste de entrada',
    ajuste_saida: 'Ajuste de saída',
    transferencia_entrada: 'Transferência de entrada',
    transferencia_saida: 'Transferência de saída',
  }

  return labels[tipo] ?? tipo
}

export function labelStatusEstoque(status: StatusEstoque) {
  const labels: Record<StatusEstoque, string> = {
    normal: 'Normal',
    abaixo_minimo: 'Abaixo do mínimo',
    acima_maximo: 'Acima do máximo',
  }

  return labels[status] ?? status
}

async function hidratarMovimentacoes(
  movimentacoes: EstoqueMovimentacao[]
): Promise<EstoqueMovimentacao[]> {
  if (movimentacoes.length === 0) return []

  const insumoIds = uniqueIds(movimentacoes.map((item) => item.insumo_id))
  const fazendaIds = uniqueIds(movimentacoes.map((item) => item.fazenda_id))
  const retiroIds = uniqueIds(movimentacoes.map((item) => item.retiro_id))

  const documentoFiscalIds = uniqueIds(
    movimentacoes.map((item) => item.documento_fiscal_id)
  )

  const documentoFiscalItemIds = uniqueIds(
    movimentacoes.map((item) => item.documento_fiscal_item_id)
  )

  const [
    { data: insumosData, error: insumosError },
    { data: fazendasData, error: fazendasError },
    { data: retirosData, error: retirosError },
    { data: documentosData, error: documentosError },
    { data: itensData, error: itensError },
  ] = await Promise.all([
    insumoIds.length > 0
      ? db
          .from('insumos')
          .select(
            'id,nome,categoria,unidade,estoque_minimo_kg,estoque_maximo_kg,ativo'
          )
          .in('id', insumoIds)
      : Promise.resolve({ data: [] as any[], error: null }),

    fazendaIds.length > 0
      ? db.from('fazendas').select('id,nome,codigo').in('id', fazendaIds)
      : Promise.resolve({ data: [] as any[], error: null }),

    retiroIds.length > 0
      ? db.from('retiros').select('id,nome').in('id', retiroIds)
      : Promise.resolve({ data: [] as any[], error: null }),

    documentoFiscalIds.length > 0
      ? db
          .from('documentos_fiscais')
          .select('id,chave_acesso,numero,serie,status,data_emissao')
          .in('id', documentoFiscalIds)
      : Promise.resolve({ data: [] as any[], error: null }),

    documentoFiscalItemIds.length > 0
      ? db
          .from('documentos_fiscais_itens')
          .select('id,numero_item,descricao,quantidade_convertida_kg,status')
          .in('id', documentoFiscalItemIds)
      : Promise.resolve({ data: [] as any[], error: null }),
  ])

  if (insumosError) {
    throw new Error(
      `Erro ao carregar insumos das movimentações: ${insumosError.message}`
    )
  }

  if (fazendasError) {
    throw new Error(
      `Erro ao carregar fazendas das movimentações: ${fazendasError.message}`
    )
  }

  if (retirosError) {
    throw new Error(
      `Erro ao carregar retiros das movimentações: ${retirosError.message}`
    )
  }

  if (documentosError) {
    throw new Error(
      `Erro ao carregar documentos fiscais das movimentações: ${documentosError.message}`
    )
  }

  if (itensError) {
    throw new Error(
      `Erro ao carregar itens fiscais das movimentações: ${itensError.message}`
    )
  }

  const insumosMap = new Map(
    (insumosData ?? []).map((item: any) => [item.id, item])
  )

  const fazendasMap = new Map(
    (fazendasData ?? []).map((item: any) => [item.id, item])
  )

  const retirosMap = new Map(
    (retirosData ?? []).map((item: any) => [item.id, item])
  )

  const documentosMap = new Map(
    (documentosData ?? []).map((item: any) => [item.id, item])
  )

  const itensMap = new Map((itensData ?? []).map((item: any) => [item.id, item]))

  return movimentacoes.map((movimento) => ({
    ...movimento,
    insumo: insumosMap.get(movimento.insumo_id),
    fazenda: movimento.fazenda_id
      ? fazendasMap.get(movimento.fazenda_id)
      : undefined,
    retiro: movimento.retiro_id
      ? retirosMap.get(movimento.retiro_id)
      : undefined,
    documento_fiscal: movimento.documento_fiscal_id
      ? documentosMap.get(movimento.documento_fiscal_id)
      : undefined,
    documento_fiscal_item: movimento.documento_fiscal_item_id
      ? itensMap.get(movimento.documento_fiscal_item_id)
      : undefined,
  }))
}

export async function listarInsumos(params?: {
  apenasAtivos?: boolean
}): Promise<Insumo[]> {
  let query = db.from('insumos').select('*').order('nome')

  if (params?.apenasAtivos) {
    query = query.eq('ativo', true)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Erro ao listar insumos: ${error.message}`)
  }

  return (data as Insumo[]) ?? []
}

export async function listarSaldosInsumos(): Promise<SaldoInsumo[]> {
  const { data, error } = await db.rpc('listar_saldos_insumos')

  if (error) {
    throw new Error(`Erro ao listar saldos dos insumos: ${error.message}`)
  }

  return (data as SaldoInsumo[]) ?? []
}

export async function salvarInsumo(
  params: SalvarInsumoPayload
): Promise<Insumo> {
  const nome = params.nome.trim()

  if (!nome) {
    throw new Error('Informe o nome do insumo.')
  }

  const estoqueMinimo = normalizarNumero(params.estoque_minimo_kg)
  const estoqueMaximo = normalizarNumero(params.estoque_maximo_kg)

  if (estoqueMinimo !== null && estoqueMinimo < 0) {
    throw new Error('O estoque mínimo não pode ser negativo.')
  }

  if (estoqueMaximo !== null && estoqueMaximo < 0) {
    throw new Error('O estoque máximo não pode ser negativo.')
  }

  if (
    estoqueMinimo !== null &&
    estoqueMaximo !== null &&
    estoqueMaximo < estoqueMinimo
  ) {
    throw new Error('O estoque máximo não pode ser menor que o mínimo.')
  }

  const empresaId = await getEmpresaId()
  const userId = await getUserId()

  if (params.id) {
    const { data, error } = await db
      .from('insumos')
      .update({
        nome,
        categoria: params.categoria,
        unidade: 'kg',
        estoque_minimo_kg: estoqueMinimo,
        estoque_maximo_kg: estoqueMaximo,
        ativo: params.ativo ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Erro ao atualizar insumo: ${error.message}`)
    }

    return data as Insumo
  }

  const { data, error } = await db
    .from('insumos')
    .insert({
      empresa_id: empresaId,
      nome,
      categoria: params.categoria,
      unidade: 'kg',
      estoque_minimo_kg: estoqueMinimo,
      estoque_maximo_kg: estoqueMaximo,
      ativo: params.ativo ?? true,
      created_by: userId,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(`Erro ao cadastrar insumo: ${error.message}`)
  }

  return data as Insumo
}

export async function alternarStatusInsumo(params: {
  id: string
  ativoAtual: boolean
}): Promise<Insumo> {
  const { data, error } = await db
    .from('insumos')
    .update({
      ativo: !params.ativoAtual,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    throw new Error(`Erro ao alterar status do insumo: ${error.message}`)
  }

  return data as Insumo
}

export async function registrarMovimentacaoEstoque(
  params: RegistrarMovimentacaoPayload
): Promise<EstoqueMovimentacao> {
  if (!TIPOS_MOVIMENTACAO_MANUAL_PERMITIDOS.has(params.tipo)) {
    throw new Error(
      'Nesta tela só é permitido lançar entrada manual ou saída manual.'
    )
  }

  if (!Number.isFinite(params.quantidadeKg) || params.quantidadeKg <= 0) {
    throw new Error('Informe uma quantidade em kg válida.')
  }

  const empresaId = await getEmpresaId()
  const userId = await getUserId()

  const dataMovimentacao = normalizarDataMovimentacao(params.dataMovimentacao)

  const quantidadeKg = Number(params.quantidadeKg.toFixed(3))

  const { valorUnitario, valorTotal } = calcularValores({
    quantidadeKg,
    valorUnitario: params.valorUnitario ?? null,
    valorTotal: params.valorTotal ?? null,
  })

  const origem: OrigemMovimentacaoEstoque = params.origem ?? 'manual'

  const { data, error } = await db
    .from('estoque_movimentacoes')
    .insert({
      empresa_id: empresaId,
      insumo_id: params.insumoId,

      fazenda_id: params.fazendaId ?? null,
      retiro_id: params.retiroId ?? null,

      tipo: params.tipo,
      quantidade_kg: quantidadeKg,

      origem,

      data_movimentacao: dataMovimentacao,

      abastecimento_id: null,
      documento_fiscal_id: null,
      documento_fiscal_item_id: null,

      documento_referencia: textoOuNull(params.documentoReferencia),
      pessoa_referencia: textoOuNull(params.pessoaReferencia),
      valor_unitario: valorUnitario,
      valor_total: valorTotal,

      observacao: textoOuNull(params.observacao),

      created_by: userId,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(`Erro ao registrar movimentação: ${error.message}`)
  }

  const hidratadas = await hidratarMovimentacoes([data as EstoqueMovimentacao])

  return hidratadas[0]
}

export async function listarMovimentacoesEstoque(params?: {
  insumoId?: string
  limite?: number
}): Promise<EstoqueMovimentacao[]> {
  let query = db
    .from('estoque_movimentacoes')
    .select('*')
    .order('data_movimentacao', {
      ascending: false,
    })
    .order('created_at', {
      ascending: false,
    })

  if (params?.insumoId) {
    query = query.eq('insumo_id', params.insumoId)
  }

  if (params?.limite) {
    query = query.limit(params.limite)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Erro ao listar movimentações: ${error.message}`)
  }

  return hidratarMovimentacoes((data as EstoqueMovimentacao[]) ?? [])
}