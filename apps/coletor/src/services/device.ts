const DEVICE_SECRET_KEY = 'device_secret'

type DeviceSecretStorage = {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}

function localStorageDisponivel() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

const storageLocal: DeviceSecretStorage = {
  async get(key) {
    if (!localStorageDisponivel()) return null

    return window.localStorage.getItem(key)
  },

  async set(key, value) {
    if (!localStorageDisponivel()) return

    window.localStorage.setItem(key, value)
  },

  async remove(key) {
    if (!localStorageDisponivel()) return

    window.localStorage.removeItem(key)
  },
}

const storageLegado = storageLocal
let storageSeguro: DeviceSecretStorage = storageLocal

export function configurarDeviceSecretStorage(storage: DeviceSecretStorage) {
  storageSeguro = storage
}

async function migrarSecretLegadoParaStorageSeguro() {
  if (storageSeguro === storageLegado) return null

  const secretAtual = await storageSeguro.get(DEVICE_SECRET_KEY)

  if (secretAtual) return secretAtual

  const secretLegado = await storageLegado.get(DEVICE_SECRET_KEY)

  if (!secretLegado) return null

  await storageSeguro.set(DEVICE_SECRET_KEY, secretLegado)
  await storageLegado.remove(DEVICE_SECRET_KEY)

  return secretLegado
}

export async function salvarDeviceSecret(secret: string) {
  await storageSeguro.set(DEVICE_SECRET_KEY, secret)

  if (storageSeguro !== storageLegado) {
    await storageLegado.remove(DEVICE_SECRET_KEY)
  }
}

export async function obterDeviceSecret() {
  const secret = await storageSeguro.get(DEVICE_SECRET_KEY)

  return secret ?? migrarSecretLegadoParaStorageSeguro()
}

export async function removerDeviceSecret() {
  await storageSeguro.remove(DEVICE_SECRET_KEY)

  if (storageSeguro !== storageLegado) {
    await storageLegado.remove(DEVICE_SECRET_KEY)
  }
}
