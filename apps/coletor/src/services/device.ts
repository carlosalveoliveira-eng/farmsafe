const DEVICE_SECRET_KEY = 'device_secret'

export function salvarDeviceSecret(secret: string) {
  localStorage.setItem(DEVICE_SECRET_KEY, secret)
}

export function obterDeviceSecret() {
  return localStorage.getItem(DEVICE_SECRET_KEY)
}

export function removerDeviceSecret() {
  localStorage.removeItem(DEVICE_SECRET_KEY)
}