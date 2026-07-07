import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Archive,
  Boxes,
  CalendarDays,
  ClipboardList,
  FileText,
  History,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  TrendingDown,
  TrendingUp,
  X,
  type LucideIcon,
} from 'lucide-react'

import {
  supabase,
  type CategoriaInsumo,
  type EstoqueMovimentacao,
  type Fazenda,
  type Retiro,
  type TipoMovimentacaoEstoque,
} from '../services/supabase'

import {
  formatarKg,
  formatarMoeda,
  labelCategoriaInsumo,
  labelTipoMovimentacao,
  listarMovimentacoesEstoque,
  listarSaldosInsumos,
  registrarMovimentacaoEstoque,
  salvarInsumo,
  type SaldoInsumo,
} from '../services/estoque/EstoqueService'

import PageHeader from '../components/ui/PageHeader'
import SectionCard from '../components/ui/SectionCard'
import EmptyState from '../components/ui/EmptyState'

type TipoMovimentacaoManual = Extract<TipoMovimentacaoEstoque, 'entrada' | 'saida'>

type FormInsumo = {
  id?: string
  nome: string
  categoria: CategoriaInsumo
  estoque_minimo_kg: string
  estoque_maximo_kg: string
  ativo: boolean
}

type FormMovimentacao = {
  insumoId: string
  tipo: TipoMovimentacaoManual
  quantidadeKg: string
  dataMovimentacao: string
  documentoReferencia: string
  pessoaReferencia: string
  valorUnitario: string
  valorTotal: string
  fazendaId: string
  retiroId: string
  observacao: string
}

const insumoInicial: FormInsumo = {
  nome: '',
  categoria: 'sal',
  estoque_minimo_kg: '',
  estoque_maximo_kg: '',
  ativo: true,
}

const CATEGORIAS: { value: CategoriaInsumo; label: string }[] = [
  { value: 'sal', label: 'Sal' },
  { value: 'racao', label: 'Ração' },
  { value: 'suplemento', label: 'Suplemento' },
  { value: 'mineral', label: 'Mineral' },
  { value: 'nucleo', label: 'Núcleo' },
  { value: 'outro', label: 'Outro' },
]

const TIPOS_MOVIMENTACAO: {
  value: TipoMovimentacaoManual
  label: string
  description: string
}[] = [
  {
    value: 'entrada',
    label: 'Entrada manual',
    description: 'Produto entrou no estoque. Ex.: compra, transferência recebida ou contagem inicial.',
  },
  {
    value: 'saida',
    label: 'Saída manual',
    description: 'Produto saiu do estoque. Ex.: retirada, perda, transferência enviada ou correção física.',
  },
]

function n(value: unknown) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

function numeroOuNull(value: string) {
  const text = value.trim()

  if (!text) return null

  const parsed = Number(text.replace(',', '.'))

  if (!Number.isFinite(parsed)) return null

  return Number(parsed.toFixed(2))
}

function numeroObrigatorio(value: string) {
  const parsed = Number(value.trim().replace(',', '.'))

  if (!Number.isFinite(parsed)) return null

  return Number(parsed.toFixed(3))
}

function movimentoEntrada(tipo: TipoMovimentacaoEstoque) {
  return ['saldo_inicial', 'entrada', 'ajuste_entrada', 'transferencia_entrada'].includes(tipo)
}

function movimentoSaida(tipo: TipoMovimentacaoEstoque) {
  return ['saida', 'consumo', 'ajuste_saida', 'transferencia_saida'].includes(tipo)
}

function agoraParaInputDateTime() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)

  return local.toISOString().slice(0, 16)
}

function formatarDataHora(value: string | null | undefined) {
  if (!value) return '—'

  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusEstoqueLabel(saldo: SaldoInsumo) {
  if (saldo.status_estoque === 'abaixo_minimo') return 'Comprar'
  if (saldo.status_estoque === 'acima_maximo') return 'Acima do planejado'

  return 'Ok'
}

function statusEstoqueClasses(saldo: SaldoInsumo) {
  if (saldo.status_estoque === 'abaixo_minimo') {
    return 'bg-red/10 text-red border-red/20'
  }

  if (saldo.status_estoque === 'acima_maximo') {
    return 'bg-amber/10 text-amber border-amber/20'
  }

  return 'bg-green/10 text-green border-green/20'
}

function criarMovimentacaoInicial(tipo: TipoMovimentacaoManual, insumoId = ''): FormMovimentacao {
  return {
    insumoId,
    tipo,
    quantidadeKg: '',
    dataMovimentacao: agoraParaInputDateTime(),
    documentoReferencia: '',
    pessoaReferencia: '',
    valorUnitario: '',
    valorTotal: '',
    fazendaId: '',
    retiroId: '',
    observacao: '',
  }
}

function getPessoaReferenciaLabel(tipo: TipoMovimentacaoManual) {
  return tipo === 'entrada' ? 'Fornecedor / origem' : 'Destino / responsável'
}

function getPessoaReferenciaPlaceholder(tipo: TipoMovimentacaoManual) {
  return tipo === 'entrada'
    ? 'Ex.: fornecedor, fazenda de origem ou depósito'
    : 'Ex.: destino, responsável pela retirada ou local de uso'
}

function getDocumentoPlaceholder(tipo: TipoMovimentacaoManual) {
  return tipo === 'entrada'
    ? 'Ex.: recibo, pedido, romaneio ou controle interno'
    : 'Ex.: requisição, baixa interna, romaneio ou controle interno'
}

export default function InsumosPage() {
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [saldos, setSaldos] = useState<SaldoInsumo[]>([])
  const [movimentacoes, setMovimentacoes] = useState<EstoqueMovimentacao[]>([])
  const [fazendas, setFazendas] = useState<Fazenda[]>([])
  const [retiros, setRetiros] = useState<Retiro[]>([])

  const [busca, setBusca] = useState('')
  const [mostrarHistorico, setMostrarHistorico] = useState(false)

  const [modalInsumoAberto, setModalInsumoAberto] = useState(false)
  const [modalMovimentoAberto, setModalMovimentoAberto] = useState(false)

  const [formInsumo, setFormInsumo] = useState<FormInsumo>(insumoInicial)
  const [formMovimentacao, setFormMovimentacao] = useState<FormMovimentacao>(
    criarMovimentacaoInicial('entrada')
  )

  async function load() {
    setLoading(true)
    setErro(null)

    try {
      const [
        saldosData,
        movimentacoesData,
        { data: fazendasData, error: fazendasError },
        { data: retirosData, error: retirosError },
      ] = await Promise.all([
        listarSaldosInsumos(),
        listarMovimentacoesEstoque({ limite: 25 }),
        supabase.from('fazendas').select('*').eq('ativo', true).order('nome'),
        supabase.from('retiros').select('*').eq('ativo', true).order('nome'),
      ])

      if (fazendasError) {
        throw new Error(`Erro ao listar fazendas: ${fazendasError.message}`)
      }

      if (retirosError) {
        throw new Error(`Erro ao listar retiros: ${retirosError.message}`)
      }

      setSaldos(saldosData)
      setMovimentacoes(movimentacoesData)
      setFazendas((fazendasData as Fazenda[]) ?? [])
      setRetiros((retirosData as Retiro[]) ?? [])
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar o estoque.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const saldosPorId = useMemo(() => {
    return new Map(saldos.map((saldo) => [saldo.id, saldo]))
  }, [saldos])

  const retirosFiltrados = useMemo(() => {
    return retiros.filter(
      (retiro) =>
        !formMovimentacao.fazendaId ||
        retiro.fazenda_id === formMovimentacao.fazendaId
    )
  }, [retiros, formMovimentacao.fazendaId])

  const saldosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return saldos.filter((saldo) => {
      if (!termo) return true

      return saldo.nome.toLowerCase().includes(termo)
    })
  }, [saldos, busca])

  const resumo = useMemo(() => {
    const totalKg = saldos.reduce((acc, saldo) => acc + n(saldo.saldo_kg), 0)

    const alertas = saldos.filter(
      (saldo) => saldo.status_estoque !== 'normal'
    ).length

    return {
      ativos: saldos.filter((saldo) => saldo.ativo).length,
      totalKg,
      alertas,
    }
  }, [saldos])

  const tipoSelecionado = TIPOS_MOVIMENTACAO.find(
    (item) => item.value === formMovimentacao.tipo
  )

  function abrirNovoInsumo() {
    setFormInsumo(insumoInicial)
    setModalInsumoAberto(true)
  }

  function abrirEditarInsumo(saldo: SaldoInsumo) {
    setFormInsumo({
      id: saldo.id,
      nome: saldo.nome,
      categoria: saldo.categoria,
      estoque_minimo_kg:
        saldo.estoque_minimo_kg !== null &&
        saldo.estoque_minimo_kg !== undefined
          ? String(saldo.estoque_minimo_kg)
          : '',
      estoque_maximo_kg:
        saldo.estoque_maximo_kg !== null &&
        saldo.estoque_maximo_kg !== undefined
          ? String(saldo.estoque_maximo_kg)
          : '',
      ativo: saldo.ativo,
    })

    setModalInsumoAberto(true)
  }

  function abrirMovimentacao(tipo: TipoMovimentacaoManual, saldo?: SaldoInsumo) {
    setFormMovimentacao(criarMovimentacaoInicial(tipo, saldo?.id ?? ''))
    setModalMovimentoAberto(true)
  }

  function alterarTipoMovimentacao(tipo: TipoMovimentacaoManual) {
    setFormMovimentacao((current) => ({
      ...current,
      tipo,
      pessoaReferencia: '',
      documentoReferencia: '',
    }))
  }

  async function salvarInsumoSubmit() {
    const minimo = numeroOuNull(formInsumo.estoque_minimo_kg)
    const maximo = numeroOuNull(formInsumo.estoque_maximo_kg)

    if (formInsumo.estoque_minimo_kg.trim() && minimo === null) {
      alert('Informe um estoque mínimo válido.')
      return
    }

    if (formInsumo.estoque_maximo_kg.trim() && maximo === null) {
      alert('Informe um estoque máximo válido.')
      return
    }

    setSalvando(true)

    try {
      await salvarInsumo({
        id: formInsumo.id,
        nome: formInsumo.nome,
        categoria: formInsumo.categoria,
        estoque_minimo_kg: minimo,
        estoque_maximo_kg: maximo,
        ativo: formInsumo.ativo,
      })

      setModalInsumoAberto(false)
      setFormInsumo(insumoInicial)
      await load()
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar o insumo.'
      )
    } finally {
      setSalvando(false)
    }
  }

  async function salvarMovimentacaoSubmit() {
    if (!formMovimentacao.insumoId) {
      alert('Selecione o insumo.')
      return
    }

    const quantidadeKg = numeroObrigatorio(formMovimentacao.quantidadeKg)

    if (quantidadeKg === null || quantidadeKg <= 0) {
      alert('Informe uma quantidade em kg válida.')
      return
    }

    if (!formMovimentacao.dataMovimentacao) {
      alert('Informe a data da movimentação.')
      return
    }

    const saldoAtual = saldosPorId.get(formMovimentacao.insumoId)

    if (!saldoAtual) {
      alert('Insumo não encontrado.')
      return
    }

    if (!saldoAtual.ativo) {
      alert('Não é possível movimentar um insumo inativo.')
      return
    }

    if (
      movimentoSaida(formMovimentacao.tipo) &&
      quantidadeKg > n(saldoAtual.saldo_kg)
    ) {
      const confirmar = confirm(
        'Esta saída deixará o estoque negativo. Deseja continuar?'
      )

      if (!confirmar) return
    }

    const valorUnitario = numeroOuNull(formMovimentacao.valorUnitario)
    const valorTotal = numeroOuNull(formMovimentacao.valorTotal)

    if (formMovimentacao.valorUnitario.trim() && valorUnitario === null) {
      alert('Informe um valor unitário válido.')
      return
    }

    if (formMovimentacao.valorTotal.trim() && valorTotal === null) {
      alert('Informe um valor total válido.')
      return
    }

    setSalvando(true)

    try {
      await registrarMovimentacaoEstoque({
        insumoId: formMovimentacao.insumoId,
        tipo: formMovimentacao.tipo,
        quantidadeKg,
        dataMovimentacao: formMovimentacao.dataMovimentacao,
        fazendaId: formMovimentacao.fazendaId || null,
        retiroId: formMovimentacao.retiroId || null,
        documentoReferencia: formMovimentacao.documentoReferencia || null,
        pessoaReferencia: formMovimentacao.pessoaReferencia || null,
        valorUnitario,
        valorTotal,
        observacao: formMovimentacao.observacao || null,
      })

      setModalMovimentoAberto(false)
      setFormMovimentacao(criarMovimentacaoInicial('entrada'))
      await load()
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Não foi possível registrar a movimentação.'
      )
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estoque de Insumos"
        description="Controle simples de entradas e saídas de sal, ração, suplemento e outros insumos."
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="btn-ghost border border-border bg-white"
            >
              <RefreshCw
                size={14}
                className={loading ? 'animate-spin' : ''}
              />
              Atualizar
            </button>

            <button
              type="button"
              onClick={() => abrirMovimentacao('entrada')}
              className="btn-ghost border border-border bg-white"
            >
              <TrendingUp size={14} />
              Entrada
            </button>

            <button
              type="button"
              onClick={() => abrirMovimentacao('saida')}
              className="btn-ghost border border-border bg-white"
            >
              <TrendingDown size={14} />
              Saída
            </button>

            <button
              type="button"
              onClick={abrirNovoInsumo}
              className="btn-primary"
            >
              <Plus size={14} />
              Novo insumo
            </button>
          </div>
        }
      />

      {erro && (
        <div className="rounded-xl border border-red/20 bg-red/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red mt-0.5" />

            <div>
              <p className="text-sm font-semibold text-red">
                Erro ao carregar estoque
              </p>

              <p className="text-sm text-ink-muted mt-1">{erro}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ResumoSimples
          title="Insumos ativos"
          value={resumo.ativos}
          description="Produtos que podem ser movimentados"
          icon={Package}
        />

        <ResumoSimples
          title="Saldo total"
          value={formatarKg(resumo.totalKg)}
          description="Soma geral em estoque"
          icon={Boxes}
        />

        <ResumoSimples
          title="Atenção"
          value={resumo.alertas}
          description="Abaixo do mínimo ou acima do máximo"
          icon={AlertTriangle}
          danger={resumo.alertas > 0}
        />
      </div>

      <SectionCard title="O que você quer fazer?">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <AcaoCard
            icon={Plus}
            title="Cadastrar insumo"
            description="Criar sal, ração, suplemento ou mineral."
            onClick={abrirNovoInsumo}
          />

          <AcaoCard
            icon={TrendingUp}
            title="Registrar entrada"
            description="Produto entrou no estoque manualmente."
            onClick={() => abrirMovimentacao('entrada')}
          />

          <AcaoCard
            icon={TrendingDown}
            title="Registrar saída"
            description="Produto saiu do estoque manualmente."
            onClick={() => abrirMovimentacao('saida')}
          />

          <AcaoCard
            icon={FileText}
            title="Importar NF-e"
            description="Estrutura pronta. Será habilitado no módulo fiscal."
            disabled
          />
        </div>
      </SectionCard>

      <SectionCard title="Insumos cadastrados">
        <div className="relative mb-4">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />

          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar insumo..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-border rounded-lg text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-green/50 focus:ring-1 focus:ring-green/20 transition-colors"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-green/20 border-t-green rounded-full animate-spin" />
          </div>
        ) : saldos.length === 0 ? (
          <EmptyState
            title="Nenhum insumo cadastrado"
            description="Cadastre o primeiro insumo para começar o controle de estoque."
          />
        ) : saldosFiltrados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/40 p-8 text-center">
            <Archive size={24} className="mx-auto text-ink-muted" />

            <p className="text-sm font-semibold text-ink-primary mt-3">
              Nenhum insumo encontrado
            </p>

            <p className="text-sm text-ink-muted mt-1">
              Tente buscar por outro nome.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {saldosFiltrados.map((saldo) => (
              <div
                key={saldo.id}
                className="rounded-xl border border-border bg-white p-4"
              >
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-ink-primary">
                        {saldo.nome}
                      </p>

                      <span className="px-2 py-1 rounded-lg border border-border bg-surface text-xs text-ink-muted">
                        {labelCategoriaInsumo(saldo.categoria)}
                      </span>

                      {!saldo.ativo && (
                        <span className="px-2 py-1 rounded-lg border border-border bg-surface text-xs text-ink-muted">
                          Inativo
                        </span>
                      )}

                      <span
                        className={`px-2 py-1 rounded-lg border text-xs font-semibold ${statusEstoqueClasses(
                          saldo
                        )}`}
                      >
                        {statusEstoqueLabel(saldo)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                      <InfoSimples
                        label="Saldo atual"
                        value={formatarKg(n(saldo.saldo_kg))}
                      />

                      <InfoSimples
                        label="Mínimo desejado"
                        value={formatarKg(saldo.estoque_minimo_kg)}
                      />

                      <InfoSimples
                        label="Máximo desejado"
                        value={formatarKg(saldo.estoque_maximo_kg)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={!saldo.ativo}
                      onClick={() => abrirMovimentacao('entrada', saldo)}
                      className="btn-ghost text-xs border border-border bg-white disabled:opacity-50"
                    >
                      <TrendingUp size={13} />
                      Entrada
                    </button>

                    <button
                      type="button"
                      disabled={!saldo.ativo}
                      onClick={() => abrirMovimentacao('saida', saldo)}
                      className="btn-ghost text-xs border border-border bg-white disabled:opacity-50"
                    >
                      <TrendingDown size={13} />
                      Saída
                    </button>

                    <button
                      type="button"
                      onClick={() => abrirEditarInsumo(saldo)}
                      className="btn-ghost text-xs border border-border bg-white"
                    >
                      <Pencil size={13} />
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Histórico">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink-primary">
              Últimas movimentações
            </p>

            <p className="text-sm text-ink-muted mt-1">
              Entradas, saídas, lançamentos por NF-e e consumos do coletor aparecerão aqui.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMostrarHistorico((value) => !value)}
            className="btn-ghost border border-border bg-white"
          >
            <History size={14} />
            {mostrarHistorico ? 'Ocultar' : 'Ver histórico'}
          </button>
        </div>

        {mostrarHistorico && (
          <div className="mt-4 space-y-3">
            {movimentacoes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface/40 p-8 text-center">
                <ClipboardList size={24} className="mx-auto text-ink-muted" />

                <p className="text-sm font-semibold text-ink-primary mt-3">
                  Nenhuma movimentação
                </p>

                <p className="text-sm text-ink-muted mt-1">
                  O histórico aparecerá depois do primeiro lançamento.
                </p>
              </div>
            ) : (
              movimentacoes.map((movimento) => (
                <div
                  key={movimento.id}
                  className="rounded-xl border border-border bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-ink-primary">
                          {movimento.insumo?.nome ?? 'Insumo'}
                        </p>

                        <span
                          className={`px-2 py-1 rounded-lg border text-xs font-semibold ${
                            movimentoEntrada(movimento.tipo)
                              ? 'bg-green/10 text-green border-green/20'
                              : 'bg-red/10 text-red border-red/20'
                          }`}
                        >
                          {labelTipoMovimentacao(movimento.tipo)}
                        </span>

                        {movimento.origem === 'nfe' && (
                          <span className="px-2 py-1 rounded-lg border border-blue/20 bg-blue/10 text-blue text-xs font-semibold">
                            NF-e
                          </span>
                        )}

                        {movimento.origem === 'coletor' && (
                          <span className="px-2 py-1 rounded-lg border border-amber/20 bg-amber/10 text-amber text-xs font-semibold">
                            Coletor
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-ink-muted mt-2 inline-flex items-center gap-1">
                        <CalendarDays size={12} />
                        Movimentação: {formatarDataHora(movimento.data_movimentacao)}
                      </p>

                      {movimento.created_at && (
                        <p className="text-xs text-ink-muted mt-1">
                          Lançado no sistema: {formatarDataHora(movimento.created_at)}
                        </p>
                      )}

                      {(movimento.documento_referencia ||
                        movimento.pessoa_referencia) && (
                        <div className="text-xs text-ink-muted mt-2 space-y-1">
                          {movimento.documento_referencia && (
                            <p>Referência: {movimento.documento_referencia}</p>
                          )}

                          {movimento.pessoa_referencia && (
                            <p>Pessoa/origem/destino: {movimento.pessoa_referencia}</p>
                          )}
                        </div>
                      )}

                      {(movimento.valor_unitario !== null ||
                        movimento.valor_total !== null) && (
                        <p className="text-xs text-ink-muted mt-2">
                          Valor: {formatarMoeda(movimento.valor_unitario)}/kg · Total{' '}
                          {formatarMoeda(movimento.valor_total)}
                        </p>
                      )}

                      {movimento.documento_fiscal?.numero && (
                        <p className="text-xs text-ink-muted mt-2">
                          NF-e {movimento.documento_fiscal.numero}
                          {movimento.documento_fiscal.serie
                            ? `/${movimento.documento_fiscal.serie}`
                            : ''}
                        </p>
                      )}

                      {(movimento.fazenda?.nome || movimento.retiro?.nome) && (
                        <p className="text-xs text-ink-muted mt-2">
                          Local:{' '}
                          {[movimento.fazenda?.nome, movimento.retiro?.nome]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}

                      {movimento.observacao && (
                        <p className="text-xs text-ink-muted mt-2">
                          {movimento.observacao}
                        </p>
                      )}
                    </div>

                    <p
                      className={`text-sm font-bold font-mono shrink-0 ${
                        movimentoEntrada(movimento.tipo)
                          ? 'text-green'
                          : 'text-red'
                      }`}
                    >
                      {movimentoEntrada(movimento.tipo) ? '+' : '-'}
                      {formatarKg(n(movimento.quantidade_kg))}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </SectionCard>

      {modalInsumoAberto && (
        <Modal
          title={formInsumo.id ? 'Editar insumo' : 'Novo insumo'}
          onClose={() => setModalInsumoAberto(false)}
        >
          <div className="p-6 grid grid-cols-1 gap-4">
            <InputLabel label="Nome do insumo">
              <input
                value={formInsumo.nome}
                onChange={(event) =>
                  setFormInsumo({
                    ...formInsumo,
                    nome: event.target.value,
                  })
                }
                placeholder="Ex.: Sal mineral proteinado"
                className="input"
              />
            </InputLabel>

            <InputLabel label="Tipo">
              <select
                value={formInsumo.categoria}
                onChange={(event) =>
                  setFormInsumo({
                    ...formInsumo,
                    categoria: event.target.value as CategoriaInsumo,
                  })
                }
                className="input"
              >
                {CATEGORIAS.map((categoria) => (
                  <option key={categoria.value} value={categoria.value}>
                    {categoria.label}
                  </option>
                ))}
              </select>
            </InputLabel>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputLabel label="Estoque mínimo em kg">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formInsumo.estoque_minimo_kg}
                  onChange={(event) =>
                    setFormInsumo({
                      ...formInsumo,
                      estoque_minimo_kg: event.target.value,
                    })
                  }
                  placeholder="Opcional"
                  className="input"
                />
              </InputLabel>

              <InputLabel label="Estoque máximo em kg">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formInsumo.estoque_maximo_kg}
                  onChange={(event) =>
                    setFormInsumo({
                      ...formInsumo,
                      estoque_maximo_kg: event.target.value,
                    })
                  }
                  placeholder="Opcional"
                  className="input"
                />
              </InputLabel>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-secondary">
              <input
                type="checkbox"
                checked={formInsumo.ativo}
                onChange={(event) =>
                  setFormInsumo({
                    ...formInsumo,
                    ativo: event.target.checked,
                  })
                }
                className="accent-green"
              />
              Insumo ativo
            </label>
          </div>

          <ModalFooter
            onCancel={() => setModalInsumoAberto(false)}
            onConfirm={salvarInsumoSubmit}
            saving={salvando}
          />
        </Modal>
      )}

      {modalMovimentoAberto && (
        <Modal
          title={
            formMovimentacao.tipo === 'entrada'
              ? 'Registrar entrada de estoque'
              : 'Registrar saída de estoque'
          }
          onClose={() => setModalMovimentoAberto(false)}
        >
          <div className="p-6 grid grid-cols-1 gap-4">
            <div className="rounded-xl border border-border bg-surface/50 p-4">
              <p className="text-sm font-semibold text-ink-primary">
                Tipo de lançamento
              </p>

              <p className="text-xs text-ink-muted mt-1">
                {tipoSelecionado?.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {TIPOS_MOVIMENTACAO.map((tipo) => (
                  <button
                    key={tipo.value}
                    type="button"
                    onClick={() => alterarTipoMovimentacao(tipo.value)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      formMovimentacao.tipo === tipo.value
                        ? 'border-green/30 bg-green/10 text-green'
                        : 'border-border bg-white text-ink-secondary hover:bg-green/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {tipo.value === 'entrada' ? (
                        <TrendingUp size={16} />
                      ) : (
                        <TrendingDown size={16} />
                      )}

                      <p className="text-sm font-semibold">{tipo.label}</p>
                    </div>

                    <p className="text-xs mt-2 opacity-80">
                      {tipo.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <InputLabel label="Insumo">
              <select
                value={formMovimentacao.insumoId}
                onChange={(event) =>
                  setFormMovimentacao({
                    ...formMovimentacao,
                    insumoId: event.target.value,
                  })
                }
                className="input"
              >
                <option value="">Selecione</option>

                {saldos
                  .filter((saldo) => saldo.ativo)
                  .map((saldo) => (
                    <option key={saldo.id} value={saldo.id}>
                      {saldo.nome} · saldo {formatarKg(n(saldo.saldo_kg))}
                    </option>
                  ))}
              </select>
            </InputLabel>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputLabel label="Data da movimentação">
                <input
                  type="datetime-local"
                  value={formMovimentacao.dataMovimentacao}
                  onChange={(event) =>
                    setFormMovimentacao({
                      ...formMovimentacao,
                      dataMovimentacao: event.target.value,
                    })
                  }
                  className="input"
                />
              </InputLabel>

              <InputLabel label="Quantidade em kg">
                <input
                  type="number"
                  min={0}
                  step="0.001"
                  value={formMovimentacao.quantidadeKg}
                  onChange={(event) =>
                    setFormMovimentacao({
                      ...formMovimentacao,
                      quantidadeKg: event.target.value,
                    })
                  }
                  placeholder="Ex.: 500"
                  className="input"
                />
              </InputLabel>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputLabel label="Documento / referência">
                <input
                  value={formMovimentacao.documentoReferencia}
                  onChange={(event) =>
                    setFormMovimentacao({
                      ...formMovimentacao,
                      documentoReferencia: event.target.value,
                    })
                  }
                  placeholder={getDocumentoPlaceholder(formMovimentacao.tipo)}
                  className="input"
                />
              </InputLabel>

              <InputLabel label={getPessoaReferenciaLabel(formMovimentacao.tipo)}>
                <input
                  value={formMovimentacao.pessoaReferencia}
                  onChange={(event) =>
                    setFormMovimentacao({
                      ...formMovimentacao,
                      pessoaReferencia: event.target.value,
                    })
                  }
                  placeholder={getPessoaReferenciaPlaceholder(
                    formMovimentacao.tipo
                  )}
                  className="input"
                />
              </InputLabel>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputLabel label="Valor unitário em R$/kg">
                <input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={formMovimentacao.valorUnitario}
                  onChange={(event) =>
                    setFormMovimentacao({
                      ...formMovimentacao,
                      valorUnitario: event.target.value,
                    })
                  }
                  placeholder="Opcional"
                  className="input"
                />
              </InputLabel>

              <InputLabel label="Valor total">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formMovimentacao.valorTotal}
                  onChange={(event) =>
                    setFormMovimentacao({
                      ...formMovimentacao,
                      valorTotal: event.target.value,
                    })
                  }
                  placeholder="Opcional"
                  className="input"
                />
              </InputLabel>
            </div>

            <div className="rounded-xl border border-border bg-surface/50 p-4">
              <p className="text-sm font-semibold text-ink-primary">
                Local do estoque
              </p>

              <p className="text-xs text-ink-muted mt-1">
                Opcional. Use apenas quando quiser separar por fazenda ou retiro.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <InputLabel label="Fazenda">
                  <select
                    value={formMovimentacao.fazendaId}
                    onChange={(event) =>
                      setFormMovimentacao({
                        ...formMovimentacao,
                        fazendaId: event.target.value,
                        retiroId: '',
                      })
                    }
                    className="input"
                  >
                    <option value="">Estoque geral</option>

                    {fazendas.map((fazenda) => (
                      <option key={fazenda.id} value={fazenda.id}>
                        {fazenda.nome}
                      </option>
                    ))}
                  </select>
                </InputLabel>

                <InputLabel label="Retiro">
                  <select
                    value={formMovimentacao.retiroId}
                    disabled={!formMovimentacao.fazendaId}
                    onChange={(event) =>
                      setFormMovimentacao({
                        ...formMovimentacao,
                        retiroId: event.target.value,
                      })
                    }
                    className="input disabled:bg-surface disabled:text-ink-muted"
                  >
                    <option value="">
                      {formMovimentacao.fazendaId
                        ? 'Sem retiro específico'
                        : 'Selecione uma fazenda primeiro'}
                    </option>

                    {retirosFiltrados.map((retiro) => (
                      <option key={retiro.id} value={retiro.id}>
                        {retiro.nome}
                      </option>
                    ))}
                  </select>
                </InputLabel>
              </div>
            </div>

            <InputLabel label="Observação">
              <textarea
                value={formMovimentacao.observacao}
                onChange={(event) =>
                  setFormMovimentacao({
                    ...formMovimentacao,
                    observacao: event.target.value,
                  })
                }
                placeholder={
                  formMovimentacao.tipo === 'entrada'
                    ? 'Ex.: estoque existente no início do controle, compra manual ou transferência recebida'
                    : 'Ex.: baixa manual, perda, transferência enviada ou uso interno'
                }
                className="input min-h-24 resize-none"
              />
            </InputLabel>
          </div>

          <ModalFooter
            onCancel={() => setModalMovimentoAberto(false)}
            onConfirm={salvarMovimentacaoSubmit}
            saving={salvando}
          />
        </Modal>
      )}
    </div>
  )
}

function ResumoSimples({
  title,
  value,
  description,
  icon: Icon,
  danger = false,
}: {
  title: string
  value: string | number
  description: string
  icon: LucideIcon
  danger?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-ink-muted">{title}</p>

          <p className="text-2xl font-bold text-ink-primary mt-2 font-mono">
            {value}
          </p>

          <p className="text-xs text-ink-muted mt-2">{description}</p>
        </div>

        <div
          className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
            danger
              ? 'bg-red/10 text-red border-red/20'
              : 'bg-green/10 text-green border-green/20'
          }`}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

function AcaoCard({
  icon: Icon,
  title,
  description,
  onClick,
  disabled,
}: {
  icon: LucideIcon
  title: string
  description: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="text-left rounded-xl border border-border bg-white p-5 hover:border-green/30 hover:bg-green/5 transition-colors disabled:opacity-60 disabled:hover:bg-white disabled:hover:border-border"
    >
      <div className="w-10 h-10 rounded-xl bg-green/10 border border-green/20 text-green flex items-center justify-center">
        <Icon size={18} />
      </div>

      <p className="font-semibold text-ink-primary mt-4">{title}</p>

      <p className="text-sm text-ink-muted mt-1">{description}</p>
    </button>
  )
}

function InfoSimples({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-3">
      <p className="text-xs text-ink-muted">{label}</p>

      <p className="text-sm font-bold text-ink-primary mt-1 font-mono">
        {value}
      </p>
    </div>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[92vh] bg-white border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-ink-primary">{title}</h2>

            <p className="text-sm text-ink-muted mt-1">
              Lançamento manual com data, referência, local e observação.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-ink-muted hover:text-ink-primary"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function ModalFooter({
  onCancel,
  onConfirm,
  saving,
}: {
  onCancel: () => void
  onConfirm: () => void
  saving: boolean
}) {
  return (
    <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-surface/40">
      <button type="button" onClick={onCancel} className="btn-ghost">
        Cancelar
      </button>

      <button
        type="button"
        onClick={onConfirm}
        disabled={saving}
        className="btn-primary"
      >
        <Save size={14} />
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
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