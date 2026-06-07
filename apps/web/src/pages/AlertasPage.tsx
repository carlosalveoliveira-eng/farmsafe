import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, RefreshCw, CheckCircle2, Clock } from 'lucide-react'

import { supabase } from '../services/supabase'
import PageHeader from '../components/PageHeader'

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
    <div>
      <PageHeader
        title="Alertas operacionais"
        subtitle="Monitore cochos sem abastecimento e pontos críticos"
        action={
          <button onClick={load} disabled={loading} className="btn-ghost">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'ok', label: 'OK' },
          { key: 'atencao', label: 'Atenção' },
          { key: 'atrasado', label: 'Atrasados' },
          { key: 'sem_registro', label: 'Sem registro' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFiltro(item.key as typeof filtro)}
            className={`fs-card p-4 text-left transition-colors ${
              filtro === item.key ? 'border-green/40' : ''
            }`}
          >
            <p className="text-xs text-ink-muted">{item.label}</p>
            <p className="text-2xl font-semibold text-ink-primary mt-2">
              {contadores[item.key as keyof typeof contadores]}
            </p>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="py-24 text-center text-ink-muted text-sm">
          Nenhum alerta encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtrados.map((cocho) => {
            const info = statusInfo(cocho.status_operacional)
            const Icon = info.icon

            return (
              <div
                key={cocho.id}
                className={`fs-card p-5 ${info.card}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="text-green" />
                      <h3 className="text-ink-primary font-semibold">
                        {cocho.nome}
                      </h3>
                    </div>

                    <p className="font-mono text-xs text-ink-muted mt-1">
                      {cocho.codigo_qr}
                    </p>
                  </div>

                  <span className={info.className}>{info.label}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-5">
                  <div className="bg-surface border border-border rounded-lg p-3">
                    <p className="text-xs text-ink-muted">Último abastecimento</p>
                    <p className="text-sm text-ink-primary mt-1">
                      {fmtData(cocho.ultimo_abastecimento)}
                    </p>
                  </div>

                  <div className="bg-surface border border-border rounded-lg p-3">
                    <p className="text-xs text-ink-muted">Tempo sem abastecer</p>
                    <p className="text-sm text-ink-primary mt-1">
                      {fmtHoras(cocho.horas_sem_abastecer)}
                    </p>
                  </div>

                  <div className="bg-surface border border-border rounded-lg p-3">
                    <p className="text-xs text-ink-muted">Total kg</p>
                    <p className="text-sm text-ink-primary mt-1">
                      {Number(cocho.total_kg ?? 0).toLocaleString('pt-BR')} kg
                    </p>
                  </div>

                  <div className="bg-surface border border-border rounded-lg p-3">
                    <p className="text-xs text-ink-muted">Registros</p>
                    <p className="text-sm text-ink-primary mt-1">
                      {cocho.total_registros}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-ink-muted mt-4">
                  {[cocho.fazenda_nome, cocho.retiro_nome, cocho.lote_nome]
                    .filter(Boolean)
                    .join(' · ') || 'Sem localização vinculada'}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}