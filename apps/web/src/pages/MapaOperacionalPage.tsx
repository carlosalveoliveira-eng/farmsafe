import { useEffect, useMemo, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { RefreshCw, MapPin } from 'lucide-react'

import {
  supabase,
  type Abastecimento,
  type Fazenda,
} from '../services/supabase'
import PageHeader from '../components/PageHeader'

type Periodo = 'hoje' | '7d' | '30d' | 'todos'

type PontoMapa = Abastecimento & {
  lat: number
  lng: number
}

delete (L.Icon.Default.prototype as any)._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function criarMarcadorPorTipo(tipo: string, numero: number) {
  const cor =
    tipo === 'sal_mineral'
      ? '#2f7d46'
      : tipo === 'sal_proteinado'
      ? '#d69e2e'
      : tipo === 'racao'
      ? '#2563eb'
      : tipo === 'sal_comum'
      ? '#94a3b8'
      : '#e53e3e'

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 999px;
        background: ${cor};
        border: 3px solid #f3f4ec;
        box-shadow: 0 0 0 6px rgba(47,125,70,0.22);
        color: white;
        font-weight: 700;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Arial, sans-serif;
      ">
        ${numero}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  })
}

function AtualizarCentro({
  centro,
  zoom,
}: {
  centro: [number, number]
  zoom: number
}) {
  const map = useMap()

  useEffect(() => {
    map.setView(centro, zoom)
  }, [centro, zoom, map])

  return null
}

function getInicioPeriodo(periodo: Periodo) {
  if (periodo === 'todos') return null

  const data = new Date()

  if (periodo === 'hoje') {
    data.setHours(0, 0, 0, 0)
  }

  if (periodo === '7d') {
    data.setDate(data.getDate() - 7)
    data.setHours(0, 0, 0, 0)
  }

  if (periodo === '30d') {
    data.setDate(data.getDate() - 30)
    data.setHours(0, 0, 0, 0)
  }

  return data.toISOString()
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MapaOperacionalPage() {
  const [periodo, setPeriodo] = useState<Periodo>('7d')
  const [loading, setLoading] = useState(true)
  const [registros, setRegistros] = useState<Abastecimento[]>([])
  const [fazendaCentro, setFazendaCentro] =
    useState<[number, number] | null>(null)

  async function load() {
    setLoading(true)

    let q = supabase
      .from('abastecimentos')
      .select(
        '*, cocho:cochos(nome,codigo_qr), lote:lotes(nome), dispositivo:dispositivos(nome,tratador_nome)'
      )
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('registrado_em', { ascending: true })

    const inicio = getInicioPeriodo(periodo)

    if (inicio) {
      q = q.gte('registrado_em', inicio)
    }

    const [{ data, error }, { data: fazendasData }] =
      await Promise.all([
        q,
        supabase
          .from('fazendas')
          .select('*')
          .eq('ativo', true)
          .limit(1),
      ])

    if (error) {
      console.error(error)
      setRegistros([])
    } else {
      setRegistros((data as Abastecimento[]) ?? [])
    }

    const fazenda = (fazendasData as Fazenda[] | null)?.[0]

    if (fazenda?.latitude && fazenda?.longitude) {
      setFazendaCentro([
        Number(fazenda.latitude),
        Number(fazenda.longitude),
      ])
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [periodo])

  const pontos = useMemo<PontoMapa[]>(() => {
    return registros
      .filter((r) => r.latitude && r.longitude)
      .map((r) => ({
        ...r,
        lat: Number(r.latitude),
        lng: Number(r.longitude),
      }))
  }, [registros])

  const centro = useMemo<[number, number]>(() => {
    if (fazendaCentro) return fazendaCentro

    if (pontos.length > 0) {
      return [pontos[0].lat, pontos[0].lng]
    }

    return [-15.0725, -57.1811]
  }, [pontos, fazendaCentro])

  const rota = pontos.map((p) => [p.lat, p.lng] as [number, number])

  function calcularTempoAnterior(index: number) {
  if (index === 0) return null

  const atual = pontos[index]
  const anterior = pontos[index - 1]

  const diffMs =
    new Date(atual.registrado_em).getTime() -
    new Date(anterior.registrado_em).getTime()

  const minutos = Math.round(diffMs / 60000)

  if (minutos < 1) return 'menos de 1 min'
  if (minutos < 60) return `${minutos} min`

  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60

  return `${horas}h ${resto}min`
}

function calcularDistanciaMetros(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371e3

  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180

  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) *
      Math.cos(φ2) *
      Math.sin(Δλ / 2) *
      Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

function calcularDistanciaAnterior(index: number) {
  if (index === 0) return null

  const atual = pontos[index]
  const anterior = pontos[index - 1]

  const metros = calcularDistanciaMetros(
    anterior.lat,
    anterior.lng,
    atual.lat,
    atual.lng
  )

  if (metros < 1000) {
    return `${Math.round(metros)} m`
  }

  return `${(metros / 1000).toFixed(2)} km`
}

  return (
    <div>
      <PageHeader
        title="Mapa operacional"
        subtitle="Auditoria visual dos abastecimentos com GPS"
        action={
          <button onClick={load} disabled={loading} className="btn-ghost">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        }
      />

      <div className="flex items-center gap-2 mb-5">
        {[
          { value: 'hoje', label: 'Hoje' },
          { value: '7d', label: '7 dias' },
          { value: '30d', label: '30 dias' },
          { value: 'todos', label: 'Todos' },
        ].map((item) => (
          <button
            key={item.value}
            onClick={() => setPeriodo(item.value as Periodo)}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              periodo === item.value
                ? 'bg-green/10 text-green border-green/20'
                : 'bg-surface text-ink-muted border-border hover:text-ink-primary'
            }`}
          >
            {item.label}
          </button>
        ))}

        <span className="ml-auto text-xs text-ink-muted font-mono">
          {pontos.length} ponto{pontos.length !== 1 ? 's' : ''} com GPS
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-5 text-xs text-ink-muted">
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="w-3 h-3 rounded-full bg-green" />
            Sal mineral
          </span>

          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="w-3 h-3 rounded-full bg-warn" />
            Sal proteinado
          </span>

          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="w-3 h-3 rounded-full bg-blue-600" />
            Ração
          </span>

          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="w-3 h-3 rounded-full bg-slate-400" />
            Sal comum
          </span>
        </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div className="fs-card overflow-hidden h-[620px]">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
            </div>
          ) : (
            <MapContainer
              center={centro}
              zoom={16}
              scrollWheelZoom
              className="w-full h-full"
            >
              <AtualizarCentro centro={centro} zoom={16} />

              <TileLayer
                attribution="Tiles © Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />

              {rota.length > 1 && (
                <Polyline
                  positions={rota}
                  pathOptions={{
                    color: '#4ade80',
                    weight: 3,
                    opacity: 0.75,
                  }}
                />
              )}

              {pontos.map((ponto, index) => (
                <Marker
                  key={ponto.id}
                  position={[ponto.lat, ponto.lng]}
                  icon={criarMarcadorPorTipo(ponto.tipo_abastecimento, index + 1)}
                >
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <strong>
                        #{index + 1} — {ponto.cocho?.nome ?? 'Cocho'}
                      </strong>

                      <br />

                      <span>
                        Código: {ponto.cocho?.codigo_qr ?? ponto.cocho_id}
                      </span>

                      <br />

                      <span>
                        Quantidade: {ponto.quantidade_kg ?? 0} kg
                      </span>

                      <br />

                      <span>
                        Tratador:{' '}
                        {ponto.dispositivo?.tratador_nome ??
                          ponto.dispositivo?.nome ??
                          '—'}
                      </span>

                      <br />

                      <span>
                        Horário: {fmtDateTime(ponto.registrado_em)}
                      </span>
                      <span>
                        Tempo anterior:{' '}
                        {calcularTempoAnterior(index) ?? 'Primeiro ponto'}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        <div className="fs-card p-5 h-[620px] overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={15} className="text-green" />

            <h2 className="text-sm font-semibold text-ink-primary">
              Linha da rota
            </h2>
          </div>

          {pontos.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Nenhum registro com GPS neste período.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {pontos.map((ponto, index) => (
                <div
                  key={ponto.id}
                  className="border border-border bg-surface rounded-lg p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-md bg-green/10 text-green flex items-center justify-center text-xs font-mono">
                      {index + 1}
                    </span>

                    <span className="text-xs text-ink-muted font-mono">
                      {fmtDateTime(ponto.registrado_em)}
                    </span>
                  </div>

                  <p className="text-sm text-ink-primary font-medium mt-3">
                    {ponto.cocho?.nome ?? 'Cocho não identificado'}
                  </p>

                  <p className="text-xs text-ink-muted font-mono mt-1">
                    {ponto.cocho?.codigo_qr ?? ponto.cocho_id}
                  </p>

                  <p className="text-xs text-ink-muted mt-2">
                    {ponto.quantidade_kg ?? 0} kg ·{' '}
                    {ponto.dispositivo?.tratador_nome ??
                      ponto.dispositivo?.nome ??
                      'Sem tratador'}
                  </p>
                  {calcularTempoAnterior(index) && (
                <p className="text-xs text-green mt-2">
                  Tempo desde o ponto anterior: {calcularTempoAnterior(index)}
                  {calcularDistanciaAnterior(index) && (
                  <p className="text-xs text-blue-400 mt-1">
                    Distância do ponto anterior:{' '}
                    {calcularDistanciaAnterior(index)}
                  </p>
                )}
                </p>
              )}

                  <p className="text-[10px] text-ink-muted/70 font-mono mt-2">
                    {ponto.lat.toFixed(6)}, {ponto.lng.toFixed(6)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}