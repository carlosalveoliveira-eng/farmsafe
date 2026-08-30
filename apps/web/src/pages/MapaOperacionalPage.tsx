import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  GeoJSON,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L, { type LeafletEvent } from 'leaflet'
import {
  AlertTriangle,
  Beef,
  Box,
  Droplets,
  Edit3,
  Eye,
  EyeOff,
  Layers,
  MapPin,
  RefreshCw,
  Route,
  Satellite,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'

import {
  supabase,
  type Abastecimento,
  type Fazenda,
  type Lote,
} from '../services/supabase'
import StatusBadge from '../components/ui/StatusBadge'
import type { FarmMap, GeoJsonFeatureCollection, MapArea } from '../types/map'
import {
  getActiveFarmMap,
  loadFarmMapGeoJson,
} from '../services/map/MapService'
import { listMapAreas } from '../services/map/MapAreaService'
import {
  clearCochoMapPosition,
  createAbastecimentoFromMap,
  listOperationalCochos,
  listOperationalLotes,
  moveLoteToArea,
  updateCochoQuickInfo,
  updateCochoMapPosition,
  type CochoMapa,
} from '../services/map/OperationalMapService'
import {
  calcularCentroFeature,
  formatarHectares,
} from '../features/mapa/mapGeometry'
import MapPastoLabel from '../features/mapa/MapPastoLabel'
import { findAreaContainingPoint } from '../features/mapa/mapSpatial'
import { getAreaStyle, getCorArea } from '../features/mapa/mapTheme'

type Periodo = 'hoje' | '7d' | '30d' | 'todos'
type StatusFiltro = 'todos' | 'ok' | 'atencao' | 'atrasado' | 'sem_registro'
type PainelAtivo = 'cochos' | 'lotes' | 'rota'
type BaseMapa = 'satelite' | 'osm'

type StatusCocho = {
  id: string
  status_operacional: 'ok' | 'atencao' | 'atrasado' | 'sem_registro'
}

type PontoMapa = Abastecimento & {
  lat: number
  lng: number
}

const EMPTY_GEOJSON: GeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}

delete (L.Icon.Default.prototype as any)._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

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

function FitOperationalBounds({
  centro,
  geojson,
}: {
  centro: [number, number]
  geojson: GeoJsonFeatureCollection
}) {
  const map = useMap()

  useEffect(() => {
    map.setMinZoom(10)
    map.setMaxZoom(17)

    const layer = geojson.features.length ? L.geoJSON(geojson as any) : null
    const bounds = layer?.getBounds()

    if (bounds?.isValid()) {
      map.fitBounds(bounds, {
        padding: [56, 56],
        maxZoom: 15,
      })
      return
    }

    map.setView(centro, 14)
  }, [centro, geojson, map])

  return null
}

function ZoomControls() {
  const map = useMap()

  return (
    <div className="absolute left-4 top-20 z-[1200] flex flex-col overflow-hidden rounded-lg border border-white/20 bg-white/95 shadow-xl">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="h-10 w-10 text-lg font-bold text-ink-primary hover:bg-green/10"
      >
        +
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="h-10 w-10 border-t border-border text-lg font-bold text-ink-primary hover:bg-green/10"
      >
        -
      </button>
    </div>
  )
}

function ClickToPlaceItem({
  enabled,
  onPlace,
}: {
  enabled: boolean
  onPlace: (point: [number, number]) => void
}) {
  useMapEvents({
    click(event) {
      if (!enabled) return
      onPlace([event.latlng.lat, event.latlng.lng])
    },
  })

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

function statusBadge(status: StatusCocho['status_operacional']) {
  if (status === 'ok') return 'ok'
  if (status === 'atencao' || status === 'sem_registro') return 'warn'
  return 'err'
}

function statusColor(status: StatusCocho['status_operacional']) {
  if (status === 'ok') return '#22c55e'
  if (status === 'atrasado') return '#ef4444'
  return '#f59e0b'
}

function areaFeature(area: MapArea) {
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

export default function MapaOperacionalPage() {
  const [periodo, setPeriodo] = useState<Periodo>('7d')
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('todos')
  const [painelAtivo, setPainelAtivo] = useState<PainelAtivo>('cochos')
  const [painelAberto, setPainelAberto] = useState(true)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [fazendas, setFazendas] = useState<Fazenda[]>([])
  const [fazendaSelecionadaId, setFazendaSelecionadaId] = useState('')
  const [fazendaAtual, setFazendaAtual] = useState<Fazenda | null>(null)
  const [mapaFazenda, setMapaFazenda] = useState<FarmMap | null>(null)
  const [geojsonFazenda, setGeojsonFazenda] =
    useState<GeoJsonFeatureCollection>(EMPTY_GEOJSON)
  const [areas, setAreas] = useState<MapArea[]>([])
  const [cochos, setCochos] = useState<CochoMapa[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [registros, setRegistros] = useState<Abastecimento[]>([])
  const [statusCochos, setStatusCochos] = useState<StatusCocho[]>([])
  const [cochoParaPosicionar, setCochoParaPosicionar] = useState<string | null>(
    null
  )
  const [loteParaPosicionar, setLoteParaPosicionar] = useState<string | null>(
    null
  )
  const [showAreas, setShowAreas] = useState(true)
  const [showLabels, setShowLabels] = useState(false)
  const [showCochos, setShowCochos] = useState(true)
  const [showLotes, setShowLotes] = useState(true)
  const [showRota, setShowRota] = useState(false)
  const [baseMapa, setBaseMapa] = useState<BaseMapa>('satelite')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fazendaCentro = useMemo<[number, number]>(() => {
    if (fazendaAtual?.latitude && fazendaAtual?.longitude) {
      return [Number(fazendaAtual.latitude), Number(fazendaAtual.longitude)]
    }

    return [-15.0725, -57.1811]
  }, [fazendaAtual])

  const areasGeojson = useMemo<GeoJsonFeatureCollection>(() => {
    return {
      type: 'FeatureCollection',
      features: areas.map(areaFeature),
    }
  }, [areas])

  const pontos = useMemo<PontoMapa[]>(() => {
    return registros
      .filter((registro) => registro.latitude && registro.longitude)
      .map((registro) => ({
        ...registro,
        lat: Number(registro.latitude),
        lng: Number(registro.longitude),
      }))
  }, [registros])

  const rota = pontos.map((ponto) => [ponto.lat, ponto.lng] as [number, number])

  const areasPorId = useMemo(() => {
    return new Map(areas.map((area) => [area.id, area]))
  }, [areas])

  const lotesPorArea = useMemo(() => {
    const map = new Map<string, Lote[]>()

    lotes.forEach((lote) => {
      if (!lote.map_area_id) return
      const current = map.get(lote.map_area_id) ?? []
      current.push(lote)
      map.set(lote.map_area_id, current)
    })

    return map
  }, [lotes])

  function getStatusCocho(cochoId: string): StatusCocho['status_operacional'] {
    return (
      statusCochos.find((status) => status.id === cochoId)
        ?.status_operacional ?? 'sem_registro'
    )
  }

  function cancelarPosicionamento() {
    setCochoParaPosicionar(null)
    setLoteParaPosicionar(null)
  }

  async function load() {
    setLoading(true)
    setErrorMessage(null)

    try {
      const { data: fazendasData } = await supabase
        .from('fazendas')
        .select('*')
        .eq('ativo', true)
        .order('nome')

      const fazendasList = (fazendasData as Fazenda[]) ?? []
      const selectedId = fazendaSelecionadaId || fazendasList[0]?.id || ''
      const fazenda =
        fazendasList.find((item) => item.id === selectedId) ?? null

      setFazendas(fazendasList)
      setFazendaAtual(fazenda)

      if (!fazendaSelecionadaId && selectedId) {
        setFazendaSelecionadaId(selectedId)
      }

      if (!fazenda?.empresa_id) {
        setMapaFazenda(null)
        setGeojsonFazenda(EMPTY_GEOJSON)
        setAreas([])
        setCochos([])
        setLotes([])
        setRegistros([])
        return
      }

      const mapaAtivo = await getActiveFarmMap({
        empresaId: fazenda.empresa_id,
        fazendaId: fazenda.id,
      })

      setMapaFazenda(mapaAtivo)

      if (!mapaAtivo) {
        setGeojsonFazenda(EMPTY_GEOJSON)
        setAreas([])
        setCochos([])
        setLotes([])
        setRegistros([])
        return
      }

      let abastecimentosQuery = supabase
        .from('abastecimentos')
        .select(
          '*, cocho:cochos(nome,codigo_qr), lote:lotes(nome), dispositivo:dispositivos(nome,tratador_nome)'
        )
        .eq('fazenda_id', fazenda.id)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('registrado_em', { ascending: true })

      const inicio = getInicioPeriodo(periodo)

      if (inicio) abastecimentosQuery = abastecimentosQuery.gte('registrado_em', inicio)

      const [
        geojson,
        areasData,
        cochosData,
        lotesData,
        { data: registrosData, error: registrosError },
        { data: statusData },
      ] = await Promise.all([
        loadFarmMapGeoJson(mapaAtivo),
        listMapAreas({
          mapId: mapaAtivo.id,
          empresaId: fazenda.empresa_id,
          fazendaId: fazenda.id,
        }),
        listOperationalCochos(fazenda.id),
        listOperationalLotes(fazenda.id),
        abastecimentosQuery,
        supabase
          .from('vw_status_cochos')
          .select('id,status_operacional')
          .eq('ativo', true),
      ])

      if (registrosError) throw registrosError

      setGeojsonFazenda(geojson)
      setAreas(areasData)
      setCochos(cochosData)
      setLotes(lotesData)
      setRegistros((registrosData as Abastecimento[]) ?? [])
      setStatusCochos((statusData as StatusCocho[]) ?? [])
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel carregar o mapa operacional.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [periodo, fazendaSelecionadaId])

  useEffect(() => {
    if (!cochoParaPosicionar && !loteParaPosicionar) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') cancelarPosicionamento()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cochoParaPosicionar, loteParaPosicionar])

  async function posicionarCocho(cochoId: string, point: [number, number]) {
    const area = findAreaContainingPoint(point, areas)

    setSavingId(cochoId)

    try {
      await updateCochoMapPosition({
        cochoId,
        latitude: point[0],
        longitude: point[1],
        area,
      })

      setCochos((atuais) =>
        atuais.map((cocho) =>
          cocho.id === cochoId
            ? {
                ...cocho,
                latitude: point[0],
                longitude: point[1],
                map_area_id: area?.id ?? null,
              }
            : cocho
        )
      )
      setCochoParaPosicionar(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Falha ao posicionar cocho.')
    } finally {
      setSavingId(null)
    }
  }

  async function retirarPinCocho(cocho: CochoMapa) {
    if (!window.confirm(`Retirar o pin do cocho "${cocho.nome}" do mapa?`)) {
      return
    }

    setSavingId(cocho.id)

    try {
      await clearCochoMapPosition(cocho.id)

      setCochos((atuais) =>
        atuais.map((item) =>
          item.id === cocho.id
            ? { ...item, latitude: null, longitude: null, map_area_id: null }
            : item
        )
      )
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Falha ao retirar pin.')
    } finally {
      setSavingId(null)
    }
  }

  async function editarCochoRapido(cocho: CochoMapa) {
    const nome = window.prompt('Nome do cocho', cocho.nome)

    if (nome === null) return
    if (!nome.trim()) {
      alert('Informe o nome do cocho.')
      return
    }

    const tipoSal = window.prompt(
      'Tipo de sal/abastecimento',
      cocho.tipo_sal ?? ''
    )

    if (tipoSal === null) return

    const capacidadeTexto = window.prompt(
      'Capacidade em kg',
      cocho.capacidade_kg === null || cocho.capacidade_kg === undefined
        ? ''
        : String(cocho.capacidade_kg)
    )

    if (capacidadeTexto === null) return

    const capacidadeKg =
      capacidadeTexto.trim() === '' ? null : Number(capacidadeTexto)

    if (
      capacidadeKg !== null &&
      (!Number.isFinite(capacidadeKg) || capacidadeKg < 0)
    ) {
      alert('Informe uma capacidade valida.')
      return
    }

    setSavingId(cocho.id)

    try {
      await updateCochoQuickInfo({
        cochoId: cocho.id,
        nome,
        tipoSal: tipoSal.trim() || null,
        capacidadeKg,
      })

      setCochos((atuais) =>
        atuais.map((item) =>
          item.id === cocho.id
            ? {
                ...item,
                nome: nome.trim(),
                tipo_sal: tipoSal.trim() || null,
                capacidade_kg: capacidadeKg,
              }
            : item
        )
      )
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Falha ao editar cocho.')
    } finally {
      setSavingId(null)
    }
  }

  async function lancarAbastecimentoCocho(cocho: CochoMapa) {
    const quantidadeTexto = window.prompt('Quantidade abastecida em kg', '')

    if (quantidadeTexto === null) return

    const quantidadeKg = Number(quantidadeTexto.replace(',', '.'))

    if (!Number.isFinite(quantidadeKg) || quantidadeKg <= 0) {
      alert('Informe uma quantidade valida.')
      return
    }

    const tipoAbastecimento = window.prompt(
      'Tipo de abastecimento',
      cocho.tipo_sal ?? 'sal_mineral'
    )

    if (tipoAbastecimento === null) return

    const observacao = window.prompt(
      'Observacao opcional',
      'Lancado pelo mapa operacional.'
    )

    if (observacao === null) return

    setSavingId(cocho.id)

    try {
      await createAbastecimentoFromMap({
        cocho,
        quantidadeKg,
        tipoAbastecimento: tipoAbastecimento.trim() || 'sal_mineral',
        observacao: observacao.trim() || null,
      })

      await load()
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Falha ao lancar abastecimento.'
      )
    } finally {
      setSavingId(null)
    }
  }

  async function moverLote(lote: Lote, point: [number, number]) {
    const destino = findAreaContainingPoint(point, areas, ['pasto', 'retiro'])

    if (!destino) {
      alert('Solte o lote dentro de um pasto ou retiro cadastrado no KMZ.')
      setLoteParaPosicionar(null)
      await load()
      return
    }

    if (destino.id === lote.map_area_id) {
      setLoteParaPosicionar(null)
      return
    }

    let quantidade: number | null = lote.quantidade_animais ?? null

    if ((lote.quantidade_animais ?? 0) > 1) {
      const resposta = window.prompt(
        `Mover quantas cabecas do lote "${lote.nome}"?`,
        String(lote.quantidade_animais)
      )

      if (resposta === null) {
        setLoteParaPosicionar(null)
        await load()
        return
      }

      quantidade = Number(resposta)

      if (
        !Number.isInteger(quantidade) ||
        quantidade <= 0 ||
        quantidade > (lote.quantidade_animais ?? 0)
      ) {
        alert('Informe uma quantidade inteira valida.')
        setLoteParaPosicionar(null)
        await load()
        return
      }
    }

    setSavingId(lote.id)

    try {
      await moveLoteToArea({
        lote,
        destino,
        quantidade,
        observacao: `Movido pelo mapa operacional para ${destino.nome}`,
      })

      setLoteParaPosicionar(null)
      await load()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Falha ao mover lote.')
      await load()
    } finally {
      setSavingId(null)
    }
  }

  const cochosVisiveis = useMemo(() => {
    if (statusFiltro === 'todos') return cochos

    return cochos.filter((cocho) => getStatusCocho(cocho.id) === statusFiltro)
  }, [cochos, statusCochos, statusFiltro])

  const cochosComPosicao = cochosVisiveis.filter(
    (cocho) => cocho.latitude && cocho.longitude
  )
  const cochosSemPosicao = cochosVisiveis.filter(
    (cocho) => !cocho.latitude || !cocho.longitude
  )
  const lotesSemPasto = lotes.filter((lote) => !lote.map_area_id)
  const lotesComPasto = lotes.filter((lote) => lote.map_area_id)

  if (!loading && !mapaFazenda) {
    return (
      <div className="relative flex h-full min-h-[620px] items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-xl rounded-xl border border-white/15 bg-white p-6 text-center shadow-2xl">
          <Satellite size={36} className="mx-auto text-green" />
          <h1 className="mt-4 text-xl font-bold text-ink-primary">
            Mapa operacional indisponivel
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Cadastre o KMZ/KML na tela da fazenda para liberar operacao com
            pastos, cochos, lotes e movimentacao de gado no mapa.
          </p>
          <Link to="/fazendas" className="btn-primary mt-5">
            Ir para Fazendas
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full min-h-[680px] overflow-hidden bg-slate-950">
      <MapContainer
        center={fazendaCentro}
        zoom={14}
        minZoom={10}
        maxZoom={17}
        zoomControl={false}
        scrollWheelZoom
        className="h-full w-full"
      >
        <FitOperationalBounds
          centro={fazendaCentro}
          geojson={areas.length > 0 ? areasGeojson : geojsonFazenda}
        />

        {baseMapa === 'satelite' ? (
          <TileLayer
            attribution="Tiles Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={17}
            maxNativeZoom={17}
          />
        ) : (
          <TileLayer
            attribution="OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={17}
            maxNativeZoom={17}
          />
        )}

        {showAreas &&
          areas.length === 0 &&
          geojsonFazenda.features.length > 0 && (
            <GeoJSON
              key={`kmz-fallback-${mapaFazenda?.id ?? 'mapa'}-${geojsonFazenda.features.length}`}
              data={geojsonFazenda as any}
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
            const feature = areaFeature(area)

            return (
              <GeoJSON
                key={`${area.id}-${area.updated_at ?? ''}`}
                data={feature as any}
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
            <MapPastoLabel key={`label-${index}`} feature={feature} index={index} />
          ))}

        {showRota && rota.length > 1 && (
          <Polyline
            positions={rota}
            pathOptions={{ color: '#4ade80', weight: 3, opacity: 0.78 }}
          />
        )}

        {showCochos &&
          cochosComPosicao.map((cocho, index) => {
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
                    void posicionarCocho(cocho.id, [point.lat, point.lng])
                  },
                }}
              >
                <Popup>
                  <div className="min-w-[220px]">
                    <p className="font-semibold text-ink-primary">{cocho.nome}</p>
                    <p className="mt-1 font-mono text-xs text-ink-muted">
                      {cocho.codigo_qr}
                    </p>
                    <div className="my-3">
                      <StatusBadge status={statusBadge(status)}>
                        {status.toUpperCase()}
                      </StatusBadge>
                    </div>
                    <p className="text-xs text-ink-muted">
                      Pasto: {areasPorId.get(cocho.map_area_id ?? '')?.nome ?? 'Nao identificado'}
                    </p>

                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
                      <button
                        type="button"
                        onClick={() => void lancarAbastecimentoCocho(cocho)}
                        className="rounded-md bg-green px-2 py-2 text-xs font-semibold text-white"
                      >
                        Lancar
                      </button>
                      <button
                        type="button"
                        onClick={() => void editarCochoRapido(cocho)}
                        className="rounded-md border border-border px-2 py-2 text-xs font-semibold text-ink-secondary"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void retirarPinCocho(cocho)}
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
          lotesComPasto.map((lote, index) => {
            const area = areasPorId.get(lote.map_area_id ?? '')
            const center = area ? calcularCentroFeature(areaFeature(area)) : null

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
                    void moverLote(lote, [point.lat, point.lng])
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

        <ClickToPlaceItem
          enabled={Boolean(cochoParaPosicionar || loteParaPosicionar)}
          onPlace={(point) => {
            if (cochoParaPosicionar) {
              void posicionarCocho(cochoParaPosicionar, point)
              return
            }

            if (loteParaPosicionar) {
              const lote = lotes.find((item) => item.id === loteParaPosicionar)

              if (lote) {
                void moverLote(lote, point)
              }
            }
          }}
        />

        <ZoomControls />
      </MapContainer>

      <div className="absolute inset-x-4 top-4 z-[1200] flex items-start justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-1.5 rounded-lg border border-white/20 bg-white/95 p-1.5 shadow-xl backdrop-blur">
          <select
            value={fazendaSelecionadaId}
            onChange={(event) => setFazendaSelecionadaId(event.target.value)}
            className="input h-9 w-[160px] min-w-0 truncate py-1.5"
          >
            {fazendas.map((fazenda) => (
              <option key={fazenda.id} value={fazenda.id}>
                {fazenda.nome}
              </option>
            ))}
          </select>

          {(['hoje', '7d', '30d', 'todos'] as Periodo[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPeriodo(item)}
              className={`h-9 rounded-md px-2.5 text-xs font-bold ${
                periodo === item
                  ? 'bg-green text-white'
                  : 'text-ink-secondary hover:bg-green/10'
              }`}
            >
              {item === 'hoje' ? 'Hoje' : item === 'todos' ? 'Tudo' : item}
            </button>
          ))}

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="h-9 rounded-md px-2.5 text-xs font-bold text-ink-secondary hover:bg-green/10 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="pointer-events-auto hidden items-center gap-2 2xl:flex">
          <Metric title="Cochos" value={cochos.length} icon={Box} />
          <Metric title="Lotes" value={lotes.length} icon={Beef} />
          <Metric title="Pastos" value={areas.length} icon={Layers} />
          <Metric title="Alertas" value={cochos.filter((c) => getStatusCocho(c.id) !== 'ok').length} icon={AlertTriangle} />
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-[1200] flex max-w-[calc(100%-2rem)] flex-wrap gap-2 rounded-lg border border-white/20 bg-white/95 p-2 shadow-xl backdrop-blur">
        {[
          { label: 'Pastos', active: showAreas, onClick: () => setShowAreas((v) => !v) },
          { label: 'Rotulos', active: showLabels, onClick: () => setShowLabels((v) => !v) },
          { label: 'Cochos', active: showCochos, onClick: () => setShowCochos((v) => !v) },
          { label: 'Lotes', active: showLotes, onClick: () => setShowLotes((v) => !v) },
          { label: 'Rota', active: showRota, onClick: () => setShowRota((v) => !v) },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className={`h-9 rounded-md px-3 text-xs font-bold ${
              item.active ? 'bg-green/10 text-green' : 'text-ink-muted hover:bg-surface'
            }`}
          >
            {item.active ? <Eye size={13} className="mr-1 inline" /> : <EyeOff size={13} className="mr-1 inline" />}
            {item.label}
          </button>
        ))}

        <div className="h-9 w-px bg-border" />

        <button
          type="button"
          onClick={() => setBaseMapa((value) => (value === 'satelite' ? 'osm' : 'satelite'))}
          className="h-9 rounded-md px-3 text-xs font-bold text-ink-secondary hover:bg-green/10"
        >
          <Satellite size={13} className="mr-1 inline" />
          {baseMapa === 'satelite' ? 'Satelite' : 'Ruas'}
        </button>
      </div>

      {(cochoParaPosicionar || loteParaPosicionar) && (
        <div className="absolute left-1/2 top-20 z-[1210] w-[330px] -translate-x-1/2 rounded-lg border border-green/30 bg-white/95 p-3 text-sm shadow-xl backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-ink-primary">
                Clique no mapa para posicionar.
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {cochoParaPosicionar
                  ? 'Depois disso, o pin do cocho pode ser arrastado para ajuste fino.'
                  : 'Clique dentro do pasto onde o lote esta localizado.'}
              </p>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                cancelarPosicionamento()
              }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-ink-muted hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              Cancelar
            </button>
          </div>
          <p className="mt-2 text-[11px] font-medium text-ink-muted">
            Esc tambem cancela.
          </p>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 z-[1300] flex items-center justify-center bg-slate-950/30 backdrop-blur-[1px]">
          <div className="rounded-lg border border-white/20 bg-white/95 px-4 py-3 text-sm font-semibold text-ink-primary shadow-xl">
            Carregando mapa operacional...
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="absolute left-4 right-4 top-20 z-[1220] rounded-lg border border-red/30 bg-white/95 p-3 text-sm font-semibold text-red shadow-xl">
          {errorMessage}
        </div>
      )}

      {painelAberto ? (
        <aside className="absolute bottom-4 right-4 top-20 z-[1210] flex w-[390px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-white/20 bg-white/95 shadow-2xl backdrop-blur max-lg:left-4 max-lg:w-auto">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-bold text-ink-primary">Operacao</p>
              <p className="text-xs text-ink-muted">
                {mapaFazenda?.nome ?? 'Mapa da fazenda'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPainelAberto(false)}
              className="h-8 w-8 rounded-md text-ink-muted hover:bg-surface hover:text-ink-primary"
            >
              <X size={16} className="mx-auto" />
            </button>
          </div>

          <div className="grid grid-cols-3 border-b border-border bg-surface/70 p-1">
            {[
              { id: 'cochos' as PainelAtivo, label: 'Cochos', icon: Box },
              { id: 'lotes' as PainelAtivo, label: 'Lotes', icon: Beef },
              { id: 'rota' as PainelAtivo, label: 'Rota', icon: Route },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPainelAtivo(id)}
                className={`rounded-md px-2 py-2 text-[11px] font-bold ${
                  painelAtivo === id
                    ? 'bg-white text-green shadow-sm'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                <Icon size={14} className="mx-auto mb-1" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {painelAtivo === 'cochos' && (
              <div className="space-y-3">
                <select
                  value={statusFiltro}
                  onChange={(event) => setStatusFiltro(event.target.value as StatusFiltro)}
                  className="input w-full"
                >
                  <option value="todos">Todos os status</option>
                  <option value="ok">OK</option>
                  <option value="atencao">Atencao</option>
                  <option value="atrasado">Atrasado</option>
                  <option value="sem_registro">Sem registro</option>
                </select>

                {cochosSemPosicao.length > 0 && (
                  <PanelBlock title="Cochos sem posicao">
                    {cochosSemPosicao.map((cocho) => (
                      <div key={cocho.id} className="rounded-lg border border-border bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink-primary">
                              {cocho.nome}
                            </p>
                            <p className="mt-1 font-mono text-xs text-ink-muted">
                              {cocho.codigo_qr}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCochoParaPosicionar(cocho.id)
                              setLoteParaPosicionar(null)
                            }}
                            className="btn-primary shrink-0 px-3 py-2 text-xs"
                          >
                            <MapPin size={13} />
                            Colocar
                          </button>
                        </div>
                      </div>
                    ))}
                  </PanelBlock>
                )}

                <PanelBlock title="Cochos no mapa">
                  {cochosComPosicao.length === 0 ? (
                    <p className="py-4 text-center text-sm text-ink-muted">
                      Nenhum cocho posicionado.
                    </p>
                  ) : (
                    cochosComPosicao.map((cocho) => {
                      const status = getStatusCocho(cocho.id)

                      return (
                        <div key={cocho.id} className="rounded-lg border border-border bg-white p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink-primary">
                                {cocho.nome}
                              </p>
                              <p className="mt-1 text-xs text-ink-muted">
                                {areasPorId.get(cocho.map_area_id ?? '')?.nome ?? 'Sem pasto'}
                              </p>
                            </div>
                            <StatusBadge status={statusBadge(status)}>
                              {status.toUpperCase()}
                            </StatusBadge>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => void lancarAbastecimentoCocho(cocho)}
                              className="btn-primary justify-center px-2 py-2 text-xs"
                            >
                              <Droplets size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void editarCochoRapido(cocho)}
                              className="btn-ghost justify-center border border-border px-2 py-2 text-xs"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void retirarPinCocho(cocho)}
                              className="inline-flex items-center justify-center rounded-lg border border-red/30 px-2 py-2 text-xs font-semibold text-red hover:bg-red/10"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </PanelBlock>
              </div>
            )}

            {painelAtivo === 'lotes' && (
              <div className="space-y-3">
                {lotesSemPasto.length > 0 && (
                  <PanelBlock title="Lotes sem pasto">
                    {lotesSemPasto.map((lote) => (
                      <div key={lote.id} className="rounded-lg border border-border bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink-primary">{lote.nome}</p>
                            <p className="mt-1 text-xs text-ink-muted">
                              {lote.quantidade_animais ?? 0} cabecas
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setLoteParaPosicionar(lote.id)
                              setCochoParaPosicionar(null)
                            }}
                            className="btn-primary shrink-0 px-3 py-2 text-xs"
                          >
                            <MapPin size={13} />
                            Colocar
                          </button>
                        </div>
                      </div>
                    ))}
                  </PanelBlock>
                )}

                <PanelBlock title="Pastos e lotes">
                  {areas
                    .filter((area) => area.tipo === 'pasto' || area.tipo === 'retiro')
                    .map((area) => {
                      const areaLotes = lotesPorArea.get(area.id) ?? []

                      return (
                        <div key={area.id} className="rounded-lg border border-border bg-white p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-ink-primary">{area.nome}</p>
                              <p className="mt-1 text-xs text-ink-muted">
                                {formatarHectares(Number(area.area_hectares ?? 0))}
                              </p>
                            </div>
                            <span
                              className="h-4 w-4 rounded-full border border-white shadow-sm"
                              style={{ background: area.cor || getCorArea(area.geojson) }}
                            />
                          </div>

                          {areaLotes.length === 0 ? (
                            <p className="mt-3 text-xs text-ink-muted">Sem lote neste pasto.</p>
                          ) : (
                            <div className="mt-3 space-y-2">
                              {areaLotes.map((lote) => (
                                <div key={lote.id} className="rounded-md bg-surface px-3 py-2">
                                  <p className="text-xs font-semibold text-ink-primary">{lote.nome}</p>
                                  <p className="text-[11px] text-ink-muted">
                                    {lote.quantidade_animais ?? 0} cabecas
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </PanelBlock>
              </div>
            )}

            {painelAtivo === 'rota' && (
              <div className="space-y-2">
                {pontos.length === 0 ? (
                  <p className="py-8 text-center text-sm text-ink-muted">
                    Nenhum abastecimento com GPS neste periodo.
                  </p>
                ) : (
                  pontos.map((ponto, index) => (
                    <div key={ponto.id} className="rounded-lg border border-border bg-white p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-green/10 font-mono text-xs font-semibold text-green">
                          {index + 1}
                        </span>
                        <span className="font-mono text-xs text-ink-muted">
                          {fmtDateTime(ponto.registrado_em)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-ink-primary">
                        {ponto.cocho?.nome ?? 'Cocho nao identificado'}
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {ponto.quantidade_kg ?? 0} kg -{' '}
                        {ponto.dispositivo?.tratador_nome ??
                          ponto.dispositivo?.nome ??
                          'Sem tratador'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>
      ) : (
        <button
          type="button"
          onClick={() => setPainelAberto(true)}
          className="absolute right-4 top-28 z-[1210] flex h-11 w-11 items-center justify-center rounded-lg border border-white/20 bg-white/95 text-ink-primary shadow-xl backdrop-blur hover:bg-green/10"
        >
          <SlidersHorizontal size={18} />
        </button>
      )}

      {savingId && (
        <div className="absolute bottom-4 right-4 z-[1220] rounded-lg border border-white/20 bg-white/95 px-4 py-3 text-sm font-semibold text-ink-primary shadow-xl">
          Salvando operacao...
        </div>
      )}
    </div>
  )
}

function Metric({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: number | string
  icon: typeof Box
}) {
  return (
    <div className="min-w-[92px] rounded-lg border border-white/15 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
      <div className="flex items-center gap-2">
        <Icon size={13} className="text-green" />
        <span className="text-[11px] font-medium text-ink-muted">{title}</span>
      </div>
      <p className="mt-1 font-mono text-lg font-bold text-ink-primary">
        {value}
      </p>
    </div>
  )
}

function PanelBlock({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold text-ink-primary">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
