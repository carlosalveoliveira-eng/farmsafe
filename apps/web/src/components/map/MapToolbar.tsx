import { RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

import type { Fazenda } from '../../services/supabase'

type MapToolbarProps<TPeriodo extends string> = {
  fazendas: Fazenda[]
  fazendaSelecionadaId: string
  periodo: TPeriodo
  periodos: TPeriodo[]
  loading: boolean
  onFazendaChange: (fazendaId: string) => void
  onPeriodoChange: (periodo: TPeriodo) => void
  onRefresh: () => void
  formatPeriodo: (periodo: TPeriodo) => string
  metrics?: ReactNode
}

export default function MapToolbar<TPeriodo extends string>({
  fazendas,
  fazendaSelecionadaId,
  periodo,
  periodos,
  loading,
  onFazendaChange,
  onPeriodoChange,
  onRefresh,
  formatPeriodo,
  metrics,
}: MapToolbarProps<TPeriodo>) {
  return (
    <div className="absolute inset-x-4 top-4 z-[1200] flex items-start justify-between gap-3 pointer-events-none">
      <div className="pointer-events-auto flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-1.5 rounded-lg border border-white/20 bg-white/95 p-1.5 shadow-xl backdrop-blur">
        <select
          value={fazendaSelecionadaId}
          onChange={(event) => onFazendaChange(event.target.value)}
          className="input h-9 w-[160px] min-w-0 truncate py-1.5"
        >
          {fazendas.map((fazenda) => (
            <option key={fazenda.id} value={fazenda.id}>
              {fazenda.nome}
            </option>
          ))}
        </select>

        {periodos.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPeriodoChange(item)}
            className={`h-9 rounded-md px-2.5 text-xs font-bold ${
              periodo === item
                ? 'bg-green text-white'
                : 'text-ink-secondary hover:bg-green/10'
            }`}
          >
            {formatPeriodo(item)}
          </button>
        ))}

        <button
          type="button"
          aria-label="Recarregar mapa"
          onClick={onRefresh}
          disabled={loading}
          className="h-9 rounded-md px-2.5 text-xs font-bold text-ink-secondary hover:bg-green/10 disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {metrics}
    </div>
  )
}
