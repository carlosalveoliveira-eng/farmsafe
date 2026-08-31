import type { GeoJsonFeatureCollection, MapArea } from '../../types/map'

export const EMPTY_GEOJSON: GeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}

export function normalizeFeatureCollection(
  value: unknown
): GeoJsonFeatureCollection {
  const collection = value as Partial<GeoJsonFeatureCollection> | null

  if (!collection || collection.type !== 'FeatureCollection') {
    return EMPTY_GEOJSON
  }

  return {
    type: 'FeatureCollection',
    features: Array.isArray(collection.features) ? collection.features : [],
  }
}

export function mapAreaToFeature(area: MapArea) {
  return {
    ...(area.geojson ?? {}),
    type: 'Feature',
    properties: {
      ...(area.geojson?.properties ?? {}),
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
