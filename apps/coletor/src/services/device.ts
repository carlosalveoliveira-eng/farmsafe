const DEVICE_SECRET_KEY = 'farmsafe_device_secret'

export function salvarDeviceSecret(deviceSecret: string) {
  localStorage.setItem(DEVICE_SECRET_KEY, deviceSecret)
}

export function obterDeviceSecret() {
  return localStorage.getItem(DEVICE_SECRET_KEY)
}

export function limparDeviceSecret() {
  localStorage.removeItem(DEVICE_SECRET_KEY)
}

export function removerDeviceSecret() {
  localStorage.removeItem('device_secret')
}