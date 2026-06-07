import { getEmpresaUsuario } from '../services/Auth'
import { useEffect, useState } from 'react'
import {
  Smartphone,
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
  Pencil,
  Power,
  X,
  Save,
  KeyRound,
  Copy,
} from 'lucide-react'

import {
  supabase,
  type Dispositivo,
  type Fazenda,
} from '../services/supabase'

import PageHeader from '../components/PageHeader'

type FormDispositivo = {
  id?: string
  fazenda_id: string
  nome: string
  tratador_nome: string
  device_secret: string
  ativo: boolean
}

const formInicial: FormDispositivo = {
  fazenda_id: '',
  nome: '',
  tratador_nome: '',
  device_secret: '',
  ativo: true,
}

function fmtRelativo(iso: string | null) {
  if (!iso) return 'Nunca'

  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)

  if (min < 1) return 'Agora há pouco'
  if (min < 60) return `${min} min atrás`

  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h atrás`

  const d = Math.floor(h / 24)
  return `${d} dia${d > 1 ? 's' : ''} atrás`
}

function isRecente(iso: string | null) {
  if (!iso) return false

  return Date.now() - new Date(iso).getTime() < 30 * 60_000
}

function gerarDeviceSecret() {
  const numero = Math.floor(100000 + Math.random() * 900000)

  return `DEV-${numero}`
}

export default function DispositivosPage() {
  const [dispositivos, setDispositivos] =
    useState<Dispositivo[]>([])

  const [fazendas, setFazendas] =
    useState<Fazenda[]>([])

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] =
    useState<FormDispositivo>(formInicial)

  async function load() {
    setLoading(true)

    const [
      { data: dispositivosData, error: dispositivosError },
      { data: fazendasData },
    ] = await Promise.all([
      supabase
        .from('dispositivos')
        .select('*, fazenda:fazendas(nome,codigo), device_secret')
        .order('nome'),

      supabase
        .from('fazendas')
        .select('*')
        .eq('ativo', true)
        .order('nome'),
    ])

    if (dispositivosError) {
      console.error(dispositivosError)
      setDispositivos([])
    } else {
      setDispositivos(
        (dispositivosData as Dispositivo[]) ?? []
      )
    }

    setFazendas((fazendasData as Fazenda[]) ?? [])

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function abrirNovo() {
    setForm({
      ...formInicial,
      device_secret: gerarDeviceSecret(),
    })

    setModalAberto(true)
  }

  function abrirEditar(dispositivo: Dispositivo) {
    setForm({
      id: dispositivo.id,
      fazenda_id: dispositivo.fazenda_id,
      nome: dispositivo.nome,
      tratador_nome: dispositivo.tratador_nome ?? '',
      device_secret:
        // o tipo atual não tem device_secret por segurança visual,
        // então só permite alterar se vier do Supabase no select futuro
        '',
      ativo: dispositivo.ativo,
    })

    setModalAberto(true)
  }

  async function salvarDispositivo() {
  if (!form.nome.trim()) {
    alert('Informe o nome do dispositivo.')
    return
  }

  if (!form.fazenda_id) {
    alert('Selecione a fazenda.')
    return
  }

  if (!form.id && !form.device_secret.trim()) {
    alert('Gere ou informe o código interno do dispositivo.')
    return
  }

  setSalvando(true)

  try {
    const usuario = await getEmpresaUsuario()

    const empresa = usuario.empresa as any

    if (!empresa?.id) {
      alert('Empresa não encontrada.')
      return
    }

    // LIMITE DO PLANO
    if (!form.id) {
      const totalDispositivos = dispositivos.length

      if (
        empresa.max_dispositivos &&
        totalDispositivos >= empresa.max_dispositivos
      ) {
        alert(
          `Seu plano permite apenas ${empresa.max_dispositivos} dispositivo(s).`
        )

        return
      }
    }

    const payloadNovo = {
      fazenda_id: form.fazenda_id,
      nome: form.nome.trim(),
      tratador_nome: form.tratador_nome.trim() || null,
      device_secret: form.device_secret.trim().toUpperCase(),
      ativo: form.ativo,
      empresa_id: empresa.id,
    }

    const payloadEdicao = {
      fazenda_id: form.fazenda_id,
      nome: form.nome.trim(),
      tratador_nome: form.tratador_nome.trim() || null,
      ativo: form.ativo,
      empresa_id: empresa.id,
    }

    const { error } = form.id
      ? await supabase
          .from('dispositivos')
          .update(payloadEdicao)
          .eq('id', form.id)

      : await supabase
          .from('dispositivos')
          .insert(payloadNovo)

    if (error) {
      console.error(error)
      alert(`Erro ao salvar dispositivo: ${error.message}`)
      return
    }

    setModalAberto(false)

    await load()
  } finally {
    setSalvando(false)
  }
}

  async function alternarAtivo(dispositivo: Dispositivo) {
    const confirmar = confirm(
      dispositivo.ativo
        ? `Deseja inativar o dispositivo "${dispositivo.nome}"?`
        : `Deseja ativar o dispositivo "${dispositivo.nome}"?`
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('dispositivos')
      .update({
        ativo: !dispositivo.ativo,
      })
      .eq('id', dispositivo.id)

    if (error) {
      console.error(error)
      alert(`Erro ao atualizar status: ${error.message}`)
      return
    }

    await load()
  }

  const ativos = dispositivos.filter((d) => d.ativo)
  const inativos = dispositivos.filter((d) => !d.ativo)

  return (
    <div>
      <PageHeader
        title="Dispositivos"
        subtitle={`${ativos.length} ativo${
          ativos.length !== 1 ? 's' : ''
        } · ${inativos.length} inativo${
          inativos.length !== 1 ? 's' : ''
        }`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={abrirNovo}
              className="btn-primary"
            >
              <Plus size={14} />
              Novo dispositivo
            </button>

            <button
              onClick={load}
              disabled={loading}
              className="btn-ghost"
            >
              <RefreshCw
                size={14}
                className={loading ? 'animate-spin' : ''}
              />
              Atualizar
            </button>
          </div>
        }
      />

      {dispositivos.length > 3 && (
  <div className="mb-6 bg-warn/10 border border-warn/30 rounded-lg p-4">
    <p className="text-sm text-warn font-medium">
      Limite de dispositivos excedido
    </p>

    <p className="text-xs text-ink-muted mt-1">
      Este plano permite até 3 dispositivos. Para cadastrar mais usuários/tratadores,
      será necessário aumentar o plano.
    </p>
  </div>
)}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
        </div>
      ) : dispositivos.length === 0 ? (
        <div className="py-24 text-center text-ink-muted text-sm">
          Nenhum dispositivo cadastrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {dispositivos.map((dispositivo) => {
            const online = isRecente(dispositivo.ultimo_sync)

            return (
              <div
                key={dispositivo.id}
                className={`fs-card p-5 flex flex-col gap-4 ${
                  !dispositivo.ativo ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-md ${
                        online ? 'bg-ok/10' : 'bg-surface'
                      }`}
                    >
                      <Smartphone
                        size={16}
                        className={
                          online
                            ? 'text-ok'
                            : 'text-ink-muted'
                        }
                      />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-ink-primary">
                        {dispositivo.nome}
                      </p>

                      {dispositivo.tratador_nome && (
                        <p className="text-xs text-ink-muted">
                          {dispositivo.tratador_nome}
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className={`badge ${
                      dispositivo.ativo
                        ? online
                          ? 'badge-ok'
                          : 'badge-muted'
                        : 'badge-muted'
                    }`}
                  >
                    {!dispositivo.ativo
                      ? 'inativo'
                      : online
                      ? 'online'
                      : 'offline'}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-xs text-ink-muted">
                  <div className="flex items-center justify-between">
                    <span>Fazenda</span>
                    <span className="text-ink-secondary font-medium">
                      {dispositivo.fazenda?.nome ?? '—'}
                      {dispositivo.fazenda?.codigo && (
                        <span className="ml-1 font-mono text-ink-muted">
                          ({dispositivo.fazenda.codigo})
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      {online ? (
                        <Wifi size={11} className="text-ok" />
                      ) : (
                        <WifiOff size={11} />
                      )}
                      Último sync
                    </span>

                    <span
                      className={`font-mono ${
                        online
                          ? 'text-ok'
                          : 'text-ink-muted'
                      }`}
                    >
                      {fmtRelativo(dispositivo.ultimo_sync)}
                    </span>
                  </div>
                </div>
                <div className="bg-canvas border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-ink-muted">
                        Código de ativação
                      </p>

                      <p className="font-mono text-xs text-ink-primary mt-1">
                        {dispositivo.device_secret ?? '—'}
                      </p>
                    </div>

                    {dispositivo.device_secret && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(dispositivo.device_secret!)
                          alert('Código copiado!')
                        }}
                        className="w-8 h-8 rounded-md bg-surface border border-border flex items-center justify-center text-ink-muted hover:text-ink-primary"
                        title="Copiar código"
                      >
                        <Copy size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <p className="font-mono text-[10px] text-ink-muted/50 truncate border-t border-border pt-3">
                  {dispositivo.id}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => abrirEditar(dispositivo)}
                    className="btn-ghost justify-center text-xs border border-border"
                  >
                    <Pencil size={13} />
                    Editar
                  </button>

                  <button
                    onClick={() => alternarAtivo(dispositivo)}
                    className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-md border transition-colors ${
                      dispositivo.ativo
                        ? 'border-warn/30 text-warn hover:bg-warn/10'
                        : 'border-green/30 text-green hover:bg-green/10'
                    }`}
                  >
                    <Power size={13} />
                    {dispositivo.ativo
                      ? 'Inativar'
                      : 'Ativar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-xl bg-surface border border-border rounded-xl shadow-panel">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-ink-primary">
                  {form.id
                    ? 'Editar dispositivo'
                    : 'Novo dispositivo'}
                </h2>

                <p className="text-xs text-ink-muted mt-1">
                  Cadastre o celular usado pelo tratador no campo.
                </p>
              </div>

              <button
                onClick={() => setModalAberto(false)}
                className="w-9 h-9 rounded-md bg-panel border border-border flex items-center justify-center text-ink-muted hover:text-ink-primary"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 gap-4">
              <div>
                <label className="text-xs text-ink-muted">
                  Fazenda
                </label>

                <select
                  value={form.fazenda_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fazenda_id: e.target.value,
                    })
                  }
                  className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50"
                >
                  <option value="">Selecione</option>

                  {fazendas.map((fazenda) => (
                    <option
                      key={fazenda.id}
                      value={fazenda.id}
                    >
                      {fazenda.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-ink-muted">
                  Nome do dispositivo
                </label>

                <input
                  value={form.nome}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      nome: e.target.value,
                    })
                  }
                  placeholder="Celular João"
                  className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50"
                />
              </div>

              <div>
                <label className="text-xs text-ink-muted">
                  Nome do tratador
                </label>

                <input
                  value={form.tratador_nome}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tratador_nome: e.target.value,
                    })
                  }
                  placeholder="João da Silva"
                  className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50"
                />
              </div>

              {!form.id && (
                <div>
                  <label className="text-xs text-ink-muted">
                    Código interno do dispositivo
                  </label>

                  <div className="mt-1 flex gap-2">
                    <input
                      value={form.device_secret}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          device_secret:
                            e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="DEV-123456"
                      className="flex-1 px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary font-mono focus:outline-none focus:border-green/50"
                    />

                    <button
                      onClick={() =>
                        setForm({
                          ...form,
                          device_secret: gerarDeviceSecret(),
                        })
                      }
                      className="px-3 py-2 rounded-md border border-border text-xs text-ink-secondary hover:text-ink-primary flex items-center gap-2"
                    >
                      <KeyRound size={13} />
                      Gerar
                    </button>
                  </div>

                  <p className="text-xs text-ink-muted mt-2">
                    Esse código será configurado no celular do
                    tratador uma única vez.
                  </p>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-ink-secondary">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ativo: e.target.checked,
                    })
                  }
                  className="accent-green"
                />
                Dispositivo ativo
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
              <button
                onClick={() => setModalAberto(false)}
                className="btn-ghost"
              >
                Cancelar
              </button>

              <button
                onClick={salvarDispositivo}
                disabled={salvando}
                className="btn-primary"
              >
                <Save size={14} />
                {salvando
                  ? 'Salvando...'
                  : 'Salvar dispositivo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}