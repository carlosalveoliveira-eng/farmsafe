type LoadingMapProps = {
  message?: string
}

export default function LoadingMap({
  message = 'Carregando mapa operacional...',
}: LoadingMapProps) {
  return (
    <div className="absolute inset-0 z-[1300] flex items-center justify-center bg-slate-950/30 backdrop-blur-[1px]">
      <div className="rounded-lg border border-white/20 bg-white/95 px-4 py-3 text-sm font-semibold text-ink-primary shadow-xl">
        {message}
      </div>
    </div>
  )
}
