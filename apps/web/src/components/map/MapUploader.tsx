import { useRef, useState } from "react";
import type { FarmMap, GeoJsonFeatureCollection } from "../../types/map";
import { importMapForFarm } from "../../services/map/MapService";

type Props = {
  empresaId: string;
  fazendaId: string;
  variant?: "full" | "compact";
  buttonLabel?: string;
  onUploaded: (payload: {
    map: FarmMap;
    geojson: GeoJsonFeatureCollection;
  }) => void;
};

export default function MapUploader({
  empresaId,
  fazendaId,
  variant = "full",
  buttonLabel = "Selecionar KMZ/KML",
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setErrorMessage(null);

    try {
      const result = await importMapForFarm({
        empresaId,
        fazendaId,
        file,
      });

      onUploaded(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível importar o mapa.";

      setErrorMessage(message);
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  if (variant === "compact") {
    return (
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept=".kmz,.kml"
          disabled={uploading}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              void handleFile(file);
            }
          }}
        />

        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="btn-ghost w-full justify-center"
        >
          {uploading ? "Enviando..." : buttonLabel}
        </button>

        {errorMessage && (
          <p className="text-xs text-red font-medium">{errorMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px dashed #94a3b8",
        borderRadius: 12,
        padding: 32,
        background: "#ffffff",
        textAlign: "center",
      }}
    >
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
        Nenhum mapa cadastrado para esta fazenda
      </h2>

      <p style={{ marginTop: 8, color: "#64748b" }}>
        Importe um arquivo KMZ ou KML para visualizar os limites da propriedade.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".kmz,.kml"
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            void handleFile(file);
          }
        }}
        style={{ marginTop: 16 }}
      />

      {uploading && (
        <p style={{ marginTop: 12, color: "#2563eb" }}>
          Importando e processando mapa...
        </p>
      )}

      {errorMessage && (
        <p style={{ marginTop: 12, color: "#dc2626" }}>{errorMessage}</p>
      )}
    </div>
  );
}