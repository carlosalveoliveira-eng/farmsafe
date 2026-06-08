import { getEmpresaUsuario } from '../services/auth'
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
  AlertCircle,
  Activity,
} from 'lucide-react'

import {
  supabase,
  type Dispositivo,
  type Fazenda,
} from '../services/supabase'

import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import SectionCard from '../components/ui/SectionCard'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'

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
  const online = dispositivos.filter((d) => d.ativo && isRecente(d.ultimo_sync))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispositivos"
        description="Controle operacional e rastreabilidade dos dispositivos de campo"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={abrirNovo}
              className="btn-primary"
            >
              <Plus size={14} />
              Novo Dispositivo
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Dispositivos"
          value={dispositivos.length}
          icon={Smartphone}
          color="bg-blue/10 text-blue"
        />
        <StatCard
          title="Dispositivos Ativos"
          value={ativos.length}
          icon={Activity}
          color="bg-green/10 text-green"
        />
        <StatCard
          title="Online Agora"
          value={online.length}
          icon={Wifi}
          color="bg-emerald/10 text-emerald"
        />
        <StatCard
          title="Inativos"
          value={inativos.length}
          icon={AlertCircle}
          color="bg-amber/10 text-amber"
        />
      </div>

      {dispositivos.length > 3 && (
        <SectionCard>
          <div className="bg-amber/10 border border-amber/30 rounded-lg p-4">
            <p className="text-sm font-semibold text-amber">
              Limite de dispositivos próximo
            </p>

            <p className="text-sm text-ink-muted mt-2">
              Este plano permite até 3 dispositivos. Para cadastrar mais usuários/tratadores,
              será necessário aumentar o plano.
            </p>
          </div>
        </SectionCard>
      )}

      {loading ? (
        <SectionCard>
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-green/20 border-t-green rounded-full animate-spin" />
          </div>
        </SectionCard>
      ) : dispositivos.length === 0 ? (
        <EmptyState
          title="Nenhum dispositivo cadastrado"
          description="Comece adicionando um novo dispositivo para rastrear seus tratadores no campo."
        />
      ) : (
        <SectionCard title="Dispositivos Operacionais">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dispositivos.map((dispositivo) => {
              const isOnline = isRecente(dispositivo.ultimo_sync)

              return (
                <div
                  key={dispositivo.id}
                  className={`border border-border rounded-lg p-4 bg-white transition-all ${
                    !dispositivo.ativo ? 'opacity-60' : 'hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`p-2 rounded-lg flex-shrink-0 ${
                          isOnline ? 'bg-emerald/10' : 'bg-surface'
                        }`}
                      >
                        <Smartphone
                          size={18}
                          className={
                            isOnline
                              ? 'text-emerald'
                              : 'text-ink-muted'
                          }
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-ink-primary">
                          {dispositivo.nome}
                        </h3>

                        {dispositivo.tratador_nome && (
                          <p className="text-xs text-ink-muted mt-1">
                            {dispositivo.tratador_nome}
                          </p>
                        )}
                      </div>
                    </div>

                    <StatusBadge status={
                      !dispositivo.ativo
                        ? 'muted'
                        : isOnline
                        ? 'ok'
                        : 'warn'
                    }>
                      {!dispositivo.ativo
                        ? 'Inativo'
                        : isOnline
                        ? 'Online'
                        : 'Offline'}
                    </StatusBadge>
                  </div>

                  <div className="space-y-3 mb-4 pb-4 border-b border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-muted">Fazenda</span>
                      <span className="text-sm font-semibold text-ink-primary">
                        {dispositivo.fazenda?.nome ?? '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-muted flex items-center gap-1">
                        {isOnline ? (
                          <Wifi size={12} className="text-emerald" />
                        ) : (
                          <WifiOff size={12} className="text-ink-muted" />
                        )}
                        Último sync
                      </span>

                      <span
                        className={`text-sm font-mono font-semibold ${
                          isOnline
                            ? 'text-emerald'
                            : 'text-ink-muted'
                        }`}
                      >
                        {fmtRelativo(dispositivo.ultimo_sync)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-surface rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-semibold text-ink-muted">
                          Código de Ativação
                        </p>

                        <p className="font-mono text-xs text-ink-primary mt-2 font-semibold">
                          {dispositivo.device_secret ?? '—'}
                        </p>
                      </div>

                      {dispositivo.device_secret && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(dispositivo.device_secret!)
                            alert('Código copiado!')
                          }}
                          className="w-9 h-9 rounded-lg bg-white border border-border flex items-center justify-center text-ink-muted hover:text-ink-primary hover:bg-surface transition-colors flex-shrink-0"
                          title="Copiar código"
                        >
                          <Copy size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => abrirEditar(dispositivo)}
                      className="btn-ghost justify-center text-xs py-2 border border-border"
                    >
                      <Pencil size={13} />
                      Editar
                    </button>

                    <button
                      onClick={() => alternarAtivo(dispositivo)}
                      className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-lg border transition-all font-medium ${
                        dispositivo.ativo
                          ? 'border-amber/30 text-amber hover:bg-amber/10'
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
        </SectionCard>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white border border-border rounded-xl shadow-lg">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-ink-primary">
                  {form.id
                    ? 'Editar Dispositivo'
                    : 'Novo Dispositivo'}
                </h2>

                <p className="text-sm text-ink-muted mt-1">
                  Cadastre o celular usado pelo tratador no campo.
                </p>
              </div>

              <button
                onClick={() => setModalAberto(false)}
                className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-ink-muted hover:text-ink-primary hover:bg-surface/80 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium text-ink-primary">
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
                  className="mt-2 w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-ink-primary focus:outline-none focus:border-green/50 focus:ring-1 focus:ring-green/20 transition-colors"
                >
                  <option value="">Selecione uma fazenda</option>

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
                <label className="text-sm font-medium text-ink-primary">
                  Nome do Dispositivo
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
                  className="mt-2 w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-green/50 focus:ring-1 focus:ring-green/20 transition-colors"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-ink-primary">
                  Nome do Tratador
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
                  className="mt-2 w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-green/50 focus:ring-1 focus:ring-green/20 transition-colors"
                />
              </div>

              {!form.id && (
                <div>
                  <label className="text-sm font-medium text-ink-primary">
                    Código Interno do Dispositivo
                  </label>

                  <div className="mt-2 flex gap-2">
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
                      className="flex-1 px-3 py-2 bg-white border border-border rounded-lg text-sm text-ink-primary font-mono focus:outline-none focus:border-green/50 focus:ring-1 focus:ring-green/20 transition-colors"
                    />

                    <button
                      onClick={() =>
                        setForm({
                          ...form,
                          device_secret: gerarDeviceSecret(),
                        })
                      }
                      className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-ink-secondary hover:text-ink-primary hover:bg-surface transition-colors flex items-center gap-2"
                    >
                      <KeyRound size={14} />
                      Gerar
                    </button>
                  </div>

                  <p className="text-sm text-ink-muted mt-2">
                    Esse código será configurado no celular do tratador uma única vez.
                  </p>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ativo: e.target.checked,
                    })
                  }
                  className="accent-green rounded"
                />
                <span className="font-medium">Dispositivo ativo</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface/30">
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
                  : 'Salvar Dispositivo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}