import { useEffect, useState } from 'react'
import {
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Power,
  X,
  Save,
  Package,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'

import { supabase, type Cocho, type Fazenda, type Lote, type Retiro } from '../services/supabase'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import SectionCard from '../components/ui/SectionCard'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'
import QRCodeCard from '../components/QRCodeCard'
import { getEmpresaUsuario } from '../services/auth'

type FormCocho = {
  id?: string
  nome: string
  codigo_qr: string
  fazenda_id: string
  retiro_id: string
  lote_id: string
  tipo_sal: string
  capacidade_kg: string
  ativo: boolean
}

const formInicial: FormCocho = {
  nome: '',
  codigo_qr: '',
  fazenda_id: '',
  retiro_id: '',
  lote_id: '',
  tipo_sal: 'sal_mineral',
  capacidade_kg: '',
  ativo: true,
}

export default function CochosPage() {
  const [cochos, setCochos] = useState<Cocho[]>([])
  const [fazendas, setFazendas] = useState<Fazenda[]>([])
  const [retiros, setRetiros] = useState<Retiro[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [search, setSearch] = useState('')
  const [apenasAtivos, setApenasAtivos] = useState(true)

  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<FormCocho>(formInicial)

  async function load() {
    setLoading(true)

    let q = supabase
      .from('cochos')
      .select(
        '*, fazenda:fazendas(nome,codigo), lote:lotes(nome), retiro:retiros(nome)'
      )
      .order('nome')

    if (apenasAtivos) {
      q = q.eq('ativo', true)
    }

    const [
      { data: cochosData, error: cochosError },
      { data: fazendasData },
      { data: retirosData },
      { data: lotesData },
    ] = await Promise.all([
      q,
      supabase.from('fazendas').select('*').order('nome'),
      supabase.from('retiros').select('*').order('nome'),
      supabase.from('lotes').select('*').order('nome'),
    ])

    if (cochosError) {
      console.error(cochosError)
      setCochos([])
    } else {
      setCochos((cochosData as Cocho[]) ?? [])
    }

    setFazendas((fazendasData as Fazenda[]) ?? [])
    setRetiros((retirosData as Retiro[]) ?? [])
    setLotes((lotesData as Lote[]) ?? [])

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [apenasAtivos])

  const filtered = search.trim()
    ? cochos.filter((c) =>
        c.nome.toLowerCase().includes(search.toLowerCase()) ||
        c.codigo_qr.toLowerCase().includes(search.toLowerCase()) ||
        c.lote?.nome?.toLowerCase().includes(search.toLowerCase()) ||
        c.tipo_sal?.toLowerCase().includes(search.toLowerCase())
      )
    : cochos

  const contadores = {
    total: cochos.length,
    ativos: cochos.filter((c) => c.ativo).length,
    inativos: cochos.filter((c) => !c.ativo).length,
  }

  function abrirNovo() {
    setForm(formInicial)
    setModalAberto(true)
  }

  function abrirEditar(cocho: Cocho) {
    setForm({
      id: cocho.id,
      nome: cocho.nome,
      codigo_qr: cocho.codigo_qr,
      fazenda_id: cocho.fazenda_id,
      retiro_id: cocho.retiro_id ?? '',
      lote_id: cocho.lote_id ?? '',
      tipo_sal: cocho.tipo_sal ?? 'sal_mineral',
      capacidade_kg: cocho.capacidade_kg
        ? String(cocho.capacidade_kg)
        : '',
      ativo: cocho.ativo,
    })

    setModalAberto(true)
  }

  async function gerarCodigoAutomatico() {
    if (!form.fazenda_id) {
      alert('Selecione a fazenda antes.')
      return
    }

    const { data, error } = await supabase.rpc(
      'gerar_codigo_cocho',
      {
        p_fazenda_id: form.fazenda_id,
      }
    )

    if (error) {
      console.error(error)
      alert('Erro ao gerar QR.')
      return
    }

    setForm((atual) => ({
      ...atual,
      codigo_qr: data,
    }))
  }

  async function salvarCocho() {
    if (!form.nome.trim()) {
      alert('Informe o nome do cocho.')
      return
    }

    if (!form.codigo_qr.trim()) {
      alert('Informe o código QR.')
      return
    }

    if (!form.fazenda_id) {
      alert('Selecione a fazenda.')
      return
    }

    setSalvando(true)
    
    const usuario = await getEmpresaUsuario()
    const empresa = usuario.empresa as any

    if (!empresa?.id) {
      alert('Empresa não encontrada.')
      return
    }

    const payload = {
      nome: form.nome.trim(),
      codigo_qr: form.codigo_qr.trim().toUpperCase(),
      empresa_id: empresa.id,
      fazenda_id: form.fazenda_id,
      retiro_id: form.retiro_id || null,
      lote_id: form.lote_id || null,
      tipo_sal: form.tipo_sal || null,
      capacidade_kg: form.capacidade_kg
        ? Number(form.capacidade_kg)
        : null,
      ativo: form.ativo,
    }

    const { error } = form.id
      ? await supabase
          .from('cochos')
          .update(payload)
          .eq('id', form.id)
      : await supabase
          .from('cochos')
          .insert(payload)

    setSalvando(false)

    if (error) {
      console.error(error)
      alert(`Erro ao salvar cocho: ${error.message}`)
      return
    }

    setModalAberto(false)
    setForm(formInicial)
    await load()
  }

  async function alternarAtivo(cocho: Cocho) {
    const confirmar = confirm(
      cocho.ativo
        ? `Deseja inativar o cocho "${cocho.nome}"?`
        : `Deseja ativar o cocho "${cocho.nome}"?`
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('cochos')
      .update({
        ativo: !cocho.ativo,
      })
      .eq('id', cocho.id)

    if (error) {
      console.error(error)
      alert(`Erro ao atualizar status: ${error.message}`)
      return
    }

    await load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cochos"
        description="Gestão operacional e rastreabilidade dos cochos da fazenda"
        action={
          <div className="flex items-center gap-2">
            <button onClick={abrirNovo} className="btn-primary">
              <Plus size={14} />
              Novo Cocho
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

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total de Cochos"
          value={contadores.total}
          icon={Package}
          color="bg-blue/10 text-blue"
        />
        <StatCard
          title="Cochos Ativos"
          value={contadores.ativos}
          icon={CheckCircle2}
          color="bg-green/10 text-green"
        />
        <StatCard
          title="Cochos Inativos"
          value={contadores.inativos}
          icon={AlertCircle}
          color="bg-amber/10 text-amber"
        />
      </div>

      <SectionCard title="Filtros e Busca">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />

            <input
              type="text"
              placeholder="Buscar por nome, código, lote, tipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-border rounded-lg text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-green/50 focus:ring-1 focus:ring-green/20 transition-colors"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer select-none hover:text-ink-primary transition-colors">
            <input
              type="checkbox"
              checked={apenasAtivos}
              onChange={(e) => setApenasAtivos(e.target.checked)}
              className="accent-green rounded"
            />
            Apenas ativos
          </label>

          <span className="ml-auto text-sm text-ink-muted font-mono">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </SectionCard>

      {loading ? (
        <SectionCard>
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-green/20 border-t-green rounded-full animate-spin" />
          </div>
        </SectionCard>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? 'Nenhum cocho encontrado' : 'Nenhum cocho cadastrado'}
          description={
            search
              ? 'Nenhum cocho atende aos critérios de busca.'
              : 'Comece adicionando um novo cocho à sua fazenda.'
          }
        />
      ) : (
        <SectionCard title="Lista de Cochos">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((cocho) => (
              <div
                key={cocho.id}
                className="border border-border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
              >
                <div className="mb-4">
                  <QRCodeCard cocho={cocho} />
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <p className="text-xs text-ink-muted">Nome</p>
                    <p className="text-sm font-semibold text-ink-primary mt-1">
                      {cocho.nome}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-ink-muted">Código QR</p>
                    <p className="text-xs font-mono text-ink-primary mt-1">
                      {cocho.codigo_qr}
                    </p>
                  </div>

                  {cocho.fazenda?.nome && (
                    <div>
                      <p className="text-xs text-ink-muted">Fazenda</p>
                      <p className="text-sm text-ink-primary mt-1">
                        {cocho.fazenda.nome}
                      </p>
                    </div>
                  )}

                  {cocho.lote?.nome && (
                    <div>
                      <p className="text-xs text-ink-muted">Lote</p>
                      <p className="text-sm text-ink-primary mt-1">
                        {cocho.lote.nome}
                      </p>
                    </div>
                  )}

                  {cocho.capacidade_kg && (
                    <div>
                      <p className="text-xs text-ink-muted">Capacidade</p>
                      <p className="text-sm text-ink-primary mt-1">
                        {cocho.capacidade_kg} kg
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border/50">
                  <StatusBadge status={cocho.ativo ? 'ok' : 'muted'}>
                    {cocho.ativo ? 'Ativo' : 'Inativo'}
                  </StatusBadge>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={() => abrirEditar(cocho)}
                    className="btn-ghost justify-center text-xs py-2 border border-border"
                  >
                    <Pencil size={13} />
                    Editar
                  </button>

                  <button
                    onClick={() => alternarAtivo(cocho)}
                    className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-lg border transition-all font-medium ${
                      cocho.ativo
                        ? 'border-amber/30 text-amber hover:bg-amber/10'
                        : 'border-green/30 text-green hover:bg-green/10'
                    }`}
                  >
                    <Power size={13} />
                    {cocho.ativo ? 'Inativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-border rounded-xl shadow-lg">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-ink-primary">
                  {form.id ? 'Editar Cocho' : 'Novo Cocho'}
                </h2>
                <p className="text-sm text-ink-muted mt-1">
                  Cadastre o cocho e gere o código usado pelo QR Code.
                </p>
              </div>

              <button
                onClick={() => setModalAberto(false)}
                className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-ink-muted hover:text-ink-primary hover:bg-surface/80 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-1">
                <label className="text-sm font-medium text-ink-primary">
                  Nome do Cocho
                </label>
                <input
                  value={form.nome}
                  onChange={(e) =>
                    setForm({ ...form, nome: e.target.value })
                  }
                  placeholder="Cocho 001"
                  className="mt-2 w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-green/50 focus:ring-1 focus:ring-green/20 transition-colors"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-ink-primary">
                  Código QR
                </label>

                <div className="mt-2 flex gap-2">
                  <input
                    value={form.codigo_qr}
                    readOnly
                    placeholder="Gerado automaticamente"
                    className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-ink-muted font-mono cursor-not-allowed"
                  />

                  <button
                    onClick={gerarCodigoAutomatico}
                    className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-ink-secondary hover:text-ink-primary hover:bg-surface transition-colors"
                  >
                    Gerar
                  </button>
                </div>
              </div>

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
                      codigo_qr: '',
                    })
                  }
                  className="mt-2 w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-ink-primary focus:outline-none focus:border-green/50 focus:ring-1 focus:ring-green/20 transition-colors"
                >
                  <option value="">Selecione uma fazenda</option>
                  {fazendas.map((fazenda) => (
                    <option key={fazenda.id} value={fazenda.id}>
                      {fazenda.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-ink-primary">
                  Retiro
                </label>
                <select
                  value={form.retiro_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      retiro_id: e.target.value,
                    })
                  }
                  className="mt-2 w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-ink-primary focus:outline-none focus:border-green/50 focus:ring-1 focus:ring-green/20 transition-colors"
                >
                  <option value="">Sem retiro</option>
                  {retiros
                    .filter(
                      (r) =>
                        !form.fazenda_id ||
                        r.fazenda_id === form.fazenda_id
                    )
                    .map((retiro) => (
                      <option key={retiro.id} value={retiro.id}>
                        {retiro.nome}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-ink-primary">
                  Lote
                </label>
                <select
                  value={form.lote_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      lote_id: e.target.value,
                    })
                  }
                  className="mt-2 w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-ink-primary focus:outline-none focus:border-green/50 focus:ring-1 focus:ring-green/20 transition-colors"
                >
                  <option value="">Sem lote</option>
                  {lotes
                    .filter(
                      (l) =>
                        !form.fazenda_id ||
                        l.fazenda_id === form.fazenda_id
                    )
                    .map((lote) => (
                      <option key={lote.id} value={lote.id}>
                        {lote.nome}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-ink-primary">
                  Tipo de Sal/Abastecimento
                </label>
                <input
                  value={form.tipo_sal}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tipo_sal: e.target.value,
                    })
                  }
                  placeholder="sal_mineral"
                  className="mt-2 w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-green/50 focus:ring-1 focus:ring-green/20 transition-colors"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-ink-primary">
                  Capacidade (kg)
                </label>
                <input
                  value={form.capacidade_kg}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      capacidade_kg: e.target.value,
                    })
                  }
                  type="number"
                  placeholder="100"
                  className="mt-2 w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-green/50 focus:ring-1 focus:ring-green/20 transition-colors"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-ink-secondary mt-2 md:col-span-1">
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
                <span className="font-medium">Cocho ativo</span>
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
                onClick={salvarCocho}
                disabled={salvando}
                className="btn-primary"
              >
                <Save size={14} />
                {salvando ? 'Salvando...' : 'Salvar Cocho'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}