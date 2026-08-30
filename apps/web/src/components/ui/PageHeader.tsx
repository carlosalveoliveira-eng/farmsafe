type Props = {
  title: string
  description?: string
  action?: React.ReactNode
}

export default function PageHeader({
  title,
  description,
  action,
}: Props) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/70 pb-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-ink-primary">
          {title}
        </h1>

        {description && (
          <p className="text-sm text-ink-muted mt-1 max-w-3xl">
            {description}
          </p>
        )}
      </div>

      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  )
}
