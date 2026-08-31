import { useCallback, useEffect, useState } from 'react'

import type { FarmMap, GeoJsonFeatureCollection } from '../types/map'
import { EMPTY_GEOJSON } from '../services/map/geojson'
import {
  buscarGeoJsonDoMapa,
  buscarMapaAtivoDaFazenda,
} from '../services/map/maps'

type UseMapParams = {
  empresaId?: string | null
  fazendaId?: string | null
  enabled?: boolean
}

export function useMap({
  empresaId,
  fazendaId,
  enabled = true,
}: UseMapParams) {
  const [loading, setLoading] = useState(false)
  const [map, setMap] = useState<FarmMap | null>(null)
  const [geojson, setGeojson] =
    useState<GeoJsonFeatureCollection>(EMPTY_GEOJSON)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled || !empresaId || !fazendaId) {
      setMap(null)
      setGeojson(EMPTY_GEOJSON)
      setLoading(false)
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const activeMap = await buscarMapaAtivoDaFazenda({
        empresaId,
        fazendaId,
      })

      if (!activeMap) {
        setMap(null)
        setGeojson(EMPTY_GEOJSON)
        return null
      }

      const mapGeojson = await buscarGeoJsonDoMapa(activeMap)

      setMap(activeMap)
      setGeojson(mapGeojson)

      return {
        map: activeMap,
        geojson: mapGeojson,
      }
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : 'Nao foi possivel carregar o mapa da fazenda.'

      setError(message)
      setMap(null)
      setGeojson(EMPTY_GEOJSON)
      return null
    } finally {
      setLoading(false)
    }
  }, [enabled, empresaId, fazendaId])

  useEffect(() => {
    void reload()
  }, [reload])

  return {
    loading,
    map,
    geojson,
    error,
    hasMap: Boolean(map),
    reload,
  }
}
