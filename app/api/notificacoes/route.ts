import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  await requireAdmin()
  const supabase = await createClient()

  const { data: pendentes, error } = await supabase
    .from('notificacoes')
    .select('*, alteracoes(*, entradas(*), usuarios(*))')
    .eq('estado', 'pendente')
    .lt('tentativas', 3)
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const resultados = []

  for (const n of pendentes || []) {
    const sucesso = await enviarEmailMock(n)

    const novoEstado = sucesso ? 'enviada' : n.tentativas >= 2 ? 'falha_definitiva' : 'falha'
    const { error: updateError } = await supabase
      .from('notificacoes')
      .update({
        estado: novoEstado,
        tentativas: n.tentativas + 1,
        enviado_em: sucesso ? new Date().toISOString() : n.enviado_em,
      })
      .eq('id', n.id)

    resultados.push({ id: n.id, estado: novoEstado, erro: updateError?.message })
  }

  return NextResponse.json({ processadas: resultados.length, resultados })
}

async function enviarEmailMock(n: {
  alteracoes: {
    usuarios: { nome: string; email: string }
    entradas: { numero: number; tema: string | null }
    diff: Record<string, { de: unknown; para: unknown }>
  }
}): Promise<boolean> {
  // TODO: integrar Resend/Brevo aqui
  // const resend = new Resend({ apiKey: process.env.RESEND_API_KEY })
  console.log('[NOTIFICAÇÃO MOCK]', n.alteracoes.usuarios.email, n.alteracoes.entradas.tema)
  return process.env.NOTIFICACAO_MODO !== 'falha'
}
