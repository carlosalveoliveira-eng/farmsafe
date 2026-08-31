import { useMapEvents } from 'react-leaflet'

type MapEditorProps = {
  enabled: boolean
  onPlace: (point: [number, number]) => void
}

export default function MapEditor({ enabled, onPlace }: MapEditorProps) {
  useMapEvents({
    click(event) {
      if (!enabled) return

      onPlace([event.latlng.lat, event.latlng.lng])
    },
  })

  return null
}
