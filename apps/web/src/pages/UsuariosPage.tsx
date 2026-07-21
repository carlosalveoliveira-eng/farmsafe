import { useEffect, useMemo, useState } from 'react'
import {
  RefreshCw,
  ShieldCheck,
  UserCog,
  UserX,
  Users,
  Pencil,
  Save,
  X,
} from 'lucide-react'

import { supabase } from '../services/supabase'
import PageHeader from '../components/ui/PageHeader'
import SectionCard from '../components/ui/SectionCard'

type PerfilSistema =
  | 'dono'
  | 'admin_empresa'
  | 'gerente'
  | 'controller'
  | 'escritorio'

type UsuarioPainel = {
  id: string
  auth_user_id: string
  empresa_id: string
  nome: string
  email: string | null
  cargo: string | null
  telefone: string | null
  role: PerfilSistema
  ativo: boolean
  created_at: string | null
  updated_at: string | null
}

type UsuarioForm = {
  id: string
  nome: string
  email: string
  cargo: string
  telefone: string
  role: PerfilSistema
  ativo: boolean
}

const PERFIS: Array<{
  value: PerfilSistema
  label: string
  description: string
}> = [
  {
    value: 'dono',
    label: 'Dono',
    description: 'Controle total da empresa.',
  },
  {
    value: 'admin_empresa',
    label: 'Admin empresa',
    description: 'Administração da empresa e usuários.',
  },
  {
    value: 'gerente',
    label: 'Gerente',
    description: 'Gestão operacional completa.',
  },
  {
    value: 'controller',
    label: 'Controller',
    description: 'Relatórios, auditoria e controle.',
  },
  {
    value: 'escritorio',
    label: 'Escritório',
    description: 'Rotina administrativa e consultas.',
  },
]

function perfilLabel(role: string) {
  return PERFIS.find((p) => p.value === role)?.label ?? role
}

function roleBadgeClass(role: string) {
  if (role === 'dono') return 'bg-green/10 text-green border-green/20'
  if (role === 'admin_empresa') return 'bg-blue/10 text-blue-700 border-blue/20'
  if (role === 'gerente') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (role === 'controller') return 'bg-amber/10 text-amber-700 border-amber/20'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function formatarData(value: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioPainel[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<UsuarioForm | null>(null)

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    if (!termo) return usuarios

    return usuarios.filter((usuario) => {
      return [
        usuario.nome,
        usuario.email,
        usuario.cargo,
        usuario.telefone,
        perfilLabel(usuario.role),
      ]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo))
    })
  }, [usuarios, busca])

  async function carregarUsuarios() {
    setLoading(true)
    setErro(null)

    const { data, error } = await supabase.rpc('admin_listar_usuarios')

    if (error) {
      console.error(error)
      setErro(error.message)
      setUsuarios([])
    } else {
      setUsuarios((data as UsuarioPainel[]) ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    carregarUsuarios()
  }, [])

  function abrirEdicao(usuario: UsuarioPainel) {
    setEditando({
      id: usuario.id,
      nome: usuario.nome ?? '',
      email: usuario.email ?? '',
      cargo: usuario.cargo ?? '',
      telefone: usuario.telefone ?? '',
      role: usuario.role,
      ativo: usuario.ativo,
    })
  }

  async function salvarUsuario() {
    if (!editando) return

    if (!editando.nome.trim()) {
      alert('Informe o nome do usuário.')
      return
    }

    setSalvando(true)

    const { data, error } = await supabase.rpc('admin_atualizar_usuario', {
      p_usuario_id: editando.id,
      p_nome: editando.nome,
      p_email: editando.email || null,
      p_cargo: editando.cargo || null,
      p_telefone: editando.telefone || null,
      p_role: editando.role,
      p_ativo: editando.ativo,
    })

    setSalvando(false)

    if (error) {
      alert('Erro ao salvar usuário: ' + error.message)
      return
    }

    if (data && data.ok === false) {
      alert(data.erro ?? 'Não foi possível salvar o usuário.')
      return
    }

    setEditando(null)
    await carregarUsuarios()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários e Perfis"
        description="Controle de acesso dos usuários do painel FarmSafe"
        action={
          <button
            onClick={carregarUsuarios}
            disabled={loading}
            className="btn-ghost"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted">Total</span>
            <Users size={16} className="text-green" />
          </div>
          <p className="text-2xl font-bold mt-2">{usuarios.length}</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted">Ativos</span>
            <ShieldCheck size={16} className="text-green" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {usuarios.filter((u) => u.ativo).length}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted">Inativos</span>
            <UserX size={16} className="text-red" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {usuarios.filter((u) => !u.ativo).length}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted">Gestores</span>
            <UserCog size={16} className="text-blue" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {
              usuarios.filter((u) =>
                ['dono', 'admin_empresa', 'gerente'].includes(u.role)
              ).length
            }
          </p>
        </div>
      </div>

      <SectionCard title="Usuários da empresa">
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, e-mail, cargo ou perfil..."
            className="w-full md:max-w-md h-10 rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-green/40 focus:ring-4 focus:ring-green/10"
          />

          <div className="rounded-xl bg-amber/10 border border-amber/20 px-3 py-2">
            <p className="text-xs text-amber-800 font-medium">
              Criação de novos usuários será feita na próxima etapa com convite seguro.
            </p>
          </div>
        </div>

        {erro ? (
          <div className="rounded-xl border border-red/20 bg-red/10 p-4 text-sm text-red font-medium">
            {erro}
          </div>
        ) : loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-3 border-green/20 border-t-green rounded-full animate-spin" />
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-ink-muted">
              Nenhum usuário encontrado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px]">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 px-3 text-xs font-semibold text-ink-muted">
                    Usuário
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold text-ink-muted">
                    Perfil
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold text-ink-muted">
                    Cargo
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold text-ink-muted">
                    Status
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold text-ink-muted">
                    Criado em
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold text-ink-muted text-right">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {usuariosFiltrados.map((usuario) => (
                  <tr
                    key={usuario.id}
                    className="border-b border-border/70 hover:bg-surface/60"
                  >
                    <td className="py-3 px-3">
                      <p className="text-sm font-semibold text-ink-primary">
                        {usuario.nome}
                      </p>

                      <p className="text-xs text-ink-muted mt-0.5">
                        {usuario.email || 'E-mail não informado'}
                      </p>

                      <p className="text-[11px] text-ink-muted font-mono mt-1">
                        {usuario.auth_user_id}
                      </p>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${roleBadgeClass(
                          usuario.role
                        )}`}
                      >
                        {perfilLabel(usuario.role)}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-sm text-ink-muted">
                      {usuario.cargo || '—'}
                    </td>

                    <td className="py-3 px-3">
                      {usuario.ativo ? (
                        <span className="inline-flex rounded-full bg-green/10 text-green px-2.5 py-1 text-xs font-bold">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-red/10 text-red px-2.5 py-1 text-xs font-bold">
                          Inativo
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-sm text-ink-muted">
                      {formatarData(usuario.created_at)}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => abrirEdicao(usuario)}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink-secondary hover:text-green hover:border-green/30"
                      >
                        <Pencil size={13} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {editando && (
        <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-border shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-ink-primary">
                  Editar usuário
                </h2>
                <p className="text-sm text-ink-muted mt-1">
                  Atualize dados administrativos, perfil e status.
                </p>
              </div>

              <button
                onClick={() => setEditando(null)}
                className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-surface"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-ink-muted">
                  Nome
                </label>
                <input
                  value={editando.nome}
                  onChange={(event) =>
                    setEditando({ ...editando, nome: event.target.value })
                  }
                  className="mt-2 w-full h-10 rounded-xl border border-border px-3 text-sm outline-none focus:border-green/40 focus:ring-4 focus:ring-green/10"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-ink-muted">
                  E-mail
                </label>
                <input
                  value={editando.email}
                  onChange={(event) =>
                    setEditando({ ...editando, email: event.target.value })
                  }
                  className="mt-2 w-full h-10 rounded-xl border border-border px-3 text-sm outline-none focus:border-green/40 focus:ring-4 focus:ring-green/10"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-ink-muted">
                  Cargo
                </label>
                <input
                  value={editando.cargo}
                  onChange={(event) =>
                    setEditando({ ...editando, cargo: event.target.value })
                  }
                  placeholder="Ex.: gerente, escritório, controller..."
                  className="mt-2 w-full h-10 rounded-xl border border-border px-3 text-sm outline-none focus:border-green/40 focus:ring-4 focus:ring-green/10"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-ink-muted">
                  Telefone
                </label>
                <input
                  value={editando.telefone}
                  onChange={(event) =>
                    setEditando({ ...editando, telefone: event.target.value })
                  }
                  placeholder="(00) 00000-0000"
                  className="mt-2 w-full h-10 rounded-xl border border-border px-3 text-sm outline-none focus:border-green/40 focus:ring-4 focus:ring-green/10"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-ink-muted">
                  Perfil
                </label>
                <select
                  value={editando.role}
                  onChange={(event) =>
                    setEditando({
                      ...editando,
                      role: event.target.value as PerfilSistema,
                    })
                  }
                  className="mt-2 w-full h-10 rounded-xl border border-border px-3 text-sm outline-none focus:border-green/40 focus:ring-4 focus:ring-green/10"
                >
                  {PERFIS.map((perfil) => (
                    <option key={perfil.value} value={perfil.value}>
                      {perfil.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-ink-muted">
                  Status
                </label>
                <select
                  value={editando.ativo ? 'ativo' : 'inativo'}
                  onChange={(event) =>
                    setEditando({
                      ...editando,
                      ativo: event.target.value === 'ativo',
                    })
                  }
                  className="mt-2 w-full h-10 rounded-xl border border-border px-3 text-sm outline-none focus:border-green/40 focus:ring-4 focus:ring-green/10"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              <div className="md:col-span-2 rounded-xl bg-surface border border-border p-4">
                <p className="text-xs font-bold text-ink-primary mb-2">
                  Perfis disponíveis
                </p>

                <div className="grid gap-2">
                  {PERFIS.map((perfil) => (
                    <div key={perfil.value} className="text-xs text-ink-muted">
                      <span className="font-semibold text-ink-primary">
                        {perfil.label}:
                      </span>{' '}
                      {perfil.description}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-surface/50 flex justify-end gap-2">
              <button
                onClick={() => setEditando(null)}
                className="px-4 py-2 rounded-xl border border-border bg-white text-sm font-semibold text-ink-secondary hover:bg-surface"
              >
                Cancelar
              </button>

              <button
                onClick={salvarUsuario}
                disabled={salvando}
                className="px-4 py-2 rounded-xl bg-green text-white text-sm font-semibold hover:bg-green/90 disabled:opacity-60 inline-flex items-center gap-2"
              >
                <Save size={15} />
                {salvando ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}