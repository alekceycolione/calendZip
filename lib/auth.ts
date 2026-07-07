import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function getSession() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

export async function requireAuth() {
  const user = await getSession()
  if (!user) {
    redirect('/login')
  }
  return user
}

export type PerfilUsuario = {
  id: string
  nome: string
  email: string
  papel: 'admin' | 'cliente'
  cliente_id: string | null
  ativo: boolean
  created_at: string
}

export async function getProfile(): Promise<{ user: { id: string; email?: string }; profile: PerfilUsuario }> {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    redirect('/login')
  }

  return { user: { id: user.id, email: user.email }, profile: profile as unknown as PerfilUsuario }
}

export async function requireAdmin(): Promise<{ user: { id: string; email?: string }; profile: PerfilUsuario }> {
  const session = await getProfile()
  if (session.profile.papel !== 'admin' || !session.profile.ativo) {
    redirect('/cliente')
  }
  return session
}

export async function requireCliente(): Promise<{ user: { id: string; email?: string }; profile: PerfilUsuario }> {
  const session = await getProfile()
  if (session.profile.papel !== 'cliente' || !session.profile.ativo) {
    redirect('/admin')
  }
  return session
}
