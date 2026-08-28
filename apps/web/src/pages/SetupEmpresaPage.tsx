import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CheckCircle2, Leaf, Save } from 'lucide-react'

import { criarSetupEmpresaInicial } from '../services/setup'
import { supabase } from '../services/supabase'

type SetupForm = {
  empresaNome: string
  usuarioNome: string
  fazendaNome: string
  fazendaCidade: string
  fazendaEstado: string
}

const formInicial: SetupForm = {
  empresaNome: '',
  usuarioNome: '',
  fazendaNome: '',
  fazendaCidade: '',
  fazendaEstado: '',
}

export default function SetupEmpresaPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<SetupForm>(formInicial)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return

      if (!data.session) {
        navigate('/login', { replace: true })
      }
    })

    return () => {
      mounted = false
    }
  }, [navigate])

  async function concluirSetup() {
    setSalvando(true)

    try {
      await criarSetupEmpresaInicial(form)
      navigate('/dashboard', { replace: true })
      window.location.reload()
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel concluir o setup.'

      alert(mensagem)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <main className="min-h-screen bg-canvas text-ink-primary">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8">
        <header className="flex items-center gap-3 border-b border-border pb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green text-white">
            <Leaf size={20} />
          </div>

          <div>
            <h1 className="text-xl font-semibold">FarmSafe</h1>
            <p className="text-sm text-ink-muted">Setup inicial da empresa</p>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-green/20 bg-green/10 px-3 py-2 text-sm font-medium text-green">
              <Building2 size={15} />
              Primeira configuracao
            </div>

            <h2 className="text-4xl font-semibold tracking-tight text-ink-primary">
              Prepare a operacao para vender, testar e implantar.
            </h2>

            <div className="mt-6 space-y-3 text-sm text-ink-secondary">
              {[
                'Cria a empresa sem afetar dados existentes.',
                'Vincula seu usuario como dono da empresa.',
                'Opcionalmente cadastra a primeira fazenda.',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <div className="grid gap-5">
              <label className="block">
                <span className="text-sm font-medium text-ink-primary">
                  Nome da empresa
                </span>
                <input
                  value={form.empresaNome}
                  onChange={(event) =>
                    setForm({ ...form, empresaNome: event.target.value })
                  }
                  className="input mt-2"
                  placeholder="Fazenda Boa Vista Ltda"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-ink-primary">
                  Seu nome
                </span>
                <input
                  value={form.usuarioNome}
                  onChange={(event) =>
                    setForm({ ...form, usuarioNome: event.target.value })
                  }
                  className="input mt-2"
                  placeholder="Responsavel pela operacao"
                />
              </label>

              <div className="border-t border-border pt-5">
                <p className="text-sm font-semibold text-ink-primary">
                  Primeira fazenda
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  Opcional, mas recomendado para demonstracao e onboarding.
                </p>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-ink-primary">
                  Nome da fazenda
                </span>
                <input
                  value={form.fazendaNome}
                  onChange={(event) =>
                    setForm({ ...form, fazendaNome: event.target.value })
                  }
                  className="input mt-2"
                  placeholder="Fazenda Santa Rita"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-[1fr_110px]">
                <label className="block">
                  <span className="text-sm font-medium text-ink-primary">
                    Cidade
                  </span>
                  <input
                    value={form.fazendaCidade}
                    onChange={(event) =>
                      setForm({ ...form, fazendaCidade: event.target.value })
                    }
                    className="input mt-2"
                    placeholder="Rondonopolis"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-ink-primary">
                    UF
                  </span>
                  <input
                    value={form.fazendaEstado}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        fazendaEstado: event.target.value
                          .toUpperCase()
                          .slice(0, 2),
                      })
                    }
                    className="input mt-2"
                    placeholder="MT"
                    maxLength={2}
                  />
                </label>
              </div>

              <div className="flex justify-end border-t border-border pt-5">
                <button
                  onClick={concluirSetup}
                  disabled={salvando}
                  className="btn-primary"
                >
                  <Save size={14} />
                  {salvando ? 'Configurando...' : 'Concluir setup'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
