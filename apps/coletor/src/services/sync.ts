import { db } from '../database/db'
import { obterDeviceSecret, removerDeviceSecret } from './device'
import { supabase } from './supabase'

type SyncResponse = {
  ok: boolean
  status?: 'inserted' | 'already_exists'
  erro?: string
  id?: string
}

function deveDesativarDispositivo(mensagem: string) {
  const texto = mensagem.toLowerCase()

  return (
    texto.includes('dispositivo') ||
    texto.includes('inativo') ||
    texto.includes('device') ||
    texto.includes('não autorizado') ||
    texto.includes('nao autorizado') ||
    texto.includes('invalid')
  )
}

async function desconectarDispositivo(mensagem: string) {
  removerDeviceSecret()

  alert(
    mensagem ||
      'Este dispositivo foi desativado pela gestão. Faça uma nova ativação.'
  )

  window.location.reload()
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

      console.log('Enviando GPS para Supabase:', {
        latitude: registro.latitude,
        longitude: registro.longitude,
      })

      const { data, error } = await supabase.rpc('sync_abastecimento', {
        p_device_secret: deviceSecret,
        p_client_uuid: registro.client_uuid,
        p_cocho_id: registro.cocho_id,
        p_lote_id: registro.lote_id ?? null,
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

        if (deveDesativarDispositivo(error.message)) {
          await desconectarDispositivo(
            'Este dispositivo foi desativado ou não está autorizado. Faça uma nova ativação.'
          )
          return { enviados, falhas: falhas + 1, total: pendentes.length }
        }

        falhas++
        continue
      }

      const resposta = data as SyncResponse

      if (!resposta.ok) {
        const mensagem = resposta.erro ?? 'Erro desconhecido'

        await db.abastecimentos.update(registro.id, {
          status_sync: 'erro',
          erro_sync: mensagem,
          tentativas_sync: (registro.tentativas_sync ?? 0) + 1,
        })

        if (deveDesativarDispositivo(mensagem)) {
          await desconectarDispositivo(
            'Este dispositivo foi desativado pela gestão. Faça uma nova ativação.'
          )
          return { enviados, falhas: falhas + 1, total: pendentes.length }
        }

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
      const mensagem = err instanceof Error ? err.message : 'Erro inesperado'

      await db.abastecimentos.update(registro.id, {
        status_sync: 'erro',
        erro_sync: mensagem,
        tentativas_sync: (registro.tentativas_sync ?? 0) + 1,
      })

      if (deveDesativarDispositivo(mensagem)) {
        await desconectarDispositivo(
          'Este dispositivo foi desativado ou perdeu autorização. Faça uma nova ativação.'
        )
        return { enviados, falhas: falhas + 1, total: pendentes.length }
      }

      falhas++
    }
  }

  return {
    enviados,
    falhas,
    total: pendentes.length,
  }
}