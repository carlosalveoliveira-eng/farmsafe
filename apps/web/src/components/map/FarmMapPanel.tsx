import { useEffect, useMemo, useState } from 'react'

import {
  buscarGeoJsonDoMapa,
  buscarMapaAtivoDaFazenda,
} from '../../services/map/maps'
import { EMPTY_GEOJSON } from '../../services/map/geojson'
import type { FarmMap, GeoJsonFeatureCollection } from '../../types/map'
import MapRegions from './MapRegions'
import MapUploader from './MapUploader'
import MapViewer from './MapViewer'

type Props = {
  empresaId?: string | null
  fazendaId?: string | null
  center?: [number, number]
}

export default function FarmMapPanel({ empresaId, fazendaId, center }: Props) {
  const [loading, setLoading] = useState(false)
  const [map, setMap] = useState<FarmMap | null>(null)
  const [geojson, setGeojson] =
    useState<GeoJsonFeatureCollection>(EMPTY_GEOJSON)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [replaceMode, setReplaceMode] = useState(false)

  const canLoad = useMemo(() => {
    return Boolean(empresaId && fazendaId)
  }, [empresaId, fazendaId])

  useEffect(() => {
    let cancelled = false

    async function loadMap() {
      if (!empresaId || !fazendaId) {
        setMap(null)
        setGeojson(EMPTY_GEOJSON)
        return
      }

      setLoading(true)
      setErrorMessage(null)

      try {
        const activeMap = await buscarMapaAtivoDaFazenda({
          empresaId,
          fazendaId,
        })

        if (cancelled) return

        if (!activeMap) {
          setMap(null)
          setGeojson(EMPTY_GEOJSON)
          return
        }

        const loadedGeoJson = await buscarGeoJsonDoMapa(activeMap)

        if (cancelled) return

        setMap(activeMap)
        setGeojson(loadedGeoJson)
      } catch (error) {
        if (cancelled) return

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Nao foi possivel carregar o mapa da fazenda.'
        )
        setMap(null)
        setGeojson(EMPTY_GEOJSON)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadMap()

    return () => {
      cancelled = true
    }
  }, [empresaId, fazendaId])

  if (!canLoad) {
    return (
      <div className="rounded-lg border border-border bg-white p-5">
        <strong className="text-ink-primary">Mapa da fazenda</strong>
        <p className="mt-2 text-sm text-ink-muted">
          Selecione uma fazenda para carregar ou importar o mapa.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-white p-5">
        <strong className="text-ink-primary">
          Carregando mapa da fazenda...
        </strong>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="rounded-lg border border-red/30 bg-red/5 p-5">
        <strong className="text-red">Erro ao carregar mapa</strong>
        <p className="mt-2 text-sm text-red">{errorMessage}</p>
      </div>
    )
  }

  if (!map || replaceMode) {
    return (
      <MapUploader
        empresaId={empresaId!}
        fazendaId={fazendaId!}
        onUploaded={(payload) => {
          setMap(payload.map)
          setGeojson(payload.geojson)
          setReplaceMode(false)
        }}
      />
    )
  }

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <strong className="text-ink-primary">Mapa da fazenda</strong>
          <p className="mt-1 text-sm text-ink-muted">{map.nome}</p>
        </div>

        <button
          type="button"
          onClick={() => setReplaceMode(true)}
          className="rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold text-ink-secondary hover:bg-surface"
        >
          Substituir KMZ/KML
        </button>
      </div>

      <div className="h-[520px] overflow-hidden rounded-lg border border-border">
        <MapViewer
          center={center ?? [-15.77972, -47.92972]}
          fitGeojson={geojson}
          baseLayer="osm"
        >
          <MapRegions
            mapId={map.id}
            mapGeojson={geojson}
            areas={[]}
            areasGeojson={geojson}
            showAreas
            showLabels={false}
          />
        </MapViewer>
      </div>
    </div>
  )
}
