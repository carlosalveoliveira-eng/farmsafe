import Dexie, { type Table } from 'dexie'

export interface AbastecimentoLocal {
  id?: number

  client_uuid: string

  cocho_id: string

  lote_id?: string | null

  tipo_abastecimento: string

  quantidade_kg?: number | null

  observacao?: string | null

  latitude?: number | null

  longitude?: number | null

  registrado_em: string

  sincronizado: boolean

  status_sync?: string

  erro_sync?: string | null

  tentativas_sync?: number
}

export class FarmsafeDB extends Dexie {
  abastecimentos!: Table<
    AbastecimentoLocal,
    number
  >

  constructor() {
    super('farmsafe-db')

    this.version(3).stores({
      abastecimentos:
        '++id, client_uuid, sincronizado, status_sync, registrado_em',
    })
  }
}

export const db = new FarmsafeDB()