import { supabase } from "../supabase";
import type { MapArea, MapAreaTipo } from "../../types/map";
import { calcularAreaHectares } from "../../features/mapa/mapGeometry";
import { getCorArea, getNomeArea, getTipoArea } from "../../features/mapa/mapTheme";

const db = supabase.schema("farmsafe");

type SaveMapAreaInput = {
  mapId: string;
  empresaId: string;
  fazendaId: string;
  nome: string;
  tipo: MapAreaTipo;
  cor?: string | null;
  geojson: any;
  areaHectares?: number | null;
};

export async function listMapAreas(params: {
  mapId: string;
  empresaId: string;
  fazendaId: string;
}): Promise<MapArea[]> {
  const { data, error } = await db
    .from("map_areas")
    .select("*")
    .eq("map_id", params.mapId)
    .eq("empresa_id", params.empresaId)
    .eq("fazenda_id", params.fazendaId)
    .order("tipo")
    .order("nome");

  if (error) {
    throw new Error(`Falha ao carregar areas do mapa: ${error.message}`);
  }

  return (data as MapArea[]) ?? [];
}

export async function createMapArea(input: SaveMapAreaInput): Promise<MapArea> {
  const area =
    input.areaHectares ?? calcularAreaHectares(input.geojson) ?? null;

  const { data, error } = await db
    .from("map_areas")
    .insert({
      map_id: input.mapId,
      empresa_id: input.empresaId,
      fazenda_id: input.fazendaId,
      nome: input.nome.trim(),
      tipo: input.tipo,
      cor: input.cor || null,
      geojson: input.geojson,
      area_hectares: area,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Falha ao salvar area do mapa: ${error.message}`);
  }

  return data as MapArea;
}

export async function updateMapArea(
  areaId: string,
  input: {
    nome: string;
    tipo: MapAreaTipo;
    cor?: string | null;
    geojson?: any;
    areaHectares?: number | null;
  }
): Promise<MapArea> {
  const patch: Record<string, unknown> = {
    nome: input.nome.trim(),
    tipo: input.tipo,
    cor: input.cor || null,
    updated_at: new Date().toISOString(),
  };

  if (input.geojson) {
    patch.geojson = input.geojson;
    patch.area_hectares =
      input.areaHectares ?? calcularAreaHectares(input.geojson) ?? null;
  }

  const { data, error } = await db
    .from("map_areas")
    .update(patch)
    .eq("id", areaId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Falha ao atualizar area do mapa: ${error.message}`);
  }

  return data as MapArea;
}

export function buildAreaFromFeature(params: {
  mapId: string;
  empresaId: string;
  fazendaId: string;
  feature: any;
  index: number;
}): SaveMapAreaInput {
  const tipo = getTipoArea(params.feature);

  return {
    mapId: params.mapId,
    empresaId: params.empresaId,
    fazendaId: params.fazendaId,
    nome: getNomeArea(params.feature, params.index),
    tipo,
    cor: getCorArea(params.feature),
    geojson: {
      ...params.feature,
      type: "Feature",
      properties: {
        ...(params.feature?.properties ?? {}),
        nome: getNomeArea(params.feature, params.index),
        tipo,
      },
    },
    areaHectares: calcularAreaHectares(params.feature),
  };
}

export function buildPolygonFeature(params: {
  nome: string;
  tipo: MapAreaTipo;
  cor?: string | null;
  points: Array<[number, number]>;
}) {
  const ring = params.points.map(([lat, lng]) => [lng, lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];

  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    ring.push(first);
  }

  return {
    type: "Feature",
    properties: {
      nome: params.nome,
      tipo: params.tipo,
      cor: params.cor || null,
    },
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };
}
