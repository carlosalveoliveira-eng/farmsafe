import { getEmpresaUsuario } from '../services/auth'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronRight,
  Layers,
  Map,
  MapPin,
  Pencil,
  Plus,
  Power,
  Ruler,
  Save,
  Search,
  Users,
  X,
} from 'lucide-react'

import {
  supabase,
  type Fazenda,
  type Lote,
  type Retiro,
} from '../services/supabase'

import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import SectionCard from '../components/ui/SectionCard'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'

function gerarCodigoFazenda(total: number) {
  return `FAZ-${String(total + 1).padStart(4, '0')}`
}

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
  quantidade_animais: string
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
  quantidade_animais: '',
  ativo: true,
}

function converterAreaParaMetrosQuadrados(valor: number, unidade: string) {
  if (!valor || valor <= 0) return 0

  if (unidade === 'hectare') return valor * 10000
  if (unidade === 'alqueire_mt') return valor * 27225
  if (unidade === 'alqueire_sp') return valor * 24200
  if (unidade === 'alqueire_mg') return valor * 48400

  return valor * 10000
}

function calcularRaioPorArea(valor: number, unidade: string) {
  const areaM2 = converterAreaParaMetrosQuadrados(valor, unidade)

  if (!areaM2) return 3000

  return Math.round(Math.sqrt(areaM2 / Math.PI))
}

function formatarArea(valor?: number | null, unidade?: string | null) {
  if (!valor) return '—'

  const label =
    unidade === 'alqueire_mt'
      ? 'alq. MT'
      : unidade === 'alqueire_sp'
      ? 'alq. SP'
      : unidade === 'alqueire_mg'
      ? 'alq. MG'
      : 'ha'

  return `${Number(valor).toLocaleString('pt-BR')} ${label}`
}

function normalizarBusca(valor: string) {
  return valor.trim().toLowerCase()
}

function loteCombinaBusca(lote: Lote, busca: string) {
  if (!busca) return true

  return (
    lote.nome.toLowerCase().includes(busca) ||
    (lote.descricao?.toLowerCase().includes(busca) ?? false)
  )
}

function quantidadeCabecasInformada(lote: Lote) {
  return (
    lote.quantidade_animais !== null &&
    lote.quantidade_animais !== undefined
  )
}

function somarCabecas(lotes: Lote[]) {
  return lotes.reduce((acc, lote) => acc + (lote.quantidade_animais ?? 0), 0)
}

function formatarCabecas(valor: number | null | undefined) {
  if (valor === null || valor === undefined) {
    return 'Não informado'
  }

  return `${valor.toLocaleString('pt-BR')} cabeça${valor !== 1 ? 's' : ''}`
}

export default function FazendasPage() {
  const [fazendas, setFazendas] = useState<FazendaComDetalhes[]>([])
  const [retiros, setRetiros] = useState<Retiro[]>([])

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const [buscaLotePorFazenda, setBuscaLotePorFazenda] = useState<
    Record<string, string>
  >({})

  const [filtroRetiroPorFazenda, setFiltroRetiroPorFazenda] = useState<
    Record<string, string>
  >({})

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
      fazendasList.map((fazenda) => ({
        ...fazenda,
        lotes: lotesList.filter((lote) => lote.fazenda_id === fazenda.id),
        retiros: retirosList.filter(
          (retiro) => retiro.fazenda_id === fazenda.id
        ),
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

  const areaTotal = useMemo(() => {
    return fazendas.reduce((acc, fazenda) => {
      return (
        acc +
        converterAreaParaMetrosQuadrados(
          Number(fazenda.area_valor ?? 0),
          fazenda.area_unidade ?? 'hectare'
        )
      )
    }, 0)
  }, [fazendas])

  const totalRetiros = useMemo(() => {
    return fazendas.reduce((sum, fazenda) => sum + fazenda.retiros.length, 0)
  }, [fazendas])

  const totalLotes = useMemo(() => {
    return fazendas.reduce((sum, fazenda) => sum + fazenda.lotes.length, 0)
  }, [fazendas])

  const totalLotesSemRetiro = useMemo(() => {
    return fazendas.reduce(
      (sum, fazenda) =>
        sum + fazenda.lotes.filter((lote) => !lote.retiro_id).length,
      0
    )
  }, [fazendas])

  const totalCabecasInformadas = useMemo(() => {
    return fazendas.reduce((sum, fazenda) => {
      return sum + somarCabecas(fazenda.lotes)
    }, 0)
  }, [fazendas])

  const totalLotesComCabecasInformadas = useMemo(() => {
    return fazendas.reduce((sum, fazenda) => {
      return (
        sum +
        fazenda.lotes.filter((lote) => quantidadeCabecasInformada(lote)).length
      )
    }, 0)
  }, [fazendas])

  const retirosDoFormLote = useMemo(() => {
    if (!formLote.fazenda_id) return []

    return retiros.filter((retiro) => retiro.fazenda_id === formLote.fazenda_id)
  }, [retiros, formLote.fazenda_id])

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function atualizarBuscaLote(fazendaId: string, valor: string) {
    setBuscaLotePorFazenda((atual) => ({
      ...atual,
      [fazendaId]: valor,
    }))
  }

  function atualizarFiltroRetiro(fazendaId: string, retiroId: string) {
    setFiltroRetiroPorFazenda((atual) => ({
      ...atual,
      [fazendaId]: retiroId,
    }))
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
      area_valor: fazenda.area_valor ? String(fazenda.area_valor) : '',
      area_unidade: fazenda.area_unidade ?? 'hectare',
      raio_operacional_metros: fazenda.raio_operacional_metros
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

  function abrirNovoLote(fazendaId?: string, retiroId?: string) {
    setFormLote({
      ...loteInicial,
      fazenda_id: fazendaId ?? '',
      retiro_id: retiroId ?? '',
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
      quantidade_animais: quantidadeCabecasInformada(lote)
        ? String(lote.quantidade_animais)
        : '',
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

      if (!formFazenda.id) {
        const totalFazendas = fazendas.length

        if (empresa.max_fazendas && totalFazendas >= empresa.max_fazendas) {
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
        area_unidade: formFazenda.area_unidade || 'hectare',
        raio_operacional_metros: formFazenda.raio_operacional_metros
          ? Number(formFazenda.raio_operacional_metros)
          : 3000,
        empresa_id: empresa.id,
      }

      const { error } = formFazenda.id
        ? await supabase
            .from('fazendas')
            .update(payload)
            .eq('id', formFazenda.id)
        : await supabase.from('fazendas').insert(payload)

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

    try {
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
        ? await supabase
            .from('retiros')
            .update(payload)
            .eq('id', formRetiro.id)
        : await supabase.from('retiros').insert(payload)

      if (error) {
        alert(`Erro ao salvar retiro: ${error.message}`)
        return
      }

      setModalTipo(null)
      setFormRetiro(retiroInicial)
      await load()
    } finally {
      setSalvando(false)
    }
  }

  async function salvarLote() {
    if (!formLote.fazenda_id) {
      alert('Selecione a fazenda.')
      return
    }

    if (!formLote.retiro_id) {
      alert('Selecione o retiro do lote.')
      return
    }

    if (!formLote.nome.trim()) {
      alert('Informe o nome do lote.')
      return
    }

    const quantidadeAnimais =
      formLote.quantidade_animais.trim() === ''
        ? null
        : Number(formLote.quantidade_animais)

    if (
      quantidadeAnimais !== null &&
      (!Number.isInteger(quantidadeAnimais) || quantidadeAnimais < 0)
    ) {
      alert('Informe uma quantidade de cabeças válida, sem casas decimais.')
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

      const payload = {
        fazenda_id: formLote.fazenda_id,
        retiro_id: formLote.retiro_id,
        nome: formLote.nome.trim(),
        descricao: formLote.descricao.trim() || null,
        quantidade_animais: quantidadeAnimais,
        ativo: formLote.ativo,
        empresa_id: empresa.id,
      }

      const { error } = formLote.id
        ? await supabase.from('lotes').update(payload).eq('id', formLote.id)
        : await supabase.from('lotes').insert(payload)

      if (error) {
        alert(`Erro ao salvar lote: ${error.message}`)
        return
      }

      setModalTipo(null)
      setFormLote(loteInicial)
      await load()
    } finally {
      setSalvando(false)
    }
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
    <div className="space-y-8">
      <PageHeader
        title="Fazendas"
        description="Gestão operacional das propriedades, retiros e lotes monitorados."
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={abrirNovaFazenda}
              className="btn-primary"
            >
              <Plus size={14} />
              Nova fazenda
            </button>

            <button
              type="button"
              onClick={() => abrirNovoRetiro()}
              className="btn-ghost border border-border bg-white"
            >
              <Map size={14} />
              Novo retiro
            </button>

            <button
              type="button"
              onClick={() => abrirNovoLote()}
              className="btn-ghost border border-border bg-white"
            >
              <Layers size={14} />
              Novo lote
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-6">
        <StatCard
          title="Total de fazendas"
          value={fazendas.length}
          icon={Building2}
        />

        <StatCard
          title="Fazendas ativas"
          value={fazendas.filter((fazenda) => fazenda.ativo).length}
          icon={MapPin}
        />

        <StatCard
          title="Retiros cadastrados"
          value={totalRetiros}
          icon={Map}
        />

        <StatCard title="Lotes cadastrados" value={totalLotes} icon={Layers} />

        <StatCard
          title="Cabeças informadas"
          value={totalCabecasInformadas.toLocaleString('pt-BR')}
          icon={Users}
        />

        <StatCard
          title="Área monitorada"
          value={`${(areaTotal / 10000).toLocaleString('pt-BR', {
            maximumFractionDigits: 0,
          })} ha`}
          icon={Ruler}
        />
      </div>

      {totalLotesComCabecasInformadas < totalLotes && totalLotes > 0 && (
        <SectionCard>
          <div className="rounded-xl border border-amber/30 bg-amber/10 p-4">
            <div className="flex items-start gap-3">
              <Users size={18} className="text-amber mt-0.5" />

              <div>
                <p className="text-sm font-semibold text-amber">
                  Quantidade de cabeças parcialmente informada
                </p>

                <p className="text-sm text-ink-muted mt-1">
                  {totalLotesComCabecasInformadas} de {totalLotes} lote
                  {totalLotes !== 1 ? 's' : ''} possuem quantidade de cabeças
                  preenchida. Os lotes sem informação continuarão funcionando,
                  mas não entrarão em cálculos futuros de consumo por cabeça.
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {fazendas.length > 1 && (
        <SectionCard>
          <div className="rounded-xl border border-warn/30 bg-warn/10 p-4">
            <p className="text-sm font-semibold text-warn">
              Limite do plano gratuito excedido
            </p>

            <p className="text-sm text-ink-muted mt-1">
              Este plano permite até 1 fazenda cadastrada. Para gerenciar mais
              fazendas, será necessário aumentar o plano.
            </p>
          </div>
        </SectionCard>
      )}

      {totalLotesSemRetiro > 0 && (
        <SectionCard>
          <div className="rounded-xl border border-red/20 bg-red/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red mt-0.5" />

              <div>
                <p className="text-sm font-semibold text-red">
                  Existem {totalLotesSemRetiro} lote
                  {totalLotesSemRetiro !== 1 ? 's' : ''} sem retiro vinculado
                </p>

                <p className="text-sm text-ink-muted mt-1">
                  Novos lotes agora exigem retiro. Edite os lotes antigos sem
                  retiro para manter a organização operacional correta.
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {loading ? (
        <SectionCard>
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-green/20 border-t-green rounded-full animate-spin" />
          </div>
        </SectionCard>
      ) : fazendas.length === 0 ? (
        <EmptyState
          title="Nenhuma fazenda cadastrada"
          description="Cadastre sua primeira fazenda para começar a organizar retiros, lotes e cochos."
        />
      ) : (
        <SectionCard title="Propriedades e unidades operacionais">
          <div className="space-y-4">
            {fazendas.map((fazenda) => {
              const open = expanded.has(fazenda.id)
              const filtroRetiroAtual =
                filtroRetiroPorFazenda[fazenda.id] ?? ''
              const buscaAtual = normalizarBusca(
                buscaLotePorFazenda[fazenda.id] ?? ''
              )

              const retirosVisiveis = fazenda.retiros.filter((retiro) => {
                if (filtroRetiroAtual && retiro.id !== filtroRetiroAtual) {
                  return false
                }

                return true
              })

              const lotesSemRetiro = fazenda.lotes.filter((lote) => {
                if (lote.retiro_id) return false
                return loteCombinaBusca(lote, buscaAtual)
              })

              const lotesVisiveisPorRetiro = retirosVisiveis.flatMap(
                (retiro) =>
                  fazenda.lotes.filter(
                    (lote) =>
                      lote.retiro_id === retiro.id &&
                      loteCombinaBusca(lote, buscaAtual)
                  )
              )

              const lotesVisiveis = filtroRetiroAtual
                ? lotesVisiveisPorRetiro
                : [...lotesVisiveisPorRetiro, ...lotesSemRetiro]

              const totalLotesVisiveis = lotesVisiveis.length
              const totalCabecasVisiveis = somarCabecas(lotesVisiveis)
              const lotesVisiveisComCabecas = lotesVisiveis.filter((lote) =>
                quantidadeCabecasInformada(lote)
              ).length

              return (
                <div
                  key={fazenda.id}
                  className="overflow-hidden rounded-xl border border-border bg-white transition-all hover:shadow-sm"
                >
                  <div className="flex items-center gap-4 p-5">
                    <button
                      type="button"
                      onClick={() => toggle(fazenda.id)}
                      className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center hover:bg-green/10 transition-colors"
                    >
                      {open ? (
                        <ChevronDown size={16} className="text-green" />
                      ) : (
                        <ChevronRight size={16} className="text-ink-muted" />
                      )}
                    </button>

                    <div
                      className={`p-3 rounded-xl ${
                        fazenda.ativo ? 'bg-green/10' : 'bg-surface'
                      }`}
                    >
                      <Building2
                        size={20}
                        className={
                          fazenda.ativo ? 'text-green' : 'text-ink-muted'
                        }
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-ink-primary">
                          {fazenda.nome}
                        </p>

                        <span className="font-mono text-xs text-ink-muted bg-surface border border-border px-2 py-1 rounded-lg">
                          {fazenda.codigo}
                        </span>

                        <StatusBadge status={fazenda.ativo ? 'ok' : 'muted'}>
                          {fazenda.ativo ? 'Ativa' : 'Inativa'}
                        </StatusBadge>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-sm text-ink-muted flex-wrap">
                        {(fazenda.cidade || fazenda.estado) && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={14} />
                            {[fazenda.cidade, fazenda.estado]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        )}

                        <span>
                          {formatarArea(
                            fazenda.area_valor,
                            fazenda.area_unidade
                          )}
                        </span>

                        <span>
                          Raio: {fazenda.raio_operacional_metros ?? 3000} m
                        </span>
                      </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-6 text-sm text-ink-muted">
                      <div className="text-center">
                        <p className="font-semibold text-ink-primary">
                          {fazenda.retiros.length}
                        </p>
                        <p className="text-xs">Retiros</p>
                      </div>

                      <div className="text-center">
                        <p className="font-semibold text-ink-primary">
                          {fazenda.lotes.length}
                        </p>
                        <p className="text-xs">Lotes</p>
                      </div>

                      <div className="text-center">
                        <p className="font-semibold text-ink-primary">
                          {somarCabecas(fazenda.lotes).toLocaleString('pt-BR')}
                        </p>
                        <p className="text-xs">Cabeças</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={() => abrirNovoRetiro(fazenda.id)}
                        className="btn-ghost text-xs border border-border bg-white"
                      >
                        <Map size={13} />
                        Retiro
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const primeiroRetiro =
                            fazenda.retiros.find((retiro) => retiro.ativo) ??
                            fazenda.retiros[0]

                          if (!primeiroRetiro) {
                            alert(
                              'Cadastre um retiro antes de criar lotes nesta fazenda.'
                            )
                            return
                          }

                          abrirNovoLote(fazenda.id, primeiroRetiro.id)
                        }}
                        className="btn-ghost text-xs border border-border bg-white"
                      >
                        <Layers size={13} />
                        Lote
                      </button>

                      <button
                        type="button"
                        onClick={() => abrirEditarFazenda(fazenda)}
                        className="btn-ghost text-xs border border-border bg-white"
                      >
                        <Pencil size={13} />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          alternarAtivo(
                            'fazendas',
                            fazenda.id,
                            fazenda.ativo
                          )
                        }
                        className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-lg border transition-colors font-medium ${
                          fazenda.ativo
                            ? 'border-warn/30 text-warn hover:bg-warn/10'
                            : 'border-green/30 text-green hover:bg-green/10'
                        }`}
                      >
                        <Power size={13} />
                        {fazenda.ativo ? 'Inativar' : 'Ativar'}
                      </button>
                    </div>
                  </div>

                  {open && (
                    <div className="border-t border-border bg-surface/40">
                      <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-4 items-end">
                          <div className="relative">
                            <Search
                              size={16}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                            />

                            <input
                              type="text"
                              value={buscaLotePorFazenda[fazenda.id] ?? ''}
                              onChange={(event) =>
                                atualizarBuscaLote(
                                  fazenda.id,
                                  event.target.value
                                )
                              }
                              placeholder="Buscar lote por nome ou descrição..."
                              className="w-full pl-10 pr-4 py-2 bg-white border border-border rounded-lg text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-green/50 focus:ring-1 focus:ring-green/20 transition-colors"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-ink-muted">
                              Filtrar por retiro
                            </label>

                            <select
                              value={filtroRetiroAtual}
                              onChange={(event) =>
                                atualizarFiltroRetiro(
                                  fazenda.id,
                                  event.target.value
                                )
                              }
                              className="mt-2 w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-ink-primary focus:outline-none focus:border-green/50 focus:ring-1 focus:ring-green/20 transition-colors"
                            >
                              <option value="">Todos os retiros</option>

                              {fazenda.retiros.map((retiro) => (
                                <option key={retiro.id} value={retiro.id}>
                                  {retiro.nome}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <ResumoOperacionalCard
                            label="Retiros nesta fazenda"
                            value={fazenda.retiros.length}
                          />

                          <ResumoOperacionalCard
                            label="Lotes encontrados"
                            value={totalLotesVisiveis}
                          />

                          <ResumoOperacionalCard
                            label="Lotes ativos"
                            value={
                              lotesVisiveis.filter((lote) => lote.ativo).length
                            }
                          />

                          <div className="rounded-xl border border-border bg-white p-4">
                            <p className="text-xs text-ink-muted">
                              Cabeças informadas
                            </p>

                            <p className="text-xl font-bold text-ink-primary mt-1 font-mono">
                              {totalCabecasVisiveis.toLocaleString('pt-BR')}
                            </p>

                            <p className="text-xs text-ink-muted mt-1">
                              Em {lotesVisiveisComCabecas} lote
                              {lotesVisiveisComCabecas !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        {fazenda.retiros.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border bg-white p-6 text-center">
                            <Map size={24} className="mx-auto text-ink-muted" />

                            <p className="text-sm font-semibold text-ink-primary mt-3">
                              Nenhum retiro cadastrado
                            </p>

                            <p className="text-sm text-ink-muted mt-1">
                              Cadastre pelo menos um retiro antes de criar lotes.
                            </p>

                            <button
                              type="button"
                              onClick={() => abrirNovoRetiro(fazenda.id)}
                              className="btn-primary mt-4"
                            >
                              <Plus size={14} />
                              Criar retiro
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {retirosVisiveis.map((retiro) => {
                              const lotesDoRetiro = fazenda.lotes.filter(
                                (lote) =>
                                  lote.retiro_id === retiro.id &&
                                  loteCombinaBusca(lote, buscaAtual)
                              )

                              const cabecasDoRetiro =
                                somarCabecas(lotesDoRetiro)

                              const lotesDoRetiroComCabecas =
                                lotesDoRetiro.filter((lote) =>
                                  quantidadeCabecasInformada(lote)
                                ).length

                              return (
                                <div
                                  key={retiro.id}
                                  className="rounded-xl border border-border bg-white overflow-hidden"
                                >
                                  <div className="p-4 border-b border-border bg-surface/60">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Map
                                            size={16}
                                            className="text-green"
                                          />

                                          <p className="text-sm font-semibold text-ink-primary">
                                            {retiro.nome}
                                          </p>

                                          <StatusBadge
                                            status={
                                              retiro.ativo ? 'ok' : 'muted'
                                            }
                                          >
                                            {retiro.ativo
                                              ? 'Ativo'
                                              : 'Inativo'}
                                          </StatusBadge>
                                        </div>

                                        <p className="text-xs text-ink-muted mt-2">
                                          {lotesDoRetiro.length} lote
                                          {lotesDoRetiro.length !== 1
                                            ? 's'
                                            : ''}{' '}
                                          encontrado
                                          {lotesDoRetiro.length !== 1
                                            ? 's'
                                            : ''}
                                        </p>

                                        <p className="text-xs text-ink-muted mt-1">
                                          {cabecasDoRetiro.toLocaleString(
                                            'pt-BR'
                                          )}{' '}
                                          cabeça
                                          {cabecasDoRetiro !== 1 ? 's' : ''}{' '}
                                          informada
                                          {cabecasDoRetiro !== 1 ? 's' : ''} em{' '}
                                          {lotesDoRetiroComCabecas} lote
                                          {lotesDoRetiroComCabecas !== 1
                                            ? 's'
                                            : ''}
                                        </p>
                                      </div>

                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            abrirNovoLote(fazenda.id, retiro.id)
                                          }
                                          className="btn-ghost text-xs border border-border bg-white"
                                        >
                                          <Plus size={13} />
                                          Lote
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            abrirEditarRetiro(retiro)
                                          }
                                          className="btn-ghost text-xs border border-border bg-white"
                                        >
                                          <Pencil size={13} />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            alternarAtivo(
                                              'retiros',
                                              retiro.id,
                                              retiro.ativo
                                            )
                                          }
                                          className="btn-ghost text-xs border border-border bg-white"
                                        >
                                          <Power size={13} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {lotesDoRetiro.length === 0 ? (
                                    <div className="p-5 text-sm text-ink-muted">
                                      Nenhum lote encontrado neste retiro.
                                    </div>
                                  ) : (
                                    <div className="divide-y divide-border">
                                      {lotesDoRetiro.map((lote) => (
                                        <div
                                          key={lote.id}
                                          className="p-4 hover:bg-surface/50 transition-colors"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <Layers
                                                  size={15}
                                                  className="text-green"
                                                />

                                                <p className="text-sm font-semibold text-ink-primary">
                                                  {lote.nome}
                                                </p>

                                                <StatusBadge
                                                  status={
                                                    lote.ativo ? 'ok' : 'muted'
                                                  }
                                                >
                                                  {lote.ativo
                                                    ? 'Ativo'
                                                    : 'Inativo'}
                                                </StatusBadge>
                                              </div>

                                              <div className="flex items-center gap-1 mt-2 text-xs text-ink-muted">
                                                <Users size={13} />
                                                <span>
                                                  {formatarCabecas(
                                                    lote.quantidade_animais
                                                  )}
                                                </span>
                                              </div>

                                              {lote.descricao && (
                                                <p className="text-xs text-ink-muted mt-2 line-clamp-2">
                                                  {lote.descricao}
                                                </p>
                                              )}
                                            </div>

                                            <div className="flex gap-2 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  abrirEditarLote(lote)
                                                }
                                                className="btn-ghost text-xs border border-border bg-white"
                                              >
                                                <Pencil size={13} />
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() =>
                                                  alternarAtivo(
                                                    'lotes',
                                                    lote.id,
                                                    lote.ativo
                                                  )
                                                }
                                                className="btn-ghost text-xs border border-border bg-white"
                                              >
                                                <Power size={13} />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {!filtroRetiroAtual && lotesSemRetiro.length > 0 && (
                          <div className="rounded-xl border border-red/20 bg-red/10 overflow-hidden">
                            <div className="p-4 border-b border-red/20">
                              <div className="flex items-center gap-2">
                                <AlertTriangle
                                  size={16}
                                  className="text-red"
                                />

                                <p className="text-sm font-semibold text-red">
                                  Lotes sem retiro
                                </p>
                              </div>

                              <p className="text-xs text-ink-muted mt-1">
                                Corrija estes lotes para manter a estrutura
                                operacional organizada.
                              </p>
                            </div>

                            <div className="divide-y divide-red/20">
                              {lotesSemRetiro.map((lote) => (
                                <div
                                  key={lote.id}
                                  className="p-4 flex items-center justify-between gap-3"
                                >
                                  <div>
                                    <p className="text-sm font-semibold text-ink-primary">
                                      {lote.nome}
                                    </p>

                                    <p className="text-xs text-ink-muted mt-1">
                                      {formatarCabecas(
                                        lote.quantidade_animais
                                      )}
                                    </p>

                                    {lote.descricao && (
                                      <p className="text-xs text-ink-muted mt-1">
                                        {lote.descricao}
                                      </p>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => abrirEditarLote(lote)}
                                    className="btn-ghost text-xs border border-border bg-white"
                                  >
                                    <Pencil size={13} />
                                    Corrigir
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}

      {modalTipo && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[92vh] bg-white border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-ink-primary">
                  {modalTipo === 'fazenda' &&
                    (formFazenda.id ? 'Editar fazenda' : 'Nova fazenda')}
                  {modalTipo === 'retiro' &&
                    (formRetiro.id ? 'Editar retiro' : 'Novo retiro')}
                  {modalTipo === 'lote' &&
                    (formLote.id ? 'Editar lote' : 'Novo lote')}
                </h2>

                <p className="text-sm text-ink-muted mt-1">
                  Organize a estrutura operacional rural do FarmSafe.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalTipo(null)}
                className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-ink-muted hover:text-ink-primary"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 gap-4 overflow-y-auto">
              {modalTipo === 'fazenda' && (
                <>
                  <InputLabel label="Nome da fazenda">
                    <input
                      value={formFazenda.nome}
                      onChange={(event) =>
                        setFormFazenda({
                          ...formFazenda,
                          nome: event.target.value,
                        })
                      }
                      placeholder="Fazenda Santa Maria"
                      className="input"
                    />
                  </InputLabel>

                  <InputLabel label="Código">
                    <input
                      value={formFazenda.codigo}
                      readOnly
                      placeholder="Gerado automaticamente"
                      className="input bg-surface cursor-not-allowed font-mono text-ink-muted"
                    />
                  </InputLabel>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputLabel label="Cidade">
                      <input
                        value={formFazenda.cidade}
                        onChange={(event) =>
                          setFormFazenda({
                            ...formFazenda,
                            cidade: event.target.value,
                          })
                        }
                        placeholder="Barra do Bugres"
                        className="input"
                      />
                    </InputLabel>

                    <InputLabel label="Estado">
                      <input
                        value={formFazenda.estado}
                        onChange={(event) =>
                          setFormFazenda({
                            ...formFazenda,
                            estado: event.target.value.toUpperCase(),
                          })
                        }
                        placeholder="MT"
                        maxLength={2}
                        className="input uppercase font-mono"
                      />
                    </InputLabel>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputLabel label="Área">
                      <input
                        type="number"
                        min={0}
                        value={formFazenda.area_valor}
                        onChange={(event) => {
                          const area = event.target.value
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
                        className="input"
                      />
                    </InputLabel>

                    <InputLabel label="Unidade">
                      <select
                        value={formFazenda.area_unidade}
                        onChange={(event) => {
                          const unidade = event.target.value
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
                        className="input"
                      >
                        <option value="hectare">Hectare</option>
                        <option value="alqueire_mt">Alqueire MT</option>
                        <option value="alqueire_sp">Alqueire SP</option>
                        <option value="alqueire_mg">Alqueire MG</option>
                      </select>
                    </InputLabel>

                    <InputLabel label="Raio operacional (m)">
                      <input
                        type="number"
                        min={0}
                        value={formFazenda.raio_operacional_metros}
                        onChange={(event) =>
                          setFormFazenda({
                            ...formFazenda,
                            raio_operacional_metros: event.target.value,
                          })
                        }
                        className="input"
                      />
                    </InputLabel>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-ink-secondary">
                    <input
                      type="checkbox"
                      checked={formFazenda.ativo}
                      onChange={(event) =>
                        setFormFazenda({
                          ...formFazenda,
                          ativo: event.target.checked,
                        })
                      }
                      className="accent-green"
                    />
                    Fazenda ativa
                  </label>
                </>
              )}

              {modalTipo === 'retiro' && (
                <>
                  <InputLabel label="Fazenda">
                    <select
                      value={formRetiro.fazenda_id}
                      onChange={(event) =>
                        setFormRetiro({
                          ...formRetiro,
                          fazenda_id: event.target.value,
                        })
                      }
                      className="input"
                    >
                      <option value="">Selecione uma fazenda</option>
                      {fazendas.map((fazenda) => (
                        <option key={fazenda.id} value={fazenda.id}>
                          {fazenda.nome}
                        </option>
                      ))}
                    </select>
                  </InputLabel>

                  <InputLabel label="Nome do retiro">
                    <input
                      value={formRetiro.nome}
                      onChange={(event) =>
                        setFormRetiro({
                          ...formRetiro,
                          nome: event.target.value,
                        })
                      }
                      placeholder="Retiro Principal"
                      className="input"
                    />
                  </InputLabel>

                  <label className="flex items-center gap-2 text-sm text-ink-secondary">
                    <input
                      type="checkbox"
                      checked={formRetiro.ativo}
                      onChange={(event) =>
                        setFormRetiro({
                          ...formRetiro,
                          ativo: event.target.checked,
                        })
                      }
                      className="accent-green"
                    />
                    Retiro ativo
                  </label>
                </>
              )}

              {modalTipo === 'lote' && (
                <>
                  <InputLabel label="Fazenda">
                    <select
                      value={formLote.fazenda_id}
                      onChange={(event) =>
                        setFormLote({
                          ...formLote,
                          fazenda_id: event.target.value,
                          retiro_id: '',
                        })
                      }
                      className="input"
                    >
                      <option value="">Selecione uma fazenda</option>
                      {fazendas.map((fazenda) => (
                        <option key={fazenda.id} value={fazenda.id}>
                          {fazenda.nome}
                        </option>
                      ))}
                    </select>
                  </InputLabel>

                  <InputLabel label="Retiro obrigatório">
                    <select
                      value={formLote.retiro_id}
                      disabled={!formLote.fazenda_id}
                      onChange={(event) =>
                        setFormLote({
                          ...formLote,
                          retiro_id: event.target.value,
                        })
                      }
                      className="input disabled:bg-surface disabled:text-ink-muted"
                    >
                      <option value="">
                        {formLote.fazenda_id
                          ? 'Selecione um retiro'
                          : 'Selecione uma fazenda primeiro'}
                      </option>

                      {formLote.fazenda_id && retirosDoFormLote.length === 0 && (
                        <option value="" disabled>
                          Nenhum retiro cadastrado nesta fazenda
                        </option>
                      )}

                      {retirosDoFormLote.map((retiro) => (
                        <option key={retiro.id} value={retiro.id}>
                          {retiro.nome}
                        </option>
                      ))}
                    </select>
                  </InputLabel>

                  <InputLabel label="Nome do lote">
                    <input
                      value={formLote.nome}
                      onChange={(event) =>
                        setFormLote({
                          ...formLote,
                          nome: event.target.value,
                        })
                      }
                      placeholder="Lote 01"
                      className="input"
                    />
                  </InputLabel>

                  <InputLabel label="Quantidade de cabeças">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={formLote.quantidade_animais}
                      onChange={(event) =>
                        setFormLote({
                          ...formLote,
                          quantidade_animais: event.target.value,
                        })
                      }
                      placeholder="EX: 100"
                      className="input"
                    />

                    <p className="text-xs text-ink-muted mt-2">
                      Deixe em branco apenas quando a quantidade ainda
                      não foi informada. Use 0 apenas quando o lote estiver
                      vazio.
                    </p>
                  </InputLabel>

                  <InputLabel label="Descrição">
                    <textarea
                      value={formLote.descricao}
                      onChange={(event) =>
                        setFormLote({
                          ...formLote,
                          descricao: event.target.value,
                        })
                      }
                      placeholder="Descrição opcional"
                      className="input min-h-24 resize-none"
                    />
                  </InputLabel>

                  <label className="flex items-center gap-2 text-sm text-ink-secondary">
                    <input
                      type="checkbox"
                      checked={formLote.ativo}
                      onChange={(event) =>
                        setFormLote({
                          ...formLote,
                          ativo: event.target.checked,
                        })
                      }
                      className="accent-green"
                    />
                    Lote ativo
                  </label>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-surface/40">
              <button
                type="button"
                onClick={() => setModalTipo(null)}
                className="btn-ghost"
              >
                Cancelar
              </button>

              <button
                type="button"
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

function ResumoOperacionalCard({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-xs text-ink-muted">{label}</p>

      <p className="text-xl font-bold text-ink-primary mt-1 font-mono">
        {value}
      </p>
    </div>
  )
}

function InputLabel({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink-primary">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  )
}