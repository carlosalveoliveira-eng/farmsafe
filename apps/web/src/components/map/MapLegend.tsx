type LegendItem = {
  label: string
  color: string
}

const DEFAULT_ITEMS: LegendItem[] = [
  { label: 'OK', color: '#22c55e' },
  { label: 'Atencao', color: '#f59e0b' },
  { label: 'Critico', color: '#ef4444' },
  { label: 'Lote', color: '#7c3aed' },
]

type MapLegendProps = {
  items?: LegendItem[]
}

export default function MapLegend({ items = DEFAULT_ITEMS }: MapLegendProps) {
  return (
    <div className="absolute bottom-20 left-4 z-[1190] hidden rounded-lg border border-white/20 bg-white/95 px-3 py-2 shadow-xl backdrop-blur xl:block">
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: item.color }}
            />
            <span className="text-[11px] font-semibold text-ink-muted">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
