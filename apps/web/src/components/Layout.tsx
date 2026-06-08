import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Droplets,
  Box,
  Smartphone,
  Building2,
  ChevronRight,
  MapPinned,
  LogOut,
  AlertTriangle,
  ClipboardList,
  Leaf,
} from 'lucide-react'

import { supabase } from '../services/supabase'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/abastecimentos', label: 'Abastecimentos', icon: Droplets },
  { to: '/cochos', label: 'Cochos', icon: Box },
  { to: '/alertas', label: 'Alertas', icon: AlertTriangle },
  { to: '/dispositivos', label: 'Dispositivos', icon: Smartphone },
  { to: '/fazendas', label: 'Fazendas', icon: Building2 },
  { to: '/mapa-operacional', label: 'Mapa Operacional', icon: MapPinned },
  { to: '/logs', label: 'Logs', icon: ClipboardList },
]

export default function Layout() {
  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="flex h-screen bg-canvas overflow-hidden text-ink-primary">
      <aside className="w-64 shrink-0 flex flex-col border-r border-border bg-white">
        <div className="h-20 flex items-center px-6 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-green text-white flex items-center justify-center shadow-sm">
            <Leaf size={20} />
          </div>

          <div className="ml-3">
            <p className="font-display text-xl font-semibold text-ink-primary tracking-tight">
              FarmSafe
            </p>

            <p className="text-xs text-ink-muted">
              Gestão operacional
            </p>
          </div>
        </div>

        <nav className="flex-1 py-5 px-4 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-green/10 text-green border border-green/20 shadow-sm'
                    : 'text-ink-secondary hover:text-green hover:bg-green/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={17}
                    className={
                      isActive
                        ? 'text-green'
                        : 'text-ink-muted group-hover:text-green'
                    }
                  />

                  <span className="flex-1">{label}</span>

                  {isActive && (
                    <ChevronRight size={13} className="text-green/60" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border bg-surface/50">
          <div className="mb-3 rounded-xl bg-white border border-border p-3">
            <p className="text-xs text-ink-muted">
              Ambiente
            </p>

            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-ok animate-pulse" />

              <span className="text-xs font-medium text-ink-secondary">
                Supabase conectado
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-white text-sm font-medium text-ink-secondary hover:text-err hover:border-err/30 hover:bg-err/5 transition-colors"
          >
            <LogOut size={15} />
            Sair
          </button>

          <p className="text-[11px] text-ink-muted mt-3 text-center">
            FarmSafe v0.1.0
          </p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 shrink-0 flex items-center px-8 border-b border-border bg-white">
          <div>
            <p className="text-sm font-medium text-ink-primary">
              Painel de gestão
            </p>

            <p className="text-xs text-ink-muted mt-0.5">
              Controle, rastreabilidade e auditoria operacional
            </p>
          </div>

          <div className="flex-1" />

          <div className="hidden md:flex items-center gap-3">
            <div className="px-3 py-2 rounded-xl bg-green/10 border border-green/20">
              <p className="text-xs font-medium text-green">
                Operação ativa
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-canvas">
          <Outlet />
        </main>
      </div>
    </div>
  )
}