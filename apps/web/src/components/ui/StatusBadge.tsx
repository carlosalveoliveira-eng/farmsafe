type Props = {
  status:
    | 'ok'
    | 'warn'
    | 'err'
    | 'muted'
  children: React.ReactNode
}

export default function StatusBadge({
  status,
  children,
}: Props) {
  return (
    <span className={`badge badge-${status}`}>
      {children}
    </span>
  )
}