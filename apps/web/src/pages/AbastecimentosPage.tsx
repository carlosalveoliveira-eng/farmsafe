import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Search, Filter, Pencil, X, Save } from 'lucide-react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

import { supabase, type Abastecimento } from '../services/supabase'
import PageHeader from '../components/PageHeader'

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
    <div>
      <PageHeader
        title="Abastecimentos"
        subtitle={`${total.toLocaleString('pt-BR')} registros encontrados`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={exportarExcel}
              disabled={exportando || total === 0}
              className="btn-primary"
            >
              {exportando ? 'Exportando...' : 'Exportar Excel'}
            </button>

            <button onClick={load} disabled={loading} className="btn-ghost">
              <RefreshCw
                size={14}
                className={loading ? 'animate-spin' : ''}
              />
              Atualizar
            </button>
          </div>
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />

          <input
            type="text"
            placeholder="Buscar cocho, dispositivo, tratador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-surface border border-border rounded-md text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-green/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-surface border border-border rounded-md">
          <Filter size={12} className="text-ink-muted ml-2" />

          {(['todos', 'sync', 'pendente'] as const).map((v) => (
            <button
              key={v}
              onClick={() => {
                setSyncFilter(v)
                setPage(0)
              }}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                syncFilter === v
                  ? 'bg-green/10 text-green border border-green/20'
                  : 'text-ink-muted hover:text-ink-primary'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-5">
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

      <div className="fs-card overflow-hidden">
        {loading && rows.length === 0 ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-ink-muted text-sm">
            Nenhum resultado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="fs-table">
              <thead>
                <tr>
                  <th>Cocho</th>
                  <th>Lote</th>
                  <th>Tipo</th>
                  <th>Qtd (kg)</th>
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
                      <span className="text-ink-primary font-medium">
                        {a.cocho?.nome ?? '—'}
                      </span>
                      <span className="block font-mono text-[10px] text-ink-muted mt-0.5">
                        {a.cocho?.codigo_qr}
                      </span>
                    </td>

                    <td>
                      {a.lote?.nome ?? (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>

                    <td>
                      <span className="badge badge-muted">
                        {a.tipo_abastecimento}
                      </span>
                    </td>

                    <td className="font-mono">
                      {a.quantidade_kg ?? '—'}
                    </td>

                    <td>
                      <span>{a.dispositivo?.nome ?? '—'}</span>
                      {a.dispositivo?.tratador_nome && (
                        <span className="block text-[11px] text-ink-muted">
                          {a.dispositivo.tratador_nome}
                        </span>
                      )}
                    </td>

                    <td className="font-mono text-xs whitespace-nowrap">
                      {fmtDateTime(a.registrado_em)}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          a.sincronizado_em ? 'badge-ok' : 'badge-warn'
                        }`}
                      >
                        {a.sincronizado_em ? 'sync' : 'pendente'}
                      </span>
                    </td>

                    <td>
                      <button
                        onClick={() => abrirEdicao(a)}
                        className="btn-ghost text-xs border border-border"
                      >
                        <Pencil size={13} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-ink-muted font-mono">
              {page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, total)} de{' '}
              {total.toLocaleString('pt-BR')}
            </span>

            <div className="flex gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-xs border border-border rounded hover:border-green/40 disabled:opacity-30 transition-colors text-ink-secondary"
              >
                ← anterior
              </button>

              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-xs border border-border rounded hover:border-green/40 disabled:opacity-30 transition-colors text-ink-secondary"
              >
                próxima →
              </button>
            </div>
          </div>
        )}
      </div>

      {modalAberto && form && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-xl bg-surface border border-border rounded-xl shadow-panel">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-ink-primary">
                  Editar abastecimento
                </h2>
                <p className="text-xs text-ink-muted mt-1">
                  Corrija quantidade, tipo ou observação do registro.
                </p>
              </div>

              <button
                onClick={() => setModalAberto(false)}
                className="w-9 h-9 rounded-md bg-panel border border-border flex items-center justify-center text-ink-muted hover:text-ink-primary"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 gap-4">
              <div>
                <label className="text-xs text-ink-muted">
                  Tipo de abastecimento
                </label>

                <select
                  value={form.tipo_abastecimento}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tipo_abastecimento: e.target.value,
                    })
                  }
                  className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50"
                >
                  <option value="sal_mineral">Sal mineral</option>
                  <option value="sal_proteinado">Sal proteinado</option>
                  <option value="sal_comum">Sal comum</option>
                  <option value="racao">Ração</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-ink-muted">
                  Quantidade kg
                </label>

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
                  className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50"
                />

                <p className="text-xs text-ink-muted mt-2">
                  Para anular um registro, informe 0 kg.
                </p>
              </div>

              <div>
                <label className="text-xs text-ink-muted">Observação</label>

                <textarea
                  value={form.observacao}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      observacao: e.target.value,
                    })
                  }
                  placeholder="Observação opcional"
                  className="mt-1 w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm text-ink-primary focus:outline-none focus:border-green/50 min-h-24 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
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