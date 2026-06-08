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
    <div className="fs-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-muted">
            {title}
          </p>

          <h3 className="text-3xl font-semibold text-ink-primary mt-2">
            {value}
          </h3>
        </div>

        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}