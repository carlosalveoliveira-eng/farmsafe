import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  RefreshCw,
  Search,
  Filter,
  Pencil,
  X,
  Save,
  Download,
  Droplets,
  Beef,
  CalendarDays,
  CheckCircle,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

import { supabase, type Abastecimento } from '../services/supabase'
import PageHeader from '../components/ui/PageHeader'
import SectionCard from '../components/ui/SectionCard'
import StatCard from '../components/ui/StatCard'
import DataTable from '../components/ui/DataTable'
import EmptyState from '../components/ui/EmptyState'
import StatusBadge from '../components/ui/StatusBadge'

const PAGE_SIZE = 25

type Periodo = 'hoje' | '7d' | '30d' | 'todos'
type SyncFilter = 'todos' | 'sync' | 'pendente'

type FormAbastecimento = {
  id: string
  tipo_abastecimento: string
  quantidade_kg: string
  observacao: string
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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

function montarLinhasExcel(registros: Abastecimento[]) {
  return registros.map((item) => ({
    Cocho: item.cocho?.nome ?? '',
    'Código QR': item.cocho?.codigo_qr ?? '',
    Lote: item.lote?.nome ?? '',
    Tipo: item.tipo_abastecimento,
    'Quantidade kg': item.quantidade_kg ?? '',
    Dispositivo: item.dispositivo?.nome ?? '',
    Tratador: item.dispositivo?.tratador_nome ?? '',
    Observação: item.observacao ?? '',
    'Registrado em': item.registrado_em
      ? new Date(item.registrado_em).toLocaleString('pt-BR')
      : '',
    'Sincronizado em': item.sincronizado_em
      ? new Date(item.sincronizado_em).toLocaleString('pt-BR')
      : '',
    Status: item.sincronizado_em ? 'Sincronizado' : 'Pendente',
  }))
}

function baixarExcel(registros: Abastecimento[]) {
  const dados = montarLinhasExcel(registros)
  const worksheet = XLSX.utils.json_to_sheet(dados)

  worksheet['!cols'] = [
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 22 },
    { wch: 22 },
    { wch: 30 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Abastecimentos')

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  })

  const blob = new Blob([excelBuffer], {
    type:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
  })

  saveAs(
    blob,
    `farmsafe-abastecimentos-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`
  )
}

export default function AbastecimentosPage() {
  const [rows, setRows] = useState<Abastecimento[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exportando, setExportando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const [search, setSearch] = useState('')
  const [syncFilter, setSyncFilter] = useState<SyncFilter>('todos')
  const [periodo, setPeriodo] = useState<Periodo>('30d')

  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<FormAbastecimento | null>(null)

  const load = useCallback(async () => {
    setLoading(true)

    let q = supabase
      .from('abastecimentos')
      .select(
        '*, cocho:cochos(nome,codigo_qr), lote:lotes(nome), dispositivo:dispositivos(nome,tratador_nome)',
        { count: 'exact' }
      )
      .order('registrado_em', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (syncFilter === 'sync') q = q.not('sincronizado_em', 'is', null)
    if (syncFilter === 'pendente') q = q.is('sincronizado_em', null)

    const inicio = getInicioPeriodo(periodo)

    if (inicio) {
      q = q.gte('registrado_em', inicio)
    }

    const { data, count, error } = await q

    if (error) {
      console.error(error)
      setRows([])
      setTotal(0)
    } else {
      setRows((data as Abastecimento[]) ?? [])
      setTotal(count ?? 0)
    }

    setLoading(false)
  }, [page, syncFilter, periodo])

  useEffect(() => {
    load()
  }, [load])

  const filtered = search.trim()
    ? rows.filter((r) =>
        r.cocho?.nome?.toLowerCase().includes(search.toLowerCase()) ||
        r.cocho?.codigo_qr?.toLowerCase().includes(search.toLowerCase()) ||
        r.dispositivo?.nome?.toLowerCase().includes(search.toLowerCase()) ||
        r.dispositivo?.tratador_nome
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        r.tipo_abastecimento.toLowerCase().includes(search.toLowerCase()) ||
        r.observacao?.toLowerCase().includes(search.toLowerCase())
      )
    : rows

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const totalKg = useMemo(() => {
    return filtered.reduce((acc, item) => acc + (item.quantidade_kg ?? 0), 0)
  }, [filtered])

  const cochosUnicos = useMemo(() => {
    return new Set(filtered.map((item) => item.cocho_id)).size
  }, [filtered])

  const sincronizados = useMemo(() => {
    return filtered.filter((item) => item.sincronizado_em).length
  }, [filtered])

  const hoje = useMemo(() => {
    const inicio = new Date()
    inicio.setHours(0, 0, 0, 0)

    return filtered.filter(
      (item) => new Date(item.registrado_em).getTime() >= inicio.getTime()
    ).length
  }, [filtered])

  function abrirEdicao(item: Abastecimento) {
    setForm({
      id: item.id,
      tipo_abastecimento: item.tipo_abastecimento,
      quantidade_kg:
        item.quantidade_kg !== null && item.quantidade_kg !== undefined
          ? String(item.quantidade_kg)
          : '',
      observacao: item.observacao ?? '',
    })

    setModalAberto(true)
  }

  async function salvarEdicao() {
    if (!form) return

    if (!form.tipo_abastecimento.trim()) {
      alert('Informe o tipo de abastecimento.')
      return
    }

    setSalvando(true)

    const { error } = await supabase
      .from('abastecimentos')
      .update({
        tipo_abastecimento: form.tipo_abastecimento,
        quantidade_kg: form.quantidade_kg
          ? Number(form.quantidade_kg)
          : 0,
        observacao: form.observacao.trim() || null,
      })
      .eq('id', form.id)

    setSalvando(false)

    if (error) {
      console.error(error)
      alert(`Erro ao editar abastecimento: ${error.message}`)
      return
    }

    setModalAberto(false)
    setForm(null)
    await load()
  }

  async function exportarExcel() {
    setExportando(true)

    let q = supabase
      .from('abastecimentos')
      .select(
        '*, cocho:cochos(nome,codigo_qr), lote:lotes(nome), dispositivo:dispositivos(nome,tratador_nome)'
      )
      .order('registrado_em', { ascending: false })

    if (syncFilter === 'sync') q = q.not('sincronizado_em', 'is', null)
    if (syncFilter === 'pendente') q = q.is('sincronizado_em', null)

    const inicio = getInicioPeriodo(periodo)

    if (inicio) {
      q = q.gte('registrado_em', inicio)
    }

    const { data, error } = await q

    if (error) {
      console.error(error)
      alert('Erro ao exportar dados.')
      setExportando(false)
      return
    }

    let registros = (data as Abastecimento[]) ?? []

    if (search.trim()) {
      registros = registros.filter((r) =>
        r.cocho?.nome?.toLowerCase().includes(search.toLowerCase()) ||
        r.cocho?.codigo_qr?.toLowerCase().includes(search.toLowerCase()) ||
        r.dispositivo?.nome?.toLowerCase().includes(search.toLowerCase()) ||
        r.dispositivo?.tratador_nome
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        r.tipo_abastecimento.toLowerCase().includes(search.toLowerCase()) ||
        r.observacao?.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (registros.length === 0) {
      alert('Nenhum dado encontrado para exportar.')
      setExportando(false)
      return
    }

    baixarExcel(registros)
    setExportando(false)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Abastecimentos"
        description="Rastreabilidade e histórico operacional dos abastecimentos realizados."
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={exportarExcel}
              disabled={exportando || total === 0}
              className="btn-primary"
            >
              <Download size={14} />
              {exportando ? 'Exportando...' : 'Exportar Excel'}
            </button>

            <button onClick={load} disabled={loading} className="btn-ghost border border-border bg-white">
              <RefreshCw
                size={14}
                className={loading ? 'animate-spin' : ''}
              />
              Atualizar
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Total abastecido"
          value={`${totalKg.toLocaleString('pt-BR')} kg`}
          icon={Droplets}
        />

        <StatCard
          title="Registros do período"
          value={filtered.length}
          icon={CalendarDays}
        />

        <StatCard
          title="Cochos abastecidos"
          value={cochosUnicos}
          icon={Beef}
        />

        <StatCard
          title="Operações hoje"
          value={hoje}
          icon={CheckCircle}
        />
      </div>

      <SectionCard>
        <div className="flex flex-col xl:flex-row xl:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />

            <input
              type="text"
              placeholder="Buscar por cocho, QR, dispositivo, tratador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 p-1 bg-surface border border-border rounded-xl">
              <Filter size={13} className="text-ink-muted ml-2" />

              {(['todos', 'sync', 'pendente'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setSyncFilter(v)
                    setPage(0)
                  }}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                    syncFilter === v
                      ? 'bg-white text-green border border-green/20 shadow-sm'
                      : 'text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  {v === 'todos'
                    ? 'Todos'
                    : v === 'sync'
                    ? 'Sincronizados'
                    : 'Pendentes'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-surface border border-border rounded-xl">
              {[
                { value: 'hoje', label: 'Hoje' },
                { value: '7d', label: '7 dias' },
                { value: '30d', label: '30 dias' },
                { value: 'todos', label: 'Todos' },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => {
                    setPeriodo(item.value as Periodo)
                    setPage(0)
                  }}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                    periodo === item.value
                      ? 'bg-white text-green border border-green/20 shadow-sm'
                      : 'text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {loading && rows.length === 0 ? (
        <SectionCard>
          <div className="p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-green/20 border-t-green rounded-full animate-spin" />
          </div>
        </SectionCard>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhum abastecimento encontrado"
          description="Não existem registros para os filtros selecionados."
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Cocho</th>
              <th>Lote</th>
              <th>Tipo</th>
              <th>Quantidade</th>
              <th>Dispositivo</th>
              <th>Registrado em</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td>
                  <span className="text-ink-primary font-semibold">
                    {a.cocho?.nome ?? '—'}
                  </span>

                  <span className="block font-mono text-[11px] text-ink-muted mt-1">
                    {a.cocho?.codigo_qr ?? 'Sem QR'}
                  </span>
                </td>

                <td>
                  {a.lote?.nome ?? (
                    <span className="text-ink-muted">—</span>
                  )}
                </td>

                <td>
                  <StatusBadge status="muted">
                    {a.tipo_abastecimento}
                  </StatusBadge>
                </td>

                <td className="font-semibold text-ink-primary">
                  {a.quantidade_kg ?? 0} kg
                </td>

                <td>
                  <span className="text-ink-primary">
                    {a.dispositivo?.nome ?? '—'}
                  </span>

                  {a.dispositivo?.tratador_nome && (
                    <span className="block text-xs text-ink-muted mt-1">
                      {a.dispositivo.tratador_nome}
                    </span>
                  )}
                </td>

                <td className="font-mono text-xs whitespace-nowrap text-ink-secondary">
                  {fmtDateTime(a.registrado_em)}
                </td>

                <td>
                  <StatusBadge status={a.sincronizado_em ? 'ok' : 'warn'}>
                    {a.sincronizado_em ? 'Sincronizado' : 'Pendente'}
                  </StatusBadge>
                </td>

                <td>
                  <button
                    onClick={() => abrirEdicao(a)}
                    className="btn-ghost text-xs border border-border bg-white"
                  >
                    <Pencil size={13} />
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      {totalPages > 1 && (
        <SectionCard>
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted">
              {page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, total)} de{' '}
              {total.toLocaleString('pt-BR')}
            </span>

            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="btn-ghost border border-border bg-white disabled:opacity-30"
              >
                ← Anterior
              </button>

              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="btn-ghost border border-border bg-white disabled:opacity-30"
              >
                Próxima →
              </button>
            </div>
          </div>
        </SectionCard>
      )}

      {modalAberto && form && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white border border-border rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-ink-primary">
                  Editar abastecimento
                </h2>

                <p className="text-sm text-ink-muted mt-1">
                  Corrija quantidade, tipo ou observação do registro.
                </p>
              </div>

              <button
                onClick={() => setModalAberto(false)}
                className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-ink-muted hover:text-ink-primary"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-ink-primary">
                  Tipo de abastecimento
                </span>

                <select
                  value={form.tipo_abastecimento}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tipo_abastecimento: e.target.value,
                    })
                  }
                  className="input mt-2"
                >
                  <option value="sal_mineral">Sal mineral</option>
                  <option value="sal_proteinado">Sal proteinado</option>
                  <option value="sal_comum">Sal comum</option>
                  <option value="racao">Ração</option>
                  <option value="outro">Outro</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-ink-primary">
                  Quantidade kg
                </span>

                <input
                  type="number"
                  value={form.quantidade_kg}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      quantidade_kg: e.target.value,
                    })
                  }
                  placeholder="0"
                  className="input mt-2"
                />

                <p className="text-xs text-ink-muted mt-2">
                  Para anular um registro, informe 0 kg.
                </p>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-ink-primary">
                  Observação
                </span>

                <textarea
                  value={form.observacao}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      observacao: e.target.value,
                    })
                  }
                  placeholder="Observação opcional"
                  className="input mt-2 min-h-24 resize-none"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-surface/40">
              <button
                onClick={() => setModalAberto(false)}
                className="btn-ghost"
              >
                Cancelar
              </button>

              <button
                onClick={salvarEdicao}
                disabled={salvando}
                className="btn-primary"
              >
                <Save size={14} />
                {salvando ? 'Salvando...' : 'Salvar alteração'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}