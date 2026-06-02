import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { db, type AbastecimentoLocal } from '../database/db'

type HistoricoPageProps = {
  onVoltar: () => void
}

export function HistoricoPage({
  onVoltar,
}: HistoricoPageProps) {
  const [registros, setRegistros] = useState<
    AbastecimentoLocal[]
  >([])

  async function carregarRegistros() {
    const dados =
      await db.abastecimentos.reverse().toArray()

    setRegistros(dados)
  }

  useEffect(() => {
    carregarRegistros()
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-6">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-6">

        <div className="flex items-center gap-3">
          <button
            onClick={onVoltar}
            className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div>
            <h1 className="text-2xl font-bold">
              Histórico
            </h1>

            <p className="text-slate-400 text-sm">
              Registros locais
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {registros.map((registro) => (
            <div
              key={registro.client_uuid}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <p className="font-bold">
                  {registro.cocho_id}
                </p>

                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    registro.sincronizado
                      ? 'bg-emerald-950 text-emerald-300'
                      : 'bg-amber-950 text-amber-300'
                  }`}
                >
                  {registro.sincronizado
                    ? 'Sincronizado'
                    : 'Pendente'}
                </span>
              </div>

              <p className="text-sm text-slate-400">
                {registro.tipo_abastecimento}
              </p>

              <p className="text-sm">
                {registro.quantidade_kg ?? 0} kg
              </p>

              {registro.observacao && (
                <p className="text-sm text-slate-300">
                  {registro.observacao}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}