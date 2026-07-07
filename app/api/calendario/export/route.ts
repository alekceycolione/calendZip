import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth'

export const dynamic = 'force-dynamic'

type EntradaRow = {
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
  imagens: string[]
}

function buildXlsx(entradas: EntradaRow[]): ArrayBuffer {
  const rows = entradas.map((e) => ({
    'Nº': e.numero,
    Data: e.data_post,
    Plataforma: e.plataforma,
    Pilar: e.pilar,
    Tema: e.tema,
    Objetivo: e.objetivo,
    Formato: e.formato,
    Gancho: e.gancho,
    'Legenda Completa': e.legenda,
    CTA: e.cta,
    Compliance: e.compliance,
    Status: e.status,
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Calendário')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
}

export async function GET() {
  const { profile } = await getProfile()
  const supabase = await createClient()

  let query = supabase.from('calendarios').select('*, entradas(*)')
  if (profile.papel === 'cliente') {
    query = query.eq('cliente_id', profile.cliente_id!).single() as typeof query
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const calendarios = Array.isArray(data) ? data : [data]
  const todasEntradas = calendarios.flatMap((c) => c.entradas || [])

  const buf = buildXlsx(todasEntradas)

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="calendario-${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  })
}

export async function POST(request: Request) {
  const { profile } = await getProfile()
  const supabase = await createClient()

  let body: { entradaIds?: string[]; calendarioId?: string }
  try {
    body = await request.json()
  } catch {
    return new NextResponse('Body inválido', { status: 400 })
  }

  const entradaIds = Array.isArray(body.entradaIds) ? body.entradaIds : []
  if (entradaIds.length === 0) {
    return new NextResponse('Selecione pelo menos uma entrada', { status: 400 })
  }

  let query = supabase
    .from('entradas')
    .select('*, calendarios!inner(cliente_id)')
    .in('id', entradaIds)

  if (profile.papel === 'cliente') {
    query = query.eq('calendarios.cliente_id', profile.cliente_id!)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return new NextResponse('Nenhuma entrada encontrada para exportar', { status: 404 })
  }

  const ordenadas = (data as Array<EntradaRow & { id: string }>).sort(
    (a, b) => a.numero - b.numero
  )
  const buf = buildXlsx(ordenadas)

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="calendario-${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  })
}

