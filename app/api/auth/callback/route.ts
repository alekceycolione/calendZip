import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Código trocado com sucesso. Os cookies de sessão foram definidos no cliente.
      // Redireciona o usuário para a página de atualização de senha (/atualizar-senha)
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error('[CALLBACK EXCHANGE ERROR]', error.message)
    }
  }

  // Em caso de falha, retorna ao login com erro de sessão
  return NextResponse.redirect(`${origin}/login?erro=sessao`)
}
