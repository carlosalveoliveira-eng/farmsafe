import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'

import { supabase } from './services/supabase'

import AlertasPage from './pages/AlertasPage'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AbastecimentosPage from './pages/AbastecimentosPage'
import CochosPage from './pages/CochosPage'
import DispositivosPage from './pages/DispositivosPage'
import FazendasPage from './pages/FazendasPage'
import MapaOperacionalPage from './pages/MapaOperacionalPage'
import LogsPage from './pages/LogsPage'
import InsumosPage from './pages/InsumosPage'
import UsuariosPage from './pages/UsuariosPage'
import SetupEmpresaPage from './pages/SetupEmpresaPage'
import { getEmpresaUsuario } from './services/auth'
import AppErrorBoundary from './components/AppErrorBoundary'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<
    'carregando' | 'autorizado' | 'setup' | 'negado'
  >('carregando')

  useEffect(() => {
    let mounted = true

    async function validarAcesso(session: Session | null) {
      if (!mounted) return

      if (!session) {
        setStatus('negado')
        return
      }

      try {
        await getEmpresaUsuario()

        if (mounted) {
          setStatus('autorizado')
        }
      } catch (error) {
        console.error('Acesso negado:', error)

        if (mounted) {
          setStatus('setup')
        }
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      validarAcesso(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        validarAcesso(session)
      }
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  if (status === 'carregando') {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center text-ink-muted">
        Validando acesso...
      </div>
    )
  }

  if (status === 'negado') {
    return <Navigate to="/login" replace />
  }

  if (status === 'setup') {
    return <Navigate to="/setup" replace />
  }

  return children
}

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AppErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<SetupEmpresaPage />} />

        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
         <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="abastecimentos" element={<AbastecimentosPage />} />
        <Route path="insumos" element={<InsumosPage />} />
        <Route path="cochos" element={<CochosPage />} />
        <Route path="alertas" element={<AlertasPage />} />
        <Route path="dispositivos" element={<DispositivosPage />} />
        <Route path="fazendas" element={<FazendasPage />} />
        <Route path="mapa-operacional" element={<MapaOperacionalPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="usuarios" element={<UsuariosPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
      </AppErrorBoundary>
    </BrowserRouter>
  )
}
