import { useEffect, useState } from 'react'
import { db } from '../database/db'

export function usePendentes() {
  const [pendentes, setPendentes] = useState(0)

  async function carregarPendentes() {
    const registros = await db.abastecimentos.toArray()

    const total = registros.filter(
      (registro) => registro.sincronizado === false
    ).length

    setPendentes(total)
  }

  useEffect(() => {
    carregarPendentes()
  }, [])

  return {
    pendentes,
    carregarPendentes,
  }
}