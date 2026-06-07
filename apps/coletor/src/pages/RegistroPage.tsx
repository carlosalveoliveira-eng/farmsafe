import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { db } from '../database/db'

type RegistroPageProps = {
  codigoQr: string
  onVoltar: () => void
  onFinalizado: () => void
}

export function RegistroPage({
  codigoQr,
  onVoltar,
  onFinalizado,
}: RegistroPageProps) {
  const [tipo, setTipo] = useState('sal_mineral')
  const [quantidade, setQuantidade] = useState('')
  const [observacao, setObservacao] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [gpsStatus, setGpsStatus] = useState('Buscando localização...')

  useEffect(() => {
  if (!navigator.geolocation) {
    setGpsStatus('GPS não disponível neste dispositivo.')
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setLatitude(position.coords.latitude)
      setLongitude(position.coords.longitude)
      setGpsStatus('Localização capturada.')
    },
    () => {
      setGpsStatus('Não foi possível capturar a localização.')
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    }
  )
}, [])

  async function salvarRegistro() {

    console.log('GPS antes de salvar:', {
      latitude,
      longitude,
    })

    await db.abastecimentos.add({
      client_uuid: crypto.randomUUID(),
      cocho_id: codigoQr,
      tipo_abastecimento: tipo,
      quantidade_kg: quantidade ? Number(quantidade) : null,
      observacao: observacao || null,
      latitude,
      longitude,
      registrado_em: new Date().toISOString(),
      sincronizado: false,
      status_sync: 'pendente',
      erro_sync: null,
      tentativas_sync: 0,
    })

    alert('Registro salvo offline!')
    onFinalizado()
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col px-6 py-6">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onVoltar}
            className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div>
            <h1 className="text-2xl font-bold">Confirmar registro</h1>
            <p className="text-slate-400 text-sm">Abastecimento do cocho</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-sm text-slate-400">Código do cocho</p>
          <p className="text-xl font-bold mt-1">{codigoQr}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-400">Tipo de abastecimento</span>

            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="h-12 rounded-xl bg-slate-950 border border-slate-700 px-4 outline-none"
            >
              <option value="sal_mineral">Sal mineral</option>
              <option value="sal_proteinado">Sal proteinado</option>
              <option value="sal_comum">Sal comum</option>
              <option value="racao">Ração</option>
              <option value="outro">Outro</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-400">Quantidade kg</span>

            <input
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              type="number"
              placeholder="Ex: 25"
              className="h-12 rounded-xl bg-slate-950 border border-slate-700 px-4 outline-none"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-400">Observação opcional</span>

            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: cocho quase vazio"
              className="min-h-24 rounded-xl bg-slate-950 border border-slate-700 p-4 outline-none resize-none"
            />
          </label>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-sm text-slate-400">GPS</p>
          <p className="font-medium">{gpsStatus}</p>

          {latitude && longitude && (
            <p className="text-xs text-slate-500 mt-1">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
          )}
        </div>

        <button
          onClick={salvarRegistro}
          className="h-16 rounded-2xl bg-green-600 font-bold text-lg active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-6 h-6" />
          Salvar offline
        </button>
      </div>
    </main>
  )
}