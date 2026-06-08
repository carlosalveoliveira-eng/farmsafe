import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  ShieldCheck,
  MapPinned,
  Satellite,
  Activity,
  CheckCircle2,
} from 'lucide-react'

import { supabase } from '../services/supabase'

export default function LoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function entrar() {
    if (!email.trim() || !password.trim()) {
      alert('Preencha e-mail e senha.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      alert('Erro ao entrar: ' + error.message)
      return
    }

    navigate('/')
  }

  return (
    <main className="h-screen bg-[#f6f3eb] grid lg:grid-cols-2 overflow-hidden">
      {/* LADO INSTITUCIONAL */}
      <section className="hidden lg:flex relative border-r border-[#e6e0d2] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop"
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/55 to-[#17301f]/70" />

        <div className="relative z-10 flex flex-col justify-between h-screen p-10 w-full">
          {/* TOP */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/10 backdrop-blur-md">
              <ShieldCheck size={14} className="text-[#c7ff9e]" />

              <span className="text-xs tracking-[0.2em] uppercase text-white/80 font-medium">
                Plataforma Enterprise Agro
              </span>
            </div>
          </div>

          {/* CENTRO */}
          <div className="max-w-xl">
            <h1 className="font-display text-5xl leading-none text-white tracking-tight">
              Farmsafe
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-white/75 max-w-xl">
              Monitoramento operacional inteligente para fazendas modernas,
              com rastreabilidade GPS, auditoria em tempo real e controle
              completo da operação rural.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {/* CARD */}
              <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-4">
                <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Satellite size={20} className="text-[#c7ff9e]" />
                </div>

                <h3 className="mt-4 text-white font-semibold text-base">
                  Auditoria GPS
                </h3>

                <p className="mt-1.5 text-xs leading-relaxed text-white/65">
                  Rastreamento operacional completo dos abastecimentos e eventos
                  da fazenda.
                </p>
              </div>

              {/* CARD */}
              <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-4">
                <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
                  <MapPinned size={20} className="text-[#c7ff9e]" />
                </div>

                <h3 className="mt-4 text-white font-semibold text-base">
                  Operação Offline
                </h3>

                <p className="mt-1.5 text-xs leading-relaxed text-white/65">
                  Registro contínuo de atividades mesmo em áreas sem sinal de
                  internet.
                </p>
              </div>

              {/* CARD */}
              <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-4">
                <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Activity size={20} className="text-[#c7ff9e]" />
                </div>

                <h3 className="mt-4 text-white font-semibold text-base">
                  Central Operacional
                </h3>

                <p className="mt-1.5 text-xs leading-relaxed text-white/65">
                  Painéis em tempo real para acompanhamento operacional da
                  propriedade.
                </p>
              </div>

              {/* CARD */}
              <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-4">
                <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-[#c7ff9e]" />
                </div>

                <h3 className="mt-4 text-white font-semibold text-base">
                  Gestão Inteligente
                </h3>

                <p className="mt-1.5 text-xs leading-relaxed text-white/65">
                  Controle moderno de cochos, dispositivos e abastecimentos em
                  uma única plataforma.
                </p>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-between pt-6">
            <p className="text-xs text-white/50">
              Farmsafe © {new Date().getFullYear()}
            </p>

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#8cff6a] animate-pulse" />

              <span className="text-[11px] tracking-wide text-white/60 uppercase">
                Plataforma online
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* LOGIN */}
      <section className="flex items-center justify-center px-6 py-6 overflow-hidden">
        <div className="w-full max-w-md">
          {/* MOBILE BRAND */}
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-green/10 border border-green/20 flex items-center justify-center">
                <span className="font-display text-2xl text-green">
                  F
                </span>
              </div>

              <div>
                <h2 className="font-display text-3xl text-green">
                  Farmsafe
                </h2>

                <p className="text-sm text-ink-muted mt-1">
                  Plataforma operacional rural
                </p>
              </div>
            </div>
          </div>

          {/* CARD LOGIN */}
          <div className="bg-white border border-[#e8e1d3] rounded-[32px] shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden">
            {/* HEADER */}
            <div className="px-8 pt-7 pb-5 border-b border-[#f1ebde]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-green/10 border border-green/20 flex items-center justify-center">
                  <span className="font-display text-green text-xl">
                    F
                  </span>
                </div>

                <div>
                  <h2 className="font-display text-3xl text-green tracking-tight">
                    Farmsafe
                  </h2>

                  <p className="text-sm text-ink-muted mt-1">
                    Gestão operacional inteligente
                  </p>
                </div>
              </div>
            </div>

            {/* BODY */}
            <div className="px-8 py-7">
              <div>
                <h3 className="text-2xl font-semibold text-ink-primary tracking-tight">
                  Entrar no sistema
                </h3>

                <p className="text-sm text-ink-muted mt-2 leading-relaxed">
                  Acesse o painel operacional da fazenda para acompanhar
                  abastecimentos, dispositivos e rastreabilidade em tempo real.
                </p>
              </div>

              <div className="mt-7 space-y-4">
                {/* EMAIL */}
                <div>
                  <label className="text-xs uppercase tracking-wide font-medium text-ink-muted">
                    E-mail
                  </label>

                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@fazenda.com"
                    className="mt-2 w-full h-11 rounded-2xl border border-[#e6dfd2] bg-[#fcfbf8] px-4 text-sm text-ink-primary outline-none transition-all focus:border-green/40 focus:ring-4 focus:ring-green/10"
                  />
                </div>

                {/* SENHA */}
                <div>
                  <label className="text-xs uppercase tracking-wide font-medium text-ink-muted">
                    Senha
                  </label>

                  <div className="relative mt-2">
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="w-full h-11 rounded-2xl border border-[#e6dfd2] bg-[#fcfbf8] px-4 pr-12 text-sm text-ink-primary outline-none transition-all focus:border-green/40 focus:ring-4 focus:ring-green/10"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* BTN */}
                <button
                  onClick={entrar}
                  disabled={loading}
                  className="w-full h-11 rounded-2xl bg-[#17301f] text-white font-semibold tracking-wide transition-all hover:opacity-95 hover:translate-y-[-1px] active:translate-y-0 disabled:opacity-60"
                >
                  {loading ? 'Entrando...' : 'Acessar plataforma'}
                </button>
              </div>

              {/* FOOT */}
              <div className="mt-7 pt-5 border-t border-[#f1ebde]">
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span>Rastreabilidade operacional</span>
                  <span>Enterprise Agro</span>
                </div>
              </div>
            </div>
          </div>

          {/* COPYRIGHT */}
          <p className="text-center text-xs text-ink-muted mt-5">
            Farmsafe © {new Date().getFullYear()} · Plataforma operacional rural
          </p>
        </div>
      </section>
    </main>
  )
}