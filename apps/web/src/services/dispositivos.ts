import { supabase } from './supabase'

type RpcStatusResult = {
  ok: boolean
  erro?: string
  mensagem?: string
  dispositivo_id?: string
}

function assertRpcOk(data: unknown, fallback: string) {
  const result = data as RpcStatusResult

  if (!result?.ok) {
    throw new Error(result?.erro ?? fallback)
  }

  return result
}

export async function revogarDispositivo(params: {
  dispositivoId: string
  motivo?: string | null
}) {
  const { data, error } = await supabase.rpc('admin_revogar_dispositivo', {
    p_dispositivo_id: params.dispositivoId,
    p_motivo: params.motivo?.trim() || null,
  })

  if (error) {
    throw new Error(`Erro ao revogar dispositivo: ${error.message}`)
  }

  return assertRpcOk(data, 'Nao foi possivel revogar o dispositivo.')
}

export async function reativarDispositivo(dispositivoId: string) {
  const { data, error } = await supabase.rpc('admin_reativar_dispositivo', {
    p_dispositivo_id: dispositivoId,
  })

  if (error) {
    throw new Error(`Erro ao reativar dispositivo: ${error.message}`)
  }

  return assertRpcOk(data, 'Nao foi possivel reativar o dispositivo.')
}
