import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Beef,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Package,
  RefreshCw,
  Scale,
  type LucideIcon,
} from 'lucide-react'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts'

import {
  supabase,
  type Abastecimento,
  type Cocho,
  type Fazenda,
  type Retiro,
} from '../services/supabase'

import {
  formatarValorArroba,
  obterOuAtualizarCotacaoBoiGordo,
  type CotacaoMercado,
} from '../services/mercado/MercadoService'

import PageHeader from '../components/ui/PageHeader'
import SectionCard from '../components/ui/SectionCard'
import EmptyState from '../components/ui/EmptyState'

type Periodo = 'hoje' | '7d' | '30d' | 'todos'

type CochoResumo = Cocho & {
  retiro?: {
    id: string
    nome: string
  } | null
  lote?: {
    id: string
    nome: string
  } | null
  fazenda?: {
    id: string
    nome: string
  } | null
}

type DashboardRow = Abastecimento & {
  cocho?: CochoResumo | null
  dispositivo?: {
    nome: string | null
    tratador_nome: string | null
  } | null
}

type UltimoRegistroRow = Pick<
  Abastecimento,
  'id' | 'cocho_id' | 'registrado_em'
> & {
  cocho?: CochoResumo | null
}

type MetricCardProps = {
  title: string
  value: string | number
  description: string
  icon: LucideIcon
  tone: 'green' | 'blue' | 'amber' | 'red' | 'neutral'
}

const LIMITE_SEM_REGISTRO_HORAS = 72
const UF_COTACAO_PADRAO = 'MT'

function getInicioPeriodo(periodo: Periodo) {
  if (periodo === 'todos') return null

  const data = new Date()

  if (periodo === 'hoje') {
    data.setHours(0, 0, 0, 0)
  }

  if (periodo === '7d') {
    data.setDate(data.getDate() - 7)
    data.setHours(0, 0, 0, 0)
  }

  if (periodo === '30d') {
    data.setDate(data.getDate() - 30)
    data.setHours(0, 0, 0, 0)
  }

  return data.toISOString()
}

function fmtKg(value: number) {
  return `${value.toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
  })} kg`
}

function fmtDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtHorasSemRegistro(horas: number | null) {
  if (horas === null) return 'Nunca registrado'

  if (horas < 24) {
    return `${horas}h`
  }

  const dias = Math.floor(horas / 24)
  const restoHoras = horas % 24

  if (restoHoras === 0) {
    return `${dias} dia${dias !== 1 ? 's' : ''}`
  }

  return `${dias}d ${restoHoras}h`
}

function normalizarTipo(tipo: string | null | undefined) {
  if (!tipo?.trim()) return 'Não informado'

  return tipo
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, (letra) => letra.toUpperCase())
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: MetricCardProps) {
  const toneClasses = {
    green: 'bg-green/10 text-green border-green/20',
    blue: 'bg-blue/10 text-blue border-blue/20',
    amber: 'bg-amber/10 text-amber border-amber/20',
    red: 'bg-red/10 text-red border-red/20',
    neutral: 'bg-surface text-ink-muted border-border',
  }

  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-ink-muted">{title}</p>

          <p className="text-2xl font-bold text-ink-primary mt-2 font-mono">
            {value}
          </p>
        </div>

        <div
          className={`w-10 h-10 rounded-xl border flex items-center justify-center ${toneClasses[tone]}`}
        >
          <Icon size={18} />
        </div>
      </div>

      <p className="text-xs text-ink-muted mt-3">{description}</p>
    </div>
  )
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="h-72 flex items-center justify-center rounded-xl border border-dashed border-border bg-surface/40">
      <p className="text-sm text-ink-muted">{message}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)

  const [periodo, setPeriodo] = useState<Periodo>('7d')
  const [fazendaId, setFazendaId] = useState('')
  const [retiroId, setRetiroId] = useState('')

  const [rows, setRows] = useState<DashboardRow[]>([])
  const [ultimosRegistros, setUltimosRegistros] = useState<UltimoRegistroRow[]>(
    []
  )
  const [cochosAtivos, setCochosAtivos] = useState<CochoResumo[]>([])
  const [fazendas, setFazendas] = useState<Fazenda[]>([])
  const [retiros, setRetiros] = useState<Retiro[]>([])

  const [cotacao, setCotacao] = useState<CotacaoMercado | null>(null)
  const [loadingCotacao, setLoadingCotacao] = useState(false)
  const [erroCotacao, setErroCotacao] = useState<string | null>(null)

  async function carregarCotacao() {
  setLoadingCotacao(true)
  setErroCotacao(null)

  try {
    const resultado = await obterOuAtualizarCotacaoBoiGordo({
      uf: UF_COTACAO_PADRAO,
      forceApi: false,
    })

    setCotacao(resultado)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Não foi possível carregar a cotação da arroba.'

    setErroCotacao(message)
  } finally {
    setLoadingCotacao(false)
  }
}

  async function load() {
    setLoading(true)

    try {
      let abastecimentosQuery = supabase
        .from('abastecimentos')
        .select(
          `
          *,
          cocho:cochos(
            *,
            retiro:retiros(id,nome),
            lote:lotes(id,nome),
            fazenda:fazendas(id,nome)
          ),
          dispositivo:dispositivos(nome,tratador_nome)
        `
        )
        .order('registrado_em', {
          ascending: true,
        })

      const inicio = getInicioPeriodo(periodo)

      if (inicio) {
        abastecimentosQuery = abastecimentosQuery.gte('registrado_em', inicio)
      }

      const [
        { data: abastecimentosData, error: abastecimentosError },
        { data: ultimosData, error: ultimosError },
        { data: cochosData, error: cochosError },
        { data: fazendasData },
        { data: retirosData },
      ] = await Promise.all([
        abastecimentosQuery,

        supabase
          .from('abastecimentos')
          .select(
            `
            id,
            cocho_id,
            registrado_em,
            cocho:cochos(
              *,
              retiro:retiros(id,nome),
              lote:lotes(id,nome),
              fazenda:fazendas(id,nome)
            )
          `
          )
          .order('registrado_em', {
            ascending: false,
          })
          .limit(3000),

        supabase
          .from('cochos')
          .select(
            `
            *,
            retiro:retiros(id,nome),
            lote:lotes(id,nome),
            fazenda:fazendas(id,nome)
          `
          )
          .eq('ativo', true)
          .order('nome'),

        supabase
          .from('fazendas')
          .select('*')
          .eq('ativo', true)
          .order('nome'),

        supabase.from('retiros').select('*').order('nome'),
      ])

      if (abastecimentosError) {
        console.error(abastecimentosError)
        setRows([])
      } else {
        setRows((abastecimentosData as DashboardRow[]) ?? [])
      }

      if (ultimosError) {
        console.error(ultimosError)
        setUltimosRegistros([])
      } else {
        setUltimosRegistros((ultimosData as UltimoRegistroRow[]) ?? [])
      }

      if (cochosError) {
        console.error(cochosError)
        setCochosAtivos([])
      } else {
        setCochosAtivos((cochosData as CochoResumo[]) ?? [])
      }

      setFazendas((fazendasData as Fazenda[]) ?? [])
      setRetiros((retirosData as Retiro[]) ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [periodo])

  useEffect(() => {
  void carregarCotacao()
}, [])

  const retirosFiltrados = useMemo(() => {
    return retiros.filter(
      (retiro) => !fazendaId || retiro.fazenda_id === fazendaId
    )
  }, [retiros, fazendaId])

  const rowsFiltradas = useMemo(() => {
    return rows.filter((row) => {
      if (fazendaId && row.cocho?.fazenda_id !== fazendaId) return false
      if (retiroId && row.cocho?.retiro_id !== retiroId) return false

      return true
    })
  }, [rows, fazendaId, retiroId])

  const cochosFiltrados = useMemo(() => {
    return cochosAtivos.filter((cocho) => {
      if (fazendaId && cocho.fazenda_id !== fazendaId) return false
      if (retiroId && cocho.retiro_id !== retiroId) return false

      return true
    })
  }, [cochosAtivos, fazendaId, retiroId])

  const totalKg = useMemo(() => {
    return rowsFiltradas.reduce(
      (acc, item) => acc + (item.quantidade_kg ?? 0),
      0
    )
  }, [rowsFiltradas])

  const cochosAbastecidos = useMemo(() => {
    return new Set(rowsFiltradas.map((row) => row.cocho_id).filter(Boolean))
      .size
  }, [rowsFiltradas])

  const resumoPorTipo = useMemo(() => {
    const map = new Map<
      string,
      {
        tipo: string
        totalKg: number
        registros: number
        mediaKg: number
      }
    >()

    rowsFiltradas.forEach((row) => {
      const tipo = normalizarTipo(row.tipo_abastecimento)

      const atual =
        map.get(tipo) ??
        {
          tipo,
          totalKg: 0,
          registros: 0,
          mediaKg: 0,
        }

      atual.totalKg += row.quantidade_kg ?? 0
      atual.registros += 1
      atual.mediaKg = atual.totalKg / atual.registros

      map.set(tipo, atual)
    })

    return Array.from(map.values()).sort((a, b) => b.totalKg - a.totalKg)
  }, [rowsFiltradas])

  const tiposUsados = resumoPorTipo.length

  const mediaKgPorRegistro = useMemo(() => {
    if (rowsFiltradas.length === 0) return 0

    return totalKg / rowsFiltradas.length
  }, [totalKg, rowsFiltradas.length])

  const linhaTempo = useMemo(() => {
    const map = new Map<
      string,
      {
        dataKey: string
        dia: string
        totalKg: number
      }
    >()

    rowsFiltradas.forEach((row) => {
      const data = new Date(row.registrado_em)
      const dataKey = data.toISOString().slice(0, 10)
      const dia = data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      })

      const atual =
        map.get(dataKey) ??
        {
          dataKey,
          dia,
          totalKg: 0,
        }

      atual.totalKg += row.quantidade_kg ?? 0

      map.set(dataKey, atual)
    })

    return Array.from(map.values()).sort((a, b) =>
      a.dataKey.localeCompare(b.dataKey)
    )
  }, [rowsFiltradas])

  const ultimosPorCocho = useMemo(() => {
    const map = new Map<string, UltimoRegistroRow>()

    ultimosRegistros.forEach((registro) => {
      if (!registro.cocho_id) return

      if (!map.has(registro.cocho_id)) {
        map.set(registro.cocho_id, registro)
      }
    })

    return map
  }, [ultimosRegistros])

  const cochosSemRegistro72h = useMemo(() => {
    const agora = Date.now()

    return cochosFiltrados
      .map((cocho) => {
        const ultimo = ultimosPorCocho.get(cocho.id)

        if (!ultimo) {
          return {
            cocho,
            ultimoRegistro: null,
            horasSemRegistro: null,
          }
        }

        const horasSemRegistro = Math.floor(
          (agora - new Date(ultimo.registrado_em).getTime()) /
            (1000 * 60 * 60)
        )

        return {
          cocho,
          ultimoRegistro: ultimo.registrado_em,
          horasSemRegistro,
        }
      })
      .filter(
        (item) =>
          item.horasSemRegistro === null ||
          item.horasSemRegistro >= LIMITE_SEM_REGISTRO_HORAS
      )
      .sort((a, b) => {
        if (a.horasSemRegistro === null) return -1
        if (b.horasSemRegistro === null) return 1

        return b.horasSemRegistro - a.horasSemRegistro
      })
  }, [cochosFiltrados, ultimosPorCocho])

  const periodoLabel =
    periodo === 'hoje'
      ? 'Hoje'
      : periodo === '7d'
      ? 'Últimos 7 dias'
      : periodo === '30d'
      ? 'Últimos 30 dias'
      : 'Todos os registros'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Resumo executivo da operação, abastecimento, consumo e alertas"
        action={
          <button
            type="button"
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
        }
      />

      <SectionCard title="Filtros do Dashboard">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-4 items-end">
          <div>
            <label className="text-xs font-medium text-ink-muted">
              Fazenda
            </label>

            <select
              value={fazendaId}
              onChange={(event) => {
                setFazendaId(event.target.value)
                setRetiroId('')
              }}
              className="mt-2 w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-ink-primary focus:outline-none focus:border-green/50 focus:ring-1 focus:ring-green/20 transition-colors"
            >
              <option value="">Todas as fazendas</option>

              {fazendas.map((fazenda) => (
                <option key={fazenda.id} value={fazenda.id}>
                  {fazenda.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-ink-muted">
              Retiro
            </label>

            <select
              value={retiroId}
              onChange={(event) => setRetiroId(event.target.value)}
              className="mt-2 w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-ink-primary focus:outline-none focus:border-green/50 focus:ring-1 focus:ring-green/20 transition-colors"
            >
              <option value="">Todos os retiros</option>

              {retirosFiltrados.map((retiro) => (
                <option key={retiro.id} value={retiro.id}>
                  {retiro.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {[
              { value: 'hoje', label: 'Hoje' },
              { value: '7d', label: '7 dias' },
              { value: '30d', label: '30 dias' },
              { value: 'todos', label: 'Todos' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPeriodo(item.value as Periodo)}
                className={`px-4 py-2 text-sm rounded-lg transition-all font-medium border ${
                  periodo === item.value
                    ? 'bg-green/10 text-green border-green/20'
                    : 'bg-white text-ink-muted border-border hover:bg-surface'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-4 border-green/20 border-t-green rounded-full animate-spin" />
        </div>
      ) : cochosAtivos.length === 0 ? (
        <EmptyState
          title="Nenhum cocho ativo encontrado"
          description="Cadastre cochos ativos para visualizar o dashboard operacional."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard
                title="Total abastecido"
                value={fmtKg(totalKg)}
                description={periodoLabel}
                icon={Scale}
                tone="green"
              />

              <MetricCard
                title="Cochos abastecidos"
                value={cochosAbastecidos}
                description={`De ${cochosFiltrados.length} cochos ativos no filtro`}
                icon={Beef}
                tone="blue"
              />

              <MetricCard
                title="Sem registro 72h"
                value={cochosSemRegistro72h.length}
                description="Cochos que precisam de atenção operacional"
                icon={AlertTriangle}
                tone={cochosSemRegistro72h.length > 0 ? 'red' : 'green'}
              />

              <MetricCard
                title="Tipos usados"
                value={tiposUsados}
                description="Rações, sais ou suplementos no período"
                icon={Package}
                tone="amber"
              />
            </div>

            <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
                      Mercado
                    </p>

                    <span className="px-2 py-0.5 rounded-full bg-green/10 border border-green/20 text-[11px] font-medium text-green">
                      Boi gordo
                    </span>
                  </div>

                  <p className="text-3xl font-bold text-ink-primary mt-3 font-mono">
                    {loadingCotacao
                      ? 'Carregando...'
                      : formatarValorArroba(cotacao?.valor_arroba)}
                    <span className="text-base text-ink-muted ml-1">/@</span>
                  </p>

                  <p className="text-xs text-ink-muted mt-2">
                    Referência {cotacao?.uf ?? UF_COTACAO_PADRAO} · Cotação diária
                  </p>
                </div>

                <div className="w-10 h-10 rounded-xl border bg-green/10 text-green border-green/20 flex items-center justify-center">
                  <CircleDollarSign size={18} />
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-border bg-surface/60 p-3">
                <p className="text-xs text-ink-muted">
                  Referência de Mercado
                </p>

                <p className="text-sm font-medium text-ink-primary mt-1">
                  {cotacao
                    ? cotacao.origem === 'api'
                      ? 'Cotação diária atualizada'
                      : 'Informada manualmente'
                    : 'Aguardando cotação'}
                </p>

                <p className="text-xs text-ink-muted mt-2 leading-relaxed">
                  {cotacao?.fonte
                    ? `Fonte: ${cotacao.fonte}`
                    : 'O sistema buscará automaticamente uma cotação diária quando necessário.'}
                </p>

                {cotacao?.data && (
                  <p className="text-xs text-ink-muted mt-2">
                    Data de referência: {new Date(cotacao.data).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>

              {erroCotacao && (
                <p className="text-xs text-red font-medium mt-3">
                  {erroCotacao}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <SectionCard title="Resumo por Tipo de Ração/Sal">
              {resumoPorTipo.length === 0 ? (
                <ChartEmpty message="Nenhum abastecimento encontrado para os filtros selecionados." />
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={resumoPorTipo}>
                      <CartesianGrid stroke="#DDD8CC" vertical={false} />

                      <XAxis dataKey="tipo" stroke="#7B847B" fontSize={12} />

                      <YAxis stroke="#7B847B" fontSize={12} />

                      <Tooltip
                        formatter={(value: number | string) =>
                          typeof value === 'number' ? fmtKg(value) : value
                        }
                      />

                      <Bar
                        dataKey="totalKg"
                        name="Total abastecido"
                        fill="#2F6B4F"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Evolução Diária">
              {linhaTempo.length === 0 ? (
                <ChartEmpty message="Nenhum dado diário para exibir neste período." />
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={linhaTempo}>
                      <CartesianGrid stroke="#DDD8CC" vertical={false} />

                      <XAxis dataKey="dia" stroke="#7B847B" fontSize={12} />

                      <YAxis stroke="#7B847B" fontSize={12} />

                      <Tooltip
                        formatter={(value: number | string) =>
                          typeof value === 'number' ? fmtKg(value) : value
                        }
                      />

                      <Line
                        type="monotone"
                        dataKey="totalKg"
                        name="Total abastecido"
                        stroke="#2F6B4F"
                        strokeWidth={3}
                        dot={{
                          r: 3,
                        }}
                        activeDot={{
                          r: 5,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Média por Tipo">
              {resumoPorTipo.length === 0 ? (
                <ChartEmpty message="Sem médias disponíveis para os filtros selecionados." />
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-surface p-3">
                    <p className="text-xs text-ink-muted">
                      Média geral por registro
                    </p>

                    <p className="text-xl font-bold text-ink-primary mt-1 font-mono">
                      {fmtKg(mediaKgPorRegistro)}
                    </p>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {resumoPorTipo.map((item) => (
                      <div
                        key={item.tipo}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-ink-primary">
                            {item.tipo}
                          </p>

                          <p className="text-xs text-ink-muted mt-1">
                            {item.registros} registro
                            {item.registros !== 1 ? 's' : ''}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold text-ink-primary font-mono">
                            {fmtKg(item.mediaKg)}
                          </p>

                          <p className="text-xs text-ink-muted">média</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
            <SectionCard title="Cochos sem Registro há 72h">
              {cochosSemRegistro72h.length === 0 ? (
                <div className="rounded-xl border border-green/20 bg-green/10 p-4">
                  <p className="text-sm font-semibold text-green">
                    Nenhum cocho crítico no filtro atual.
                  </p>

                  <p className="text-xs text-ink-muted mt-1">
                    Todos os cochos ativos possuem registro dentro do limite
                    operacional.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {cochosSemRegistro72h.slice(0, 10).map((item) => (
                    <div
                      key={item.cocho.id}
                      className="rounded-xl border border-red/20 bg-red/5 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-ink-primary">
                            {item.cocho.nome}
                          </p>

                          <p className="text-xs text-ink-muted mt-1">
                            {item.cocho.retiro?.nome ?? 'Sem retiro'} ·{' '}
                            {item.cocho.lote?.nome ?? 'Sem lote'}
                          </p>

                          <p className="text-xs text-ink-muted mt-1 font-mono">
                            {item.cocho.codigo_qr}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold text-red">
                            {fmtHorasSemRegistro(item.horasSemRegistro)}
                          </p>

                          <p className="text-xs text-ink-muted mt-1">
                            sem registro
                          </p>
                        </div>
                      </div>

                      {item.ultimoRegistro && (
                        <p className="text-xs text-ink-muted mt-3">
                          Último registro: {fmtDataHora(item.ultimoRegistro)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Leitura Executiva">
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center gap-2 text-ink-primary">
                    <CalendarDays size={16} />
                    <p className="text-sm font-semibold">Período analisado</p>
                  </div>

                  <p className="text-sm text-ink-muted mt-2">{periodoLabel}</p>
                </div>

                <div className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center gap-2 text-ink-primary">
                    <BarChart3 size={16} />
                    <p className="text-sm font-semibold">
                      Principal tipo abastecido
                    </p>
                  </div>

                  <p className="text-sm text-ink-muted mt-2">
                    {resumoPorTipo[0]
                      ? `${resumoPorTipo[0].tipo} — ${fmtKg(
                          resumoPorTipo[0].totalKg
                        )}`
                      : 'Nenhum tipo registrado no período.'}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center gap-2 text-ink-primary">
                    <Clock3 size={16} />
                    <p className="text-sm font-semibold">Risco operacional</p>
                  </div>

                  <p className="text-sm text-ink-muted mt-2">
                    {cochosSemRegistro72h.length > 0
                      ? `${cochosSemRegistro72h.length} cocho${
                          cochosSemRegistro72h.length !== 1 ? 's' : ''
                        } exigem verificação por falta de registro há 72h ou mais.`
                      : 'Nenhum alerta crítico de registro no filtro atual.'}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center gap-2 text-ink-primary">
                    <Package size={16} />
                    <p className="text-sm font-semibold">Próxima etapa</p>
                  </div>

                  <p className="text-sm text-ink-muted mt-2">
                    O módulo de estoque será conectado aqui depois que os
                    insumos, saldos e movimentações forem criados.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  )
}