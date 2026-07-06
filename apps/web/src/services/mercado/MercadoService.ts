import { supabase } from '../supabase'
import { getEmpresaUsuario } from '../auth'

const db = supabase.schema('farmsafe')

const AGRODOC_COTACAO_URL = 'https://agrodocai.com.br/api/v1/cotacao'
const PRODUTO_BOI_GORDO = 'boi_gordo'

export type OrigemCotacao = 'api' | 'manual'

export type CotacaoMercado = {
  id: string
  empresa_id: string
  data: string
  produto: string
  uf: string
  valor_arroba: number
  praca: string | null
  fonte: string | null
  origem: OrigemCotacao
  payload: any | null
  created_by: string | null
  created_at: string | null
  updated_at: string | null
}

export type CotacaoApiResult = {
  valorArroba: number
  uf: string
  praca: string | null
  fonte: string
  payload: any
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function normalizarUf(uf: string) {
  const valor = uf.trim().toUpperCase()

  if (!valor) return 'BR'

  return valor
}

function toNumber(value: unknown) {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'))

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

async function getEmpresaId() {
  const usuario = await getEmpresaUsuario()
  const empresa = usuario.empresa as { id?: string } | null

  if (!empresa?.id) {
    throw new Error('Empresa não encontrada para salvar cotação.')
  }

  return empresa.id
}

export function formatarValorArroba(valor: number | null | undefined) {
  if (!valor || !Number.isFinite(valor)) return '—'

  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export async function buscarCotacaoBoiGordoDoDia(params: {
  uf: string
}): Promise<CotacaoMercado | null> {
  const uf = normalizarUf(params.uf)

  const { data, error } = await db
    .from('cotacoes_mercado')
    .select('*')
    .eq('produto', PRODUTO_BOI_GORDO)
    .eq('data', hojeISO())
    .eq('uf', uf)
    .maybeSingle()

  if (error) {
    throw new Error(`Falha ao buscar cotação: ${error.message}`)
  }

  return data as CotacaoMercado | null
}

export async function buscarCotacaoBoiGordoNaApi(params: {
  uf: string
}): Promise<CotacaoApiResult> {
  const uf = normalizarUf(params.uf)

  const url = new URL(AGRODOC_COTACAO_URL)

  if (uf !== 'BR') {
    url.searchParams.set('uf', uf)
  }

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error('A API de cotação não respondeu corretamente.')
  }

  const payload = await response.json()

  const cotacaoUf = payload?.boi_gordo_uf
  const valorUf = toNumber(cotacaoUf?.preco)
  const valorCepea = toNumber(payload?.boi_gordo_cepea_sp)

  const valorFinal = valorUf ?? valorCepea

  if (!valorFinal || valorFinal <= 0) {
    throw new Error('A API não retornou uma cotação válida da arroba.')
  }

  return {
    valorArroba: Number(valorFinal.toFixed(2)),
    uf,
    praca:
      cotacaoUf?.praca ??
      payload?.boi_gordo_praca ??
      'CEPEA/ESALQ SP',
    fonte:
      payload?.fonte ??
      'AgroDoc AI / CEPEA',
    payload,
  }
}

export async function salvarCotacaoBoiGordo(params: {
  uf: string
  valorArroba: number
  praca?: string | null
  fonte?: string | null
  origem: OrigemCotacao
  payload?: any | null
}): Promise<CotacaoMercado> {
  const empresaId = await getEmpresaId()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const payload = {
    empresa_id: empresaId,
    data: hojeISO(),
    produto: PRODUTO_BOI_GORDO,
    uf: normalizarUf(params.uf),
    valor_arroba: params.valorArroba,
    praca: params.praca ?? null,
    fonte: params.fonte ?? null,
    origem: params.origem,
    payload: params.payload ?? null,
    created_by: user?.id ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await db
    .from('cotacoes_mercado')
    .upsert(payload, {
      onConflict: 'empresa_id,data,produto,uf',
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(`Falha ao salvar cotação: ${error.message}`)
  }

  return data as CotacaoMercado
}

export async function obterOuAtualizarCotacaoBoiGordo(params: {
  uf: string
  forceApi?: boolean
}): Promise<CotacaoMercado | null> {
  const uf = normalizarUf(params.uf)

  if (!params.forceApi) {
    const cotacaoSalvaHoje = await buscarCotacaoBoiGordoDoDia({ uf })

    if (cotacaoSalvaHoje) {
      return cotacaoSalvaHoje
    }
  }

  try {
    const cotacaoApi = await buscarCotacaoBoiGordoNaApi({ uf })

    return salvarCotacaoBoiGordo({
      uf,
      valorArroba: cotacaoApi.valorArroba,
      praca: cotacaoApi.praca,
      fonte: cotacaoApi.fonte,
      origem: 'api',
      payload: cotacaoApi.payload,
    })
  } catch (error) {
    console.error(error)

    const ultimaCotacao = await buscarUltimaCotacaoBoiGordo({ uf })

    if (ultimaCotacao) {
      return ultimaCotacao
    }

    throw error
  }
}

export async function buscarUltimaCotacaoBoiGordo(params: {
  uf: string
}): Promise<CotacaoMercado | null> {
  const uf = normalizarUf(params.uf)

  const { data, error } = await db
    .from('cotacoes_mercado')
    .select('*')
    .eq('produto', PRODUTO_BOI_GORDO)
    .eq('uf', uf)
    .order('data', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Falha ao buscar última cotação: ${error.message}`)
  }

  return data as CotacaoMercado | null
}

export async function salvarCotacaoManualBoiGordo(params: {
  uf: string
  valorArroba: number
}): Promise<CotacaoMercado> {
  if (!Number.isFinite(params.valorArroba) || params.valorArroba <= 0) {
    throw new Error('Informe uma cotação válida para a arroba.')
  }

  return salvarCotacaoBoiGordo({
    uf: params.uf,
    valorArroba: Number(params.valorArroba.toFixed(2)),
    praca: 'Informado manualmente',
    fonte: 'Manual',
    origem: 'manual',
    payload: null,
  })
}