type Props = {
  title?: string
  children: React.ReactNode
}

export default function SectionCard({
  title,
  children,
}: Props) {
  return (
    <section className="fs-card p-4">
      {title && (
        <h2 className="mb-3 text-sm font-semibold text-ink-primary">
          {title}
        </h2>
      )}

      {children}
    </section>
  )
}
