import JSZip from 'jszip'
import { kml } from '@tmcw/togeojson'

import type { GeoJsonFeatureCollection } from '../../types/map'
import { validarGeoJsonParaMapa } from './geojson'

export const KMZ_IMPORT_LIMITS = {
  maxFileSizeBytes: 50 * 1024 * 1024,
  maxKmlTextBytes: 20 * 1024 * 1024,
  maxZipEntries: 200,
}

function fileSizeLabel(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)} MB`
}

function getFileExtension(file: File) {
  const parts = file.name.toLowerCase().split('.')

  return parts.length > 1 ? parts.at(-1) : ''
}

function assertAllowedFile(file: File) {
  const extension = getFileExtension(file)

  if (!file.size) {
    throw new Error('O arquivo selecionado esta vazio.')
  }

  if (extension !== 'kmz' && extension !== 'kml') {
    throw new Error('Arquivo invalido. Envie um arquivo .kmz ou .kml.')
  }

  if (file.size > KMZ_IMPORT_LIMITS.maxFileSizeBytes) {
    throw new Error(
      `Arquivo muito grande. O limite atual e ${fileSizeLabel(KMZ_IMPORT_LIMITS.maxFileSizeBytes)}.`
    )
  }
}

function assertKmlText(kmlText: string) {
  if (!kmlText.trim()) {
    throw new Error('O KML esta vazio.')
  }

  if (new Blob([kmlText]).size > KMZ_IMPORT_LIMITS.maxKmlTextBytes) {
    throw new Error(
      `O KML descompactado ficou muito grande. O limite atual e ${fileSizeLabel(KMZ_IMPORT_LIMITS.maxKmlTextBytes)}.`
    )
  }
}

async function extractKmlFromKmz(file: File): Promise<string> {
  let zip: JSZip

  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    throw new Error('KMZ invalido ou corrompido.')
  }

  const entries = Object.values(zip.files)

  if (entries.length > KMZ_IMPORT_LIMITS.maxZipEntries) {
    throw new Error(
      `O KMZ possui muitos arquivos internos. O limite atual e ${KMZ_IMPORT_LIMITS.maxZipEntries}.`
    )
  }

  const kmlEntries = entries.filter(
    (entry) => !entry.dir && entry.name.toLowerCase().endsWith('.kml')
  )

  if (kmlEntries.length === 0) {
    throw new Error('Nenhum arquivo .kml foi encontrado dentro do KMZ.')
  }

  const mainKml =
    kmlEntries.find((entry) => entry.name.toLowerCase() === 'doc.kml') ??
    kmlEntries[0]

  const kmlText = await mainKml.async('text')

  assertKmlText(kmlText)

  return kmlText
}

async function readKmlText(file: File): Promise<string> {
  if (getFileExtension(file) === 'kml') {
    const text = await file.text()

    assertKmlText(text)

    return text
  }

  return extractKmlFromKmz(file)
}

export async function importKmlOrKmzToGeoJson(
  file: File
): Promise<GeoJsonFeatureCollection> {
  assertAllowedFile(file)

  const kmlText = await readKmlText(file)
  const xml = new DOMParser().parseFromString(kmlText, 'text/xml')
  const parserError = xml.querySelector('parsererror')

  if (parserError) {
    throw new Error('O KML esta malformado e nao pode ser lido.')
  }

  const converted = kml(xml)

  return validarGeoJsonParaMapa(converted)
}
