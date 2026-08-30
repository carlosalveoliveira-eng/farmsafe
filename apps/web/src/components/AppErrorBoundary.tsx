import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
  message: string
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro capturado pela interface:', error, errorInfo)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-[360px] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg border border-red/20 bg-white p-6 text-center shadow-sm">
          <AlertTriangle size={32} className="mx-auto text-red" />
          <h1 className="mt-4 text-lg font-semibold text-ink-primary">
            Nao foi possivel carregar esta tela
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            {this.state.message || 'Ocorreu uma falha inesperada na interface.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary mt-5"
          >
            <RefreshCw size={14} />
            Recarregar
          </button>
        </div>
      </div>
    )
  }
}
