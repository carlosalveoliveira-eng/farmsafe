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
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink-primary">
          {title}
        </h1>

        {description && (
          <p className="text-sm text-ink-muted mt-1">
            {description}
          </p>
        )}
      </div>

      {action && <div>{action}</div>}
    </div>
  )
}