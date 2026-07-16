import L from 'leaflet'
import area from '@turf/area'
import centroid from '@turf/centroid'

export type LatLngTuple = [number, number]

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const normalized = String(value)
    .replace(/[^\d,.-]/g, '')
    .replace(',', '.')

  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : null
}

export function calcularAreaHectares(feature: any) {
  const props = feature?.properties ?? {}

  const areaInformada =
    props.area_hectares ??
    props.area_ha ??
    props.areaHa ??
    props.hectares ??
    props.ha ??
    props.Area ??
    props.AREA

  const areaNumerica = toNumber(areaInformada)

  if (areaNumerica && areaNumerica > 0) {
    return areaNumerica
  }

  try {
    const areaMetros = area(feature as any)

    if (!Number.isFinite(areaMetros) || areaMetros <= 0) {
      return null
    }

    return areaMetros / 10000
  } catch {
    return null
  }
}

export function formatarHectares(value: number | null) {
  if (!value || !Number.isFinite(value)) return '— ha'

  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} ha`
}

export function calcularCentroFeature(feature: any): LatLngTuple | null {
  try {
    const centro = centroid(feature as any)
    const coords = centro?.geometry?.coordinates

    if (!coords || coords.length < 2) return null

    const [lng, lat] = coords

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

    return [lat, lng]
  } catch {
    return null
  }
}

export function calcularBoundsGeoJson(geojson: any) {
  try {
    const layer = L.geoJSON(geojson as any)
    const bounds = layer.getBounds()

    return bounds.isValid() ? bounds : null
  } catch {
    return null
  }
}

export const WORLD_MASK_OUTER_RING: LatLngTuple[] = [
  [-89.9, -179.9],
  [-89.9, 179.9],
  [89.9, 179.9],
  [89.9, -179.9],
]

function converterRingLonLatParaLatLng(ring: any[]): LatLngTuple[] {
  return ring
    .filter((coord) => Array.isArray(coord) && coord.length >= 2)
    .map((coord) => {
      const lng = Number(coord[0])
      const lat = Number(coord[1])

      return [lat, lng] as LatLngTuple
    })
    .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))
}

function extrairAneisFeature(feature: any): LatLngTuple[][] {
  const geometry = feature?.geometry

  if (!geometry) return []

  if (geometry.type === 'Polygon') {
    const outerRing = geometry.coordinates?.[0]

    if (!Array.isArray(outerRing)) return []

    return [converterRingLonLatParaLatLng(outerRing)]
  }

  if (geometry.type === 'MultiPolygon') {
    const polygons = geometry.coordinates

    if (!Array.isArray(polygons)) return []

    return polygons
      .map((polygon: any[]) => polygon?.[0])
      .filter(Boolean)
      .map((ring: any[]) => converterRingLonLatParaLatLng(ring))
  }

  return []
}

export function extrairAneisMascaraGeoJson(geojson: any): LatLngTuple[][] {
  const features = geojson?.features

  if (!Array.isArray(features)) return []

  return features
    .flatMap((feature) => extrairAneisFeature(feature))
    .filter((ring) => ring.length >= 4)
}