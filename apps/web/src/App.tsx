import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'

import { supabase } from './services/supabase'

import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AbastecimentosPage from './pages/AbastecimentosPage'
import CochosPage from './pages/CochosPage'
import DispositivosPage from './pages/DispositivosPage'
import FazendasPage from './pages/FazendasPage'
import MapaOperacionalPage from './pages/MapaOperacionalPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center text-ink-muted">
        Carregando...
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="abastecimentos" element={<AbastecimentosPage />} />
          <Route path="cochos" element={<CochosPage />} />
          <Route path="dispositivos" element={<DispositivosPage />} />
          <Route path="fazendas" element={<FazendasPage />} />
          <Route path="mapa" element={<MapaOperacionalPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}