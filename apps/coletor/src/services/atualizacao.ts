import { APP_VERSION } from '../config/appVersion'
import { supabase } from './supabase'

export type AtualizacaoInfo = {
  ok: boolean
  current_version_code?: number
  latest_version_code?: number
  latest_version_name?: string
  update_available: boolean
  update_required: boolean
  apk_url?: string | null
  release_notes?: string | null
  message?: string
}

type RpcAtualizacaoResult = {
  data: AtualizacaoInfo | null
  error: {
    message: string
  } | null
}

function withTimeout<T>(
  operation: PromiseLike<T>,
  timeoutMs: number,
  mensagem: string
): Promise<T> {
  let timeoutId: number | undefined

  const promise = Promise.resolve(operation)

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(mensagem))
    }, timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) {
      window.clearTimeout(timeoutId)
    }
  })
}

export async function verificarAtualizacaoApp(): Promise<AtualizacaoInfo> {
  const consulta = Promise.resolve(
    supabase.rpc('coletor_verificar_atualizacao', {
      p_app: APP_VERSION.app,
      p_platform: APP_VERSION.platform,
      p_channel: APP_VERSION.channel,
      p_version_code: APP_VERSION.versionCode,
    })
  ) as Promise<RpcAtualizacaoResult>

  const { data, error } = await withTimeout(
    consulta,
    6000,
    'Tempo esgotado ao verificar atualização.'
  )

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Resposta inválida ao verificar atualização.')
  }

  return data
}

export function abrirLinkAtualizacao(apkUrl?: string | null) {
  if (!apkUrl) {
    alert('Link de atualização ainda não configurado.')
    return
  }

  window.open(apkUrl, '_blank')
}