import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Database,
  Download,
  History,
  QrCode,
  RefreshCw,
} from 'lucide-react'
import type { AtualizacaoInfo } from '../services/atualizacao'
import { APP_VERSION } from '../config/appVersion'

type CargaResumo = {
  cochos: number
  insumos: number
  atualizadoEm: string | null
}

type HomePageProps = {
  sincronizando: boolean
  atualizandoCarga: boolean
  verificandoAtualizacao: boolean
  online: boolean
  pendentes: number
  cargaResumo: CargaResumo
  atualizacao: AtualizacaoInfo | null
  onAbrirScanner: () => void
  onSincronizar: () => void
  onAtualizarCarga: () => void
  onAbrirHistorico: () => void
  onVerificarAtualizacao: () => void
  onAbrirAtualizacao: () => void
}

function formatarData(dataIso: string | null) {
  if (!dataIso) return 'Nunca atualizado'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dataIso))
}

function dadosAntigos(dataIso: string | null) {
  if (!dataIso) return true

  const atualizado = new Date(dataIso).getTime()
  const agora = Date.now()
  const horas = (agora - atualizado) / 1000 / 60 / 60

  return horas > 24
}

export function HomePage({
  online,
  sincronizando,
  atualizandoCarga,
  verificandoAtualizacao,
  pendentes,
  cargaResumo,
  atualizacao,
  onAbrirScanner,
  onSincronizar,
  onAtualizarCarga,
  onAbrirHistorico,
  onVerificarAtualizacao,
  onAbrirAtualizacao,
}: HomePageProps) {
  const cargaPronta = cargaResumo.cochos > 0 && cargaResumo.insumos > 0
  const cargaAntiga = dadosAntigos(cargaResumo.atualizadoEm)
  const temAtualizacao = Boolean(atualizacao?.update_available)

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-6">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-5">
        <div className="text-center pt-4">
          <h1 className="text-4xl font-bold tracking-tight">FarmSafe</h1>
          <p className="text-slate-400 mt-2">Coletor de campo</p>
          <p className="text-xs text-slate-600 mt-1">
            Versão {APP_VERSION.versionName}
          </p>
        </div>

        {temAtualizacao && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-300 mt-1" />

              <div>
                <p className="font-bold text-yellow-200">
                  Nova versão disponível
                </p>

                <p className="text-sm text-slate-300 mt-1">
                  Versão {atualizacao?.latest_version_name ?? 'nova'} disponível
                  para o FarmSafe Coletor.
                </p>
              </div>
            </div>

            {atualizacao?.release_notes && (
              <p className="text-sm text-slate-300 whitespace-pre-line">
                {atualizacao.release_notes}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onAbrirAtualizacao}
                className="h-11 rounded-xl bg-green-600 font-bold active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Atualizar
              </button>

              <button
                onClick={onVerificarAtualizacao}
                disabled={verificandoAtualizacao || !online}
                className="h-11 rounded-xl bg-slate-800 border border-slate-700 font-semibold active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {verificandoAtualizacao ? 'Verificando' : 'Verificar'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Conexão</p>
            <p
              className={`font-semibold ${
                online ? 'text-emerald-400' : 'text-yellow-300'
              }`}
            >
              {online ? 'Online' : 'Offline pronto'}
            </p>
          </div>

          <CloudOff
            className={`w-6 h-6 ${
              online ? 'text-emerald-400' : 'text-yellow-300'
            }`}
          />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Dados offline</p>
              <p
                className={`font-semibold ${
                  cargaPronta && !cargaAntiga
                    ? 'text-emerald-300'
                    : cargaPronta
                    ? 'text-yellow-300'
                    : 'text-red-300'
                }`}
              >
                {!cargaPronta
                  ? 'Atualização necessária'
                  : cargaAntiga
                  ? 'Dados antigos'
                  : 'Pronto para campo'}
              </p>
            </div>

            <Database className="w-6 h-6 text-green-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-3">
              <p className="text-xs text-slate-500">Cochos</p>
              <p className="text-xl font-bold">{cargaResumo.cochos}</p>
            </div>

            <div className="rounded-xl bg-slate-950 border border-slate-800 p-3">
              <p className="text-xs text-slate-500">Insumos</p>
              <p className="text-xl font-bold">{cargaResumo.insumos}</p>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Atualizado em: {formatarData(cargaResumo.atualizadoEm)}
          </p>

          {cargaPronta && cargaAntiga && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
              <p className="text-sm text-yellow-200 font-medium">
                Os dados offline estão antigos. Atualize quando tiver internet
                para evitar QR Code de cocho desativado ou insumo desatualizado.
              </p>
            </div>
          )}

          <button
            onClick={onAtualizarCarga}
            disabled={atualizandoCarga || !online}
            className="h-12 rounded-xl bg-slate-800 border border-slate-700 font-semibold active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            {atualizandoCarga ? 'Atualizando...' : 'Baixar dados'}
          </button>
        </div>

        {!cargaPronta && (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-sm text-yellow-200 font-medium">
              Antes de usar no campo, baixe os dados do coletor com internet.
            </p>
          </div>
        )}

        <button
          onClick={onAbrirScanner}
          disabled={!cargaPronta}
          className="h-32 rounded-3xl bg-green-600 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-3 shadow-lg shadow-green-950 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
        >
          <QrCode className="w-12 h-12" />
          <span className="text-xl font-semibold">Escanear QR Code</span>
        </button>

        <button
          onClick={onSincronizar}
          disabled={sincronizando || pendentes === 0}
          className="h-14 rounded-2xl bg-slate-800 border border-slate-700 font-semibold active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          {sincronizando ? 'Sincronizando...' : 'Sincronizar registros'}
        </button>

        <button
          onClick={onAbrirHistorico}
          className="h-14 rounded-2xl bg-slate-800 border border-slate-700 font-semibold active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <History className="w-5 h-5" />
          Ver histórico
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Pendências</p>
            <p className="font-medium">
              {pendentes === 0
                ? 'Nenhum registro pendente'
                : `${pendentes} registro(s) pendente(s)`}
            </p>
          </div>

          <CheckCircle2
            className={`w-6 h-6 ${
              pendentes === 0 ? 'text-emerald-400' : 'text-yellow-300'
            }`}
          />
        </div>
      </div>
    </main>
  )
}