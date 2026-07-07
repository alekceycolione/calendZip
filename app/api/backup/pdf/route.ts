import { NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { BackupDocument } from '@/components/pdf/backup-document'
import { nomeArquivoBackup } from '@/lib/utils-backup'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type EntradaCompleta = {
  id: string
  numero: number
  data_post: string
  plataforma: string | null
  pilar: string | null
  tema: string | null
  objetivo: string | null
  formato: string | null
  gancho: string | null
  legenda: string | null
  cta: string | null
  compliance: string | null
  status: string
  imagens: string[] | null
  created_at: string
  updated_at: string
}

type AlteracaoCompleta = {
  id: string
  entrada_id: string
  diff: Record<string, { de: unknown; para: unknown }>
  criado_em: string
  usuarios: { nome: string; email: string } | null
}

function isValidDate(s: unknown): s is string {
  if (typeof s !== 'string') return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00`)
  return !Number.isNaN(d.getTime())
}

export async function POST(req: NextRequest) {
  const { profile } = await requireAdmin()
  const supabase = await createClient()

  let body: { clienteId?: string; inicio?: string; fim?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { clienteId, inicio, fim } = body
  if (!clienteId || typeof clienteId !== 'string') {
    return Response.json({ error: 'clienteId é obrigatório' }, { status: 400 })
  }
  if (!isValidDate(inicio) || !isValidDate(fim)) {
    return Response.json({ error: 'Datas inválidas. Use YYYY-MM-DD.' }, { status: 400 })
  }
  if (fim < inicio) {
    return Response.json({ error: 'Data fim deve ser maior ou igual a data início.' }, { status: 400 })
  }

  const { data: cliente, error: clienteErr } = await supabase
    .from('clientes')
    .select('id, nome, calendarios(id, titulo)')
    .eq('id', clienteId)
    .single()

  if (clienteErr || !cliente) {
    return Response.json({ error: 'Cliente não encontrado' }, { status: 404 })
  }

  const calendarios = (cliente.calendarios as unknown as { id: string; titulo: string }[] | null) ?? []
  const calendario = calendarios[0]
  if (!calendario) {
    return Response.json({ error: 'Cliente não tem calendário cadastrado' }, { status: 400 })
  }

  const { data: entradas, error: entradasErr } = await supabase
    .from('entradas')
    .select('id, numero, data_post, plataforma, pilar, tema, objetivo, formato, gancho, legenda, cta, compliance, status, imagens, created_at, updated_at')
    .eq('calendario_id', calendario.id)
    .gte('data_post', inicio)
    .lte('data_post', fim)
    .order('numero', { ascending: true })

  if (entradasErr) {
    return Response.json({ error: 'Erro ao buscar entradas: ' + entradasErr.message }, { status: 500 })
  }

  const entradasList = (entradas || []) as unknown as EntradaCompleta[]
  const entradaIds = entradasList.map((e) => e.id)

  let alteracoesList: AlteracaoCompleta[] = []
  if (entradaIds.length > 0) {
    const { data: alteracoes, error: altErr } = await supabase
      .from('alteracoes')
      .select('id, entrada_id, diff, criado_em, usuarios(nome, email)')
      .in('entrada_id', entradaIds)
      .order('criado_em', { ascending: true })

    if (altErr) {
      return Response.json({ error: 'Erro ao buscar alterações: ' + altErr.message }, { status: 500 })
    }
    alteracoesList = (alteracoes || []) as unknown as AlteracaoCompleta[]
  }

  let buffer: Buffer
  try {
    buffer = await renderToBuffer(
      BackupDocument({
        clienteNome: cliente.nome,
        calendarioTitulo: calendario.titulo,
        periodoInicio: inicio,
        periodoFim: fim,
        geradoEm: new Date().toISOString(),
        geradoPor: profile.email || profile.nome,
        entradas: entradasList,
        alteracoes: alteracoesList,
      })
    )
  } catch (err) {
    return Response.json(
      { error: 'Erro ao gerar PDF: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    )
  }

  if (entradaIds.length > 0) {
    const { error: delAltErr } = await supabase
      .from('alteracoes')
      .delete()
      .in('entrada_id', entradaIds)

    if (delAltErr) {
      return Response.json(
        { error: 'PDF gerado, mas falhou ao remover alterações: ' + delAltErr.message },
        { status: 500 }
      )
    }

    const { error: delEntradasErr } = await supabase
      .from('entradas')
      .delete()
      .in('id', entradaIds)

    if (delEntradasErr) {
      return Response.json(
        { error: 'PDF gerado, mas falhou ao remover entradas: ' + delEntradasErr.message },
        { status: 500 }
      )
    }
  }

  const filename = nomeArquivoBackup(cliente.nome, inicio, fim)
  const filenameEncoded = encodeURIComponent(filename)
  const stats = JSON.stringify({
    entradasRemovidas: entradasList.length,
    alteracoesRemovidas: alteracoesList.length,
  })

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(buffer.length),
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${filenameEncoded}`,
      'X-Backup-Stats': stats,
      'Cache-Control': 'no-store',
    },
  })
}
