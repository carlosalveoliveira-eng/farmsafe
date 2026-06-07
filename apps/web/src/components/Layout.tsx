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
} from 'lucide-react'

import { supabase } from '../services/supabase'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/abastecimentos', label: 'Abastecimentos', icon: Droplets },
  { to: '/cochos', label: 'Cochos', icon: Box },
  { to: '/dispositivos', label: 'Dispositivos', icon: Smartphone },
  { to: '/fazendas', label: 'Fazendas', icon: Building2 },
  { to: '/mapa-operacional', label: 'Mapa Operacional', icon: MapPinned },
]

export default function Layout() {
  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <aside className="w-56 shrink-0 flex flex-col border-r border-border bg-surface">
        <div className="h-16 flex items-center px-5 border-b border-border">
          <span className="font-display text-xl text-green tracking-tight">
            Farm<span className="text-ink-primary">safe</span>
          </span>

          <span className="ml-2 font-mono text-[10px] text-ink-muted border border-border px-1.5 py-0.5 rounded">
            WEB
          </span>
        </div>

        <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-green/10 text-green border border-green/20'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-panel'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    className={
                      isActive
                        ? 'text-green'
                        : 'text-ink-muted group-hover:text-ink-secondary'
                    }
                  />

                  <span className="flex-1">{label}</span>

                  {isActive && (
                    <ChevronRight size={12} className="text-green/60" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-border bg-panel text-sm text-ink-secondary hover:text-red-400 hover:border-red-400/30 transition-colors"
          >
            <LogOut size={15} />
            Sair
          </button>

          <p className="text-xs text-ink-muted font-mono mt-3">
            v0.1.0 MVP
          </p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 shrink-0 flex items-center px-8 border-b border-border bg-surface/50 backdrop-blur">
          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-ok animate-pulse" />

            <span className="text-xs text-ink-muted font-mono">
              Supabase conectado
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
