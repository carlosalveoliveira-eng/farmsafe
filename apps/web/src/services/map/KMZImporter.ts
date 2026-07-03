import JSZip from "jszip";
import { kml } from "@tmcw/togeojson";
import type { GeoJsonFeatureCollection } from "../../types/map";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function assertAllowedFile(file: File) {
  const name = file.name.toLowerCase();

  const isKmz = name.endsWith(".kmz");
  const isKml = name.endsWith(".kml");

  if (!isKmz && !isKml) {
    throw new Error("Arquivo inválido. Envie um arquivo .kmz ou .kml.");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("Arquivo muito grande. O limite é 50MB.");
  }
}

async function extractKmlFromKmz(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);

  const kmlEntry = Object.values(zip.files).find((entry) =>
    entry.name.toLowerCase().endsWith(".kml")
  );

  if (!kmlEntry) {
    throw new Error("Nenhum arquivo .kml foi encontrado dentro do KMZ.");
  }

  return kmlEntry.async("text");
}

async function readKmlText(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".kml")) {
    return file.text();
  }

  return extractKmlFromKmz(file);
}

function normalizeGeoJson(input: any): GeoJsonFeatureCollection {
  if (!input || input.type !== "FeatureCollection") {
    throw new Error("O arquivo não gerou um GeoJSON válido.");
  }

  return {
    type: "FeatureCollection",
    features: Array.isArray(input.features) ? input.features : [],
  };
}

export async function importKmlOrKmzToGeoJson(
  file: File
): Promise<GeoJsonFeatureCollection> {
  assertAllowedFile(file);

  const kmlText = await readKmlText(file);

  const xml = new DOMParser().parseFromString(kmlText, "text/xml");

  const parserError = xml.querySelector("parsererror");

  if (parserError) {
    throw new Error("O KML está malformado e não pôde ser lido.");
  }

  const converted = kml(xml);

  return normalizeGeoJson(converted);
}