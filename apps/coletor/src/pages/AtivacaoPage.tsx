import { useState } from 'react'
import { ShieldCheck, Smartphone } from 'lucide-react'
import { salvarDeviceSecret } from '../services/device'
import { supabase } from '../services/supabase'

type AtivacaoPageProps = {
  onAtivado: () => void
}

export function AtivacaoPage({ onAtivado }: AtivacaoPageProps) {
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)

  async function ativar() {
    const valor = codigo.trim().toUpperCase()

    if (!valor) {
      alert('Informe o código do dispositivo.')
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('dispositivos')
      .select('id, nome, tratador_nome, ativo')
      .eq('device_secret', valor)
      .eq('ativo', true)
      .maybeSingle()

    setLoading(false)

    if (error) {
      console.error(error)
      alert('Erro ao validar o dispositivo.')
      return
    }

    if (!data) {
      alert('Código inválido ou dispositivo inativo.')
      return
    }

    salvarDeviceSecret(valor)

    alert(`Dispositivo ativado: ${data.nome}`)

    onAtivado()
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-green-600/10 border border-green-500/20 flex items-center justify-center mb-4">
            <Smartphone className="w-8 h-8 text-green-500" />
          </div>

          <h1 className="text-3xl font-bold">Ativar dispositivo</h1>

          <p className="text-slate-400 text-sm mt-2">
            Informe o código interno gerado pela gestão para liberar este celular.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-400">Código interno</span>

            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="DEV-123456"
              className="h-14 rounded-2xl bg-slate-950 border border-slate-700 px-4 outline-none font-mono uppercase"
            />
          </label>

          <button
            onClick={ativar}
            disabled={loading}
            className="h-14 rounded-2xl bg-green-600 font-bold active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ShieldCheck className="w-5 h-5" />
            {loading ? 'Validando...' : 'Ativar celular'}
          </button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Farmsafe Coletor · acesso operacional de campo
        </p>
      </div>
    </main>
  )
}