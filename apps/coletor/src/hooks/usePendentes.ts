import { useCallback, useEffect, useState } from 'react'
import { db } from '../database/db'

export function usePendentes() {
  const [pendentes, setPendentes] = useState(0)

  const carregarPendentes = useCallback(async () => {
    const registros = await db.abastecimentos.toArray()

    const total = registros.filter(
      (registro) => registro.sincronizado === false
    ).length

    setPendentes(total)
  }, [])

  useEffect(() => {
    carregarPendentes()
  }, [carregarPendentes])

  return {
    pendentes,
    carregarPendentes,
  }
}