import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias.'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: {
    schema: 'farmsafe',
  },
})

// ─── Tipos espelho do schema farmsafe ────────────────────────────────────────

export interface Fazenda {
  id: string
  nome: string
  codigo: string
  cidade: string | null
  estado: string | null
  latitude: number | null
  longitude: number | null
  empresa_id: string | null
  area_valor: number | null
  area_unidade: string | null
  raio_operacional_metros: number | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface Retiro {
  id: string
  empresa_id?: string | null
  fazenda_id: string
  nome: string
  ativo: boolean
  created_at?: string | null
  updated_at: string
}

export interface Lote {
  id: string
  empresa_id?: string | null
  fazenda_id: string
  retiro_id: string | null
  nome: string
  descricao: string | null

  /**
   * null = usuário ainda não informou
   * 0    = lote vazio
   * > 0  = quantidade real de cabeças
   */
  quantidade_animais: number | null

  ativo: boolean
  created_at?: string | null
  updated_at: string
}

export interface Cocho {
  id: string
  empresa_id?: string | null
  fazenda_id: string
  retiro_id: string | null
  lote_id: string | null
  nome: string
  codigo_qr: string
  tipo_sal: string | null
  capacidade_kg: number | null
  ativo: boolean
  created_at?: string | null
  updated_at: string

  // joins opcionais
  fazenda?: Pick<Fazenda, 'nome' | 'codigo'>
  lote?: Pick<Lote, 'nome' | 'quantidade_animais'>
  retiro?: Pick<Retiro, 'nome'>
}

// ─── Insumos / Estoque ───────────────────────────────────────────────────────

export type CategoriaInsumo =
  | 'sal'
  | 'racao'
  | 'suplemento'
  | 'mineral'
  | 'nucleo'
  | 'outro'

export interface Insumo {
  id: string
  empresa_id: string
  nome: string
  categoria: CategoriaInsumo
  unidade: 'kg'
  estoque_minimo_kg: number | null
  estoque_maximo_kg: number | null
  ativo: boolean
  created_by: string | null
  created_at: string | null
  updated_at: string | null
}

export type TipoMovimentacaoEstoque =
  | 'saldo_inicial'
  | 'entrada'
  | 'saida'
  | 'consumo'
  | 'ajuste_entrada'
  | 'ajuste_saida'
  | 'transferencia_entrada'
  | 'transferencia_saida'

export type OrigemMovimentacaoEstoque =
  | 'manual'
  | 'coletor'
  | 'sistema'
  | 'nfe'
  | 'implantacao'

// ─── Fiscal / NF-e ───────────────────────────────────────────────────────────

export type TipoDocumentoFiscalEmpresa = 'cpf' | 'cnpj'

export interface EmpresaDocumentoFiscal {
  id: string
  empresa_id: string

  tipo_documento: TipoDocumentoFiscalEmpresa
  documento: string

  nome_razao_social: string | null
  inscricao_estadual: string | null
  uf: string | null
  municipio: string | null

  principal: boolean
  ativo: boolean

  observacao: string | null

  created_by: string | null
  created_at: string | null
  updated_at: string | null
}

export type TipoDocumentoFiscal = 'nfe'
export type ModeloDocumentoFiscal = '55'

export type AmbienteDocumentoFiscal =
  | 'producao'
  | 'homologacao'
  | 'teste_manual'

export type StatusDocumentoFiscal =
  | 'importada'
  | 'validada'
  | 'rejeitada'
  | 'processada'
  | 'cancelada'
  | 'duplicada'

export interface DocumentoFiscal {
  id: string
  empresa_id: string

  documento_fiscal_permitido_id: string | null

  tipo_documento: TipoDocumentoFiscal
  modelo: ModeloDocumentoFiscal

  ambiente: AmbienteDocumentoFiscal
  status: StatusDocumentoFiscal

  chave_acesso: string
  protocolo_autorizacao: string | null
  protocolo_status_codigo: string | null
  protocolo_status_motivo: string | null

  numero: string | null
  serie: string | null
  natureza_operacao: string | null
  finalidade: string | null

  data_emissao: string | null
  data_saida_entrada: string | null

  emitente_nome: string | null
  emitente_documento: string | null
  emitente_inscricao_estadual: string | null
  emitente_uf: string | null
  emitente_municipio: string | null

  destinatario_nome: string | null
  destinatario_documento: string | null
  destinatario_inscricao_estadual: string | null
  destinatario_uf: string | null
  destinatario_municipio: string | null

  valor_produtos: number | null
  valor_frete: number | null
  valor_seguro: number | null
  valor_desconto: number | null
  valor_outras_despesas: number | null
  valor_icms: number | null
  valor_ipi: number | null
  valor_pis: number | null
  valor_cofins: number | null
  valor_total: number | null

  xml_storage_bucket: string | null
  xml_storage_path: string | null
  xml_sha256: string | null

  totais_json: any | null
  transporte_json: any | null
  cobranca_json: any | null
  payload_resumo_json: any | null

  validado_por: string | null
  validado_em: string | null

  rejeitado_motivo: string | null

  processado_por: string | null
  processado_em: string | null

  created_by: string | null
  created_at: string | null
  updated_at: string | null

  // joins opcionais
  documento_fiscal_permitido?: Pick<
    EmpresaDocumentoFiscal,
    | 'id'
    | 'tipo_documento'
    | 'documento'
    | 'nome_razao_social'
    | 'inscricao_estadual'
    | 'uf'
    | 'municipio'
  >
}

export type StatusDocumentoFiscalItem =
  | 'pendente'
  | 'vinculado'
  | 'ignorado'
  | 'processado'

export interface DocumentoFiscalItem {
  id: string

  empresa_id: string
  documento_fiscal_id: string

  numero_item: number

  codigo_produto: string | null
  ean: string | null
  descricao: string

  ncm: string | null
  cest: string | null
  cfop: string | null

  unidade_comercial: string | null
  quantidade_comercial: number | null
  valor_unitario_comercial: number | null
  valor_total_bruto: number | null

  unidade_tributavel: string | null
  quantidade_tributavel: number | null
  valor_unitario_tributavel: number | null

  valor_frete: number | null
  valor_seguro: number | null
  valor_desconto: number | null
  valor_outras_despesas: number | null

  impostos_json: any | null

  insumo_id: string | null
  fator_conversao_kg: number | null
  quantidade_convertida_kg: number | null

  status: StatusDocumentoFiscalItem

  movimentacao_estoque_id: string | null

  observacao: string | null

  created_by: string | null
  created_at: string | null
  updated_at: string | null

  // joins opcionais
  documento_fiscal?: Pick<
    DocumentoFiscal,
    'id' | 'chave_acesso' | 'numero' | 'serie' | 'status' | 'data_emissao'
  >

  insumo?: Pick<
    Insumo,
    | 'id'
    | 'nome'
    | 'categoria'
    | 'unidade'
    | 'estoque_minimo_kg'
    | 'estoque_maximo_kg'
    | 'ativo'
  >
}

export type TipoRegistroPagamentoFiscal = 'pagamento' | 'duplicata'

export interface DocumentoFiscalPagamento {
  id: string

  empresa_id: string
  documento_fiscal_id: string

  tipo_registro: TipoRegistroPagamentoFiscal

  numero_parcela: string | null
  meio_pagamento: string | null

  valor: number | null
  vencimento: string | null

  payload_json: any | null

  created_by: string | null
  created_at: string | null

  // joins opcionais
  documento_fiscal?: Pick<
    DocumentoFiscal,
    'id' | 'chave_acesso' | 'numero' | 'serie' | 'status'
  >
}

export interface EstoqueMovimentacao {
  id: string
  empresa_id: string
  insumo_id: string

  fazenda_id: string | null
  retiro_id: string | null

  tipo: TipoMovimentacaoEstoque
  quantidade_kg: number

  origem: OrigemMovimentacaoEstoque

  data_movimentacao: string

  abastecimento_id: string | null
  documento_fiscal_id: string | null
  documento_fiscal_item_id: string | null

  documento_referencia: string | null
  pessoa_referencia: string | null
  valor_unitario: number | null
  valor_total: number | null

  observacao: string | null

  created_by: string | null
  created_at: string | null

  insumo?: Pick<
    Insumo,
    | 'id'
    | 'nome'
    | 'categoria'
    | 'unidade'
    | 'estoque_minimo_kg'
    | 'estoque_maximo_kg'
    | 'ativo'
  >

  fazenda?: Pick<Fazenda, 'id' | 'nome' | 'codigo'>
  retiro?: Pick<Retiro, 'id' | 'nome'>

  documento_fiscal?: Pick<
    DocumentoFiscal,
    'id' | 'chave_acesso' | 'numero' | 'serie' | 'status' | 'data_emissao'
  >

  documento_fiscal_item?: Pick<
    DocumentoFiscalItem,
    | 'id'
    | 'numero_item'
    | 'descricao'
    | 'quantidade_convertida_kg'
    | 'status'
  >
}

// ─── Dispositivos / Abastecimentos ───────────────────────────────────────────

export interface Dispositivo {
  id: string
  empresa_id?: string | null
  fazenda_id: string
  nome: string
  tratador_nome: string | null
  ativo: boolean
  ultimo_sync: string | null
  device_secret: string | null
  created_at: string
  updated_at?: string | null

  // joins opcionais
  fazenda?: Pick<Fazenda, 'nome' | 'codigo'>
}

export interface Abastecimento {
  id: string
  client_uuid: string
  dispositivo_id: string
  fazenda_id: string
  cocho_id: string
  lote_id: string | null
  insumo_id: string | null
  tipo_abastecimento: string
  quantidade_kg: number | null
  observacao: string | null
  latitude: number | null
  longitude: number | null
  registrado_em: string
  sincronizado_em: string | null

  // joins opcionais
  cocho?: Pick<Cocho, 'nome' | 'codigo_qr'>
  lote?: Pick<Lote, 'nome' | 'quantidade_animais'>
  insumo?: Pick<Insumo, 'id' | 'nome' | 'categoria' | 'unidade'>
  dispositivo?: Pick<Dispositivo, 'nome' | 'tratador_nome'>
  fazenda?: Pick<Fazenda, 'nome'>
}

