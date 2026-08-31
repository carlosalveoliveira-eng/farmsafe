import L, { type LeafletEvent } from 'leaflet'
import { Marker, Polyline, Popup } from 'react-leaflet'

import { calcularCentroFeature } from '../../features/mapa/mapGeometry'
import type { Lote } from '../../services/supabase'
import type { MapArea } from '../../types/map'
import StatusBadge from '../ui/StatusBadge'
import type { CochoMapa } from '../../services/map/OperationalMapService'
import { mapAreaToFeature } from '../../services/map/geojson'

type StatusCocho = 'ok' | 'atencao' | 'atrasado' | 'sem_registro'

type MapMarkersProps = {
  cochos: CochoMapa[]
  lotes: Lote[]
  areasPorId: Map<string, MapArea>
  route: Array<[number, number]>
  showCochos: boolean
  showLotes: boolean
  showRoute: boolean
  getStatusCocho: (cochoId: string) => StatusCocho
  onCochoDragged: (cochoId: string, point: [number, number]) => void
  onLoteDragged: (lote: Lote, point: [number, number]) => void
  onLancarAbastecimento: (cocho: CochoMapa) => void
  onEditarCocho: (cocho: CochoMapa) => void
  onRetirarCocho: (cocho: CochoMapa) => void
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function buildPinIcon(params: {
  label: string
  color: string
  shape?: 'round' | 'square'
}) {
  const radius = params.shape === 'square' ? '10px' : '999px'

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 34px;
        height: 34px;
        border-radius: ${radius};
        background: ${params.color};
        border: 3px solid #fff;
        box-shadow: 0 10px 24px rgba(15,23,42,0.28);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font: 800 12px Arial, sans-serif;
      ">${escapeHtml(params.label)}</div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  })
}

function statusBadge(status: StatusCocho) {
  if (status === 'ok') return 'ok'
  if (status === 'atencao' || status === 'sem_registro') return 'warn'
  return 'err'
}

function statusColor(status: StatusCocho) {
  if (status === 'ok') return '#22c55e'
  if (status === 'atrasado') return '#ef4444'
  return '#f59e0b'
}

export default function MapMarkers({
  cochos,
  lotes,
  areasPorId,
  route,
  showCochos,
  showLotes,
  showRoute,
  getStatusCocho,
  onCochoDragged,
  onLoteDragged,
  onLancarAbastecimento,
  onEditarCocho,
  onRetirarCocho,
}: MapMarkersProps) {
  return (
    <>
      {showRoute && route.length > 1 && (
        <Polyline
          positions={route}
          pathOptions={{ color: '#4ade80', weight: 3, opacity: 0.78 }}
        />
      )}

      {showCochos &&
        cochos.map((cocho, index) => {
          const status = getStatusCocho(cocho.id)

          return (
            <Marker
              key={`${cocho.id}-${cocho.latitude}-${cocho.longitude}`}
              position={[Number(cocho.latitude), Number(cocho.longitude)]}
              icon={buildPinIcon({
                label: String(index + 1),
                color: statusColor(status),
                shape: 'round',
              })}
              draggable
              eventHandlers={{
                dragend: (event: LeafletEvent) => {
                  const marker = event.target as L.Marker
                  const point = marker.getLatLng()

                  onCochoDragged(cocho.id, [point.lat, point.lng])
                },
              }}
            >
              <Popup>
                <div className="min-w-[220px]">
                  <p className="font-semibold text-ink-primary">
                    {cocho.nome}
                  </p>
                  <p className="mt-1 font-mono text-xs text-ink-muted">
                    {cocho.codigo_qr}
                  </p>
                  <div className="my-3">
                    <StatusBadge status={statusBadge(status)}>
                      {status.toUpperCase()}
                    </StatusBadge>
                  </div>
                  <p className="text-xs text-ink-muted">
                    Pasto:{' '}
                    {areasPorId.get(cocho.map_area_id ?? '')?.nome ??
                      'Nao identificado'}
                  </p>

                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => onLancarAbastecimento(cocho)}
                      className="rounded-md bg-green px-2 py-2 text-xs font-semibold text-white"
                    >
                      Lancar
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditarCocho(cocho)}
                      className="rounded-md border border-border px-2 py-2 text-xs font-semibold text-ink-secondary"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => onRetirarCocho(cocho)}
                      className="rounded-md border border-red/30 px-2 py-2 text-xs font-semibold text-red"
                    >
                      Retirar
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

      {showLotes &&
        lotes.map((lote, index) => {
          const area = areasPorId.get(lote.map_area_id ?? '')
          const center = area ? calcularCentroFeature(mapAreaToFeature(area)) : null

          if (!area || !center) return null

          return (
            <Marker
              key={`${lote.id}-${lote.map_area_id}`}
              position={center}
              icon={buildPinIcon({
                label: `L${index + 1}`,
                color: '#7c3aed',
                shape: 'square',
              })}
              draggable
              eventHandlers={{
                dragend: (event: LeafletEvent) => {
                  const marker = event.target as L.Marker
                  const point = marker.getLatLng()

                  onLoteDragged(lote, [point.lat, point.lng])
                },
              }}
            >
              <Popup>
                <div className="min-w-[220px]">
                  <p className="font-semibold text-ink-primary">{lote.nome}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {lote.quantidade_animais ?? 0} cabecas
                  </p>
                  <p className="mt-2 text-xs text-ink-muted">
                    Pasto atual: {area.nome}
                  </p>
                </div>
              </Popup>
            </Marker>
          )
        })}
    </>
  )
}
