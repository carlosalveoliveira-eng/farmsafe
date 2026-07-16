import type { PathOptions } from 'leaflet'

export type TipoAreaMapa =
  | 'fazenda'
  | 'retiro'
  | 'pasto'
  | 'agua'
  | 'estrutura'
  | 'restricao'
  | 'outro'

export const MAP_COLORS = {
  fazenda: '#14532d',
  retiro: '#15803d',
  pasto: '#22c55e',
  agua: '#2563eb',
  estrutura: '#334155',
  restricao: '#dc2626',
  outro: '#64748b',
  selecionado: '#0ea5e9',
  brancoFora: '#ffffff',
}

function normalizarTexto(valor: unknown) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function getProp(properties: Record<string, unknown>, nomes: string[]) {
  for (const nome of nomes) {
    const valor = properties[nome]

    if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
      return valor
    }
  }

  return null
}

export function getNomeArea(feature: any, index?: number) {
  const props = feature?.properties ?? {}

  const valor =
    getProp(props, [
      'nome',
      'name',
      'Name',
      'NOME',
      'titulo',
      'title',
      'Title',
      'description',
      'Description',
    ]) ?? `Área ${typeof index === 'number' ? index + 1 : ''}`

  return String(valor).replace(/<[^>]*>/g, '').trim()
}

export function getTipoArea(feature: any): TipoAreaMapa {
  const props = feature?.properties ?? {}

  const tipoInformado = normalizarTexto(
    getProp(props, ['tipo', 'type', 'Type', 'TIPO', 'categoria', 'Category'])
  )

  const nome = normalizarTexto(getNomeArea(feature))

  const base = `${tipoInformado} ${nome}`

  if (
    base.includes('agua') ||
    base.includes('represa') ||
    base.includes('lago') ||
    base.includes('corrego') ||
    base.includes('rio') ||
    base.includes('bebedouro')
  ) {
    return 'agua'
  }

  if (
    base.includes('sede') ||
    base.includes('curral') ||
    base.includes('barracao') ||
    base.includes('deposito') ||
    base.includes('estrutura')
  ) {
    return 'estrutura'
  }

  if (
    base.includes('restricao') ||
    base.includes('reserva') ||
    base.includes('app') ||
    base.includes('proibido') ||
    base.includes('risco')
  ) {
    return 'restricao'
  }

  if (base.includes('retiro')) {
    return 'retiro'
  }

  if (
    base.includes('fazenda') ||
    base.includes('limite') ||
    base.includes('perimetro') ||
    base.includes('perímetro')
  ) {
    return 'fazenda'
  }

  return 'pasto'
}

export function getCorArea(feature: any) {
  const tipo = getTipoArea(feature)

  return MAP_COLORS[tipo] ?? MAP_COLORS.outro
}

export function getAreaStyle(feature: any): PathOptions {
  const tipo = getTipoArea(feature)
  const cor = getCorArea(feature)

  if (tipo === 'fazenda') {
    return {
      color: MAP_COLORS.fazenda,
      weight: 3,
      opacity: 0.95,
      fillColor: MAP_COLORS.fazenda,
      fillOpacity: 0.04,
    }
  }

  if (tipo === 'retiro') {
    return {
      color: MAP_COLORS.retiro,
      weight: 2,
      opacity: 0.95,
      fillColor: MAP_COLORS.retiro,
      fillOpacity: 0.08,
    }
  }

  if (tipo === 'agua') {
    return {
      color: MAP_COLORS.agua,
      weight: 2,
      opacity: 0.95,
      fillColor: MAP_COLORS.agua,
      fillOpacity: 0.2,
    }
  }

  if (tipo === 'estrutura') {
    return {
      color: MAP_COLORS.estrutura,
      weight: 2,
      opacity: 0.95,
      fillColor: MAP_COLORS.estrutura,
      fillOpacity: 0.14,
    }
  }

  if (tipo === 'restricao') {
    return {
      color: MAP_COLORS.restricao,
      weight: 2,
      opacity: 0.95,
      fillColor: MAP_COLORS.restricao,
      fillOpacity: 0.16,
      dashArray: '6 6',
    }
  }

  return {
    color: cor,
    weight: 1.8,
    opacity: 0.95,
    fillColor: cor,
    fillOpacity: 0.12,
  }
}