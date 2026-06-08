import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Search,
  RefreshCw,
  Clock3,
  ShieldAlert,
} from 'lucide-react'

import { supabase } from '../services/supabase'

import PageHeader from '../components/ui/PageHeader'
import SectionCard from '../components/ui/SectionCard'
import StatCard from '../components/ui/StatCard'
import DataTable from '../components/ui/DataTable'
import EmptyState from '../components/ui/EmptyState'
import StatusBadge from '../components/ui/StatusBadge'

type LogOperacional = {
  id: string
  tipo: string
  descricao: string | null
  payload: any
  created_at: string
}

function formatarData(data: string) {
  return new Date(data).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatus(tipo: string) {
  const texto = tipo.toLowerCase()

  if (
    texto.includes('erro') ||
    texto.includes('critical') ||
    texto.includes('falha')
  ) {
    return 'warn'
  }

  if (
    texto.includes('sync') ||
    texto.includes('sincron')
  ) {
    return 'ok'
  }

  return 'muted'
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogOperacional[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)

    const { data } = await supabase
      .from('logs_operacionais')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    setLogs(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return logs

    return logs.filter((log) => {
      const termo = search.toLowerCase()

      return (
        log.tipo?.toLowerCase().includes(termo) ||
        log.descricao?.toLowerCase().includes(termo)
      )
    })
  }, [logs, search])

  const logsCriticos = useMemo(() => {
    return logs.filter((log) => {
      const texto = log.tipo.toLowerCase()

      return (
        texto.includes('erro') ||
        texto.includes('critical') ||
        texto.includes('falha')
      )
    }).length
  }, [logs])

  const logsHoje = useMemo(() => {
    const inicio = new Date()
    inicio.setHours(0, 0, 0, 0)

    return logs.filter(
      (log) =>
        new Date(log.created_at).getTime() >= inicio.getTime()
    ).length
  }, [logs])

  const ultimaAtividade =
    logs.length > 0
      ? formatarData(logs[0].created_at)
      : '—'

  return (
    <div className="space-y-8">
      <PageHeader
        title="Logs Operacionais"
        description="Auditoria e rastreabilidade dos eventos operacionais do sistema."
        action={
          <button
            onClick={load}
            disabled={loading}
            className="btn-primary"
          >
            <RefreshCw
              size={14}
              className={loading ? 'animate-spin' : ''}
            />
            Atualizar
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Total de eventos"
          value={logs.length}
          icon={Activity}
        />

        <StatCard
          title="Eventos críticos"
          value={logsCriticos}
          icon={ShieldAlert}
        />

        <StatCard
          title="Operações hoje"
          value={logsHoje}
          icon={AlertTriangle}
        />

        <StatCard
          title="Última atividade"
          value={ultimaAtividade}
          icon={Clock3}
        />
      </div>

      <SectionCard>
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />

            <input
              type="text"
              placeholder="Buscar por tipo ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
        </div>
      </SectionCard>

      {loading && logs.length === 0 ? (
        <SectionCard>
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-green/20 border-t-green rounded-full animate-spin" />
          </div>
        </SectionCard>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhum log encontrado"
          description="Não existem eventos operacionais registrados para os filtros selecionados."
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Evento</th>
              <th>Descrição</th>
              <th>Criticidade</th>
              <th>Data / Hora</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((log) => (
              <tr key={log.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        getStatus(log.tipo) === 'warn'
                          ? 'bg-warn/10'
                          : getStatus(log.tipo) === 'ok'
                          ? 'bg-ok/10'
                          : 'bg-surface'
                      }`}
                    >
                      <Activity
                        size={16}
                        className={
                          getStatus(log.tipo) === 'warn'
                            ? 'text-warn'
                            : getStatus(log.tipo) === 'ok'
                            ? 'text-ok'
                            : 'text-ink-muted'
                        }
                      />
                    </div>

                    <div>
                      <p className="font-semibold text-ink-primary">
                        {log.tipo}
                      </p>

                      <p className="text-xs text-ink-muted font-mono mt-1">
                        {log.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </td>

                <td>
                  <div className="max-w-xl">
                    <p className="text-sm text-ink-secondary">
                      {log.descricao ?? 'Sem descrição'}
                    </p>

                    {log.payload && (
                      <pre className="mt-2 text-[11px] text-ink-muted bg-surface border border-border rounded-lg p-2 overflow-auto">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                </td>

                <td>
                  <StatusBadge
                    status={getStatus(log.tipo)}
                  >
                    {getStatus(log.tipo) === 'warn'
                      ? 'Crítico'
                      : getStatus(log.tipo) === 'ok'
                      ? 'Operacional'
                      : 'Auditoria'}
                  </StatusBadge>
                </td>

                <td className="font-mono text-xs whitespace-nowrap text-ink-secondary">
                  {formatarData(log.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  )
}