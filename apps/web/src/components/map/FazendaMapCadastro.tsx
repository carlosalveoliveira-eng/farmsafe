import { useEffect, useState } from 'react'
import { Layers, MapPinned } from 'lucide-react'

import type { Fazenda } from '../../services/supabase'
import type { FarmMap, GeoJsonFeatureCollection } from '../../types/map'
import {
  buscarGeoJsonDoMapa,
  buscarMapaAtivoDaFazenda,
} from '../../services/map/maps'
import {
  buildAreaFromFeature,
  createMapArea,
  listMapAreas,
} from '../../services/map/MapAreaService'
import MapUploader from './MapUploader'

type Props = {
  fazenda: Fazenda
}

export default function FazendaMapCadastro({ fazenda }: Props) {
  const [loading, setLoading] = useState(true)
  const [mapa, setMapa] = useState<FarmMap | null>(null)
  const [features, setFeatures] = useState(0)
  const [areas, setAreas] = useState(0)
  const [preparing, setPreparing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!fazenda.empresa_id) {
        setLoading(false)
        return
      }

      setLoading(true)
      setErrorMessage(null)

      try {
        const activeMap = await buscarMapaAtivoDaFazenda({
          empresaId: fazenda.empresa_id,
          fazendaId: fazenda.id,
        })

        if (cancelled) return

        setMapa(activeMap)

        if (!activeMap) {
          setFeatures(0)
          return
        }

        const [geojson, mapAreas] = await Promise.all([
          buscarGeoJsonDoMapa(activeMap),
          listMapAreas({
            mapId: activeMap.id,
            empresaId: fazenda.empresa_id,
            fazendaId: fazenda.id,
          }),
        ])

        if (!cancelled) {
          setFeatures(geojson.features.length)
          setAreas(mapAreas.length)
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Nao foi possivel carregar o KMZ/KML da fazenda.'
          )
          setMapa(null)
          setFeatures(0)
          setAreas(0)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [fazenda.id, fazenda.empresa_id])

  if (!fazenda.empresa_id) return null

  async function prepararAreas(payload: {
    map: FarmMap
    geojson: GeoJsonFeatureCollection
  }) {
    if (areas > 0) return

    setPreparing(true)

    try {
      const criadas = await Promise.all(
        payload.geojson.features.map((feature, index) =>
          createMapArea(
            buildAreaFromFeature({
              mapId: payload.map.id,
              empresaId: fazenda.empresa_id!,
              fazendaId: fazenda.id,
              feature,
              index,
            })
          )
        )
      )

      setAreas(criadas.length)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Mapa salvo, mas nao foi possivel preparar as areas.'
      )
    } finally {
      setPreparing(false)
    }
  }

  async function prepararAreasDoMapaAtual() {
    if (!mapa) return

    try {
      const geojson = await buscarGeoJsonDoMapa(mapa)
      await prepararAreas({ map: mapa, geojson })
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel preparar as areas do KMZ/KML.'
      )
    }
  }

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MapPinned size={16} className="text-green" />
            <p className="text-sm font-semibold text-ink-primary">
              Mapa KMZ/KML da fazenda
            </p>
          </div>

          <p className="mt-1 text-xs text-ink-muted">
            Cadastro opcional usado para habilitar o mapa operacional.
          </p>
        </div>

        <Layers size={18} className="text-ink-muted" />
      </div>

      <div className="mt-3 rounded-lg border border-border bg-surface p-3">
        {loading ? (
          <p className="text-sm font-medium text-ink-muted">
            Verificando mapa cadastrado...
          </p>
        ) : errorMessage ? (
          <p className="text-sm font-medium text-red">{errorMessage}</p>
        ) : mapa ? (
          <div>
            <p className="text-sm font-semibold text-ink-primary">
              {mapa.nome}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {features} feicao{features !== 1 ? 'oes' : ''} carregada
              {features !== 1 ? 's' : ''}. {areas} area
              {areas !== 1 ? 's' : ''} operacional
              {areas !== 1 ? 'is' : ''} preparada
              {areas !== 1 ? 's' : ''}.
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            Nenhum KMZ/KML cadastrado. O mapa operacional desta fazenda ficara
            indisponivel ate o envio do arquivo.
          </p>
        )}
      </div>

      <div className="mt-3">
        <MapUploader
          variant="compact"
          buttonLabel={mapa ? 'Substituir KMZ/KML' : 'Cadastrar KMZ/KML'}
          empresaId={fazenda.empresa_id}
          fazendaId={fazenda.id}
          onUploaded={(payload: {
            map: FarmMap
            geojson: GeoJsonFeatureCollection
          }) => {
            setMapa(payload.map)
            setFeatures(payload.geojson.features.length)
            setAreas(0)
            setErrorMessage(null)
            void prepararAreas(payload)
          }}
        />
      </div>

      {mapa && features > 0 && areas === 0 && (
        <button
          type="button"
          onClick={prepararAreasDoMapaAtual}
          disabled={preparing}
          className="btn-ghost mt-2 w-full justify-center border border-border bg-white"
        >
          <Layers size={14} />
          {preparing ? 'Preparando areas...' : 'Preparar areas operacionais'}
        </button>
      )}

      {preparing && (
        <p className="mt-2 text-xs font-medium text-green">
          Preparando pastos e areas para o mapa operacional...
        </p>
      )}
    </div>
  )
}
