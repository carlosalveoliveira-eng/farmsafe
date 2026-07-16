import { MAP_COLORS } from './mapTheme'

const itens = [
  { label: 'Fazenda', color: MAP_COLORS.fazenda },
  { label: 'Retiro', color: MAP_COLORS.retiro },
  { label: 'Pasto', color: MAP_COLORS.pasto },
  { label: 'Água', color: MAP_COLORS.agua },
  { label: 'Estrutura', color: MAP_COLORS.estrutura },
  { label: 'Restrição', color: MAP_COLORS.restricao },
]

export default function MapLegend() {
  return (
    <div className="absolute left-4 bottom-4 z-[500] rounded-xl border border-border bg-white/95 shadow-lg p-3 backdrop-blur-sm">
      <p className="text-xs font-bold text-ink-primary mb-2">
        Legenda
      </p>

      <div className="grid gap-1.5">
        {itens.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full border border-white shadow-sm"
              style={{ background: item.color }}
            />
            <span className="text-[11px] font-medium text-ink-muted">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}