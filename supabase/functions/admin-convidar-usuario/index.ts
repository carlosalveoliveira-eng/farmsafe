import '@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from '@supabase/supabase-js'


type PerfilSistema =
  | 'dono'
  | 'admin_empresa'
  | 'gerente'
  | 'controller'
  | 'escritorio'

type ConvitePayload = {
  nome: string
  email: string
  cargo?: string | null
  telefone?: string | null
  role: PerfilSistema
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const WEB_APP_URL =
  Deno.env.get('WEB_APP_URL') ?? 'https://app.farmsafe.com.br'

const ALLOWED_ROLES: PerfilSistema[] = [
  'dono',
  'admin_empresa',
  'gerente',
  'controller',
  'escritorio',
]

const ALLOWED_ORIGINS = [
  WEB_APP_URL,
  'http://localhost:5173',
  'http://localhost:5174',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : WEB_APP_URL

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  })
}

function normalizarEmail(email: string) {
  return email.trim().toLowerCase()
}

function validarEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function podeCriarPerfil(roleLogado: string, roleNovo: PerfilSistema) {
  if (roleLogado === 'dono') {
    return true
  }

  if (roleLogado === 'admin_empresa') {
    return ['gerente', 'controller', 'escritorio'].includes(roleNovo)
  }

  if (roleLogado === 'gerente') {
    return ['controller', 'escritorio'].includes(roleNovo)
  }

  return false
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: getCorsHeaders(req),
    })
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      req,
      {
        ok: false,
        erro: 'Método não permitido.',
      },
      405
    )
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(
      req,
      {
        ok: false,
        erro: 'Variáveis de ambiente da função não configuradas.',
      },
      500
    )
  }

  const authHeader = req.headers.get('Authorization')

  if (!authHeader) {
    return jsonResponse(
      req,
      {
        ok: false,
        erro: 'Token de autenticação não informado.',
      },
      401
    )
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: {
      schema: 'farmsafe',
    },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  })

  const adminClient = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      db: {
        schema: 'farmsafe',
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user) {
    return jsonResponse(
      req,
      {
        ok: false,
        erro: 'Sessão inválida ou expirada.',
      },
      401
    )
  }

  const { data: gestor, error: gestorError } = await userClient
    .from('usuarios')
    .select('id, empresa_id, role, ativo')
    .eq('auth_user_id', user.id)
    .eq('ativo', true)
    .single()

  if (gestorError || !gestor) {
    return jsonResponse(
      req,
      {
        ok: false,
        erro: 'Usuário sem acesso ativo ao FarmSafe.',
      },
      403
    )
  }

  if (!['dono', 'admin_empresa', 'gerente'].includes(gestor.role)) {
    return jsonResponse(
      req,
      {
        ok: false,
        erro: 'Você não tem permissão para convidar usuários.',
      },
      403
    )
  }

  let payload: ConvitePayload

  try {
    payload = await req.json()
  } catch {
    return jsonResponse(
      req,
      {
        ok: false,
        erro: 'Payload inválido.',
      },
      400
    )
  }

  const nome = String(payload.nome ?? '').trim()
  const email = normalizarEmail(String(payload.email ?? ''))
  const cargo = String(payload.cargo ?? '').trim() || null
  const telefone = String(payload.telefone ?? '').trim() || null
  const role = payload.role

  if (!nome) {
    return jsonResponse(
      req,
      {
        ok: false,
        erro: 'Nome é obrigatório.',
      },
      400
    )
  }

  if (!email || !validarEmail(email)) {
    return jsonResponse(
      req,
      {
        ok: false,
        erro: 'E-mail inválido.',
      },
      400
    )
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return jsonResponse(
      req,
      {
        ok: false,
        erro: 'Perfil inválido.',
      },
      400
    )
  }

  if (!podeCriarPerfil(gestor.role, role)) {
    return jsonResponse(
      req,
      {
        ok: false,
        erro: 'Seu perfil não pode convidar usuário com esse nível de acesso.',
      },
      403
    )
  }

  const { data: usuarioExistente } = await adminClient
    .from('usuarios')
    .select('id')
    .eq('empresa_id', gestor.empresa_id)
    .eq('email', email)
    .maybeSingle()

  if (usuarioExistente) {
    return jsonResponse(
      req,
      {
        ok: false,
        erro: 'Já existe um usuário com este e-mail nesta empresa.',
      },
      409
    )
  }

  const redirectTo = `${WEB_APP_URL.replace(/\/$/, '')}/login`

  const { data: convite, error: conviteError } =
    await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        nome,
        empresa_id: gestor.empresa_id,
        role,
      },
    })

  if (conviteError || !convite.user?.id) {
    console.error('Erro ao criar convite:', conviteError)

    return jsonResponse(
      req,
      {
        ok: false,
        erro: 'Não foi possível enviar o convite. Verifique o e-mail e tente novamente.',
      },
      400
    )
  }

  const authUserId = convite.user.id

  const { data: perfil, error: perfilError } = await adminClient
    .from('usuarios')
    .insert({
      auth_user_id: authUserId,
      empresa_id: gestor.empresa_id,
      nome,
      email,
      cargo,
      telefone,
      role,
      ativo: true,
      created_by: gestor.id,
    })
    .select(
      'id, auth_user_id, empresa_id, nome, email, cargo, telefone, role, ativo, created_at, updated_at'
    )
    .single()

  if (perfilError) {
    console.error('Erro ao criar perfil do usuário:', perfilError)

    await adminClient.auth.admin.deleteUser(authUserId)

    return jsonResponse(
      req,
      {
        ok: false,
        erro: 'Não foi possível concluir o convite. Tente novamente.',
      },
      400
    )
  }

  return jsonResponse(
    req,
    {
      ok: true,
      mensagem: 'Convite enviado com sucesso.',
      usuario: perfil,
    },
    201
  )
})