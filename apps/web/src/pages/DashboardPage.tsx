import { useEffect, useMemo, useState } from 'react'
import {
  Flame,
  Beef,
  BarChart3,
  Smartphone,
  CalendarDays,
  Trophy,
  AlertTriangle,
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

import PageHeader from '../components/ui/PageHeader'
import SectionCard from '../components/ui/SectionCard'
import StatCard from '../components/ui/StatCard'
import EmptyState from '../components/ui/EmptyState'

type Periodo = 'hoje' | '7d' | '30d' | 'todos'

type StatusCocho = {
  id: string
  status_operacional:
    | 'ok'
    | 'atencao'
    | 'atrasado'
    | 'sem_registro'
}

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

function fmtMinutos(minutos: number) {
  if (!minutos) return '—'

  if (minutos < 60) {
    return `${minutos} min`
  }

  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60

  return `${horas}h ${resto}min`
}

function calcularTempoEntreCochos(
  registros: Abastecimento[]
) {
  const ordenados = [...registros].sort(
    (a, b) =>
      new Date(a.registrado_em).getTime() -
      new Date(b.registrado_em).getTime()
  )

  const diferencasMinutos: number[] = []

  for (let i = 1; i < ordenados.length; i++) {
    const anterior = ordenados[i - 1]
    const atual = ordenados[i]

    const diaAnterior = new Date(
      anterior.registrado_em
    ).toDateString()

    const diaAtual = new Date(
      atual.registrado_em
    ).toDateString()

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
    }
  }

  const total = diferencasMinutos.reduce(
    (acc, item) => acc + item,
    0
  )

  return {
    mediaMinutos: Math.round(
      total / diferencasMinutos.length
    ),
  }
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)

  const [periodo, setPeriodo] =
    useState<Periodo>('7d')

  const [rows, setRows] = useState<
    Abastecimento[]
  >([])

  const [statusCochos, setStatusCochos] =
    useState<StatusCocho[]>([])

  async function load() {
    setLoading(true)

    try {
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

      const inicio =
        getInicioPeriodo(periodo)

      if (inicio) {
        q = q.gte(
          'registrado_em',
          inicio
        )
      }

      const [
        { data, error },
        { data: statusData },
      ] = await Promise.all([
        q,
        supabase
          .from('vw_status_cochos')
          .select(
            'id,status_operacional'
          )
          .eq('ativo', true),
      ])

      if (error) {
        console.error(error)
        setRows([])
      } else {
        setRows(
          (data as Abastecimento[]) ?? []
        )
      }

      setStatusCochos(
        (statusData as StatusCocho[]) ??
          []
      )
    } finally {
      setLoading(false)
    }
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

      map.set(
        nome,
        (map.get(nome) ?? 0) + 1
      )
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

  const tempoEntreCochos =
    calcularTempoEntreCochos(rows)

  const alertasResumo = useMemo(() => {
    return {
      ok: statusCochos.filter(
        (c) =>
          c.status_operacional === 'ok'
      ).length,

      atencao: statusCochos.filter(
        (c) =>
          c.status_operacional ===
          'atencao'
      ).length,

      atrasado: statusCochos.filter(
        (c) =>
          c.status_operacional ===
          'atrasado'
      ).length,

      semRegistro: statusCochos.filter(
        (c) =>
          c.status_operacional ===
          'sem_registro'
      ).length,
    }
  }, [statusCochos])

  return (
    <div className="space-y-10">
      <PageHeader
        title="Dashboard"
        description="Visão operacional da fazenda em tempo real"
      />

      <div className="flex items-center gap-3 flex-wrap">
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
            className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all ${
              periodo === item.value
                ? 'bg-green text-white border-green'
                : 'bg-panel text-ink-secondary border-border hover:border-green hover:text-green'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-4 border-green/20 border-t-green rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nenhum abastecimento encontrado"
          description="Ainda não existem dados para este período."
        />
      ) : (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-7">
            <StatCard
              title="Cochos OK"
              value={alertasResumo.ok}
              icon={Beef}
            />

            <StatCard
              title="Em atenção"
              value={alertasResumo.atencao}
              icon={CalendarDays}
            />

            <StatCard
              title="Atrasados"
              value={alertasResumo.atrasado}
              icon={AlertTriangle}
            />

            <StatCard
              title="Sem registro"
              value={alertasResumo.semRegistro}
              icon={Smartphone}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-7">
            <StatCard
              title="Total abastecido"
              value={fmtKg(totalKg)}
              icon={Flame}
            />

            <StatCard
              title="Cochos abastecidos"
              value={totalCochos}
              icon={Beef}
            />

            <StatCard
              title="Média por cocho"
              value={fmtKg(
                Number(
                  mediaKgPorCocho.toFixed(1)
                )
              )}
              icon={BarChart3}
            />

            <StatCard
              title="Total de registros"
              value={totalRegistros}
              icon={CalendarDays}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
            <StatCard
              title="Tempo médio"
              value={fmtMinutos(
                tempoEntreCochos.mediaMinutos
              )}
              icon={CalendarDays}
            />

            <StatCard
              title="Top tratador"
              value={
                rankingTratadores[0]
                  ?.nome || '—'
              }
              icon={Smartphone}
            />

            <StatCard
              title="Top cocho"
              value={
                rankingCochos[0]?.nome ||
                '—'
              }
              icon={Trophy}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-7">
            <SectionCard title="Linha do tempo operacional">
              <div className="h-80">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart
                    data={linhaTempo}
                  >
                    <CartesianGrid
                      stroke="#DDD8CC"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="dia"
                      stroke="#7B847B"
                      fontSize={12}
                    />

                    <YAxis
                      stroke="#7B847B"
                      fontSize={12}
                    />

                    <Tooltip />

                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#2F6B4F"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Ranking de cochos">
              <div className="h-80">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={rankingCochos}
                  >
                    <CartesianGrid
                      stroke="#DDD8CC"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="nome"
                      stroke="#7B847B"
                      fontSize={12}
                    />

                    <YAxis
                      stroke="#7B847B"
                      fontSize={12}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="total"
                      fill="#2F6B4F"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  )
}