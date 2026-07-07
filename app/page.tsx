import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'

export default async function Home() {
  let destino = '/login'
  try {
    const { profile } = await getProfile()
    destino = profile.papel === 'admin' ? '/admin' : '/cliente'
  } catch {
    destino = '/login'
  }
  redirect(destino)
}
