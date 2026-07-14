import { AlertTriangle, Download } from 'lucide-react'
import { abrirLinkAtualizacao, type AtualizacaoInfo } from '../services/atualizacao'
import { APP_VERSION } from '../config/appVersion'

type AtualizacaoObrigatoriaPageProps = {
  atualizacao: AtualizacaoInfo
  onTentarAtualizar: () => void
}

export function AtualizacaoObrigatoriaPage({
  atualizacao,
  onTentarAtualizar,
}: AtualizacaoObrigatoriaPageProps) {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col gap-5">
        <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-5 text-center">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-300" />
          </div>

          <h1 className="text-2xl font-bold">Atualização obrigatória</h1>

          <p className="text-slate-300 text-sm mt-3">
            Esta versão do FarmSafe Coletor precisa ser atualizada para continuar
            usando com segurança.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-sm text-slate-400">Versão instalada</p>
          <p className="font-bold">{APP_VERSION.versionName}</p>

          <p className="text-sm text-slate-400 mt-4">Nova versão</p>
          <p className="font-bold">
            {atualizacao.latest_version_name ?? 'Disponível'}
          </p>

          {atualizacao.release_notes && (
            <>
              <p className="text-sm text-slate-400 mt-4">O que mudou</p>
              <p className="text-sm text-slate-300 whitespace-pre-line">
                {atualizacao.release_notes}
              </p>
            </>
          )}
        </div>

        <button
          onClick={() => abrirLinkAtualizacao(atualizacao.apk_url)}
          className="h-14 rounded-2xl bg-green-600 font-bold active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Baixar atualização
        </button>

        <button
          onClick={onTentarAtualizar}
          className="h-12 rounded-2xl bg-slate-800 border border-slate-700 font-semibold active:scale-[0.98]"
        >
          Verificar novamente
        </button>

        <p className="text-center text-xs text-slate-500">
          Caso não consiga atualizar, fale com a gestão.
        </p>
      </div>
    </main>
  )
}