import { UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'

import { uploadMapaDaFazenda } from '../../services/map/maps'
import type { FarmMap, GeoJsonFeatureCollection } from '../../types/map'

type Props = {
  empresaId: string
  fazendaId: string
  variant?: 'full' | 'compact'
  buttonLabel?: string
  onUploaded: (payload: {
    map: FarmMap
    geojson: GeoJsonFeatureCollection
  }) => void
}

export default function MapUploader({
  empresaId,
  fazendaId,
  variant = 'full',
  buttonLabel = 'Selecionar KMZ/KML',
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setErrorMessage(null)

    try {
      const result = await uploadMapaDaFazenda({
        empresaId,
        fazendaId,
        file,
      })

      onUploaded(result)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel importar o mapa.'

      setErrorMessage(message)
    } finally {
      setUploading(false)

      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept=".kmz,.kml"
      disabled={uploading}
      className={variant === 'compact' ? 'hidden' : 'mt-4 text-sm'}
      onChange={(event) => {
        const file = event.target.files?.[0]

        if (file) {
          void handleFile(file)
        }
      }}
    />
  )

  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        {input}

        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="btn-ghost w-full justify-center"
        >
          <UploadCloud size={14} />
          {uploading ? 'Enviando...' : buttonLabel}
        </button>

        {errorMessage && (
          <p className="text-xs font-medium text-red">{errorMessage}</p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-green/10 text-green">
        <UploadCloud size={22} />
      </div>

      <h2 className="mt-4 text-lg font-bold text-ink-primary">
        Seu mapa ainda nao foi configurado
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
        Importe um arquivo KMZ ou KML da fazenda para comecar a operar pastos,
        retiros, currais e outras areas no mapa.
      </p>

      {input}

      {uploading && (
        <p className="mt-3 text-sm font-medium text-green">
          Importando e processando mapa...
        </p>
      )}

      {errorMessage && (
        <p className="mt-3 text-sm font-medium text-red">{errorMessage}</p>
      )}
    </div>
  )
}
