import { Loader2, Smartphone } from 'lucide-react'
import { APP_VERSION } from '../config/appVersion'

export function SplashLoadingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="relative w-28 h-28 rounded-[2rem] bg-green-600/15 border border-green-500/30 flex items-center justify-center mb-6 shadow-lg shadow-green-950">
          <Smartphone className="w-14 h-14 text-green-400" />

          <div className="absolute -right-3 top-7 flex flex-col gap-1">
            <span className="w-7 h-1.5 rounded-full bg-green-400/90" />
            <span className="w-5 h-1.5 rounded-full bg-green-400/70" />
            <span className="w-3 h-1.5 rounded-full bg-green-400/50" />
          </div>

          <div className="absolute -right-6 top-10 w-3 h-3 rounded-full bg-green-400 animate-pulse" />
        </div>

        <h1 className="text-4xl font-bold tracking-tight">FarmSafe</h1>

        <p className="text-slate-400 mt-2">Coletor de campo</p>

        <div className="mt-10 flex items-center gap-3 text-green-300">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-medium">Preparando dados...</span>
        </div>

        <p className="text-xs text-slate-600 mt-8">
          Versão {APP_VERSION.versionName}
        </p>
      </div>
    </main>
  )
}