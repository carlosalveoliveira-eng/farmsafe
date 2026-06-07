import { useEffect, useState } from 'react'

import { useNetworkStatus } from './hooks/useNetworkStatus'
import { useAutoSync } from './hooks/useAutoSync'
import { sincronizarRegistros } from './services/sync'
import { obterDeviceSecret } from './services/device'

import { AtivacaoPage } from './pages/AtivacaoPage'
import { HomePage } from './pages/HomePage'
import { ScannerPage } from './pages/ScannerPage'
import { RegistroPage } from './pages/RegistroPage'
import { HistoricoPage } from './pages/HistoricoPage'

import { usePendentes } from './hooks/usePendentes'

function App() {
  const [ativado, setAtivado] = useState(false)

  const [tela, setTela] = useState<
    'home' | 'scanner' | 'registro' | 'historico'
  >('home')

  const [codigoQr, setCodigoQr] = useState<string | null>(null)
  const [sincronizando, setSincronizando] = useState(false)

  const online = useNetworkStatus()
  const { pendentes, carregarPendentes } = usePendentes()

  useAutoSync({
    pendentes,
    carregarPendentes,
  })

  useEffect(() => {
    const secret = obterDeviceSecret()
    setAtivado(Boolean(secret))
  }, [])

  async function sincronizar() {
    if (pendentes === 0) {
      alert('Nenhum registro pendente para sincronizar.')
      return
    }

    try {
      setSincronizando(true)

      const resultado = await sincronizarRegistros()

      await carregarPendentes()

      alert(
        `Sincronização finalizada!\n\nEnviados: ${resultado.enviados}\nFalhas: ${resultado.falhas}`
      )
    } finally {
      setSincronizando(false)
    }
  }

  if (!ativado) {
    return (
      <AtivacaoPage
        onAtivado={() => {
          setAtivado(true)
        }}
      />
    )
  }

  if (tela === 'scanner') {
    return (
      <ScannerPage
        onClose={() => setTela('home')}
        onScanSuccess={(codigo) => {
          setCodigoQr(codigo)
          setTela('registro')
        }}
      />
    )
  }

  if (tela === 'registro' && codigoQr) {
    return (
      <RegistroPage
        codigoQr={codigoQr}
        onVoltar={() => setTela('scanner')}
        onFinalizado={async () => {
          setCodigoQr(null)
          setTela('home')
          await carregarPendentes()
        }}
      />
    )
  }

  if (tela === 'historico') {
    return <HistoricoPage onVoltar={() => setTela('home')} />
  }

  return (
    <HomePage
      online={online}
      sincronizando={sincronizando}
      pendentes={pendentes}
      onAbrirScanner={() => setTela('scanner')}
      onSincronizar={sincronizar}
      onAbrirHistorico={() => setTela('historico')}
    />
  )
}

export default App