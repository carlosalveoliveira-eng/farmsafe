import { useMemo } from 'react'
import { Marker } from 'react-leaflet'
import L from 'leaflet'
import {
  calcularAreaHectares,
  calcularCentroFeature,
  formatarHectares,
} from './mapGeometry'
import { getCorArea, getNomeArea, getTipoArea } from './mapTheme'

type MapPastoLabelProps = {
  feature: any
  index: number
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export default function MapPastoLabel({ feature, index }: MapPastoLabelProps) {
  const center = useMemo(() => calcularCentroFeature(feature), [feature])

  const icon = useMemo(() => {
    const nome = getNomeArea(feature, index)
    const hectares = formatarHectares(calcularAreaHectares(feature))
    const cor = getCorArea(feature)
    const tipo = getTipoArea(feature)

    return L.divIcon({
      className: '',
      html: `
        <div style="
          min-width: 86px;
          max-width: 150px;
          padding: 7px 9px;
          border-radius: 12px;
          background: rgba(255,255,255,0.94);
          border: 1px solid ${cor}55;
          box-shadow: 0 8px 22px rgba(15,23,42,0.16);
          color: #0f172a;
          text-align: center;
          font-family: Inter, Arial, sans-serif;
          pointer-events: none;
          backdrop-filter: blur(8px);
        ">
          <div style="
            font-weight: 800;
            font-size: 12px;
            line-height: 1.15;
            color: ${cor};
            white-space: normal;
            overflow-wrap: anywhere;
          ">
            ${escapeHtml(nome)}
          </div>

          <div style="
            margin-top: 3px;
            font-size: 11px;
            line-height: 1.1;
            font-weight: 700;
            color: #475569;
          ">
            ${escapeHtml(hectares)}
          </div>

          ${
            tipo !== 'pasto'
              ? `<div style="
                  margin-top: 3px;
                  font-size: 9px;
                  font-weight: 800;
                  text-transform: uppercase;
                  letter-spacing: .06em;
                  color: #64748b;
                ">${escapeHtml(tipo)}</div>`
              : ''
          }
        </div>
      `,
      iconSize: [120, 54],
      iconAnchor: [60, 27],
    })
  }, [feature, index])

  if (!center) return null

  return (
    <Marker
      position={center}
      icon={icon}
      interactive={false}
      keyboard={false}
    />
  )
}