import { supabase, type Cocho, type Lote } from '../supabase'
import type { MapArea } from '../../types/map'

const db = supabase.schema('farmsafe')

export type CochoMapa = Cocho & {
  lote?: Pick<Lote, 'id' | 'nome' | 'quantidade_animais' | 'map_area_id'>
}

export async function listOperationalCochos(params: {
  empresaId: string
  fazendaId: string
}) {
  const { data, error } = await db
    .from('cochos')
    .select('*, lote:lotes(id,nome,quantidade_animais,map_area_id)')
    .eq('empresa_id', params.empresaId)
    .eq('fazenda_id', params.fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) {
    throw new Error(`Falha ao carregar cochos do mapa: ${error.message}`)
  }

  return (data as CochoMapa[]) ?? []
}

export async function listOperationalLotes(params: {
  empresaId: string
  fazendaId: string
}) {
  const { data, error } = await db
    .from('lotes')
    .select('*')
    .eq('empresa_id', params.empresaId)
    .eq('fazenda_id', params.fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) {
    throw new Error(`Falha ao carregar lotes do mapa: ${error.message}`)
  }

  return (data as Lote[]) ?? []
}

export async function updateCochoMapPosition(params: {
  cochoId: string
  empresaId: string
  fazendaId: string
  latitude: number
  longitude: number
  area: MapArea | null
}) {
  const { error } = await db
    .from('cochos')
    .update({
      latitude: params.latitude,
      longitude: params.longitude,
      map_area_id: params.area?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.cochoId)
    .eq('empresa_id', params.empresaId)
    .eq('fazenda_id', params.fazendaId)

  if (error) {
    throw new Error(`Falha ao posicionar cocho: ${error.message}`)
  }
}

export async function clearCochoMapPosition(params: {
  cochoId: string
  empresaId: string
  fazendaId: string
}) {
  const { error } = await db
    .from('cochos')
    .update({
      latitude: null,
      longitude: null,
      map_area_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.cochoId)
    .eq('empresa_id', params.empresaId)
    .eq('fazenda_id', params.fazendaId)

  if (error) {
    throw new Error(`Falha ao retirar pin do cocho: ${error.message}`)
  }
}

export async function updateCochoQuickInfo(params: {
  cochoId: string
  empresaId: string
  fazendaId: string
  nome: string
  tipoSal: string | null
  capacidadeKg: number | null
}) {
  const { error } = await db
    .from('cochos')
    .update({
      nome: params.nome.trim(),
      tipo_sal: params.tipoSal,
      capacidade_kg: params.capacidadeKg,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.cochoId)
    .eq('empresa_id', params.empresaId)
    .eq('fazenda_id', params.fazendaId)

  if (error) {
    throw new Error(`Falha ao atualizar cocho: ${error.message}`)
  }
}

export async function createAbastecimentoFromMap(params: {
  cocho: CochoMapa
  quantidadeKg: number
  tipoAbastecimento: string
  observacao?: string | null
}) {
  if (!params.cocho.empresa_id) {
    throw new Error('Cocho sem empresa vinculada. Atualize a pagina e tente novamente.')
  }

  const { data: dispositivo, error: dispositivoError } = await db
    .from('dispositivos')
    .select('id')
    .eq('empresa_id', params.cocho.empresa_id)
    .eq('fazenda_id', params.cocho.fazenda_id)
    .eq('ativo', true)
    .is('revogado_em', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (dispositivoError) {
    throw new Error(`Falha ao localizar dispositivo: ${dispositivoError.message}`)
  }

  if (!dispositivo?.id) {
    throw new Error('Cadastre um dispositivo ativo para lancar abastecimento pelo mapa.')
  }

  const { error } = await db.from('abastecimentos').insert({
    client_uuid: crypto.randomUUID(),
    dispositivo_id: dispositivo.id,
    empresa_id: params.cocho.empresa_id,
    fazenda_id: params.cocho.fazenda_id,
    cocho_id: params.cocho.id,
    lote_id: params.cocho.lote_id,
    tipo_abastecimento: params.tipoAbastecimento,
    quantidade_kg: params.quantidadeKg,
    observacao: params.observacao || 'Lancado pelo mapa operacional.',
    latitude: params.cocho.latitude ?? null,
    longitude: params.cocho.longitude ?? null,
    registrado_em: new Date().toISOString(),
    sincronizado_em: new Date().toISOString(),
    origem_registro: 'web_mapa',
  })

  if (error) {
    throw new Error(`Falha ao lancar abastecimento: ${error.message}`)
  }
}

export async function moveLoteToArea(params: {
  lote: Lote
  destino: MapArea
  quantidade?: number | null
  observacao?: string
}) {
  const { error } = await supabase.rpc('mover_lote_mapa', {
    p_lote_id: params.lote.id,
    p_destino_area_id: params.destino.id,
    p_quantidade: params.quantidade ?? null,
    p_observacao: params.observacao ?? null,
  })

  if (error) {
    throw new Error(`Falha ao mover lote: ${error.message}`)
  }
}
