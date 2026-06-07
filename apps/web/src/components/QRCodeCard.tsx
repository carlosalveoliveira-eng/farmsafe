import { useRef } from 'react'
import QRCode from 'react-qr-code'
import { Printer, Box } from 'lucide-react'
import type { Cocho } from '@/services/supabase'

interface Props {
  cocho: Cocho
}

export default function QRCodeCard({ cocho }: Props) {
  const printRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    const el = printRef.current
    if (!el) return

    const win = window.open('', '_blank', 'width=400,height=500')
    if (!win) return

    win.document.write(`
      <!doctype html><html><head>
        <title>QR Code — ${cocho.nome}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; min-height: 100vh;
            font-family: 'Courier New', monospace; background: #fff; color: #000;
            padding: 24px;
          }
          .label { font-size: 18px; font-weight: bold; margin-bottom: 4px; text-align: center; }
          .code  { font-size: 13px; color: #555; margin-bottom: 16px; text-align: center; }
          .qr    { padding: 12px; border: 2px solid #000; }
          .info  { margin-top: 12px; font-size: 11px; color: #777; text-align: center; }
        </style>
      </head><body>
        <div class="label">${cocho.nome}</div>
        <div class="code">${cocho.codigo_qr}</div>
        <div class="qr">${el.innerHTML}</div>
        <div class="info">
          ${cocho.tipo_sal ?? ''} ${cocho.capacidade_kg ? `· ${cocho.capacidade_kg} kg` : ''}
        </div>
      </body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  return (
    <div className="fs-card p-5 flex flex-col gap-4 hover:border-green/30 transition-colors duration-200">

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Box size={15} className="text-green shrink-0" />
          <span className="text-sm font-semibold text-ink-primary truncate">{cocho.nome}</span>
        </div>
        <span className={`badge shrink-0 ${cocho.ativo ? 'badge-ok' : 'badge-muted'}`}>
          {cocho.ativo ? 'ativo' : 'inativo'}
        </span>
      </div>

      {/* QR Code */}
      <div
        ref={printRef}
        className="flex items-center justify-center bg-white rounded-md p-4"
      >
        <QRCode
          value={cocho.codigo_qr}
          size={140}
          level="M"
          style={{ display: 'block' }}
        />
      </div>

      {/* Código */}
      <p className="text-center font-mono text-xs text-ink-muted tracking-widest">
        {cocho.codigo_qr}
      </p>

      {/* Metadados */}
      <div className="flex flex-col gap-1 text-xs text-ink-muted">
        {cocho.lote   && <span>Lote: <span className="text-ink-secondary">{cocho.lote.nome}</span></span>}
        {cocho.retiro && <span>Retiro: <span className="text-ink-secondary">{cocho.retiro.nome}</span></span>}
        {cocho.tipo_sal && <span>Sal: <span className="text-ink-secondary">{cocho.tipo_sal}</span></span>}
        {cocho.capacidade_kg && (
          <span>Cap.: <span className="text-ink-secondary">{cocho.capacidade_kg} kg</span></span>
        )}
      </div>

      {/* Botão imprimir */}
      <button onClick={handlePrint} className="btn-primary w-full justify-center text-xs py-2">
        <Printer size={13} />
        Imprimir QR Code
      </button>
    </div>
  )
}
