type Props = {
  title?: string
  children: React.ReactNode
}

export default function SectionCard({
  title,
  children,
}: Props) {
  return (
    <div className="fs-card p-5">
      {title && (
        <h2 className="text-sm font-semibold text-ink-primary mb-4">
          {title}
        </h2>
      )}

      {children}
    </div>
  )
}