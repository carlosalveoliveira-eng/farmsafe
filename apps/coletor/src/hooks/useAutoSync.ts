import { useEffect, useRef } from 'react'
import { sincronizarRegistros } from '../services/sync'

type UseAutoSyncParams = {
  pendentes: number
  carregarPendentes: () => Promise<void>
}

export function useAutoSync({
  pendentes,
  carregarPendentes,
}: UseAutoSyncParams) {
  const sincronizandoRef = useRef(false)

  useEffect(() => {
    async function tentarSincronizar() {
      if (!navigator.onLine) return
      if (pendentes === 0) return
      if (sincronizandoRef.current) return

      try {
        sincronizandoRef.current = true

        const resultado = await sincronizarRegistros()

        await carregarPendentes()

        console.log('Auto sync finalizada:', resultado)
      } catch (error) {
        console.error('Erro no auto sync:', error)
      } finally {
        sincronizandoRef.current = false
      }
    }

    function handleOnline() {
      tentarSincronizar()
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        tentarSincronizar()
      }
    }

    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const timeoutId = window.setTimeout(() => {
      tentarSincronizar()
    }, 1500)

    return () => {
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.clearTimeout(timeoutId)
    }
  }, [pendentes, carregarPendentes])
}