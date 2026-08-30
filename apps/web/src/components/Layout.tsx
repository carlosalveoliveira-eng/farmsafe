import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  AlertTriangle,
  Box,
  Building2,
  ChevronRight,
  ClipboardList,
  Droplets,
  LayoutDashboard,
  Leaf,
  LogOut,
  MapPinned,
  PanelLeftClose,
  Smartphone,
  UsersRound,
  Warehouse,
} from 'lucide-react'

import { supabase } from '../services/supabase'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, group: 'operacao' },
  {
    to: '/mapa-operacional',
    label: 'Mapa Operacional',
    icon: MapPinned,
    group: 'operacao',
  },
  {
    to: '/abastecimentos',
    label: 'Abastecimentos',
    icon: Droplets,
    group: 'operacao',
  },
  { to: '/cochos', label: 'Cochos', icon: Box, group: 'operacao' },
  { to: '/alertas', label: 'Alertas', icon: AlertTriangle, group: 'operacao' },
  {
    to: '/insumos',
    label: 'Insumos e Estoque',
    icon: Warehouse,
    group: 'cadastros',
  },
  { to: '/fazendas', label: 'Fazendas', icon: Building2, group: 'cadastros' },
  {
    to: '/dispositivos',
    label: 'Dispositivos',
    icon: Smartphone,
    group: 'admin',
  },
  { to: '/usuarios', label: 'Usuarios', icon: UsersRound, group: 'admin' },
  { to: '/logs', label: 'Logs', icon: ClipboardList, group: 'admin' },
] as const

const GROUP_LABELS = {
  operacao: 'Operacao',
  cadastros: 'Cadastros',
  admin: 'Admin',
}

export default function Layout() {
  const location = useLocation()
  const modoMapa = location.pathname === '/mapa-operacional'

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="flex h-screen overflow-hidden bg-canvas text-ink-primary">
      <aside
        className={`flex shrink-0 flex-col border-r border-border bg-white transition-all ${
          modoMapa ? 'w-20' : 'w-56'
        }`}
      >
        <div
          className={`flex h-16 items-center border-b border-border ${
            modoMapa ? 'justify-center px-3' : 'px-5'
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green text-white shadow-sm">
            <Leaf size={20} />
          </div>

          <div className={`ml-3 ${modoMapa ? 'hidden' : ''}`}>
            <p className="font-display text-lg font-semibold tracking-tight text-ink-primary">
              FarmSafe
            </p>
            <p className="text-xs text-ink-muted">Gestao operacional</p>
          </div>
        </div>

        <nav
          className={`flex flex-1 flex-col gap-3 overflow-y-auto py-3 ${
            modoMapa ? 'px-3' : 'px-3'
          }`}
        >
          {(['operacao', 'cadastros', 'admin'] as const).map((group) => (
            <div key={group} className="space-y-1">
              {!modoMapa && (
                <p className="px-3 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                  {GROUP_LABELS[group]}
                </p>
              )}

              {NAV.filter((item) => item.group === group).map(
                ({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    title={label}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? 'border border-green/20 bg-green/10 text-green shadow-sm'
                          : 'text-ink-secondary hover:bg-green/5 hover:text-green'
                      } ${modoMapa ? 'justify-center px-0 py-3' : 'px-3 py-2'}`
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
                        <span className={`flex-1 ${modoMapa ? 'hidden' : ''}`}>
                          {label}
                        </span>
                        {isActive && !modoMapa && (
                          <ChevronRight size={13} className="text-green/60" />
                        )}
                      </>
                    )}
                  </NavLink>
                )
              )}
            </div>
          ))}
        </nav>

        <div
          className={`border-t border-border bg-surface/50 ${
            modoMapa ? 'p-3' : 'p-3'
          }`}
        >
          <div
            className={`mb-3 rounded-lg border border-border bg-white p-3 ${
              modoMapa ? 'hidden' : ''
            }`}
          >
            <p className="text-xs text-ink-muted">Ambiente</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-ok" />
              <span className="text-xs font-medium text-ink-secondary">
                Sistema online
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Sair"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-ink-secondary transition-colors hover:border-err/30 hover:bg-err/5 hover:text-err"
          >
            <LogOut size={15} />
            <span className={modoMapa ? 'hidden' : ''}>Sair</span>
          </button>

          <p
            className={`mt-3 text-center text-[11px] text-ink-muted ${
              modoMapa ? 'hidden' : ''
            }`}
          >
            FarmSafe v0.1.0
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={`shrink-0 items-center border-b border-border bg-white px-7 ${
            modoMapa ? 'hidden' : 'flex h-16'
          }`}
        >
          <div>
            <p className="text-sm font-semibold text-ink-primary">
              Painel de gestao
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Controle, rastreabilidade e auditoria operacional
            </p>
          </div>

          <div className="flex-1" />

          <div className="hidden items-center gap-2 rounded-lg border border-green/20 bg-green/10 px-3 py-2 md:flex">
            <PanelLeftClose size={14} className="text-green" />
            <p className="text-xs font-medium text-green">Operacao ativa</p>
          </div>
        </header>

        <main
          className={`flex-1 overflow-y-auto bg-canvas ${
            modoMapa ? 'p-0' : 'p-6'
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
