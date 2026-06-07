import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'
import { X, Keyboard, QrCode } from 'lucide-react'

type ScannerPageProps = {
  onClose: () => void
  onScanSuccess: (codigo: string) => void
}

export function ScannerPage({ onClose, onScanSuccess }: ScannerPageProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)

  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  function pararCamera() {
    controlsRef.current?.stop()
    controlsRef.current = null

    const video = videoRef.current

    if (video?.srcObject) {
      const stream = video.srcObject as MediaStream

      stream.getTracks().forEach((track) => {
        track.stop()
      })

      video.srcObject = null
    }
  }

  useEffect(() => {
    const reader = new BrowserQRCodeReader()

    async function iniciarCamera() {
      try {
        if (!videoRef.current) return

        controlsRef.current = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' },
            },
          },
          videoRef.current,
          (result) => {
            if (!result) return

            pararCamera()
            onScanSuccess(result.getText())
          }
        )
      } catch {
        setErro('Não foi possível abrir a câmera. Use o código manual.')
      }
    }

    iniciarCamera()

    return () => {
      pararCamera()
    }
  }, [onScanSuccess])

  function confirmarCodigo() {
    const valor = codigo.trim()

    if (!valor) {
      alert('Digite o código do cocho.')
      return
    }

    pararCamera()
    onScanSuccess(valor)
  }

  function fecharScanner() {
    pararCamera()
    onClose()
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col px-6 py-6">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Escanear QR Code</h1>
            <p className="text-slate-400 text-sm">Aponte para o QR do cocho</p>
          </div>

          <button
            onClick={fecharScanner}
            className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 overflow-hidden min-h-[280px] flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
        </div>

        {erro && (
          <div className="bg-green-950 border border-green-800 rounded-2xl p-4 text-green-200 text-sm">
            {erro}
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-slate-300">
            <Keyboard className="w-5 h-5" />
            <p className="text-sm">Código manual</p>
          </div>

          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmarCodigo()
            }}
            type="text"
            placeholder="FS-COCHO-001"
            className="h-12 rounded-xl bg-slate-950 border border-slate-700 px-4 outline-none uppercase"
          />

          <button
            onClick={confirmarCodigo}
            className="h-12 rounded-xl bg-green-600 font-semibold active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <QrCode className="w-5 h-5" />
            Confirmar código
          </button>
        </div>
      </div>
    </main>
  )
}