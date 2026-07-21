import { supabase } from './supabase'

export type PerfilSistema =
  | 'dono'
  | 'admin_empresa'
  | 'gerente'
  | 'controller'
  | 'escritorio'

export type ConvidarUsuarioInput = {
  nome: string
  email: string
  cargo?: string | null
  telefone?: string | null
  role: PerfilSistema
}

export async function convidarUsuario(input: ConvidarUsuarioInput) {
  const { data, error } = await supabase.functions.invoke(
    'admin-convidar-usuario',
    {
      body: input,
    }
  )

  if (error) {
    console.error('Erro técnico ao convidar usuário:', error)

    throw new Error(
      'Não foi possível enviar o convite. Verifique os dados e tente novamente.'
    )
  }

  if (!data?.ok) {
    throw new Error(
      data?.erro ?? 'Não foi possível enviar o convite. Verifique os dados e tente novamente.'
    )
  }

  return data
}