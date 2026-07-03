import { useEffect, useMemo, useState } from "react";
import type { FarmMap, GeoJsonFeatureCollection } from "../../types/map";
import {
  getActiveFarmMap,
  loadFarmMapGeoJson,
} from "../../services/map/MapService";
import MapUploader from "./MapUploader";
import MapViewer from "./MapViewer";

type Props = {
  empresaId?: string | null;
  fazendaId?: string | null;
  center?: [number, number];
};

const EMPTY_GEOJSON: GeoJsonFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export default function FarmMapPanel({ empresaId, fazendaId, center }: Props) {
  const [loading, setLoading] = useState(false);
  const [map, setMap] = useState<FarmMap | null>(null);
  const [geojson, setGeojson] =
    useState<GeoJsonFeatureCollection>(EMPTY_GEOJSON);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);

  const canLoad = useMemo(() => {
    return Boolean(empresaId && fazendaId);
  }, [empresaId, fazendaId]);

  useEffect(() => {
    let cancelled = false;

    async function loadMap() {
      if (!empresaId || !fazendaId) {
        setMap(null);
        setGeojson(EMPTY_GEOJSON);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const activeMap = await getActiveFarmMap({
          empresaId,
          fazendaId,
        });

        if (cancelled) return;

        if (!activeMap) {
          setMap(null);
          setGeojson(EMPTY_GEOJSON);
          return;
        }

        const loadedGeoJson = await loadFarmMapGeoJson(activeMap);

        if (cancelled) return;

        setMap(activeMap);
        setGeojson(loadedGeoJson);
      } catch (error) {
        if (cancelled) return;

        const message =
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o mapa da fazenda.";

        setErrorMessage(message);
        setMap(null);
        setGeojson(EMPTY_GEOJSON);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMap();

    return () => {
      cancelled = true;
    };
  }, [empresaId, fazendaId]);

  if (!canLoad) {
    return (
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: 24,
          background: "#ffffff",
        }}
      >
        <strong>Mapa da fazenda</strong>
        <p style={{ marginTop: 8, color: "#64748b" }}>
          Selecione uma fazenda para carregar ou importar o mapa.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: 24,
          background: "#ffffff",
        }}
      >
        <strong>Carregando mapa da fazenda...</strong>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div
        style={{
          border: "1px solid #fecaca",
          borderRadius: 12,
          padding: 24,
          background: "#fff7f7",
        }}
      >
        <strong style={{ color: "#b91c1c" }}>Erro ao carregar mapa</strong>
        <p style={{ marginTop: 8, color: "#7f1d1d" }}>{errorMessage}</p>
      </div>
    );
  }

  if (!map || replaceMode) {
    return (
      <MapUploader
        empresaId={empresaId!}
        fazendaId={fazendaId!}
        onUploaded={(payload) => {
          setMap(payload.map);
          setGeojson(payload.geojson);
          setReplaceMode(false);
        }}
      />
    );
  }

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <strong>Mapa da fazenda</strong>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
            {map.nome}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setReplaceMode(true)}
          style={{
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            borderRadius: 8,
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          Substituir KMZ/KML
        </button>
      </div>

      <MapViewer geojson={geojson} center={center} height={520} />
    </div>
  );
}