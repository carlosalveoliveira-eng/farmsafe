import { getEmpresaUsuario } from '../services/auth'
import { useEffect, useState } from 'react'
import {
  Building2,
  MapPin,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Power,
  X,
  Save,
  Map,
  Layers,
} from 'lucide-react'

import {
  supabase,
  type Fazenda,
  type Lote,
  type Retiro,
} from '../services/supabase'

function gerarCodigoFazenda(total: number) {
  return `FAZ-${String(total + 1).padStart(4, '0')}`
}

import PageHeader from '../components/PageHeader'

interface FazendaComDetalhes extends Fazenda {
  lotes: Lote[]
  retiros: Retiro[]
}

type ModalTipo = 'fazenda' | 'retiro' | 'lote' | null

type FormFazenda = {
  id?: string
  nome: string
  codigo: string
  cidade: string
  estado: string
  ativo: boolean
  area_valor: string
  area_unidade: string
  raio_operacional_metros: string
}

type FormRetiro = {
  id?: string
  fazenda_id: string
  nome: string
  ativo: boolean
}

type FormLote = {
  id?: string
  fazenda_id: string
  retiro_id: string
  nome: string
  descricao: string
  ativo: boolean
}

const fazendaInicial: FormFazenda = {
  nome: '',
  codigo: '',
  cidade: '',
  estado: 'MT',
  ativo: true,
  area_valor: '',
  area_unidade: 'hectare',
  raio_operacional_metros: '3000',
}

const retiroInicial: FormRetiro = {
  fazenda_id: '',
  nome: '',
  ativo: true,
}

const loteInicial: FormLote = {
  fazenda_id: '',
  retiro_id: '',
  nome: '',
  descricao: '',
  ativo: true,
}
function converterAreaParaMetrosQuadrados(valor: number, unidade: string) {
  if (!valor || valor <= 0) return 0

  if (unidade === 'hectare') {
    return valor * 10000
  }

  if (unidade === 'alqueire_mt') {
    return valor * 27225
  }

  if (unidade === 'alqueire_sp') {
    return valor * 24200
  }

  if (unidade === 'alqueire_mg') {
    return valor * 48400
  }

  return valor * 10000
}

function calcularRaioPorArea(valor: number, unidade: string) {
  const areaM2 = converterAreaParaMetrosQuadrados(valor, unidade)

  if (!areaM2) return 3000

  const raio = Math.sqrt(areaM2 / Math.PI)

  return Math.round(raio)
}

export default function FazendasPage() {
  const [fazendas, setFazendas] = useState<FazendaComDetalhes[]>([])
  const [retiros, setRetiros] = useState<Retiro[]>([])

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const [modalTipo, setModalTipo] = useState<ModalTipo>(null)
  const [formFazenda, setFormFazenda] = useState<FormFazenda>(fazendaInicial)
  const [formRetiro, setFormRetiro] = useState<FormRetiro>(retiroInicial)
  const [formLote, setFormLote] = useState<FormLote>(loteInicial)

  async function load() {
    setLoading(true)

    const [{ data: faz }, { data: lot }, { data: ret }] = await Promise.all([
      supabase.from('fazendas').select('*').order('nome'),
      supabase.from('lotes').select('*').order('nome'),
      supabase.from('retiros').select('*').order('nome'),
    ])

    const fazendasList = (faz as Fazenda[]) ?? []
    const lotesList = (lot as Lote[]) ?? []
    const retirosList = (ret as Retiro[]) ?? []
    
    setRetiros(retirosList)

    setFazendas(
      fazendasList.map((f) => ({
        ...f,
        lotes: lotesList.filter((l) => l.fazenda_id === f.id),
        retiros: retirosList.filter((r) => r.fazenda_id === f.id),
      }))
    )

    if (fazendasList[0]) {
      setExpanded((prev) => {
        if (prev.size > 0) return prev
        return new Set([fazendasList[0].id])
      })
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function abrirNovaFazenda() {
    setFormFazenda({
      ...fazendaInicial,
      codigo: gerarCodigoFazenda(fazendas.length),
    })

    setModalTipo('fazenda')
  }

  function abrirEditarFazenda(fazenda: Fazenda) {
  setFormFazenda({
    id: fazenda.id,
    nome: fazenda.nome,
    codigo: fazenda.codigo,
    cidade: fazenda.cidade ?? '',
    estado: fazenda.estado ?? 'MT',
    ativo: fazenda.ativo,

    area_valor: fazenda.area_valor
      ? String(fazenda.area_valor)
      : '',

    area_unidade: fazenda.area_unidade ?? 'hectare',

    raio_operacional_metros:
      fazenda.raio_operacional_metros
        ? String(fazenda.raio_operacional_metros)
        : '3000',
  })

  setModalTipo('fazenda')
}

  function abrirNovoRetiro(fazendaId?: string) {
    setFormRetiro({
      ...retiroInicial,
      fazenda_id: fazendaId ?? '',
    })

    setModalTipo('retiro')
  }

  function abrirEditarRetiro(retiro: Retiro) {
    setFormRetiro({
      id: retiro.id,
      fazenda_id: retiro.fazenda_id,
      nome: retiro.nome,
      ativo: retiro.ativo,
    })

    setModalTipo('retiro')
  }

  function abrirNovoLote(fazendaId?: string) {
    setFormLote({
      ...loteInicial,
      fazenda_id: fazendaId ?? '',
    })

    setModalTipo('lote')
  }

  function abrirEditarLote(lote: Lote) {
    setFormLote({
      id: lote.id,
      fazenda_id: lote.fazenda_id,
      retiro_id: lote.retiro_id ?? '',
      nome: lote.nome,
      descricao: lote.descricao ?? '',
      ativo: lote.ativo,
    })

    setModalTipo('lote')
  }

  async function salvarFazenda() {
  if (!formFazenda.nome.trim()) {
    alert('Informe o nome da fazenda.')
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
    if (!formFazenda.id) {
      const totalFazendas = fazendas.length

      if (totalFazendas >= empresa.max_fazendas) {
        alert(
          `Seu plano permite apenas ${empresa.max_fazendas} fazenda(s). Faça upgrade para cadastrar mais.`
        )

        return
      }
    }

    const payload = {
      nome: formFazenda.nome.trim(),
      codigo: formFazenda.codigo.trim().toUpperCase(),

      cidade: formFazenda.cidade.trim() || null,
      estado: formFazenda.estado.trim().toUpperCase() || null,

      ativo: formFazenda.ativo,

      area_valor: formFazenda.area_valor
        ? Number(formFazenda.area_valor)
        : null,

      area_unidade:
        formFazenda.area_unidade || 'hectare',

      raio_operacional_metros:
        formFazenda.raio_operacional_metros
          ? Number(formFazenda.raio_operacional_metros)
          : 3000,

      empresa_id: empresa.id,
    }

    const { error } = formFazenda.id
      ? await supabase
          .from('fazendas')
          .update(payload)
          .eq('id', formFazenda.id)

      : await supabase
          .from('fazendas')
          .insert(payload)

    if (error) {
      alert(`Erro ao salvar fazenda: ${error.message}`)
      return
    }

    setModalTipo(null)

    setFormFazenda(fazendaInicial)

    await load()
  } finally {
    setSalvando(false)
  }
}

  async function salvarRetiro() {
    if (!formRetiro.fazenda_id) {
      alert('Selecione a fazenda.')
      return
    }

    if (!formRetiro.nome.trim()) {
      alert('Informe o nome do retiro.')
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
      fazenda_id: formRetiro.fazenda_id,
      nome: formRetiro.nome.trim(),
      ativo: formRetiro.ativo,
      empresa_id: empresa.id,
    }

    const { error } = formRetiro.id
      ? await supabase.from('retiros').update(payload).eq('id', formRetiro.id)
      : await supabase.from('retiros').insert(payload)

    setSalvando(false)

    if (error) {
      alert(`Erro ao salvar retiro: ${error.message}`)
      return
    }

    setModalTipo(null)
    await load()
  }

  async function salvarLote() {
    if (!formLote.fazenda_id) {
      alert('Selecione a fazenda.')
      return
    }

    if (!formLote.nome.trim()) {
      alert('Informe o nome do lote.')
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
      fazenda_id: formLote.fazenda_id,
      retiro_id: formLote.retiro_id || null,
      nome: formLote.nome.trim(),
      descricao: formLote.descricao.trim() || null,
      ativo: formLote.ativo,
      empresa_id: empresa.id,
    }

    const { error } = formLote.id
      ? await supabase.from('lotes').update(payload).eq('id', formLote.id)
      : await supabase.from('lotes').insert(payload)

    setSalvando(false)

    if (error) {
      alert(`Erro ao salvar lote: ${error.message}`)
      return
    }

    setModalTipo(null)
    await load()
  }

  async function alternarAtivo(
    tabela: 'fazendas' | 'retiros' | 'lotes',
    id: string,
    ativoAtual: boolean
  ) {
    const confirmar = confirm(
      ativoAtual ? 'Deseja inativar este item?' : 'Deseja ativar este item?'
    )

    if (!confirmar) return

    const { error } = await supabase
      .from(tabela)
      .update({ ativo: !ativoAtual })
      .eq('id', id)

    if (error) {
      alert(`Erro ao atualizar status: ${error.message}`)
      return
    }

    await load()
  }

  return (
    <div>
      <PageHeader
        title="Fazendas, Retiros e Lotes"
        subtitle={`${fazendas.length} fazenda${fazendas.length !== 1 ? 's' : ''} cadastrada${fazendas.length !== 1 ? 's' : ''}`}
        action={
          <div className="flex items-center gap-2">
            <button onClick={abrirNovaFazenda} className="btn-primary">
              <Plus size={14} />
              Nova fazenda
            </button>

            <button onClick={() => abrirNovoRetiro()} className="btn-ghost border border-border">
              <Map size={14} />
              Novo retiro
            </button>

            <button onClick={() => abrirNovoLote()} className="btn-ghost border border-border">
              <Layers size={14} />
              Novo lote
            </button>
          </div>
        }
      />
      {fazendas.length > 1 && (
  <div className="mb-6 bg-warn/10 border border-warn/30 rounded-lg p-4">
    <p className="text-sm text-warn font-medium">
      Limite do plano gratuito excedido
    </p>

    <p className="text-xs text-ink-muted mt-1">
      Este plano permite até 1 fazenda cadastrada. Para gerenciar mais fazendas,
      será necessário aumentar o plano.
    </p>
  </div>
)}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
        </div>
      ) : fazendas.length === 0 ? (
        <div className="py-24 text-center text-ink-muted text-sm">
          Nenhuma fazenda cadastrada.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {fazendas.map((f) => {
            const open = expanded.has(f.id)

            return (
              <div key={f.id} className="fs-card overflow-hidden">
                <div className="w-full flex items-center gap-4 p-5 hover:bg-panel/50 transition-colors">
                  <button
                    onClick={() => toggle(f.id)}
                    className="w-8 h-8 rounded-md bg-surface border border-border flex items-center justify-center"
                  >
                    {open ? (
                      <ChevronDown size={14} className="text-green" />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </button>

                  <div className={`p-2 rounded-md ${f.ativo ? 'bg-green/10' : 'bg-surface'}`}>
                    <Building2 size={16} className={f.ativo ? 'text-green' : 'text-ink-muted'} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink-primary">{f.nome}</span>

                      <span className="font-mono text-xs text-ink-muted border border-border px-1.5 py-0.5 rounded">
                        {f.codigo}
                      </span>

                      <span className={`badge ${f.ativo ? 'badge-ok' : 'badge-muted'}`}>
                        {f.ativo ? 'ativa' : 'inativa'}
                      </span>
                    </div>

                    {(f.cidade || f.estado) && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-ink-muted">
                        <MapPin size={10} />
                        {[f.cidade, f.estado].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-xs text-ink-muted">
                    <span>{f.lotes.length} lote{f.lotes.length !== 1 ? 's' : ''}</span>
                    <span>{f.retiros.length} retiro{f.retiros.length !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => abrirNovoRetiro(f.id)}
                      className="btn-ghost text-xs border border-border"
                    >
                      + Retiro
                    </button>

                    <button
                      onClick={() => abrirNovoLote(f.id)}
                      className="btn-ghost text-xs border border-border"
                    >
                      + Lote
                    </button>

                    <button
                      onClick={() => abrirEditarFazenda(f)}
                      className="btn-ghost text-xs border border-border"
                    >
                      <Pencil size={13} />
                      Editar
                    </button>

                    <button
                      onClick={() => alternarAtivo('fazendas', f.id, f.ativo)}
                      className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-md border transition-colors ${
                        f.ativo
                          ? 'border-warn/30 text-warn hover:bg-warn/10'
                          : 'border-green/30 text-green hover:bg-green/10'
                      }`}
                    >
                      <Power size={13} />
                      {f.ativo ? 'Inativar' : 'Ativar'}
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="border-t border-border">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-5">
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Map size={14} className="text-green" />
                          <h3 className="text-sm font-semibold text-ink-primary">
                            Retiros
                          </h3>
                        </div>

                        {f.retiros.length === 0 ? (
                          <p className="text-sm text-ink-muted">
                            Nenhum retiro cadastrado.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {f.retiros.map((r) => (
                              <div
                                key={r.id}
                                className="bg-surface border border-border rounded-md p-3 flex items-center justify-between"
                              >
                                <div>
                                  <p className="text-sm text-ink-primary">{r.nome}</p>
                                  <span className={`badge ${r.ativo ? 'badge-ok' : 'badge-muted'} mt-1`}>
                                    {r.ativo ? 'ativo' : 'inativo'}
                                  </span>
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => abrirEditarRetiro(r)}
                                    className="btn-ghost text-xs border border-border"
                                  >
                                    <Pencil size={13} />
                                  </button>

                                  <button
                                    onClick={() => alternarAtivo('retiros', r.id, r.ativo)}
                                    className="btn-ghost text-xs border border-border"
                                  >
                                    <Power size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Layers size={14} className="text-green" />
                          <h3 className="text-sm font-semibold text-ink-primary">
                            Lotes
                          </h3>
                        </div>

                        {f.lotes.length === 0 ? (
                          <p className="text-sm text-ink-muted">
                            Nenhum lote cadastrado.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {f.lotes.map((l) => {
                              const retiro = retiros.find((r) => r.id === l.retiro_id)

                              return (
                                <div
                                  key={l.id}
                                  className="bg-surface border border-border rounded-md p-3 flex items-center justify-between"
                                >
                                  <div>
                                    <p className="text-sm text-ink-primary">{l.nome}</p>
                                    <p className="text-xs text-ink-muted mt-0.5">
                                      {retiro?.nome ?? 'Sem retiro'}
                                    </p>
                                    {l.descricao && (
                                      <p className="text-xs text-ink-muted mt-0.5">
                                        {l.descricao}
                                      </p>
                                    )}
                                    <span className={`badge ${l.ativo ? 'badge-ok' : 'badge-muted'} mt-1`}>
                                      {l.ativo ? 'ativo' : 'inativo'}
                                    </span>
                                  </div>

                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => abrirEditarLote(l)}
                                      className="btn-ghost text-xs border border-border"
                                    >
                                      <Pencil size={13} />
                                    </button>

                                    <button
                                      onClick={() => alternarAtivo('lotes', l.id, l.ativo)}
                                      className="btn-ghost text-xs border border-border"
                                    >
                                      <Power size={13} />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalTipo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-xl bg-surface border border-border rounded-xl shadow-panel">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-ink-primary">
                  {modalTipo === 'fazenda' && (formFazenda.id ? 'Editar fazenda' : 'Nova fazenda')}
                  {modalTipo === 'retiro' && (formRetiro.id ? 'Editar retiro' : 'Novo retiro')}
                  {modalTipo === 'lote' && (formLote.id ? 'Editar lote' : 'Novo lote')}
                </h2>

                <p className="text-xs text-ink-muted mt-1">
                  Organize a estrutura operacional rural do Farmsafe.
                </p>
              </div>

              <button
                onClick={() => setModalTipo(null)}
                className="w-9 h-9 rounded-md bg-panel border border-border flex items-center justify-center text-ink-muted hover:text-ink-primary"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 gap-4">
              {modalTipo === 'fazenda' && (
                <>
                  <div>
                    <label className="text-xs text-ink-muted">Nome da fazenda</label>
                    <input
                      value={formFazenda.nome}
                      onChange={(e) => setFormFazenda({ ...formFazenda, nome: e.target.value })}
                      placeholder="Fazenda Santa Maria"
                      className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-ink-muted">Código</label>
                    <input
                      value={formFazenda.codigo}
                      readOnly
                      placeholder="Gerado automaticamente"
                      className="mt-1 w-full px-3 py-2 bg-canvas/60 border border-border rounded-md text-sm text-ink-muted font-mono cursor-not-allowed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-ink-muted">Cidade</label>
                      <input
                        value={formFazenda.cidade}
                        onChange={(e) => setFormFazenda({ ...formFazenda, cidade: e.target.value })}
                        placeholder="Barra do Bugres"
                        className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-ink-muted">Estado</label>
                      <input
                        value={formFazenda.estado}
                        onChange={(e) => setFormFazenda({ ...formFazenda, estado: e.target.value.toUpperCase() })}
                        placeholder="MT"
                        maxLength={2}
                        className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary font-mono focus:outline-none focus:border-green/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-ink-muted">
                    Área
                  </label>

                  <input
                    type="number"
                    value={formFazenda.area_valor}
                    onChange={(e) => {
                      const area = e.target.value

                      const raio = calcularRaioPorArea(
                        Number(area),
                        formFazenda.area_unidade
                      )

                      setFormFazenda({
                        ...formFazenda,
                        area_valor: area,
                        raio_operacional_metros: String(raio),
                      })
                    }}
                    placeholder="Ex: 500"
                    className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-ink-muted">
                    Unidade
                  </label>

                  <select
                    value={formFazenda.area_unidade}
                    onChange={(e) => {
                      const unidade = e.target.value

                      const raio = calcularRaioPorArea(
                        Number(formFazenda.area_valor),
                        unidade
                      )

                      setFormFazenda({
                        ...formFazenda,
                        area_unidade: unidade,
                        raio_operacional_metros: String(raio),
                      })
                    }}
                    className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50"
                  >
                    <option value="hectare">
                      Hectare
                    </option>

                    <option value="alqueire_mt">
                      Alqueire MT
                    </option>

                    <option value="alqueire_sp">
                      Alqueire SP
                    </option>

                    <option value="alqueire_mg">
                      Alqueire MG
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-ink-muted">
                    Raio operacional
                  </label>

                  <input
                    type="number"
                    value={formFazenda.raio_operacional_metros}
                    onChange={(e) =>
                      setFormFazenda({
                        ...formFazenda,
                        raio_operacional_metros: e.target.value,
                      })
                    }
                    className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50"
                  />

                  <p className="text-[10px] text-ink-muted mt-1">
                    Calculado automaticamente.
                  </p>
                </div>
              </div>
                  <label className="flex items-center gap-2 text-sm text-ink-secondary">
                    <input
                      type="checkbox"
                      checked={formFazenda.ativo}
                      onChange={(e) => setFormFazenda({ ...formFazenda, ativo: e.target.checked })}
                      className="accent-green"
                    />
                    Fazenda ativa
                  </label>
                </>
              )}

              {modalTipo === 'retiro' && (
                <>
                  <div>
                    <label className="text-xs text-ink-muted">Fazenda</label>
                    <select
                      value={formRetiro.fazenda_id}
                      onChange={(e) => setFormRetiro({ ...formRetiro, fazenda_id: e.target.value })}
                      className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50"
                    >
                      <option value="">Selecione</option>
                      {fazendas.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-ink-muted">Nome do retiro</label>
                    <input
                      value={formRetiro.nome}
                      onChange={(e) => setFormRetiro({ ...formRetiro, nome: e.target.value })}
                      placeholder="Retiro Principal"
                      className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-ink-secondary">
                    <input
                      type="checkbox"
                      checked={formRetiro.ativo}
                      onChange={(e) => setFormRetiro({ ...formRetiro, ativo: e.target.checked })}
                      className="accent-green"
                    />
                    Retiro ativo
                  </label>
                </>
              )}

              {modalTipo === 'lote' && (
                <>
                  <div>
                    <label className="text-xs text-ink-muted">Fazenda</label>
                    <select
                      value={formLote.fazenda_id}
                      onChange={(e) => setFormLote({ ...formLote, fazenda_id: e.target.value, retiro_id: '' })}
                      className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50"
                    >
                      <option value="">Selecione</option>
                      {fazendas.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-ink-muted">Retiro</label>
                    <select
                      value={formLote.retiro_id}
                      onChange={(e) => setFormLote({ ...formLote, retiro_id: e.target.value })}
                      className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50"
                    >
                      <option value="">Sem retiro</option>
                      {retiros
                        .filter((r) => !formLote.fazenda_id || r.fazenda_id === formLote.fazenda_id)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nome}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-ink-muted">Nome do lote</label>
                    <input
                      value={formLote.nome}
                      onChange={(e) => setFormLote({ ...formLote, nome: e.target.value })}
                      placeholder="Lote 01"
                      className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-ink-muted">Descrição</label>
                    <textarea
                      value={formLote.descricao}
                      onChange={(e) => setFormLote({ ...formLote, descricao: e.target.value })}
                      placeholder="Descrição opcional"
                      className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50 min-h-24 resize-none"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-ink-secondary">
                    <input
                      type="checkbox"
                      checked={formLote.ativo}
                      onChange={(e) => setFormLote({ ...formLote, ativo: e.target.checked })}
                      className="accent-green"
                    />
                    Lote ativo
                  </label>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
              <button onClick={() => setModalTipo(null)} className="btn-ghost">
                Cancelar
              </button>

              <button
                onClick={
                  modalTipo === 'fazenda'
                    ? salvarFazenda
                    : modalTipo === 'retiro'
                    ? salvarRetiro
                    : salvarLote
                }
                disabled={salvando}
                className="btn-primary"
              >
                <Save size={14} />
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}