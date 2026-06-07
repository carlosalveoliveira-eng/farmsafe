import { useEffect, useMemo, useState } from 'react'
import {
  Flame,
  Beef,
  BarChart3,
  Smartphone,
  CalendarDays,
  Trophy,
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

import { supabase, type Abastecimento } from '../services/supabase'
import PageHeader from '../components/PageHeader'

type Periodo = 'hoje' | '7d' | '30d' | 'todos'

function getInicioPeriodo(periodo: Periodo) {
  if (periodo === 'todos') return null

  const data = new Date()

  if (periodo === 'hoje') {
    data.setHours(0, 0, 0, 0)
  }

  if (periodo === '7d') {
    data.setDate(data.getDate() - 7)
  }

  if (periodo === '30d') {
    data.setDate(data.getDate() - 30)
  }

  return data.toISOString()
}

function fmtKg(value: number) {
  return `${value.toLocaleString('pt-BR')} kg`
}

function calcularTempoEntreCochos(registros: Abastecimento[]) {
  const ordenados = [...registros].sort(
    (a, b) =>
      new Date(a.registrado_em).getTime() -
      new Date(b.registrado_em).getTime()
  )

  const diferencasMinutos: number[] = []

  for (let i = 1; i < ordenados.length; i++) {
    const anterior = ordenados[i - 1]
    const atual = ordenados[i]

    const diaAnterior = new Date(anterior.registrado_em).toDateString()
    const diaAtual = new Date(atual.registrado_em).toDateString()

    if (diaAnterior !== diaAtual) continue

    const diffMs =
      new Date(atual.registrado_em).getTime() -
      new Date(anterior.registrado_em).getTime()

    const diffMin = Math.round(diffMs / 60000)

    if (diffMin > 0) {
      diferencasMinutos.push(diffMin)
    }
  }

  if (diferencasMinutos.length === 0) {
    return {
      mediaMinutos: 0,
      menorMinutos: 0,
      maiorMinutos: 0,
    }
  }

  const total = diferencasMinutos.reduce((acc, item) => acc + item, 0)

  return {
    mediaMinutos: Math.round(total / diferencasMinutos.length),
    menorMinutos: Math.min(...diferencasMinutos),
    maiorMinutos: Math.max(...diferencasMinutos),
  }
}

function fmtMinutos(minutos: number) {
  if (!minutos) return '—'

  if (minutos < 60) {
    return `${minutos} min`
  }

  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60

  return `${horas}h ${resto}min`
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] =
    useState<Periodo>('7d')

  const [rows, setRows] = useState<Abastecimento[]>([])

  async function load() {
    setLoading(true)

    let q = supabase
      .from('abastecimentos')
      .select(
        `
        *,
        cocho:cochos(nome),
        dispositivo:dispositivos(nome,tratador_nome)
      `
      )
      .order('registrado_em', {
        ascending: true,
      })

    const inicio = getInicioPeriodo(periodo)

    if (inicio) {
      q = q.gte('registrado_em', inicio)
    }

    const { data, error } = await q

    if (error) {
      console.error(error)
      setRows([])
    } else {
      setRows((data as Abastecimento[]) ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [periodo])

  const totalKg = useMemo(() => {
    return rows.reduce(
      (acc, item) =>
        acc + (item.quantidade_kg ?? 0),
      0
    )
  }, [rows])

  const totalRegistros = rows.length

  const totalCochos = useMemo(() => {
    return new Set(
      rows.map((r) => r.cocho?.nome)
    ).size
  }, [rows])

  const mediaKgPorCocho = useMemo(() => {
    if (!totalCochos) return 0
    return totalKg / totalCochos
  }, [totalKg, totalCochos])

  const rankingTratadores = useMemo(() => {
    const map = new Map<string, number>()

    rows.forEach((r) => {
      const nome =
        r.dispositivo?.tratador_nome ||
        r.dispositivo?.nome ||
        'Sem nome'

      map.set(nome, (map.get(nome) ?? 0) + 1)
    })

    return Array.from(map.entries())
      .map(([nome, total]) => ({
        nome,
        total,
      }))
      .sort((a, b) => b.total - a.total)
  }, [rows])

  const rankingCochos = useMemo(() => {
    const map = new Map<string, number>()

    rows.forEach((r) => {
      const nome =
        r.cocho?.nome || 'Sem cocho'

      map.set(
        nome,
        (map.get(nome) ?? 0) +
          (r.quantidade_kg ?? 0)
      )
    })

    return Array.from(map.entries())
      .map(([nome, total]) => ({
        nome,
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [rows])

  const linhaTempo = useMemo(() => {
    const map = new Map<
      string,
      number
    >()

    rows.forEach((r) => {
      const dia = new Date(
        r.registrado_em
      ).toLocaleDateString('pt-BR')

      map.set(
        dia,
        (map.get(dia) ?? 0) +
          (r.quantidade_kg ?? 0)
      )
    })

    return Array.from(map.entries()).map(
      ([dia, total]) => ({
        dia,
        total,
      })
    )
  }, [rows])

  const porTipo = useMemo(() => {
    const map = new Map<
      string,
      number
    >()

    rows.forEach((r) => {
      const tipo =
        r.tipo_abastecimento ||
        'Sem tipo'

      map.set(
        tipo,
        (map.get(tipo) ?? 0) +
          (r.quantidade_kg ?? 0)
      )
    })

    return Array.from(map.entries()).map(
      ([tipo, total]) => ({
        tipo,
        total,
      })
    )
  }, [rows])

  const topTratador =
    rankingTratadores[0]

  const topCocho =
    rankingCochos[0]

  const tempoEntreCochos = calcularTempoEntreCochos(rows)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Visão operacional em tempo real"
      />

      <div className="flex items-center gap-2 mb-6">
        {[
          {
            value: 'hoje',
            label: 'Hoje',
          },
          {
            value: '7d',
            label: '7 dias',
          },
          {
            value: '30d',
            label: '30 dias',
          },
          {
            value: 'todos',
            label: 'Todos',
          },
        ].map((item) => (
          <button
            key={item.value}
            onClick={() =>
              setPeriodo(
                item.value as Periodo
              )
            }
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              periodo === item.value
                ? 'bg-green/10 text-green border-green/20'
                : 'bg-surface text-ink-muted border-border hover:text-ink-primary'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-6 gap-4 mb-6">
            <div className="fs-card p-4">
              <div className="flex items-center justify-between">
                <Flame
                  size={16}
                  className="text-green"
                />
                <span className="text-[10px] text-ink-muted uppercase">
                  Volume
                </span>
              </div>

              <p className="mt-4 text-2xl font-semibold text-ink-primary">
                {fmtKg(totalKg)}
              </p>

              <p className="mt-1 text-xs text-ink-muted">
                Total abastecido
              </p>
            </div>

            <div className="fs-card p-4">
              <div className="flex items-center justify-between">
                <Beef
                  size={16}
                  className="text-green"
                />
                <span className="text-[10px] text-ink-muted uppercase">
                  Cochos
                </span>
              </div>

              <p className="mt-4 text-2xl font-semibold text-ink-primary">
                {totalCochos}
              </p>

              <p className="mt-1 text-xs text-ink-muted">
                Cochos abastecidos
              </p>
            </div>

            <div className="fs-card p-4">
              <div className="flex items-center justify-between">
                <BarChart3
                  size={16}
                  className="text-green"
                />
                <span className="text-[10px] text-ink-muted uppercase">
                  Média
                </span>
              </div>

              <p className="mt-4 text-2xl font-semibold text-ink-primary">
                {fmtKg(
                  Number(
                    mediaKgPorCocho.toFixed(1)
                  )
                )}
              </p>

              <p className="mt-1 text-xs text-ink-muted">
                Média por cocho
              </p>
            </div>

            <div className="fs-card p-4">
              <div className="flex items-center justify-between">
                <CalendarDays
                  size={16}
                  className="text-green"
                />
                <span className="text-[10px] text-ink-muted uppercase">
                  Registros
                </span>
              </div>

              <p className="mt-4 text-2xl font-semibold text-ink-primary">
                {totalRegistros}
              </p>

              <p className="mt-1 text-xs text-ink-muted">
                Total operacional
              </p>
            </div>

            <div className="fs-card p-4">
              <div className="flex items-center justify-between">
                <Smartphone
                  size={16}
                  className="text-green"
                />
                <span className="text-[10px] text-ink-muted uppercase">
                  Top tratador
                </span>
              </div>

              <p className="mt-4 text-sm font-semibold text-ink-primary truncate">
                {topTratador?.nome ||
                  '—'}
              </p>

              <p className="mt-1 text-xs text-ink-muted">
                {topTratador?.total ?? 0}{' '}
                registros
              </p>
            </div>

            <div className="fs-card p-4">
              <div className="flex items-center justify-between">
                <Trophy
                  size={16}
                  className="text-green"
                />
                <span className="text-[10px] text-ink-muted uppercase">
                  Top cocho
                </span>
              </div>

              <p className="mt-4 text-sm font-semibold text-ink-primary truncate">
                {topCocho?.nome || '—'}
              </p>

              <p className="mt-1 text-xs text-ink-muted">
                {fmtKg(
                  topCocho?.total ?? 0
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            <div className="fs-card p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-ink-primary">
                  Linha do tempo
                </h3>

                <p className="text-xs text-ink-muted mt-1">
                  Volume abastecido por dia
                </p>
              </div>

              <div className="h-[320px]">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart
                    data={linhaTempo}
                  >
                    <CartesianGrid
                      stroke="#2a2d1f"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="dia"
                      stroke="#5a5749"
                      fontSize={11}
                    />

                    <YAxis
                      stroke="#5a5749"
                      fontSize={11}
                    />

                    <Tooltip />

                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#4ade80"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="fs-card p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-ink-primary">
                  Ranking de cochos
                </h3>

                <p className="text-xs text-ink-muted mt-1">
                  Volume total por cocho
                </p>
              </div>

              <div className="h-[320px]">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={rankingCochos}
                  >
                    <CartesianGrid
                      stroke="#2a2d1f"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="nome"
                      stroke="#5a5749"
                      fontSize={11}
                    />

                    <YAxis
                      stroke="#5a5749"
                      fontSize={11}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="total"
                      fill="#4ade80"
                      radius={[
                        4, 4, 0, 0,
                      ]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="fs-card p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-ink-primary">
                  Produtividade por tratador
                </h3>

                <p className="text-xs text-ink-muted mt-1">
                  Quantidade de registros
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {rankingTratadores
                  .slice(0, 5)
                  .map((item, idx) => (
                    <div
                      key={item.nome}
                      className="flex items-center gap-4"
                    >
                      <div className="w-7 h-7 rounded-md bg-green/10 flex items-center justify-center text-xs text-green font-semibold">
                        {idx + 1}
                      </div>

                      <div className="fs-card p-4">
                      <div className="flex items-center justify-between">
                        <CalendarDays
                          size={16}
                          className="text-green"
                        />
                        <span className="text-[10px] text-ink-muted uppercase">
                          Tempo médio
                        </span>
                      </div>

                      <p className="mt-4 text-2xl font-semibold text-ink-primary">
                        {fmtMinutos(tempoEntreCochos.mediaMinutos)}
                      </p>

                      <p className="mt-1 text-xs text-ink-muted">
                        Entre um cocho e outro
                      </p>
                    </div>

                      <div className="flex-1">
                        <p className="text-sm text-ink-primary">
                          {item.nome}
                        </p>

                        <div className="w-full h-2 rounded-full bg-surface mt-2 overflow-hidden">
                          <div
                            className="h-full bg-green rounded-full"
                            style={{
                              width: `${
                                (item.total /
                                  (rankingTratadores[0]
                                    ?.total ||
                                    1)) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      <span className="text-xs text-ink-muted font-mono">
                        {item.total}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="fs-card p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-ink-primary">
                  Volume por tipo
                </h3>

                <p className="text-xs text-ink-muted mt-1">
                  Distribuição operacional
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {porTipo.map((item) => (
                  <div
                    key={item.tipo}
                    className="flex items-center justify-between border-b border-border pb-3"
                  >
                    <div>
                      <p className="text-sm text-ink-primary">
                        {item.tipo}
                      </p>
                    </div>

                    <span className="text-xs text-green font-mono">
                      {fmtKg(item.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}