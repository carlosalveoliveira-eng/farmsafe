import { QrCode, CloudOff, CheckCircle2 } from 'lucide-react'

type HomePageProps = {
  sincronizando: boolean
  online: boolean
  pendentes: number
  onAbrirScanner: () => void
  onSincronizar: () => void
  onAbrirHistorico: () => void
}

export function HomePage({
  online,
  sincronizando,
  pendentes,
  onAbrirScanner,
  onSincronizar,
  onAbrirHistorico,
}: HomePageProps) {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Farmsafe</h1>
          <p className="text-slate-400 mt-2">Coletor operacional rural</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Status</p>
            <p
  className={`font-medium ${
    online
      ? 'text-emerald-400'
      : 'text-amber-400'
  }`}
>
  {online
    ? 'Online'
    : 'Offline pronto'}
</p>
          </div>

          <CloudOff className="w-6 h-6 text-amber-400" />
        </div>

        <button
          onClick={onAbrirScanner}
          className="h-32 rounded-3xl bg-green-600 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-3 shadow-lg shadow-green-950"
        >
          <QrCode className="w-12 h-12" />
          <span className="text-xl font-semibold">Escanear QR Code</span>
        </button>

        <button
          onClick={onSincronizar}
          className="h-14 rounded-2xl bg-slate-800 border border-slate-700 font-semibold active:scale-[0.98]"
        >
          {sincronizando
            ? 'Sincronizando...'
            : 'Sincronizar registros'
            }
        </button>

        <button
          onClick={onAbrirHistorico}
          className="h-14 rounded-2xl bg-slate-800 border border-slate-700 font-semibold active:scale-[0.98]"
        >
          Ver histórico
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Sincronização</p>
            <p className="font-medium">
              {pendentes === 0
                ? 'Nenhum registro pendente'
                : `${pendentes} registro(s) pendente(s)`}
            </p>
          </div>

          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
        </div>
      </div>
    </main>
  )
}