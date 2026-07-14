import Dexie, { type Table } from 'dexie'

export type StatusSync =
  | 'pendente'
  | 'sincronizando'
  | 'sincronizado'
  | 'sincronizado_com_alerta'
  | 'duplicado'
  | 'erro'

export type StatusCocho =
  | 'vazio'
  | 'baixo'
  | 'medio'
  | 'cheio'
  | 'nao_informado'

export interface CochoLocal {
  id: string
  codigo_qr: string
  nome: string
  fazenda_id: string
  retiro_id?: string | null
  retiro_nome?: string | null
  lote_id?: string | null
  lote_nome?: string | null
  tipo_sal?: string | null
  capacidade_kg?: number | null
}

export interface InsumoLocal {
  id: string
  nome: string
  categoria: string
  unidade: string
  estoque_minimo_kg?: number | null
  estoque_maximo_kg?: number | null
}

export interface MetaLocal {
  chave: string
  valor: unknown
  atualizado_em: string
}

export interface AbastecimentoLocal {
  id?: number

  client_uuid: string

  /**
   * Código lido no QR Code.
   * Antes o app salvava esse valor em cocho_id.
   * Mantemos compatibilidade com registros antigos.
   */
  codigo_qr?: string | null

  /**
   * UUID real do cocho, quando conhecido pela carga offline.
   */
  cocho_id?: string | null
  cocho_nome?: string | null

  retiro_id?: string | null
  retiro_nome?: string | null

  lote_id?: string | null
  lote_nome?: string | null

  /**
   * Novo fluxo: insumo real vindo da tabela farmsafe.insumos.
   */
  insumo_id?: string | null
  insumo_nome?: string | null

  /**
   * Campo legado.
   * Não remover agora para não quebrar registros antigos locais.
   */
  tipo_abastecimento?: string | null

  quantidade_kg?: number | null

  status_cocho?: StatusCocho | null
  leitura_cocho?: number | null

  observacao?: string | null

  latitude?: number | null
  longitude?: number | null
  gps_accuracy?: number | null

  registrado_em: string
  sincronizado: boolean

  status_sync?: StatusSync
  erro_sync?: string | null
  tentativas_sync?: number

  abastecimento_id?: string | null
  sincronizado_em?: string | null

  saldo_antes_kg?: number | null
  saldo_depois_kg?: number | null
  estoque_status?: string | null
  mensagem_validacao?: string | null
}

export class FarmsafeDB extends Dexie {
  abastecimentos!: Table<AbastecimentoLocal, number>
  cochos!: Table<CochoLocal, string>
  insumos!: Table<InsumoLocal, string>
  meta!: Table<MetaLocal, string>

  constructor() {
    super('farmsafe-db')

    this.version(3).stores({
      abastecimentos:
        '++id, client_uuid, sincronizado, status_sync, registrado_em',
    })

    this.version(4)
      .stores({
        abastecimentos:
          '++id, client_uuid, codigo_qr, cocho_id, insumo_id, sincronizado, status_sync, registrado_em',
        cochos: 'id, codigo_qr, nome, retiro_nome, lote_nome',
        insumos: 'id, nome, categoria, unidade',
        meta: 'chave',
      })
      .upgrade(async (tx) => {
        const abastecimentos = tx.table('abastecimentos')

        await abastecimentos.toCollection().modify((registro) => {
          if (!registro.codigo_qr && registro.cocho_id) {
            registro.codigo_qr = registro.cocho_id
          }

          if (!registro.status_sync) {
            registro.status_sync = registro.sincronizado
              ? 'sincronizado'
              : 'pendente'
          }

          if (registro.tentativas_sync == null) {
            registro.tentativas_sync = 0
          }
        })
      })
  }
}

export const db = new FarmsafeDB()