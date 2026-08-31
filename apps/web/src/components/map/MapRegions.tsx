import { GeoJSON } from 'react-leaflet'

import MapPastoLabel from '../../features/mapa/MapPastoLabel'
import { getAreaStyle, getCorArea } from '../../features/mapa/mapTheme'
import type { GeoJsonFeatureCollection, MapArea } from '../../types/map'
import { mapAreaToFeature } from '../../services/map/geojson'

type MapRegionsProps = {
  mapId?: string | null
  mapGeojson: GeoJsonFeatureCollection
  areas: MapArea[]
  areasGeojson: GeoJsonFeatureCollection
  showAreas: boolean
  showLabels: boolean
}

export default function MapRegions({
  mapId,
  mapGeojson,
  areas,
  areasGeojson,
  showAreas,
  showLabels,
}: MapRegionsProps) {
  return (
    <>
      {showAreas && areas.length === 0 && mapGeojson.features.length > 0 && (
        <GeoJSON
          key={`kmz-fallback-${mapId ?? 'mapa'}-${mapGeojson.features.length}`}
          data={mapGeojson as never}
          style={(feature) => ({
            ...getAreaStyle(feature),
            weight: 2,
            opacity: 0.9,
            fillOpacity: 0.12,
          })}
        />
      )}

      {showAreas &&
        areas.map((area) => {
          const feature = mapAreaToFeature(area)

          return (
            <GeoJSON
              key={`${area.id}-${area.updated_at ?? ''}`}
              data={feature as never}
              style={() => ({
                ...getAreaStyle(feature),
                color: area.cor || getCorArea(feature),
                fillColor: area.cor || getCorArea(feature),
                weight: area.tipo === 'fazenda' ? 3 : 2,
                fillOpacity: area.tipo === 'fazenda' ? 0.06 : 0.16,
              })}
            />
          )
        })}

      {showLabels &&
        showAreas &&
        areasGeojson.features.map((feature, index) => (
          <MapPastoLabel
            key={`label-${index}`}
            feature={feature}
            index={index}
          />
        ))}
    </>
  )
}
