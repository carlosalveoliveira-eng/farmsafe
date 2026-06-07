import { useEffect, useState } from 'react'
import {
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Power,
  X,
  Save,
} from 'lucide-react'

import { supabase, type Cocho, type Fazenda, type Lote, type Retiro } from '../services/supabase'
import PageHeader from '../components/PageHeader'
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

  function gerarCodigoAutomatico() {
    const numero = String(cochos.length + 1).padStart(3, '0')

    setForm((atual) => ({
      ...atual,
      codigo_qr: `FS-COCHO-${numero}`,
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
    <div>
      <PageHeader
        title="Cochos"
        subtitle={`${cochos.length} cocho${
          cochos.length !== 1 ? 's' : ''
        } cadastrado${cochos.length !== 1 ? 's' : ''}`}
        action={
          <div className="flex items-center gap-2">
            <button onClick={abrirNovo} className="btn-primary">
              <Plus size={14} />
              Novo cocho
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

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />

          <input
            type="text"
            placeholder="Buscar cocho, lote, tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-surface border border-border rounded-md text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-green/50 transition-colors"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={apenasAtivos}
            onChange={(e) => setApenasAtivos(e.target.checked)}
            className="accent-green"
          />
          Apenas ativos
        </label>

        <span className="ml-auto text-xs text-ink-muted font-mono">
          {filtered.length} resultado
          {filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center text-ink-muted text-sm">
          {search
            ? 'Nenhum cocho encontrado para esta busca.'
            : 'Nenhum cocho cadastrado.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((cocho) => (
            <div key={cocho.id} className="flex flex-col gap-2">
              <QRCodeCard cocho={cocho} />

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => abrirEditar(cocho)}
                  className="btn-ghost justify-center text-xs border border-border"
                >
                  <Pencil size={13} />
                  Editar
                </button>

                <button
                  onClick={() => alternarAtivo(cocho)}
                  className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-md border transition-colors ${
                    cocho.ativo
                      ? 'border-warn/30 text-warn hover:bg-warn/10'
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
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-surface border border-border rounded-xl shadow-panel">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-ink-primary">
                  {form.id ? 'Editar cocho' : 'Novo cocho'}
                </h2>
                <p className="text-xs text-ink-muted mt-1">
                  Cadastre o cocho e gere o código usado pelo QR Code.
                </p>
              </div>

              <button
                onClick={() => setModalAberto(false)}
                className="w-9 h-9 rounded-md bg-panel border border-border flex items-center justify-center text-ink-muted hover:text-ink-primary"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-ink-muted">
                  Nome do cocho
                </label>
                <input
                  value={form.nome}
                  onChange={(e) =>
                    setForm({ ...form, nome: e.target.value })
                  }
                  placeholder="Cocho 001"
                  className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50"
                />
              </div>

              <div>
                <label className="text-xs text-ink-muted">
                  Código QR
                </label>

                <div className="mt-1 flex gap-2">
                  <input
                    value={form.codigo_qr}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        codigo_qr: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="FS-COCHO-001"
                    className="flex-1 px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary font-mono focus:outline-none focus:border-green/50"
                  />

                  <button
                    onClick={gerarCodigoAutomatico}
                    className="px-3 py-2 rounded-md border border-border text-xs text-ink-secondary hover:text-ink-primary"
                  >
                    Gerar
                  </button>
                </div>
              </div>

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
                    <option key={fazenda.id} value={fazenda.id}>
                      {fazenda.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-ink-muted">
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
                  className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50"
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
                <label className="text-xs text-ink-muted">
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
                  className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50"
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
                <label className="text-xs text-ink-muted">
                  Tipo de sal/abastecimento
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
                  className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50"
                />
              </div>

              <div>
                <label className="text-xs text-ink-muted">
                  Capacidade kg
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
                  className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-ink-secondary mt-5">
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
                Cocho ativo
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
                onClick={salvarCocho}
                disabled={salvando}
                className="btn-primary"
              >
                <Save size={14} />
                {salvando ? 'Salvando...' : 'Salvar cocho'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}