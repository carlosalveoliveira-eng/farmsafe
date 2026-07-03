import { supabase } from "../supabase";
import type {
  FarmMap,
  GeoJsonFeatureCollection,
  ImportedMapResult,
} from "../../types/map";
import { importKmlOrKmzToGeoJson } from "./KMZImporter";
import {
  downloadGeoJsonFromStorage,
  removeMapFiles,
  uploadOriginalMapFile,
  uploadProcessedGeoJson,
} from "./StorageService";

const db = supabase.schema("farmsafe");

const EMPTY_GEOJSON: GeoJsonFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function getMapNameFromFile(file: File): string {
  return file.name.replace(/\.(kmz|kml)$/i, "");
}

export async function getActiveFarmMap(params: {
  empresaId: string;
  fazendaId: string;
}): Promise<FarmMap | null> {
  const { data, error } = await db
    .from("maps")
    .select("*")
    .eq("empresa_id", params.empresaId)
    .eq("fazenda_id", params.fazendaId)
    .eq("ativo", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar mapa: ${error.message}`);
  }

  return data as FarmMap | null;
}

export async function loadFarmMapGeoJson(
  map: FarmMap
): Promise<GeoJsonFeatureCollection> {
  if (map.arquivo_processado) {
    return downloadGeoJsonFromStorage(map.arquivo_processado);
  }

  if (map.geojson?.type === "FeatureCollection") {
    return {
      type: "FeatureCollection",
      features: Array.isArray(map.geojson.features)
        ? map.geojson.features
        : [],
    };
  }

  return EMPTY_GEOJSON;
}

async function deactivateExistingMaps(params: {
  empresaId: string;
  fazendaId: string;
}): Promise<void> {
  const { error } = await db
    .from("maps")
    .update({
      ativo: false,
      updated_at: new Date().toISOString(),
    })
    .eq("empresa_id", params.empresaId)
    .eq("fazenda_id", params.fazendaId)
    .eq("ativo", true);

  if (error) {
    throw new Error(`Falha ao desativar mapas anteriores: ${error.message}`);
  }
}

export async function importMapForFarm(params: {
  empresaId: string;
  fazendaId: string;
  file: File;
}): Promise<ImportedMapResult> {
  const geojson = await importKmlOrKmzToGeoJson(params.file);

  let originalPath = "";
  let processedPath = "";

  try {
    originalPath = await uploadOriginalMapFile({
      empresaId: params.empresaId,
      fazendaId: params.fazendaId,
      file: params.file,
    });

    processedPath = await uploadProcessedGeoJson({
      empresaId: params.empresaId,
      fazendaId: params.fazendaId,
      originalFileName: params.file.name,
      geojson,
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await deactivateExistingMaps({
      empresaId: params.empresaId,
      fazendaId: params.fazendaId,
    });

    const { data, error } = await db
      .from("maps")
      .insert({
        empresa_id: params.empresaId,
        fazenda_id: params.fazendaId,
        nome: getMapNameFromFile(params.file),
        arquivo_original: originalPath,
        arquivo_processado: processedPath,
        geojson: EMPTY_GEOJSON,
        ativo: true,
        created_by: user?.id ?? null,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Falha ao salvar mapa no banco: ${error.message}`);
    }

    return {
      map: data as FarmMap,
      geojson,
    };
  } catch (error) {
    await removeMapFiles([originalPath, processedPath]);
    throw error;
  }
}