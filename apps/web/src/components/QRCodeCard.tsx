import { useRef } from 'react'
import QRCode from 'react-qr-code'
import { Box, Printer } from 'lucide-react'

import type { Cocho } from '../services/supabase'

interface Props {
  cocho: Cocho
}

function escaparHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export default function QRCodeCard({ cocho }: Props) {
  const printRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    const el = printRef.current
    if (!el) return

    const win = window.open('', '_blank', 'width=420,height=560')
    if (!win) return

    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>QR Code - ${escaparHtml(cocho.nome)}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #fff;
              color: #000;
              font-family: Arial, sans-serif;
              padding: 24px;
            }
            .label {
              width: 76mm;
              min-height: 96mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              border: 2px solid #000;
              padding: 8mm;
              page-break-inside: avoid;
            }
            .name { font-size: 18px; font-weight: 700; text-align: center; }
            .code { margin-top: 4px; font-size: 12px; font-family: monospace; color: #333; }
            .qr { margin-top: 14px; padding: 10px; border: 1px solid #000; }
            .info { margin-top: 10px; font-size: 11px; color: #444; text-align: center; }
            @media print {
              body { padding: 0; }
              .label { border-color: #000; }
            }
          </style>
        </head>
        <body>
          <section class="label">
            <div class="name">${escaparHtml(cocho.nome)}</div>
            <div class="code">${escaparHtml(cocho.codigo_qr)}</div>
            <div class="qr">${el.innerHTML}</div>
            <div class="info">
              ${escaparHtml(cocho.tipo_sal)}
              ${cocho.capacidade_kg ? ` - ${escaparHtml(cocho.capacidade_kg)} kg` : ''}
            </div>
          </section>
        </body>
      </html>
    `)

    win.document.close()
    win.focus()
    window.setTimeout(() => {
      win.print()
      win.close()
    }, 300)
  }

  return (
    <div className="fs-card qr-print-card flex flex-col gap-4 p-5 transition-colors duration-200 hover:border-green/30">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Box size={15} className="shrink-0 text-green" />
          <span className="truncate text-sm font-semibold text-ink-primary">
            {cocho.nome}
          </span>
        </div>

        <span className={`badge shrink-0 ${cocho.ativo ? 'badge-ok' : 'badge-muted'}`}>
          {cocho.ativo ? 'ativo' : 'inativo'}
        </span>
      </div>

      <div ref={printRef} className="flex items-center justify-center rounded-md bg-white p-4">
        <QRCode
          value={cocho.codigo_qr}
          size={140}
          level="M"
          style={{ display: 'block' }}
        />
      </div>

      <p className="text-center font-mono text-xs tracking-widest text-ink-muted">
        {cocho.codigo_qr}
      </p>

      <div className="flex flex-col gap-1 text-xs text-ink-muted">
        {cocho.lote && (
          <span>
            Lote: <span className="text-ink-secondary">{cocho.lote.nome}</span>
          </span>
        )}
        {cocho.retiro && (
          <span>
            Retiro:{' '}
            <span className="text-ink-secondary">{cocho.retiro.nome}</span>
          </span>
        )}
        {cocho.tipo_sal && (
          <span>
            Sal: <span className="text-ink-secondary">{cocho.tipo_sal}</span>
          </span>
        )}
        {cocho.capacidade_kg && (
          <span>
            Cap.:{' '}
            <span className="text-ink-secondary">{cocho.capacidade_kg} kg</span>
          </span>
        )}
      </div>

      <button onClick={handlePrint} className="btn-primary w-full justify-center py-2 text-xs">
        <Printer size={13} />
        Imprimir QR Code
      </button>
    </div>
  )
}
