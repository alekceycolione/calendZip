const COOKIE_NAME = 'adminSelectedCliente'

export function getSelectedClienteClient(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)adminSelectedCliente=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function setSelectedClienteClient(value: string): void {
  if (typeof document === 'undefined') return
  const oneYear = 60 * 60 * 24 * 365
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; path=/; SameSite=Lax; max-age=${oneYear}`
}
