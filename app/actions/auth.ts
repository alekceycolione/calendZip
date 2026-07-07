'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function login(prevState: unknown, formData: FormData) {
  const supabase = await createClient()

  const email = String(formData.get('email') || '')
  const password = String(formData.get('password') || '')

  if (!email || !password) {
    return { error: 'Preencha e-mail e senha.' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('[LOGIN ERROR]', error.message, error.status)
    return { error: `Erro: ${error.message} (código ${error.status})` }
  }

  revalidatePath('/', 'layout')

  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log('[LOGIN] user after signin:', user?.id, user?.email)

  if (!user) {
    console.error('[LOGIN] No user returned after signin')
    return { error: 'Não foi possível obter a sessão.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('usuarios')
    .select('papel, ativo')
    .eq('id', user.id)
    .single()

  console.log('[LOGIN] profile:', profile, 'error:', profileError)

  redirect(profile?.papel === 'admin' ? '/admin' : '/cliente')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function resetPassword(prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const email = String(formData.get('email') || '')

  if (!email) {
    return { error: 'Informe o e-mail.' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback?next=/atualizar-senha`,
  })

  if (error) {
    console.error('[RESET PASSWORD ERROR]', error)
    return { error: 'Não foi possível enviar o e-mail de redefinição: ' + error.message }
  }

  return { success: true, message: 'E-mail de redefinição enviado.' }
}
