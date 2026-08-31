import { supabase } from '../supabase'
import type { FarmMap, GeoJsonFeatureCollection } from '../../types/map'
import {
  getActiveFarmMap,
  importMapForFarm,
  loadFarmMapGeoJson,
} from './MapService'

const db = supabase.schema('farmsafe')

export type BuscarMapaFazendaParams = {
  empresaId: string
  fazendaId: string
}

export async function buscarMapaAtivoDaFazenda(
  params: BuscarMapaFazendaParams
) {
  return getActiveFarmMap(params)
}

export async function existeMapaAtivo(params: BuscarMapaFazendaParams) {
  return Boolean(await buscarMapaAtivoDaFazenda(params))
}

export async function buscarGeoJsonDoMapa(map: FarmMap) {
  return loadFarmMapGeoJson(map)
}

export async function uploadMapaDaFazenda(params: {
  empresaId: string
  fazendaId: string
  file: File
}) {
  return importMapForFarm(params)
}

export async function salvarRegistroMapa(input: {
  empresaId: string
  fazendaId: string
  nome: string
  arquivoOriginal: string | null
  arquivoProcessado?: string | null
  geojson: GeoJsonFeatureCollection
  createdBy?: string | null
}) {
  const { data, error } = await db
    .from('maps')
    .insert({
      empresa_id: input.empresaId,
      fazenda_id: input.fazendaId,
      nome: input.nome.trim(),
      arquivo_original: input.arquivoOriginal,
      arquivo_processado: input.arquivoProcessado ?? null,
      geojson: input.geojson,
      ativo: true,
      created_by: input.createdBy ?? null,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(`Falha ao salvar mapa no banco: ${error.message}`)
  }

  return data as FarmMap
}

export async function atualizarVersaoMapa(map: FarmMap) {
  const proximaVersao = (map.versao ?? 1) + 1

  const { data, error } = await db
    .from('maps')
    .update({
      versao: proximaVersao,
      updated_at: new Date().toISOString(),
    })
    .eq('id', map.id)
    .select('*')
    .single()

  if (error) {
    throw new Error(`Falha ao atualizar versao do mapa: ${error.message}`)
  }

  return data as FarmMap
}
