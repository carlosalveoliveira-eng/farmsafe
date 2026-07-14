import { db } from '../database/db'
import { obterDeviceSecret } from './device'
import { supabase } from './supabase'

type SyncResponse = {
  ok: boolean
  status?: 'sincronizado' | 'sincronizado_com_alerta' | 'duplicado' | 'erro'
  codigo?: string
  mensagem?: string
  erro?: string

  abastecimento_id?: string
  sincronizado_em?: string
  saldo_antes_kg?: number | null
  saldo_depois_kg?: number | null
  estoque_status?: string | null
  mensagem_validacao?: string | null
}

const CODIGOS_BLOQUEIO_DISPOSITIVO = new Set([
  'DEVICE_SECRET_OBRIGATORIO',
  'DISPOSITIVO_INVALIDO',
  'DISPOSITIVO_SEM_EMPRESA',
])

function isErroAutorizacaoDispositivo(codigo?: string, mensagem?: string) {
  const codigoNormalizado = codigo?.trim().toUpperCase()

  if (codigoNormalizado && CODIGOS_BLOQUEIO_DISPOSITIVO.has(codigoNormalizado)) {
    return true
  }

  const texto = (mensagem ?? '').toLowerCase()

  return (
    texto.includes('dispositivo não autorizado') ||
    texto.includes('dispositivo nao autorizado') ||
    texto.includes('dispositivo desativado') ||
    texto.includes('device secret') ||
    texto.includes('device_secret')
  )
}

function traduzirMensagemErro(resposta: SyncResponse) {
  const codigo = resposta.codigo?.trim().toUpperCase()
  const mensagem =
    resposta.mensagem ??
    resposta.erro ??
    resposta.mensagem_validacao ??
    'Erro desconhecido.'

  switch (codigo) {
    case 'COCHO_INVALIDO':
      return 'Cocho não autorizado, desativado ou fora da fazenda deste celular. Atualize os dados do coletor ou fale com a gestão.'

    case 'INSUMO_INVALIDO':
      return 'Insumo não autorizado ou desativado. Atualize os dados do coletor ou fale com a gestão.'

    case 'DISPOSITIVO_INVALIDO':
      return 'Este celular não está autorizado ou foi desativado pela gestão.'

    case 'DISPOSITIVO_SEM_EMPRESA':
      return 'Este celular está sem empresa vinculada. Fale com a gestão.'

    case 'QUANTIDADE_INVALIDA':
      return 'A quantidade precisa ser maior que zero.'

    case 'QUANTIDADE_EXCESSIVA':
      return 'Quantidade muito alta. Confira o valor informado.'

    case 'QR_OBRIGATORIO':
      return 'Registro sem QR Code do cocho.'

    case 'INSUMO_OBRIGATORIO':
      return 'Registro sem insumo informado.'

    default:
      return mensagem
  }
}

export async function sincronizarRegistros() {
  const deviceSecret = obterDeviceSecret()

  if (!deviceSecret) {
    throw new Error('Dispositivo não configurado.')
  }

  const registros = await db.abastecimentos.toArray()

  const pendentes = registros.filter(
    (registro) => registro.sincronizado === false
  )

  let enviados = 0
  let falhas = 0
  let alertas = 0
  let duplicados = 0
  let bloqueadoPorAutorizacao = false

  for (const registro of pendentes) {
    if (!registro.id) continue

    const codigoQr = registro.codigo_qr ?? registro.cocho_id ?? null

    if (!codigoQr) {
      await db.abastecimentos.update(registro.id, {
        status_sync: 'erro',
        erro_sync: 'Registro sem QR Code do cocho.',
        tentativas_sync: (registro.tentativas_sync ?? 0) + 1,
      })

      falhas++
      continue
    }

    if (!registro.insumo_id) {
      await db.abastecimentos.update(registro.id, {
        status_sync: 'erro',
        erro_sync:
          'Registro antigo ou incompleto. Refaça o lançamento selecionando um insumo.',
        tentativas_sync: (registro.tentativas_sync ?? 0) + 1,
      })

      falhas++
      continue
    }

    try {
      await db.abastecimentos.update(registro.id, {
        status_sync: 'sincronizando',
        erro_sync: null,
      })

      const { data, error } = await supabase.rpc(
        'registrar_abastecimento_coletor',
        {
          p_device_secret: deviceSecret,
          p_client_uuid: registro.client_uuid,
          p_codigo_qr: codigoQr,
          p_insumo_id: registro.insumo_id,
          p_quantidade_kg: registro.quantidade_kg ?? null,
          p_observacao: registro.observacao ?? null,
          p_status_cocho: registro.status_cocho ?? 'nao_informado',
          p_leitura_cocho: registro.leitura_cocho ?? null,
          p_latitude: registro.latitude ?? null,
          p_longitude: registro.longitude ?? null,
          p_gps_accuracy: registro.gps_accuracy ?? null,
          p_registrado_em: registro.registrado_em,
        }
      )

      if (error) {
        const mensagem = error.message

        await db.abastecimentos.update(registro.id, {
          status_sync: 'erro',
          erro_sync: mensagem,
          tentativas_sync: (registro.tentativas_sync ?? 0) + 1,
        })

        falhas++

        if (isErroAutorizacaoDispositivo(undefined, mensagem)) {
          bloqueadoPorAutorizacao = true
          break
        }

        continue
      }

      const resposta = data as SyncResponse

      if (!resposta?.ok) {
        const mensagem = traduzirMensagemErro(resposta)

        await db.abastecimentos.update(registro.id, {
          status_sync: 'erro',
          erro_sync: mensagem,
          tentativas_sync: (registro.tentativas_sync ?? 0) + 1,
        })

        falhas++

        if (isErroAutorizacaoDispositivo(resposta.codigo, mensagem)) {
          bloqueadoPorAutorizacao = true
          break
        }

        continue
      }

      const status =
        resposta.status === 'sincronizado_com_alerta'
          ? 'sincronizado_com_alerta'
          : resposta.status === 'duplicado'
          ? 'duplicado'
          : 'sincronizado'

      await db.abastecimentos.update(registro.id, {
        sincronizado: true,
        status_sync: status,
        erro_sync: null,
        abastecimento_id: resposta.abastecimento_id ?? null,
        sincronizado_em: resposta.sincronizado_em ?? new Date().toISOString(),
        saldo_antes_kg: resposta.saldo_antes_kg ?? null,
        saldo_depois_kg: resposta.saldo_depois_kg ?? null,
        estoque_status: resposta.estoque_status ?? null,
        mensagem_validacao:
          resposta.mensagem_validacao ?? resposta.mensagem ?? null,
      })

      if (status === 'duplicado') {
        duplicados++
      } else if (status === 'sincronizado_com_alerta') {
        alertas++
        enviados++
      } else {
        enviados++
      }
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro inesperado.'

      await db.abastecimentos.update(registro.id, {
        status_sync: 'erro',
        erro_sync: mensagem,
        tentativas_sync: (registro.tentativas_sync ?? 0) + 1,
      })

      falhas++

      if (isErroAutorizacaoDispositivo(undefined, mensagem)) {
        bloqueadoPorAutorizacao = true
        break
      }
    }
  }

  if (bloqueadoPorAutorizacao) {
    alert(
      'Este celular não está autorizado ou foi desativado pela gestão. Os registros pendentes foram mantidos no aparelho.'
    )
  }

  return {
    enviados,
    falhas,
    alertas,
    duplicados,
    total: pendentes.length,
    bloqueadoPorAutorizacao,
  }
}

export async function limparFilaLocal() {
  await db.abastecimentos.clear()
}