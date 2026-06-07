import { supabase } from './supabase'

export async function getEmpresaUsuario() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Usuário não autenticado')
  }

  const { data, error } = await supabase
    .from('usuarios')
    .select(`
      id,
      nome,
      role,
      empresa:empresas (
        id,
        nome,
        plano,
        max_fazendas,
        max_dispositivos
      )
    `)
    .eq('auth_user_id', user.id)
    .single()

  if (error) {
    throw error
  }

  return data
}