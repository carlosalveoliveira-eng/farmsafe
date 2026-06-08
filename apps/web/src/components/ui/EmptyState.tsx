import { Inbox } from 'lucide-react'

type Props = {
  title: string
  description?: string
}

export default function EmptyState({
  title,
  description,
}: Props) {
  return (
    <div className="fs-card p-10 flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center mb-4">
        <Inbox size={24} className="text-ink-muted" />
      </div>

      <h3 className="text-sm font-semibold text-ink-primary">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-ink-muted mt-2 max-w-sm">
          {description}
        </p>
      )}
    </div>
  )
}