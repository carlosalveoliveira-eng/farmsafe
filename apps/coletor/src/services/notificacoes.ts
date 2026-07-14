import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

let preparado = false

export async function prepararNotificacoes() {
  if (!Capacitor.isNativePlatform()) {
    return false
  }

  if (preparado) {
    return true
  }

  const permissaoAtual = await LocalNotifications.checkPermissions()

  if (permissaoAtual.display !== 'granted') {
    const solicitada = await LocalNotifications.requestPermissions()

    if (solicitada.display !== 'granted') {
      return false
    }
  }

  await LocalNotifications.createChannel({
    id: 'farmsafe-alertas',
    name: 'Alertas FarmSafe',
    description: 'Atualizações e alertas operacionais do FarmSafe Coletor',
    importance: 4,
    visibility: 1,
    lights: true,
    vibration: true,
  })

  preparado = true
  return true
}

export async function notificarAtualizacaoDisponivel(
  obrigatoria: boolean,
  versao?: string
) {
  const ok = await prepararNotificacoes()

  if (!ok) return

  await LocalNotifications.schedule({
    notifications: [
      {
        id: obrigatoria ? 1001 : 1000,
        channelId: 'farmsafe-alertas',
        title: obrigatoria
          ? 'Atualização obrigatória'
          : 'Atualização disponível',
        body: obrigatoria
          ? `Atualize o FarmSafe Coletor para continuar usando.${versao ? ` Versão ${versao}.` : ''}`
          : `Existe uma nova versão do FarmSafe Coletor.${versao ? ` Versão ${versao}.` : ''}`,
        schedule: {
          at: new Date(Date.now() + 1000),
        },
      },
    ],
  })
}

export async function notificarPendencias(total: number) {
  if (total <= 0) return

  const ok = await prepararNotificacoes()

  if (!ok) return

  await LocalNotifications.schedule({
    notifications: [
      {
        id: 2000,
        channelId: 'farmsafe-alertas',
        title: 'Registros pendentes',
        body: `${total} registro(s) ainda precisam ser sincronizados.`,
        schedule: {
          at: new Date(Date.now() + 1000),
        },
      },
    ],
  })
}