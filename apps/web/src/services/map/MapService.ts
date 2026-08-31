// Legacy compatibility layer. New code should import from services/map/maps.
export {
  buscarGeoJsonDoMapa as loadFarmMapGeoJson,
  buscarMapaAtivoDaFazenda as getActiveFarmMap,
  uploadMapaDaFazenda as importMapForFarm,
} from './maps'
