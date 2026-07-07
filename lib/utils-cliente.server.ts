import 'server-only'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'adminSelectedCliente'

export async function getSelectedClienteServer(): Promise<string | null> {
  try {
    const c = await cookies()
    return c.get(COOKIE_NAME)?.value ?? null
  } catch {
    return null
  }
}
