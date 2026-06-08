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
import { RefreshCw, MapPin, Zap, Clock, Navigation, AlertTriangle } from 'lucide-react'

import {
  supabase,
  type Abastecimento,
  type Fazenda,
} from '../services/supabase'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import SectionCard from '../components/ui/SectionCard'
import StatusBadge from '../components/ui/StatusBadge'

type Periodo = 'hoje' | '7d' | '30d' | 'todos'

type PontoMapa = Abastecimento & {
  lat: number
  lng: number
}

type StatusCocho = {
  id: string
  status_operacional: 'ok' | 'atencao' | 'atrasado' | 'sem_registro'
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

function criarMarcadorPorStatus(
  tipo: string,
  numero: number,
  status: 'ok' | 'atencao' | 'atrasado' | 'sem_registro',
  foraDaArea = false
) {
  let cor =
    status === 'atrasado'
      ? '#ef4444'
      : status === 'atencao' || status === 'sem_registro'
      ? '#f59e0b'
      : tipo === 'racao'
      ? '#2563eb'
      : '#22c55e'

  if (foraDaArea) {
    cor = '#7f1d1d'
  }

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 999px;
        background: ${cor};
        border: 3px solid #f3f4ec;
        box-shadow: 0 0 0 6px rgba(0,0,0,0.25);
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
  const [statusCochos, setStatusCochos] = useState<StatusCocho[]>([])

  function getStatusCocho(cochoId: string) {
    return (
      statusCochos.find((s) => s.id === cochoId)?.status_operacional ?? 'ok'
    )
  }

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

    const { data: statusData } = await supabase
      .from('vw_status_cochos')
      .select('id,status_operacional')
      .eq('ativo', true)

    setStatusCochos((statusData as StatusCocho[]) ?? [])

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

  function pontoForaDaFazenda(ponto: PontoMapa) {
    if (!fazendaCentro) return false

    const distancia = calcularDistanciaMetros(
      fazendaCentro[0],
      fazendaCentro[1],
      ponto.lat,
      ponto.lng
    )

    return distancia > 3000
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
    <div className="space-y-6">
      <PageHeader
        title="Mapa Operacional"
        description="Monitoramento operacional e rastreabilidade em tempo real"
        action={
          <button onClick={load} disabled={loading} className="btn-ghost">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total de Pontos GPS"
          value={pontos.length}
          icon={Navigation}
          color="bg-blue/10 text-blue"
        />
        <StatCard
          title="Pontos Operacionais"
          value={pontos.filter((p) => getStatusCocho(p.cocho_id) === 'ok').length}
          icon={Zap}
          color="bg-green/10 text-green"
        />
        <StatCard
          title="Em Atenção"
          value={pontos.filter((p) => getStatusCocho(p.cocho_id) === 'atencao').length}
          icon={Clock}
          color="bg-amber/10 text-amber"
        />
        <StatCard
          title="Atrasados"
          value={pontos.filter((p) => getStatusCocho(p.cocho_id) === 'atrasado').length}
          icon={AlertTriangle}
          color="bg-red/10 text-red"
        />
        <StatCard
          title="Fora da Área"
          value={pontos.filter((p) => pontoForaDaFazenda(p)).length}
          icon={MapPin}
          color="bg-rose/10 text-rose"
        />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { value: 'hoje', label: 'Hoje' },
            { value: '7d', label: '7 dias' },
            { value: '30d', label: '30 dias' },
            { value: 'todos', label: 'Todos' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setPeriodo(item.value as Periodo)}
              className={`px-4 py-2 text-sm rounded-lg transition-all font-medium ${
                periodo === item.value
                  ? 'bg-green/10 text-green border border-green/20'
                  : 'bg-surface text-ink-muted border border-border hover:bg-surface/80'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-sm text-ink-muted font-mono">
          {pontos.length} ponto{pontos.length !== 1 ? 's' : ''} com GPS
        </span>
      </div>

      <SectionCard title="Legenda da Mapa">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { color: '#22c55e', label: 'OK' },
            { color: '#f59e0b', label: 'Atenção' },
            { color: '#ef4444', label: 'Atrasado' },
            { color: '#7f1d1d', label: 'Fora da Área' },
            { color: '#2563eb', label: 'Ração' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-ink-muted">{item.label}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <SectionCard title="Rastreabilidade em Tempo Real">
          {loading ? (
            <div className="h-[600px] flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-green/20 border-t-green rounded-full animate-spin" />
            </div>
          ) : (
            <MapContainer
              center={centro}
              zoom={16}
              scrollWheelZoom
              className="w-full h-[600px] rounded-lg overflow-hidden"
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
                  icon={criarMarcadorPorStatus(
                    ponto.tipo_abastecimento,
                    index + 1,
                    getStatusCocho(ponto.cocho_id),
                    pontoForaDaFazenda(ponto)
                  )}
                >
                  <Popup>
                    <div className="min-w-[240px]">
                      <div className="mb-3">
                        <h3 className="font-semibold text-ink-primary">
                          #{index + 1} — {ponto.cocho?.nome ?? 'Cocho'}
                        </h3>
                        <p className="text-xs text-ink-muted font-mono mt-1">
                          {ponto.cocho?.codigo_qr ?? ponto.cocho_id}
                        </p>
                      </div>

                      <div className="space-y-2 text-sm mb-3">
                        <div className="flex justify-between">
                          <span className="text-ink-muted">Quantidade:</span>
                          <span className="font-semibold text-ink-primary">
                            {ponto.quantidade_kg ?? 0} kg
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-ink-muted">Tratador:</span>
                          <span className="font-semibold text-ink-primary">
                            {ponto.dispositivo?.tratador_nome ??
                              ponto.dispositivo?.nome ??
                              '—'}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-ink-muted">Horário:</span>
                          <span className="font-semibold text-ink-primary font-mono text-xs">
                            {fmtDateTime(ponto.registrado_em)}
                          </span>
                        </div>

                        {calcularTempoAnterior(index) && (
                          <div className="flex justify-between">
                            <span className="text-ink-muted">Tempo anterior:</span>
                            <span className="font-semibold text-ink-primary">
                              {calcularTempoAnterior(index)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-border">
                        <StatusBadge status={
                          getStatusCocho(ponto.cocho_id) === 'ok'
                            ? 'ok'
                            : getStatusCocho(ponto.cocho_id) === 'atencao'
                            ? 'warn'
                            : 'err'
                        }>
                          {getStatusCocho(ponto.cocho_id).toUpperCase()}
                        </StatusBadge>

                        {pontoForaDaFazenda(ponto) && (
                          <div className="mt-2 p-2 bg-red/10 rounded text-xs text-red font-semibold">
                            ⚠ Fora da área operacional
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-ink-muted font-mono mt-3">
                        {ponto.lat.toFixed(6)}, {ponto.lng.toFixed(6)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </SectionCard>

        <div className="flex flex-col gap-6">
          <SectionCard title="Linha da Rota">
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {pontos.length === 0 ? (
                <p className="text-sm text-ink-muted py-8 text-center">
                  Nenhum registro com GPS neste período.
                </p>
              ) : (
                pontos.map((ponto, index) => (
                  <div
                    key={ponto.id}
                    className="border border-border rounded-lg p-3 bg-white hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="w-7 h-7 rounded-md bg-green/10 text-green flex items-center justify-center text-xs font-mono font-semibold flex-shrink-0">
                        {index + 1}
                      </span>

                      <StatusBadge status={
                        getStatusCocho(ponto.cocho_id) === 'ok'
                          ? 'ok'
                          : getStatusCocho(ponto.cocho_id) === 'atencao'
                          ? 'warn'
                          : 'err'
                      }>
                        {getStatusCocho(ponto.cocho_id).toUpperCase()}
                      </StatusBadge>
                    </div>

                    <p className="text-sm font-semibold text-ink-primary">
                      {ponto.cocho?.nome ?? 'Cocho não identificado'}
                    </p>

                    <p className="text-xs text-ink-muted font-mono mt-1">
                      {ponto.cocho?.codigo_qr ?? ponto.cocho_id}
                    </p>

                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-ink-muted">
                        <span className="font-medium">Quantidade:</span> {ponto.quantidade_kg ?? 0} kg
                      </p>

                      <p className="text-xs text-ink-muted">
                        <span className="font-medium">Tratador:</span> {
                          ponto.dispositivo?.tratador_nome ??
                          ponto.dispositivo?.nome ??
                          'Sem tratador'
                        }
                      </p>

                      <p className="text-xs text-ink-muted font-mono">
                        <span className="font-medium">Horário:</span> {fmtDateTime(ponto.registrado_em)}
                      </p>
                    </div>

                    {calcularTempoAnterior(index) && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-xs text-green font-medium">
                          ↓ {calcularTempoAnterior(index)}
                        </p>

                        {calcularDistanciaAnterior(index) && (
                          <p className="text-xs text-blue-600 font-medium mt-1">
                            ↗ {calcularDistanciaAnterior(index)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}