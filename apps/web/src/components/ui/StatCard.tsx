import type { LucideIcon } from 'lucide-react'

type Props = {
  title: string
  value: string | number
  icon: LucideIcon
  color?: string
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  color = 'bg-green/10 text-green',
}: Props) {
  return (
    <div className="fs-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-ink-muted">
            {title}
          </p>

          <h3 className="mt-1 truncate text-2xl font-semibold text-ink-primary">
            {value}
          </h3>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}
