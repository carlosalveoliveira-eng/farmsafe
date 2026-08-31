import { supabase } from '../supabase'
import type { GeoJsonFeatureCollection } from '../../types/map'
import { validarGeoJsonParaMapa } from './geojson'

export const MAPS_BUCKET = 'maps'

function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function assertStorageSegment(value: string, label: string) {
  if (!value || value.includes('/') || value.includes('..')) {
    throw new Error(`${label} invalido para montar o caminho do mapa.`)
  }
}

function getOriginalContentType(file: File): string {
  const name = file.name.toLowerCase()

  if (name.endsWith('.kmz')) {
    return 'application/vnd.google-earth.kmz'
  }

  if (name.endsWith('.kml')) {
    return 'application/vnd.google-earth.kml+xml'
  }

  throw new Error('Tipo de arquivo nao permitido.')
}

function getBaseName(fileName: string): string {
  const baseName = sanitizeFileName(fileName).replace(/\.(kmz|kml)$/i, '')

  return baseName || 'mapa'
}

function assertTenantPath(params: { empresaId: string; fazendaId: string }) {
  assertStorageSegment(params.empresaId, 'Empresa')
  assertStorageSegment(params.fazendaId, 'Fazenda')
}

export function buildOriginalMapPath(params: {
  empresaId: string
  fazendaId: string
  file: File
}): string {
  assertTenantPath(params)

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const safeName = sanitizeFileName(params.file.name) || 'mapa.kmz'

  return `${params.empresaId}/${params.fazendaId}/original/${timestamp}-${safeName}`
}

export function buildProcessedMapPath(params: {
  empresaId: string
  fazendaId: string
  originalFileName: string
}): string {
  assertTenantPath(params)

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const baseName = getBaseName(params.originalFileName)

  return `${params.empresaId}/${params.fazendaId}/processed/${timestamp}-${baseName}.geojson`
}

export async function uploadOriginalMapFile(params: {
  empresaId: string
  fazendaId: string
  file: File
}): Promise<string> {
  const path = buildOriginalMapPath(params)
  const contentType = getOriginalContentType(params.file)
  const typedFile = new File([params.file], params.file.name, {
    type: contentType,
    lastModified: params.file.lastModified,
  })

  const { error } = await supabase.storage
    .from(MAPS_BUCKET)
    .upload(path, typedFile, {
      cacheControl: '3600',
      upsert: false,
      contentType,
    })

  if (error) {
    throw new Error('Nao foi possivel enviar o arquivo original do mapa.')
  }

  return path
}

export async function uploadProcessedGeoJson(params: {
  empresaId: string
  fazendaId: string
  originalFileName: string
  geojson: GeoJsonFeatureCollection
}): Promise<string> {
  const path = buildProcessedMapPath(params)
  const validGeojson = validarGeoJsonParaMapa(params.geojson)
  const blob = new Blob([JSON.stringify(validGeojson)], {
    type: 'application/geo+json',
  })

  const { error } = await supabase.storage.from(MAPS_BUCKET).upload(path, blob, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'application/geo+json',
  })

  if (error) {
    throw new Error('Nao foi possivel enviar o GeoJSON processado do mapa.')
  }

  return path
}

export async function removeMapFiles(paths: string[]): Promise<void> {
  const validPaths = paths.filter(Boolean)

  if (validPaths.length === 0) return

  await supabase.storage.from(MAPS_BUCKET).remove(validPaths)
}

export async function createSignedMapUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(MAPS_BUCKET)
    .createSignedUrl(path, 60 * 5)

  if (error || !data?.signedUrl) {
    throw new Error('Nao foi possivel acessar o arquivo processado do mapa.')
  }

  return data.signedUrl
}

export async function downloadGeoJsonFromStorage(
  path: string
): Promise<GeoJsonFeatureCollection> {
  const signedUrl = await createSignedMapUrl(path)
  const response = await fetch(signedUrl)

  if (!response.ok) {
    throw new Error('Nao foi possivel baixar o GeoJSON processado.')
  }

  const json = await response.json()

  return validarGeoJsonParaMapa(json)
}
