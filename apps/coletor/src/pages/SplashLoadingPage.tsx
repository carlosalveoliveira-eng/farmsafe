import { Loader2 } from 'lucide-react'
import { APP_VERSION } from '../config/appVersion'

export function SplashLoadingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center overflow-hidden relative">
      <img
        src="/splash.png"
        alt="FarmSafe Coletor"
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-black/20" />

      <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center text-center px-6">
        <div className="flex items-center gap-3 text-green-300 bg-black/40 border border-green-500/20 rounded-full px-5 py-3 backdrop-blur-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-medium">Preparando dados...</span>
        </div>

        <p className="text-xs text-slate-400 mt-6">
          Versão {APP_VERSION.versionName}
        </p>
      </div>
    </main>
  )
}