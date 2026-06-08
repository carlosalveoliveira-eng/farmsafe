import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, RefreshCw, CheckCircle2, Clock, AlertCircle, CheckCheck } from 'lucide-react'

import { supabase } from '../services/supabase'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import SectionCard from '../components/ui/SectionCard'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'

type StatusCocho = {
  id: string
  nome: string
  codigo_qr: string
  ativo: boolean
  fazenda_nome: string | null
  lote_nome: string | null
  retiro_nome: string | null
  ultimo_abastecimento: string | null
  horas_sem_abastecer: number | null
  total_kg: number
  total_registros: number
  status_operacional: 'ok' | 'atencao' | 'atrasado' | 'sem_registro'
}

function fmtData(iso: string | null) {
  if (!iso) return 'Nunca abastecido'

  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtHoras(horas: number | null) {
  if (horas === null || Number.isNaN(horas)) return '—'

  if (horas < 1) return 'menos de 1h'

  if (horas < 24) return `${Math.floor(horas)}h`

  const dias = Math.floor(horas / 24)
  const resto = Math.floor(horas % 24)

  return `${dias}d ${resto}h`
}

function statusInfo(status: StatusCocho['status_operacional']) {
  if (status === 'ok') {
    return {
      label: 'OK',
      icon: CheckCircle2,
      className: 'badge badge-ok',
      card: 'border-green/20',
    }
  }

  if (status === 'atencao') {
    return {
      label: 'Atenção',
      icon: Clock,
      className: 'badge badge-warn',
      card: 'border-warn/30',
    }
  }

  if (status === 'atrasado') {
    return {
      label: 'Atrasado',
      icon: AlertTriangle,
      className: 'badge badge-err',
      card: 'border-err/30',
    }
  }

  return {
    label: 'Sem registro',
    icon: AlertTriangle,
    className: 'badge badge-muted',
    card: 'border-border',
  }
}

export default function AlertasPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<StatusCocho[]>([])
  const [filtro, setFiltro] = useState<
    'todos' | 'ok' | 'atencao' | 'atrasado' | 'sem_registro'
  >('todos')

  async function load() {
    setLoading(true)

    const { data, error } = await supabase
      .from('vw_status_cochos')
      .select('*')
      .eq('ativo', true)
      .order('status_operacional')
      .order('horas_sem_abastecer', { ascending: false })

    if (error) {
      console.error(error)
      setRows([])
    } else {
      setRows((data as StatusCocho[]) ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtrados = useMemo(() => {
    if (filtro === 'todos') return rows
    return rows.filter((r) => r.status_operacional === filtro)
  }, [rows, filtro])

  const contadores = useMemo(() => {
    return {
      todos: rows.length,
      ok: rows.filter((r) => r.status_operacional === 'ok').length,
      atencao: rows.filter((r) => r.status_operacional === 'atencao').length,
      atrasado: rows.filter((r) => r.status_operacional === 'atrasado').length,
      sem_registro: rows.filter((r) => r.status_operacional === 'sem_registro').length,
    }
  }, [rows])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertas Operacionais"
        description="Central de monitoramento de cochos e pontos críticos da operação"
        action={
          <button onClick={load} disabled={loading} className="btn-ghost">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { key: 'todos', label: 'Total', icon: AlertCircle, color: 'bg-blue/10 text-blue' },
          { key: 'ok', label: 'Operacionais', icon: CheckCheck, color: 'bg-green/10 text-green' },
          { key: 'atencao', label: 'Em Atenção', icon: Clock, color: 'bg-amber/10 text-amber' },
          { key: 'atrasado', label: 'Atrasados', icon: AlertTriangle, color: 'bg-red/10 text-red' },
          { key: 'sem_registro', label: 'Sem Registros', icon: AlertCircle, color: 'bg-slate/10 text-slate' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFiltro(item.key as typeof filtro)}
            className={`transition-all duration-200 ${
              filtro === item.key
                ? 'ring-2 ring-offset-2 ring-green/40'
                : 'hover:shadow-md'
            }`}
          >
            <StatCard
              title={item.label}
              value={contadores[item.key as keyof typeof contadores]}
              icon={item.icon}
              color={item.color}
            />
          </button>
        ))}
      </div>

      {loading ? (
        <SectionCard>
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-green/20 border-t-green rounded-full animate-spin" />
          </div>
        </SectionCard>
      ) : filtrados.length === 0 ? (
        <EmptyState
          title="Nenhum alerta encontrado"
          description={
            filtro === 'todos'
              ? 'Todos os cochos estão operacionais'
              : `Nenhum cocho com status "${filtro}"`
          }
        />
      ) : (
        <SectionCard title="Lista de Alertas">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtrados.map((cocho) => {
              const info = statusInfo(cocho.status_operacional)
              const Icon = info.icon

              return (
                <div
                  key={cocho.id}
                  className="border border-border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        cocho.status_operacional === 'ok'
                          ? 'bg-green/10'
                          : cocho.status_operacional === 'atencao'
                          ? 'bg-amber/10'
                          : cocho.status_operacional === 'atrasado'
                          ? 'bg-red/10'
                          : 'bg-slate/10'
                      }`}>
                        <Icon size={18} className={
                          cocho.status_operacional === 'ok'
                            ? 'text-green'
                            : cocho.status_operacional === 'atencao'
                            ? 'text-amber'
                            : cocho.status_operacional === 'atrasado'
                            ? 'text-red'
                            : 'text-slate'
                        } />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-ink-primary truncate">
                          {cocho.nome}
                        </h3>
                        <p className="font-mono text-xs text-ink-muted mt-1 truncate">
                          {cocho.codigo_qr}
                        </p>
                      </div>
                    </div>

                    <StatusBadge status={
                      cocho.status_operacional === 'ok'
                        ? 'ok'
                        : cocho.status_operacional === 'atencao'
                        ? 'warn'
                        : cocho.status_operacional === 'atrasado'
                        ? 'err'
                        : 'muted'
                    }>
                      {info.label}
                    </StatusBadge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-surface rounded-lg p-3 border border-border/50">
                      <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">Último abastecimento</p>
                      <p className="text-sm text-ink-primary mt-2 font-semibold">
                        {fmtData(cocho.ultimo_abastecimento)}
                      </p>
                    </div>

                    <div className="bg-surface rounded-lg p-3 border border-border/50">
                      <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">Tempo sem abastecer</p>
                      <p className="text-sm text-ink-primary mt-2 font-semibold">
                        {fmtHoras(cocho.horas_sem_abastecer)}
                      </p>
                    </div>

                    <div className="bg-surface rounded-lg p-3 border border-border/50">
                      <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">Total kg</p>
                      <p className="text-sm text-ink-primary mt-2 font-semibold">
                        {Number(cocho.total_kg ?? 0).toLocaleString('pt-BR')} kg
                      </p>
                    </div>

                    <div className="bg-surface rounded-lg p-3 border border-border/50">
                      <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">Registros</p>
                      <p className="text-sm text-ink-primary mt-2 font-semibold">
                        {cocho.total_registros}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/50">
                    <p className="text-xs text-ink-muted">
                      <span className="font-medium">Localização:</span> {
                        [cocho.fazenda_nome, cocho.retiro_nome, cocho.lote_nome]
                          .filter(Boolean)
                          .join(' · ') || 'Sem localização vinculada'
                      }
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}
    </div>
  )
}