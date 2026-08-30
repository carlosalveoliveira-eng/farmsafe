export type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: any[];
};

export type FarmMap = {
  id: string;
  empresa_id: string;
  fazenda_id: string;
  nome: string;
  arquivo_original: string | null;
  arquivo_processado: string | null;
  geojson: GeoJsonFeatureCollection;
  versao: number | null;
  ativo: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
};

export type MapAreaTipo =
  | "fazenda"
  | "retiro"
  | "pasto"
  | "agua"
  | "estrutura"
  | "restricao"
  | "outro";

export type MapArea = {
  id: string;
  map_id: string;
  empresa_id: string;
  fazenda_id: string;
  nome: string;
  tipo: MapAreaTipo;
  cor: string | null;
  geojson: any;
  area_hectares: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ImportedMapResult = {
  map: FarmMap;
  geojson: GeoJsonFeatureCollection;
};
