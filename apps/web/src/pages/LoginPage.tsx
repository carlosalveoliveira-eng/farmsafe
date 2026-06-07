import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'

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
    <main className="min-h-screen bg-canvas grid lg:grid-cols-2 overflow-hidden">
      {/* LADO VISUAL */}
      <section className="hidden lg:flex relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop"
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-green/40" />

        <div className="relative z-10 flex flex-col justify-between p-14 w-full">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
              <ShieldCheck size={14} className="text-green-400" />

              <span className="text-xs text-white/80 uppercase tracking-wider">
                Gestão operacional rural
              </span>
            </div>
          </div>

          <div className="max-w-xl">
            <h1 className="font-display text-6xl leading-none text-white">
              Farmsafe
            </h1>

            <p className="mt-6 text-lg text-white/75 leading-relaxed">
              Plataforma inteligente para monitoramento operacional,
              abastecimento de cochos, auditoria GPS e gestão rural em tempo real.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-5">
                <p className="text-3xl font-semibold text-white">100%</p>

                <p className="text-sm text-white/60 mt-1">
                  Operação offline
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-5">
                <p className="text-3xl font-semibold text-white">GPS</p>

                <p className="text-sm text-white/60 mt-1">
                  Auditoria operacional
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LOGIN */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-green/10 border border-green/20 flex items-center justify-center">
                <span className="font-display text-green text-2xl">
                  F
                </span>
              </div>

              <div>
                <h2 className="font-display text-3xl text-green">
                  Farmsafe
                </h2>

                <p className="text-sm text-ink-muted mt-1">
                  Sistema web de gestão rural
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-3xl p-8 shadow-panel">
            <div>
              <h3 className="text-2xl font-semibold text-ink-primary">
                Entrar
              </h3>

              <p className="text-sm text-ink-muted mt-2">
                Acesse o painel operacional da fazenda.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-5">
              <div>
                <label className="text-xs text-ink-muted">
                  E-mail
                </label>

                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@fazenda.com"
                  className="mt-2 w-full h-12 rounded-xl bg-canvas border border-border px-4 text-ink-primary outline-none focus:border-green/50 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-ink-muted">
                  Senha
                </label>

                <div className="relative mt-2">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full h-12 rounded-xl bg-canvas border border-border px-4 pr-12 text-ink-primary outline-none focus:border-green/50 transition-colors"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={entrar}
                disabled={loading}
                className="h-12 rounded-xl bg-green text-black font-semibold hover:opacity-90 transition-opacity"
              >
                {loading ? 'Entrando...' : 'Acessar sistema'}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-ink-muted mt-6">
            Farmsafe © {new Date().getFullYear()} · Plataforma operacional rural
          </p>
        </div>
      </section>
    </main>
  )
}