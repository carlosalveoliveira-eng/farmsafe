import { useEffect } from "react";
import L from "leaflet";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoJsonFeatureCollection } from "../../types/map";

type Props = {
  geojson: GeoJsonFeatureCollection;
  center?: [number, number];
  height?: number | string;
};

function FitBounds({ geojson }: { geojson: GeoJsonFeatureCollection }) {
  const map = useMap();

  useEffect(() => {
    if (!geojson.features.length) return;

    const layer = L.geoJSON(geojson as any);
    const bounds = layer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [24, 24],
        maxZoom: 17,
      });
    }
  }, [geojson, map]);

  return null;
}

export default function MapViewer({
  geojson,
  center = [-15.77972, -47.92972],
  height = 520,
}: Props) {
  return (
    <div
      style={{
        height,
        width: "100%",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
      }}
    >
      <MapContainer
        center={center}
        zoom={13}
        style={{
          height: "100%",
          width: "100%",
        }}
        scrollWheelZoom
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <GeoJSON
          key={JSON.stringify(geojson).length}
          data={geojson as any}
          style={() => ({
            color: "#16a34a",
            weight: 3,
            fillColor: "#22c55e",
            fillOpacity: 0.18,
          })}
        />

        <FitBounds geojson={geojson} />
      </MapContainer>
    </div>
  );
}