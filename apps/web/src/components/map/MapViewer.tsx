import { useEffect, type ReactNode } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import type { GeoJsonFeatureCollection } from '../../types/map'

export type MapBaseLayer = 'satelite' | 'osm'

type MapViewerProps = {
  center: [number, number]
  fitGeojson?: GeoJsonFeatureCollection
  baseLayer?: MapBaseLayer
  minZoom?: number
  maxZoom?: number
  initialZoom?: number
  className?: string
  children?: ReactNode
}

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function FitBounds({
  center,
  geojson,
  maxZoom,
}: {
  center: [number, number]
  geojson?: GeoJsonFeatureCollection
  maxZoom: number
}) {
  const map = useMap()

  useEffect(() => {
    const layer = geojson?.features.length ? L.geoJSON(geojson as never) : null
    const bounds = layer?.getBounds()

    if (bounds?.isValid()) {
      map.fitBounds(bounds, {
        padding: [56, 56],
        maxZoom: Math.min(maxZoom, 15),
      })
      return
    }

    map.setView(center, Math.min(maxZoom, 14))
  }, [center, geojson, map, maxZoom])

  return null
}

function ZoomControls() {
  const map = useMap()

  return (
    <div className="absolute left-4 top-20 z-[1200] flex flex-col overflow-hidden rounded-lg border border-white/20 bg-white/95 shadow-xl">
      <button
        type="button"
        aria-label="Aumentar zoom"
        onClick={() => map.zoomIn()}
        className="h-10 w-10 text-lg font-bold text-ink-primary hover:bg-green/10"
      >
        +
      </button>
      <button
        type="button"
        aria-label="Diminuir zoom"
        onClick={() => map.zoomOut()}
        className="h-10 w-10 border-t border-border text-lg font-bold text-ink-primary hover:bg-green/10"
      >
        -
      </button>
    </div>
  )
}

export default function MapViewer({
  center,
  fitGeojson,
  baseLayer = 'satelite',
  minZoom = 10,
  maxZoom = 17,
  initialZoom = 14,
  className = 'h-full w-full',
  children,
}: MapViewerProps) {
  return (
    <MapContainer
      center={center}
      zoom={initialZoom}
      minZoom={minZoom}
      maxZoom={maxZoom}
      zoomControl={false}
      scrollWheelZoom
      className={className}
    >
      <FitBounds center={center} geojson={fitGeojson} maxZoom={maxZoom} />

      {baseLayer === 'satelite' ? (
        <TileLayer
          attribution="Tiles Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={maxZoom}
          maxNativeZoom={maxZoom}
        />
      ) : (
        <TileLayer
          attribution="OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={maxZoom}
          maxNativeZoom={maxZoom}
        />
      )}

      {children}
      <ZoomControls />
    </MapContainer>
  )
}
