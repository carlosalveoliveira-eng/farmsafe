import { db } from '../database/db'
import { obterDeviceSecret } from './device'
import { supabase } from './supabase'

type SyncResponse = {
  ok: boolean
  status?: 'inserted' | 'already_exists'
  erro?: string
  id?: string
}

export async function sincronizarRegistros() {
  const deviceSecret = obterDeviceSecret()

  if (!deviceSecret) {
    throw new Error('Dispositivo não configurado.')
  }

  const registros = await db.abastecimentos.toArray()

  const pendentes = registros.filter(
    (registro) => registro.sincronizado === false
  )

  let enviados = 0
  let falhas = 0

  for (const registro of pendentes) {
    if (!registro.id) continue

    try {
      await db.abastecimentos.update(registro.id, {
        status_sync: 'sincronizando',
        erro_sync: null,
      })

      const { data, error } = await supabase.rpc('sync_abastecimento', {
        p_device_secret: deviceSecret,
        p_client_uuid: registro.client_uuid,
        p_cocho_id: '00000000-0000-0000-0000-000000000001',
        p_lote_id: null,
        p_tipo_abastecimento: registro.tipo_abastecimento,
        p_quantidade_kg: registro.quantidade_kg ?? null,
        p_observacao: registro.observacao ?? null,
        p_latitude: registro.latitude ?? null,
        p_longitude: registro.longitude ?? null,
        p_registrado_em: registro.registrado_em,
      })

      if (error) {
        await db.abastecimentos.update(registro.id, {
          status_sync: 'erro',
          erro_sync: error.message,
          tentativas_sync: (registro.tentativas_sync ?? 0) + 1,
        })

        falhas++
        continue
      }

      const resposta = data as SyncResponse

      if (!resposta.ok) {
        await db.abastecimentos.update(registro.id, {
          status_sync: 'erro',
          erro_sync: resposta.erro ?? 'Erro desconhecido',
          tentativas_sync: (registro.tentativas_sync ?? 0) + 1,
        })

        falhas++
        continue
      }

      await db.abastecimentos.update(registro.id, {
        sincronizado: true,
        status_sync: 'sincronizado',
        erro_sync: null,
      })

      enviados++
    } catch (err) {
      await db.abastecimentos.update(registro.id, {
        status_sync: 'erro',
        erro_sync: err instanceof Error ? err.message : 'Erro inesperado',
        tentativas_sync: (registro.tentativas_sync ?? 0) + 1,
      })

      falhas++
    }
  }

  return {
    enviados,
    falhas,
    total: pendentes.length,
  }
}