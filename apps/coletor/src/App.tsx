import { useCallback, useEffect, useRef, useState } from 'react'

import { useNetworkStatus } from './hooks/useNetworkStatus'
import { useAutoSync } from './hooks/useAutoSync'
import { sincronizarRegistros } from './services/sync'
import { obterDeviceSecret } from './services/device'
import {
  atualizarCargaColetor,
  obterResumoCargaLocal,
} from './services/carga'
import {
  verificarAtualizacaoApp,
  abrirLinkAtualizacao,
  type AtualizacaoInfo,
} from './services/atualizacao'
import { notificarAtualizacaoDisponivel } from './services/notificacoes'

import { AtivacaoPage } from './pages/AtivacaoPage'
import { HomePage } from './pages/HomePage'
import { ScannerPage } from './pages/ScannerPage'
import { RegistroPage } from './pages/RegistroPage'
import { HistoricoPage } from './pages/HistoricoPage'
import { SplashLoadingPage } from './pages/SplashLoadingPage'
import { AtualizacaoObrigatoriaPage } from './pages/AtualizacaoObrigatoriaPage'

import { usePendentes } from './hooks/usePendentes'

type Tela = 'home' | 'scanner' | 'registro' | 'historico'

type CargaResumo = {
  cochos: number
  insumos: number
  atualizadoEm: string | null
}

function temDispositivoAtivado() {
  return Boolean(obterDeviceSecret())
}

function deveMostrarLoadingInicial() {
  return temDispositivoAtivado() && navigator.onLine
}

function App() {
  const [inicializando, setInicializando] = useState(
    deveMostrarLoadingInicial
  )

  const [ativado, setAtivado] = useState(temDispositivoAtivado)
  const [tela, setTela] = useState<Tela>('home')
  const [codigoQr, setCodigoQr] = useState<string | null>(null)

  const [sincronizando, setSincronizando] = useState(false)
  const [atualizandoCarga, setAtualizandoCarga] = useState(false)
  const [verificandoAtualizacao, setVerificandoAtualizacao] = useState(false)

  const [atualizacao, setAtualizacao] = useState<AtualizacaoInfo | null>(null)

  const [cargaResumo, setCargaResumo] = useState<CargaResumo>({
    cochos: 0,
    insumos: 0,
    atualizadoEm: null,
  })

  const ultimaVersaoNotificadaRef = useRef<number | null>(null)

  const online = useNetworkStatus()
  const { pendentes, carregarPendentes } = usePendentes()

  useAutoSync({
    pendentes,
    carregarPendentes,
  })

  const carregarResumoCarga = useCallback(async () => {
    const resumo = await obterResumoCargaLocal()

    setCargaResumo({
      cochos: resumo.cochos,
      insumos: resumo.insumos,
      atualizadoEm: resumo.atualizadoEm,
    })
  }, [])

  const verificarAtualizacao = useCallback(
    async (silencioso = true) => {
      if (!navigator.onLine) return null

      try {
        setVerificandoAtualizacao(true)

        const info = await verificarAtualizacaoApp()
        setAtualizacao(info)

        const versaoNova = info.latest_version_code ?? null

        if (
          info.update_available &&
          versaoNova &&
          ultimaVersaoNotificadaRef.current !== versaoNova
        ) {
          ultimaVersaoNotificadaRef.current = versaoNova

          await notificarAtualizacaoDisponivel(
            info.update_required,
            info.latest_version_name
          )
        }

        return info
      } catch (err) {
        if (!silencioso) {
          const mensagem =
            err instanceof Error
              ? err.message
              : 'Erro ao verificar atualização.'

          alert(mensagem)
        }

        return null
      } finally {
        setVerificandoAtualizacao(false)
      }
    },
    []
  )

  const prepararAppAtivado = useCallback(
    async (mostrarLoading: boolean) => {
      const inicio = Date.now()

      if (mostrarLoading) {
        setInicializando(true)
      }

      try {
        await Promise.all([carregarResumoCarga(), carregarPendentes()])

        if (navigator.onLine) {
          await verificarAtualizacao(true)
        }
      } finally {
        if (!mostrarLoading) {
          setInicializando(false)
          return
        }

        const tempoPassado = Date.now() - inicio
        const esperaMinima = Math.max(0, 900 - tempoPassado)

        window.setTimeout(() => {
          setInicializando(false)
        }, esperaMinima)
      }
    },
    [carregarPendentes, carregarResumoCarga, verificarAtualizacao]
  )

  useEffect(() => {
    const secret = obterDeviceSecret()

    if (!secret) {
      setAtivado(false)
      setInicializando(false)
      return
    }

    setAtivado(true)

    prepararAppAtivado(navigator.onLine)
  }, [prepararAppAtivado])

  useEffect(() => {
    if (!ativado) return
    if (!online) return

    verificarAtualizacao(true)
  }, [ativado, online, verificarAtualizacao])

  useEffect(() => {
    function aoVoltarParaApp() {
      if (document.visibilityState !== 'visible') return

      carregarResumoCarga()
      carregarPendentes()

      if (navigator.onLine && obterDeviceSecret()) {
        verificarAtualizacao(true)
      }
    }

    document.addEventListener('visibilitychange', aoVoltarParaApp)

    return () => {
      document.removeEventListener('visibilitychange', aoVoltarParaApp)
    }
  }, [carregarPendentes, carregarResumoCarga, verificarAtualizacao])

  async function atualizarDadosColetor() {
    if (!online) {
      alert('Sem internet. Conecte o celular para baixar os dados do coletor.')
      return
    }

    try {
      setAtualizandoCarga(true)

      const resultado = await atualizarCargaColetor()
      await carregarResumoCarga()

      alert(
        `Dados atualizados!\n\nCochos: ${resultado.totalCochos}\nInsumos: ${resultado.totalInsumos}`
      )
    } catch (err) {
      const mensagem =
        err instanceof Error
          ? err.message
          : 'Erro ao atualizar dados do coletor.'

      alert(mensagem)
    } finally {
      setAtualizandoCarga(false)
    }
  }

  async function sincronizar() {
    if (pendentes === 0) {
      alert('Nenhum registro pendente para sincronizar.')
      return
    }

    if (!online) {
      alert('Sem internet. Os registros continuam salvos no aparelho.')
      return
    }

    try {
      setSincronizando(true)

      const resultado = await sincronizarRegistros()

      await carregarPendentes()

      alert(
        `Sincronização finalizada!\n\nEnviados: ${resultado.enviados}\nAlertas: ${resultado.alertas}\nDuplicados: ${resultado.duplicados}\nFalhas: ${resultado.falhas}`
      )
    } finally {
      setSincronizando(false)
    }
  }

  if (inicializando) {
    return <SplashLoadingPage />
  }

  if (!ativado) {
    return (
      <AtivacaoPage
        onAtivado={async () => {
          setAtivado(true)
          await prepararAppAtivado(true)
        }}
      />
    )
  }

  if (atualizacao?.update_required) {
    return (
      <AtualizacaoObrigatoriaPage
        atualizacao={atualizacao}
        onTentarAtualizar={() => verificarAtualizacao(false)}
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
          await carregarResumoCarga()
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
      atualizandoCarga={atualizandoCarga}
      verificandoAtualizacao={verificandoAtualizacao}
      pendentes={pendentes}
      cargaResumo={cargaResumo}
      atualizacao={atualizacao}
      onAbrirScanner={() => setTela('scanner')}
      onSincronizar={sincronizar}
      onAtualizarCarga={atualizarDadosColetor}
      onAbrirHistorico={() => setTela('historico')}
      onVerificarAtualizacao={() => verificarAtualizacao(false)}
      onAbrirAtualizacao={() => abrirLinkAtualizacao(atualizacao?.apk_url)}
    />
  )
}

export default App