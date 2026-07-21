import { supabase } from './supabase'

export type EmpresaUsuario = {
  id: string
  nome: string
  plano: string | null
  max_fazendas: number | null
  max_dispositivos: number | null
}

export type PerfilUsuario = {
  id: string
  nome: string
  role: string
  ativo: boolean
  empresa: EmpresaUsuario | null
}

type PerfilUsuarioRaw = {
  id: string
  nome: string
  role: string
  ativo: boolean
  empresa: EmpresaUsuario | EmpresaUsuario[] | null
}

function normalizarPerfilUsuario(data: PerfilUsuarioRaw): PerfilUsuario {
  const empresa = Array.isArray(data.empresa)
    ? data.empresa[0] ?? null
    : data.empresa

  return {
    id: data.id,
    nome: data.nome,
    role: data.role,
    ativo: data.ativo,
    empresa,
  }
}

export async function getEmpresaUsuario(): Promise<PerfilUsuario> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Usuário não autenticado.')
  }

  const { data, error } = await supabase
    .from('usuarios')
    .select(`
      id,
      nome,
      role,
      ativo,
      empresa:empresas (
        id,
        nome,
        plano,
        max_fazendas,
        max_dispositivos
      )
    `)
    .eq('auth_user_id', user.id)
    .eq('ativo', true)
    .single()

  if (error || !data) {
    throw new Error('Usuário sem acesso ativo ao FarmSafe.')
  }

  return normalizarPerfilUsuario(data as unknown as PerfilUsuarioRaw)
}

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    window.location.href = '/login'
  }
})