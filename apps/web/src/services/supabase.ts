import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL     as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias.')
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    db: {
      schema: 'farmsafe',
    },
  }
)

// ─── Tipos espelho do schema farmsafe ────────────────────────────────────────

export interface Fazenda {
  id:         string
  nome:       string
  codigo:     string
  cidade:     string | null
  estado:     string | null
  latitude: number | null
  longitude: number | null
  ativo:      boolean
  created_at: string
  updated_at: string
}

export interface Retiro {
  id:         string
  fazenda_id: string
  nome:       string
  ativo:      boolean
  updated_at: string
}

export interface Lote {
  id:         string
  fazenda_id: string
  retiro_id:  string | null
  nome:       string
  descricao:  string | null
  ativo:      boolean
  updated_at: string
}

export interface Cocho {
  id:            string
  fazenda_id:    string
  retiro_id:     string | null
  lote_id:       string | null
  nome:          string
  codigo_qr:     string
  tipo_sal:      string | null
  capacidade_kg: number | null
  ativo:         boolean
  updated_at:    string
  // joins opcionais
  fazenda?: Pick<Fazenda, 'nome' | 'codigo'>
  lote?:   Pick<Lote, 'nome'>
  retiro?: Pick<Retiro, 'nome'>
}

export interface Dispositivo {
  id:            string
  fazenda_id:    string
  nome:          string
  tratador_nome: string | null
  ativo:         boolean
  ultimo_sync:   string | null
  device_secret: string | null
  created_at:    string
  fazenda?:      Pick<Fazenda, 'nome' | 'codigo'>
}

export interface Abastecimento {
  id:                 string
  client_uuid:        string
  dispositivo_id:     string
  fazenda_id:         string
  cocho_id:           string
  lote_id:            string | null
  tipo_abastecimento: string
  quantidade_kg:      number | null
  observacao:         string | null
  latitude:           number | null
  longitude:          number | null
  registrado_em:      string
  sincronizado_em:    string | null
  // joins opcionais
  cocho?:      Pick<Cocho, 'nome' | 'codigo_qr'>
  lote?:       Pick<Lote, 'nome'>
  dispositivo?: Pick<Dispositivo, 'nome' | 'tratador_nome'>
  fazenda?:    Pick<Fazenda, 'nome'>
}
