import { useState } from 'react'
import { ShieldCheck, Smartphone, WifiOff } from 'lucide-react'
import { removerDeviceSecret, salvarDeviceSecret } from '../services/device'
import { atualizarCargaColetor } from '../services/carga'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

type AtivacaoPageProps = {
  onAtivado: () => void
}

export function AtivacaoPage({ onAtivado }: AtivacaoPageProps) {
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)

  const online = useNetworkStatus()

  async function ativar() {
    const valor = codigo.trim().toUpperCase()

    if (!online) {
      alert('Sem internet. Conecte o celular para ativar o FarmSafe Coletor.')
      return
    }

    if (!valor) {
      alert('Informe o código do dispositivo.')
      return
    }

    try {
      setLoading(true)

      await salvarDeviceSecret(valor)

      const resultado = await atualizarCargaColetor()

      alert(
        `Celular ativado com sucesso!\n\nCochos: ${resultado.totalCochos}\nInsumos: ${resultado.totalInsumos}`
      )

      onAtivado()
    } catch (err) {
      await removerDeviceSecret()

      const mensagem =
        err instanceof Error
          ? err.message
          : 'Código inválido ou dispositivo inativo.'

      alert(mensagem)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-green-600/10 border border-green-500/20 flex items-center justify-center mb-4">
            <Smartphone className="w-8 h-8 text-green-500" />
          </div>

          <h1 className="text-3xl font-bold">Ativar celular</h1>

          <p className="text-slate-400 text-sm mt-2">
            Informe o código interno gerado pela gestão para liberar este
            aparelho.
          </p>
        </div>

        {!online && (
          <div className="mb-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 flex gap-3">
            <WifiOff className="w-5 h-5 text-yellow-300 mt-0.5" />

            <div>
              <p className="font-semibold text-yellow-200">Sem internet</p>
              <p className="text-sm text-slate-300 mt-1">
                A primeira ativação precisa de conexão. Depois de ativado, o
                app poderá funcionar offline.
              </p>
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-400">Código interno</span>

            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="DEV-123456"
              autoCapitalize="characters"
              autoCorrect="off"
              className="h-14 rounded-2xl bg-slate-950 border border-slate-700 px-4 outline-none font-mono uppercase"
            />
          </label>

          <button
            onClick={ativar}
            disabled={loading || !online}
            className="h-14 rounded-2xl bg-green-600 font-bold active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ShieldCheck className="w-5 h-5" />
            {loading ? 'Validando...' : 'Ativar e baixar dados'}
          </button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          FarmSafe Coletor · acesso operacional de campo
        </p>
      </div>
    </main>
  )
}
