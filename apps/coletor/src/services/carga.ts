import { db, type CochoLocal, type InsumoLocal } from '../database/db'
import { obterDeviceSecret } from './device'
import { supabase } from './supabase'

export interface DispositivoCarga {
  id: string
  nome: string
  tratador_nome?: string | null
  fazenda_id: string
  fazenda_nome?: string | null
  empresa_id: string
}

export interface CargaColetorResponse {
  ok: boolean
  status?: string
  codigo?: string
  mensagem?: string
  server_time?: string
  dispositivo?: DispositivoCarga
  cochos?: CochoLocal[]
  insumos?: InsumoLocal[]
}

export async function atualizarCargaColetor() {
  const deviceSecret = obterDeviceSecret()

  if (!deviceSecret) {
    throw new Error('Dispositivo não configurado.')
  }

  const { data, error } = await supabase.rpc('coletor_obter_carga', {
    p_device_secret: deviceSecret,
  })

  if (error) {
    throw new Error(error.message)
  }

  const resposta = data as CargaColetorResponse

  if (!resposta?.ok) {
    throw new Error(
      resposta?.mensagem ??
        'Não foi possível baixar os dados do coletor.'
    )
  }

  const cochos = resposta.cochos ?? []
  const insumos = resposta.insumos ?? []

  await db.transaction('rw', db.cochos, db.insumos, db.meta, async () => {
    await db.cochos.clear()
    await db.insumos.clear()

    if (cochos.length > 0) {
      await db.cochos.bulkPut(cochos)
    }

    if (insumos.length > 0) {
      await db.insumos.bulkPut(insumos)
    }

    await db.meta.put({
      chave: 'carga',
      valor: {
        server_time: resposta.server_time ?? null,
        dispositivo: resposta.dispositivo ?? null,
        total_cochos: cochos.length,
        total_insumos: insumos.length,
      },
      atualizado_em: new Date().toISOString(),
    })
  })

  return {
    dispositivo: resposta.dispositivo ?? null,
    totalCochos: cochos.length,
    totalInsumos: insumos.length,
  }
}

export async function obterResumoCargaLocal() {
  const [cochos, insumos, carga] = await Promise.all([
    db.cochos.count(),
    db.insumos.count(),
    db.meta.get('carga'),
  ])

  return {
    cochos,
    insumos,
    atualizadoEm: carga?.atualizado_em ?? null,
    carga: carga?.valor ?? null,
  }
}