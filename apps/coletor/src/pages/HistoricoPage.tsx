import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { db, type AbastecimentoLocal } from '../database/db'

type HistoricoPageProps = {
  onVoltar: () => void
}

function formatarData(dataIso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dataIso))
}

function getStatusLabel(registro: AbastecimentoLocal) {
  if (registro.status_sync === 'sincronizado_com_alerta') {
    return 'Com alerta'
  }

  if (registro.status_sync === 'sincronizando') {
    return 'Sincronizando'
  }

  if (registro.status_sync === 'duplicado') {
    return 'Duplicado'
  }

  if (registro.status_sync === 'erro') {
    return 'Erro'
  }

  if (registro.sincronizado) {
    return 'Sincronizado'
  }

  return 'Pendente'
}

function getStatusClass(registro: AbastecimentoLocal) {
  if (registro.status_sync === 'sincronizado_com_alerta') {
    return 'bg-yellow-950 text-yellow-300'
  }

  if (registro.status_sync === 'erro') {
    return 'bg-red-950 text-red-300'
  }

  if (registro.status_sync === 'sincronizando') {
    return 'bg-blue-950 text-blue-300'
  }

  if (registro.sincronizado || registro.status_sync === 'duplicado') {
    return 'bg-emerald-950 text-emerald-300'
  }

  return 'bg-slate-800 text-slate-300'
}

export function HistoricoPage({ onVoltar }: HistoricoPageProps) {
  const [registros, setRegistros] = useState<AbastecimentoLocal[]>([])

  async function carregarRegistros() {
    const dados = await db.abastecimentos
      .orderBy('registrado_em')
      .reverse()
      .toArray()

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
            <h1 className="text-2xl font-bold">Histórico</h1>

            <p className="text-slate-400 text-sm">Registros deste aparelho</p>
          </div>
        </div>

        {registros.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
            <p className="font-semibold">Nenhum registro local</p>
            <p className="text-sm text-slate-400 mt-1">
              Os abastecimentos salvos aparecerão aqui.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {registros.map((registro) => (
            <div
              key={registro.client_uuid}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">
                    {registro.cocho_nome ??
                      registro.codigo_qr ??
                      registro.cocho_id ??
                      'Cocho não informado'}
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    {formatarData(registro.registrado_em)}
                  </p>
                </div>

                <span
                  className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${getStatusClass(
                    registro
                  )}`}
                >
                  {getStatusLabel(registro)}
                </span>
              </div>

              <div className="rounded-xl bg-slate-950 border border-slate-800 p-3">
                <p className="text-sm text-slate-400">Insumo</p>
                <p className="font-semibold">
                  {registro.insumo_nome ??
                    registro.tipo_abastecimento ??
                    'Não informado'}
                </p>

                <p className="text-sm text-slate-400 mt-3">Quantidade</p>
                <p className="font-semibold">{registro.quantidade_kg ?? 0} kg</p>
              </div>

              {registro.status_cocho && registro.status_cocho !== 'nao_informado' && (
                <p className="text-sm text-slate-300">
                  Estado do cocho: <strong>{registro.status_cocho}</strong>
                </p>
              )}

              {registro.leitura_cocho != null && (
                <p className="text-sm text-slate-300">
                  Leitura do cocho: <strong>{registro.leitura_cocho} kg</strong>
                </p>
              )}

              {registro.mensagem_validacao && (
                <p className="text-sm text-yellow-200 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                  {registro.mensagem_validacao}
                </p>
              )}

              {registro.erro_sync && (
                <p className="text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  {registro.erro_sync}
                </p>
              )}

              {registro.saldo_depois_kg != null && (
                <p className="text-xs text-slate-500">
                  Saldo após lançamento: {registro.saldo_depois_kg} kg
                </p>
              )}

              {registro.observacao && (
                <p className="text-sm text-slate-300">{registro.observacao}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}