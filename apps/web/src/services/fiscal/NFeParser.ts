import JSZip from 'jszip'

import type {
  AmbienteDocumentoFiscal,
  ModeloDocumentoFiscal,
  StatusDocumentoFiscal,
  StatusDocumentoFiscalItem,
  TipoDocumentoFiscal,
  TipoRegistroPagamentoFiscal,
} from '../supabase'

export type NFeDocumentoParseado = {
  tipo_documento: TipoDocumentoFiscal
  modelo: ModeloDocumentoFiscal
  ambiente: AmbienteDocumentoFiscal
  status: StatusDocumentoFiscal

  chave_acesso: string
  protocolo_autorizacao: string | null
  protocolo_status_codigo: string | null
  protocolo_status_motivo: string | null

  numero: string | null
  serie: string | null
  natureza_operacao: string | null
  finalidade: string | null

  data_emissao: string | null
  data_saida_entrada: string | null

  emitente_nome: string | null
  emitente_documento: string | null
  emitente_inscricao_estadual: string | null
  emitente_uf: string | null
  emitente_municipio: string | null

  destinatario_nome: string | null
  destinatario_documento: string | null
  destinatario_inscricao_estadual: string | null
  destinatario_uf: string | null
  destinatario_municipio: string | null

  valor_produtos: number | null
  valor_frete: number | null
  valor_seguro: number | null
  valor_desconto: number | null
  valor_outras_despesas: number | null
  valor_icms: number | null
  valor_ipi: number | null
  valor_pis: number | null
  valor_cofins: number | null
  valor_total: number | null

  xml_sha256: string

  totais_json: any | null
  transporte_json: any | null
  cobranca_json: any | null
  payload_resumo_json: any | null
}

export type NFeItemParseado = {
  numero_item: number

  codigo_produto: string | null
  ean: string | null
  descricao: string

  ncm: string | null
  cest: string | null
  cfop: string | null

  unidade_comercial: string | null
  quantidade_comercial: number | null
  valor_unitario_comercial: number | null
  valor_total_bruto: number | null

  unidade_tributavel: string | null
  quantidade_tributavel: number | null
  valor_unitario_tributavel: number | null

  valor_frete: number | null
  valor_seguro: number | null
  valor_desconto: number | null
  valor_outras_despesas: number | null

  impostos_json: any | null

  insumo_id: string | null
  fator_conversao_kg: number | null
  quantidade_convertida_kg: number | null

  status: StatusDocumentoFiscalItem

  observacao: string | null
}

export type NFePagamentoParseado = {
  tipo_registro: TipoRegistroPagamentoFiscal
  numero_parcela: string | null
  meio_pagamento: string | null
  valor: number | null
  vencimento: string | null
  payload_json: any | null
}

export type NFeParseada = {
  nomeArquivo: string
  xmlText: string
  documento: NFeDocumentoParseado
  itens: NFeItemParseado[]
  pagamentos: NFePagamentoParseado[]
}

export type NFeArquivoParseResult = {
  nomeArquivo: string
  sucesso: boolean
  nfe?: NFeParseada
  erro?: string
}

function limparDocumento(value: string | null | undefined) {
  if (!value) return null

  const digits = value.replace(/\D/g, '')

  if (digits.length !== 11 && digits.length !== 14) {
    return null
  }

  return digits
}

function parseNumero(value: string | null | undefined) {
  if (!value) return null

  const normalized = value.trim().replace(',', '.')
  const parsed = Number(normalized)

  if (!Number.isFinite(parsed)) return null

  return parsed
}

function parseTexto(value: string | null | undefined) {
  const text = value?.trim()

  return text ? text : null
}

function onlyChildren(element: Element | null | undefined) {
  if (!element) return []

  return Array.from(element.children)
}

function child(element: Element | null | undefined, localName: string) {
  if (!element) return null

  return onlyChildren(element).find((item) => item.localName === localName) ?? null
}

function children(element: Element | null | undefined, localName: string) {
  if (!element) return []

  return onlyChildren(element).filter((item) => item.localName === localName)
}

function descendants(element: Element | Document, localName: string) {
  return Array.from(element.getElementsByTagName('*')).filter(
    (item) => item.localName === localName
  )
}

function firstDescendant(element: Element | Document, localName: string) {
  return descendants(element, localName)[0] ?? null
}

function text(element: Element | null | undefined, path: string[]) {
  let current: Element | null | undefined = element

  for (const name of path) {
    current = child(current, name)

    if (!current) return null
  }

  return parseTexto(current.textContent)
}

function elementToObject(element: Element | null | undefined): any {
  if (!element) return null

  const elementChildren = onlyChildren(element)

  if (elementChildren.length === 0) {
    return parseTexto(element.textContent)
  }

  const result: Record<string, any> = {}

  for (const item of elementChildren) {
    const key = item.localName
    const value = elementToObject(item)

    if (result[key] === undefined) {
      result[key] = value
      continue
    }

    if (Array.isArray(result[key])) {
      result[key].push(value)
      continue
    }

    result[key] = [result[key], value]
  }

  return result
}

function getInfNFe(doc: Document) {
  const infNFe = firstDescendant(doc, 'infNFe')

  if (!infNFe) {
    throw new Error('XML não contém a tag infNFe.')
  }

  return infNFe
}

function getChaveAcesso(doc: Document, infNFe: Element) {
  const infProt = firstDescendant(doc, 'infProt')
  const chaveProt = text(infProt, ['chNFe'])

  if (chaveProt && /^[0-9]{44}$/.test(chaveProt)) {
    return chaveProt
  }

  const id = infNFe.getAttribute('Id') ?? ''
  const chaveId = id.replace(/^NFe/i, '')

  if (/^[0-9]{44}$/.test(chaveId)) {
    return chaveId
  }

  throw new Error('Não foi possível identificar a chave de acesso da NF-e.')
}

function getAmbiente(ide: Element | null): AmbienteDocumentoFiscal {
  const tpAmb = text(ide, ['tpAmb'])

  if (tpAmb === '1') return 'producao'
  if (tpAmb === '2') return 'homologacao'

  return 'teste_manual'
}

function getModelo(ide: Element | null): ModeloDocumentoFiscal {
  const modelo = text(ide, ['mod'])

  if (modelo && modelo !== '55') {
    throw new Error(`Modelo fiscal ${modelo} não suportado. Apenas NF-e modelo 55 é aceita.`)
  }

  return '55'
}

async function sha256Hex(textValue: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(textValue)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))

  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function parseItens(infNFe: Element): NFeItemParseado[] {
  const dets = children(infNFe, 'det')

  return dets.map((det, index) => {
    const prod = child(det, 'prod')
    const imposto = child(det, 'imposto')

    const numeroItemRaw = det.getAttribute('nItem')
    const numeroItem = numeroItemRaw ? Number(numeroItemRaw) : index + 1

    const descricao = text(prod, ['xProd'])

    if (!descricao) {
      throw new Error(`Item ${numeroItem} sem descrição do produto.`)
    }

    return {
      numero_item: numeroItem,

      codigo_produto: text(prod, ['cProd']),
      ean: text(prod, ['cEAN']),
      descricao,

      ncm: text(prod, ['NCM']),
      cest: text(prod, ['CEST']),
      cfop: text(prod, ['CFOP']),

      unidade_comercial: text(prod, ['uCom']),
      quantidade_comercial: parseNumero(text(prod, ['qCom'])),
      valor_unitario_comercial: parseNumero(text(prod, ['vUnCom'])),
      valor_total_bruto: parseNumero(text(prod, ['vProd'])),

      unidade_tributavel: text(prod, ['uTrib']),
      quantidade_tributavel: parseNumero(text(prod, ['qTrib'])),
      valor_unitario_tributavel: parseNumero(text(prod, ['vUnTrib'])),

      valor_frete: parseNumero(text(prod, ['vFrete'])),
      valor_seguro: parseNumero(text(prod, ['vSeg'])),
      valor_desconto: parseNumero(text(prod, ['vDesc'])),
      valor_outras_despesas: parseNumero(text(prod, ['vOutro'])),

      impostos_json: elementToObject(imposto),

      insumo_id: null,
      fator_conversao_kg: null,
      quantidade_convertida_kg: null,

      status: 'pendente',
      observacao: null,
    }
  })
}

function parsePagamentos(infNFe: Element): NFePagamentoParseado[] {
  const pagamentos: NFePagamentoParseado[] = []

  const pag = child(infNFe, 'pag')
  const detPags = children(pag, 'detPag')

  for (const detPag of detPags) {
    pagamentos.push({
      tipo_registro: 'pagamento',
      numero_parcela: null,
      meio_pagamento: text(detPag, ['tPag']),
      valor: parseNumero(text(detPag, ['vPag'])),
      vencimento: null,
      payload_json: elementToObject(detPag),
    })
  }

  const cobr = child(infNFe, 'cobr')
  const dups = children(cobr, 'dup')

  for (const dup of dups) {
    pagamentos.push({
      tipo_registro: 'duplicata',
      numero_parcela: text(dup, ['nDup']),
      meio_pagamento: null,
      valor: parseNumero(text(dup, ['vDup'])),
      vencimento: text(dup, ['dVenc']),
      payload_json: elementToObject(dup),
    })
  }

  return pagamentos
}

export async function parseNFeXmlText(
  xmlText: string,
  nomeArquivo = 'nfe.xml'
): Promise<NFeParseada> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')

  const parserError = doc.getElementsByTagName('parsererror')[0]

  if (parserError) {
    throw new Error('XML inválido ou malformado.')
  }

  const infNFe = getInfNFe(doc)
  const ide = child(infNFe, 'ide')
  const emit = child(infNFe, 'emit')
  const dest = child(infNFe, 'dest')
  const total = child(infNFe, 'total')
  const icmsTot = child(total, 'ICMSTot')
  const transp = child(infNFe, 'transp')
  const cobr = child(infNFe, 'cobr')
  const infProt = firstDescendant(doc, 'infProt')

  const chaveAcesso = getChaveAcesso(doc, infNFe)
  const modelo = getModelo(ide)
  const ambiente = getAmbiente(ide)
  const xmlSha256 = await sha256Hex(xmlText)

  const emitEnder = child(emit, 'enderEmit')
  const destEnder = child(dest, 'enderDest')

  const documento: NFeDocumentoParseado = {
    tipo_documento: 'nfe',
    modelo,
    ambiente,
    status: 'importada',

    chave_acesso: chaveAcesso,
    protocolo_autorizacao: text(infProt, ['nProt']),
    protocolo_status_codigo: text(infProt, ['cStat']),
    protocolo_status_motivo: text(infProt, ['xMotivo']),

    numero: text(ide, ['nNF']),
    serie: text(ide, ['serie']),
    natureza_operacao: text(ide, ['natOp']),
    finalidade: text(ide, ['finNFe']),

    data_emissao: text(ide, ['dhEmi']) ?? text(ide, ['dEmi']),
    data_saida_entrada: text(ide, ['dhSaiEnt']) ?? text(ide, ['dSaiEnt']),

    emitente_nome: text(emit, ['xNome']),
    emitente_documento:
      limparDocumento(text(emit, ['CNPJ'])) ?? limparDocumento(text(emit, ['CPF'])),
    emitente_inscricao_estadual: text(emit, ['IE']),
    emitente_uf: text(emitEnder, ['UF']),
    emitente_municipio: text(emitEnder, ['xMun']),

    destinatario_nome: text(dest, ['xNome']),
    destinatario_documento:
      limparDocumento(text(dest, ['CNPJ'])) ?? limparDocumento(text(dest, ['CPF'])),
    destinatario_inscricao_estadual: text(dest, ['IE']),
    destinatario_uf: text(destEnder, ['UF']),
    destinatario_municipio: text(destEnder, ['xMun']),

    valor_produtos: parseNumero(text(icmsTot, ['vProd'])),
    valor_frete: parseNumero(text(icmsTot, ['vFrete'])),
    valor_seguro: parseNumero(text(icmsTot, ['vSeg'])),
    valor_desconto: parseNumero(text(icmsTot, ['vDesc'])),
    valor_outras_despesas: parseNumero(text(icmsTot, ['vOutro'])),
    valor_icms: parseNumero(text(icmsTot, ['vICMS'])),
    valor_ipi: parseNumero(text(icmsTot, ['vIPI'])),
    valor_pis: parseNumero(text(icmsTot, ['vPIS'])),
    valor_cofins: parseNumero(text(icmsTot, ['vCOFINS'])),
    valor_total: parseNumero(text(icmsTot, ['vNF'])),

    xml_sha256: xmlSha256,

    totais_json: elementToObject(total),
    transporte_json: elementToObject(transp),
    cobranca_json: elementToObject(cobr),

    payload_resumo_json: {
      ide: elementToObject(ide),
      emit: {
        nome: text(emit, ['xNome']),
        documento:
          limparDocumento(text(emit, ['CNPJ'])) ??
          limparDocumento(text(emit, ['CPF'])),
        ie: text(emit, ['IE']),
        municipio: text(emitEnder, ['xMun']),
        uf: text(emitEnder, ['UF']),
      },
      dest: {
        nome: text(dest, ['xNome']),
        documento:
          limparDocumento(text(dest, ['CNPJ'])) ??
          limparDocumento(text(dest, ['CPF'])),
        ie: text(dest, ['IE']),
        municipio: text(destEnder, ['xMun']),
        uf: text(destEnder, ['UF']),
      },
      protocolo: elementToObject(infProt),
    },
  }

  const itens = parseItens(infNFe)
  const pagamentos = parsePagamentos(infNFe)

  if (itens.length === 0) {
    throw new Error('NF-e sem itens de produto.')
  }

  return {
    nomeArquivo,
    xmlText,
    documento,
    itens,
    pagamentos,
  }
}

function isZipFile(file: File) {
  return (
    file.name.toLowerCase().endsWith('.zip') ||
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed'
  )
}

function isXmlFileName(name: string) {
  return name.toLowerCase().endsWith('.xml')
}

async function parseXmlFile(file: File): Promise<NFeArquivoParseResult[]> {
  try {
    const xmlText = await file.text()
    const nfe = await parseNFeXmlText(xmlText, file.name)

    return [
      {
        nomeArquivo: file.name,
        sucesso: true,
        nfe,
      },
    ]
  } catch (error) {
    return [
      {
        nomeArquivo: file.name,
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro desconhecido ao processar XML.',
      },
    ]
  }
}

async function parseZipFile(file: File): Promise<NFeArquivoParseResult[]> {
  const zip = await JSZip.loadAsync(file)
  const results: NFeArquivoParseResult[] = []

  const entries = Object.values(zip.files).filter(
    (entry) => !entry.dir && isXmlFileName(entry.name)
  )

  if (entries.length === 0) {
    return [
      {
        nomeArquivo: file.name,
        sucesso: false,
        erro: 'ZIP não contém arquivos XML.',
      },
    ]
  }

  for (const entry of entries) {
    try {
      const xmlText = await entry.async('text')
      const nfe = await parseNFeXmlText(xmlText, entry.name)

      results.push({
        nomeArquivo: entry.name,
        sucesso: true,
        nfe,
      })
    } catch (error) {
      results.push({
        nomeArquivo: entry.name,
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro desconhecido ao processar XML do ZIP.',
      })
    }
  }

  return results
}

export async function parseNFeArquivo(
  file: File
): Promise<NFeArquivoParseResult[]> {
  if (isZipFile(file)) {
    return parseZipFile(file)
  }

  if (!isXmlFileName(file.name)) {
    return [
      {
        nomeArquivo: file.name,
        sucesso: false,
        erro: 'Arquivo não suportado. Envie XML ou ZIP com XMLs.',
      },
    ]
  }

  return parseXmlFile(file)
}