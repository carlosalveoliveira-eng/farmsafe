import { useEffect } from 'react'
import { sincronizarRegistros } from '../services/sync'

type UseAutoSyncParams = {
  pendentes: number
  carregarPendentes: () => Promise<void>
}

export function useAutoSync({
  pendentes,
  carregarPendentes,
}: UseAutoSyncParams) {
  useEffect(() => {
    async function sincronizarQuandoOnline() {
      if (!navigator.onLine) return
      if (pendentes === 0) return

      try {
        const resultado = await sincronizarRegistros()

        await carregarPendentes()

        console.log('Auto sync finalizada:', resultado)
      } catch (error) {
        console.error('Erro no auto sync:', error)
      }
    }

    window.addEventListener('online', sincronizarQuandoOnline)

    return () => {
      window.removeEventListener('online', sincronizarQuandoOnline)
    }
  }, [pendentes, carregarPendentes])
}