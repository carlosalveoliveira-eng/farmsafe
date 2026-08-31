import type {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  GeoJsonGeometry,
  GeoJsonPosition,
  MapArea,
} from '../../types/map'

export const EMPTY_GEOJSON: GeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}

export const MAP_GEOJSON_LIMITS = {
  maxFeatures: 2500,
  maxSerializedBytes: 15 * 1024 * 1024,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isPosition(value: unknown): value is GeoJsonPosition {
  if (!Array.isArray(value) || value.length < 2) return false

  const [lng, lat] = value

  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  )
}

function isPositionArray(value: unknown): value is GeoJsonPosition[] {
  return Array.isArray(value) && value.length > 0 && value.every(isPosition)
}

function hasValidGeometry(value: unknown): value is GeoJsonGeometry {
  if (!isRecord(value) || typeof value.type !== 'string') return false

  const coordinates = value.coordinates

  if (value.type === 'Point') {
    return isPosition(coordinates)
  }

  if (value.type === 'LineString') {
    return isPositionArray(coordinates)
  }

  if (value.type === 'Polygon') {
    return (
      Array.isArray(coordinates) &&
      coordinates.length > 0 &&
      coordinates.every(isPositionArray)
    )
  }

  if (value.type === 'MultiPolygon') {
    return (
      Array.isArray(coordinates) &&
      coordinates.length > 0 &&
      coordinates.every(
        (polygon) =>
          Array.isArray(polygon) &&
          polygon.length > 0 &&
          polygon.every(isPositionArray)
      )
    )
  }

  return false
}

function normalizeFeature(value: unknown): GeoJsonFeature | null {
  if (!isRecord(value) || value.type !== 'Feature') return null

  if (value.geometry !== null && !hasValidGeometry(value.geometry)) {
    return null
  }

  return {
    type: 'Feature',
    geometry: value.geometry,
    properties: isRecord(value.properties) ? value.properties : {},
    id:
      typeof value.id === 'string' || typeof value.id === 'number'
        ? value.id
        : undefined,
  }
}

function assertSerializable(geojson: GeoJsonFeatureCollection) {
  const serialized = JSON.stringify(geojson)

  if (!serialized) {
    throw new Error('O mapa nao pode ser serializado.')
  }

  if (serialized.length > MAP_GEOJSON_LIMITS.maxSerializedBytes) {
    throw new Error(
      'O mapa convertido ficou muito grande. Reduza detalhes do KMZ/KML antes de importar.'
    )
  }
}

export function validarGeoJsonParaMapa(
  value: unknown
): GeoJsonFeatureCollection {
  if (!isRecord(value) || value.type !== 'FeatureCollection') {
    throw new Error('O arquivo nao gerou um GeoJSON valido.')
  }

  if (!Array.isArray(value.features)) {
    throw new Error('O GeoJSON nao possui lista de feicoes.')
  }

  if (value.features.length === 0) {
    throw new Error('O mapa nao possui geometrias para exibir.')
  }

  if (value.features.length > MAP_GEOJSON_LIMITS.maxFeatures) {
    throw new Error(
      `O mapa possui muitas feicoes (${value.features.length}). O limite atual e ${MAP_GEOJSON_LIMITS.maxFeatures}.`
    )
  }

  const features = value.features
    .map(normalizeFeature)
    .filter((feature): feature is GeoJsonFeature =>
      Boolean(feature?.geometry)
    )

  if (features.length === 0) {
    throw new Error('O mapa nao possui geometrias validas.')
  }

  const geojson = {
    type: 'FeatureCollection',
    features,
  } satisfies GeoJsonFeatureCollection

  assertSerializable(geojson)

  return geojson
}

export function normalizeFeatureCollection(
  value: unknown
): GeoJsonFeatureCollection {
  try {
    return validarGeoJsonParaMapa(value)
  } catch {
    return EMPTY_GEOJSON
  }
}

export function mapAreaToFeature(area: MapArea): GeoJsonFeature {
  return {
    ...area.geojson,
    type: 'Feature',
    properties: {
      ...(area.geojson.properties ?? {}),
      area_id: area.id,
      nome: area.nome,
      tipo: area.tipo,
      cor: area.cor,
    },
  }
}

export function mapAreasToFeatureCollection(
  areas: MapArea[]
): GeoJsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: areas.map(mapAreaToFeature),
  }
}
