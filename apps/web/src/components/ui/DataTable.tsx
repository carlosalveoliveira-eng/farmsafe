type Props = {
  children: React.ReactNode
}

export default function DataTable({
  children,
}: Props) {
  return (
    <div className="fs-card overflow-hidden">
      <div className="overflow-auto">
        <table className="fs-table">
          {children}
        </table>
      </div>
    </div>
  )
}