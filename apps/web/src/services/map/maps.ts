import { supabase } from '../supabase'
import type {
  FarmMap,
  GeoJsonFeatureCollection,
  ImportedMapResult,
} from '../../types/map'
import { importKmlOrKmzToGeoJson } from './KMZImporter'
import {
  downloadGeoJsonFromStorage,
  removeMapFiles,
  uploadOriginalMapFile,
  uploadProcessedGeoJson,
} from './StorageService'
import { EMPTY_GEOJSON, validarGeoJsonParaMapa } from './geojson'

const db = supabase.schema('farmsafe')

export type BuscarMapaFazendaParams = {
  empresaId: string
  fazendaId: string
}

function getMapNameFromFile(file: File): string {
  return file.name.replace(/\.(kmz|kml)$/i, '').trim() || 'Mapa da fazenda'
}

export async function buscarMapaAtivoDaFazenda(
  params: BuscarMapaFazendaParams
): Promise<FarmMap | null> {
  const { data, error } = await db
    .from('maps')
    .select('*')
    .eq('empresa_id', params.empresaId)
    .eq('fazenda_id', params.fazendaId)
    .eq('ativo', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error('Nao foi possivel carregar o mapa da fazenda.')
  }

  return data as FarmMap | null
}

export async function existeMapaAtivo(params: BuscarMapaFazendaParams) {
  return Boolean(await buscarMapaAtivoDaFazenda(params))
}

export async function buscarGeoJsonDoMapa(
  map: FarmMap
): Promise<GeoJsonFeatureCollection> {
  if (map.arquivo_processado) {
    return downloadGeoJsonFromStorage(map.arquivo_processado)
  }

  if (map.geojson?.type === 'FeatureCollection') {
    return validarGeoJsonParaMapa(map.geojson)
  }

  return EMPTY_GEOJSON
}

async function inativarOutrosMapas(params: {
  empresaId: string
  fazendaId: string
  mapaAtivoId: string
}) {
  const { error } = await db
    .from('maps')
    .update({
      ativo: false,
      updated_at: new Date().toISOString(),
    })
    .eq('empresa_id', params.empresaId)
    .eq('fazenda_id', params.fazendaId)
    .eq('ativo', true)
    .neq('id', params.mapaAtivoId)

  if (error) {
    throw new Error(
      'Mapa importado, mas nao foi possivel inativar versoes anteriores.'
    )
  }
}

async function criarMapaAtivo(params: {
  empresaId: string
  fazendaId: string
  nome: string
  arquivoOriginal: string
  arquivoProcessado: string
  createdBy?: string | null
}): Promise<FarmMap> {
  const { data, error } = await db
    .from('maps')
    .insert({
      empresa_id: params.empresaId,
      fazenda_id: params.fazendaId,
      nome: params.nome,
      arquivo_original: params.arquivoOriginal,
      arquivo_processado: params.arquivoProcessado,
      geojson: EMPTY_GEOJSON,
      ativo: true,
      created_by: params.createdBy ?? null,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error('Nao foi possivel salvar o mapa no banco.')
  }

  return data as FarmMap
}

export async function uploadMapaDaFazenda(params: {
  empresaId: string
  fazendaId: string
  file: File
}): Promise<ImportedMapResult> {
  const geojson = await importKmlOrKmzToGeoJson(params.file)

  let originalPath = ''
  let processedPath = ''

  try {
    originalPath = await uploadOriginalMapFile({
      empresaId: params.empresaId,
      fazendaId: params.fazendaId,
      file: params.file,
    })

    processedPath = await uploadProcessedGeoJson({
      empresaId: params.empresaId,
      fazendaId: params.fazendaId,
      originalFileName: params.file.name,
      geojson,
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const map = await criarMapaAtivo({
      empresaId: params.empresaId,
      fazendaId: params.fazendaId,
      nome: getMapNameFromFile(params.file),
      arquivoOriginal: originalPath,
      arquivoProcessado: processedPath,
      createdBy: user?.id ?? null,
    })

    await inativarOutrosMapas({
      empresaId: params.empresaId,
      fazendaId: params.fazendaId,
      mapaAtivoId: map.id,
    })

    return {
      map,
      geojson,
    }
  } catch (error) {
    const novoMapaJaCriado =
      error instanceof Error &&
      error.message.includes('versoes anteriores')

    if (!novoMapaJaCriado) {
      await removeMapFiles([originalPath, processedPath])
    }

    throw error
  }
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
  const validGeojson = validarGeoJsonParaMapa(input.geojson)

  const { data, error } = await db
    .from('maps')
    .insert({
      empresa_id: input.empresaId,
      fazenda_id: input.fazendaId,
      nome: input.nome.trim(),
      arquivo_original: input.arquivoOriginal,
      arquivo_processado: input.arquivoProcessado ?? null,
      geojson: validGeojson,
      ativo: true,
      created_by: input.createdBy ?? null,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error('Nao foi possivel salvar o mapa no banco.')
  }

  return data as FarmMap
}

export async function atualizarVersaoMapa(params: {
  map: FarmMap
  empresaId: string
  fazendaId: string
}) {
  const proximaVersao = (params.map.versao ?? 1) + 1

  const { data, error } = await db
    .from('maps')
    .update({
      versao: proximaVersao,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.map.id)
    .eq('empresa_id', params.empresaId)
    .eq('fazenda_id', params.fazendaId)
    .select('*')
    .single()

  if (error) {
    throw new Error('Nao foi possivel atualizar a versao do mapa.')
  }

  return data as FarmMap
}

export const getActiveFarmMap = buscarMapaAtivoDaFazenda
export const loadFarmMapGeoJson = buscarGeoJsonDoMapa
export const importMapForFarm = uploadMapaDaFazenda
