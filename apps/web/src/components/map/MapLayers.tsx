import { Eye, EyeOff, Satellite } from 'lucide-react'

import type { MapBaseLayer } from './MapViewer'

export type MapLayerToggle = {
  id: string
  label: string
  active: boolean
  onToggle: () => void
}

type MapLayersProps = {
  layers: MapLayerToggle[]
  baseLayer: MapBaseLayer
  onToggleBaseLayer: () => void
}

export default function MapLayers({
  layers,
  baseLayer,
  onToggleBaseLayer,
}: MapLayersProps) {
  return (
    <div className="absolute bottom-4 left-4 z-[1200] flex max-w-[calc(100%-2rem)] flex-wrap gap-2 rounded-lg border border-white/20 bg-white/95 p-2 shadow-xl backdrop-blur">
      {layers.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={item.onToggle}
          className={`h-9 rounded-md px-3 text-xs font-bold ${
            item.active
              ? 'bg-green/10 text-green'
              : 'text-ink-muted hover:bg-surface'
          }`}
        >
          {item.active ? (
            <Eye size={13} className="mr-1 inline" />
          ) : (
            <EyeOff size={13} className="mr-1 inline" />
          )}
          {item.label}
        </button>
      ))}

      <div className="h-9 w-px bg-border" />

      <button
        type="button"
        onClick={onToggleBaseLayer}
        className="h-9 rounded-md px-3 text-xs font-bold text-ink-secondary hover:bg-green/10"
      >
        <Satellite size={13} className="mr-1 inline" />
        {baseLayer === 'satelite' ? 'Satelite' : 'Ruas'}
      </button>
    </div>
  )
}
