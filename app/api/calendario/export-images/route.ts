import JSZip from 'jszip'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth'
import { extrairPathStorage, sanitizarNomeArquivo } from '@/lib/utils-storage'

export const dynamic = 'force-dynamic'

type EntradaBasica = {
  id: string
  numero: number
  tema: string | null
  imagens: unknown
}

type CalendarioBasico = {
  id: string
  titulo: string
  cliente_id: string
  clientes: { nome: string } | null
  entradas: EntradaBasica[] | null
}

type ArquivoEntrada = { fileName: string; originalUrl: string }

export async function GET(request: Request) {
  const { profile } = await getProfile()
  const url = new URL(request.url)
  const calendarioIdParam = url.searchParams.get('calendarioId')

  const supabase = await createClient()

  let calendarios: CalendarioBasico[] = []

  if (profile.papel === 'cliente') {
    const { data, error } = await supabase
      .from('calendarios')
      .select('id, titulo, cliente_id, clientes(nome), entradas(id, numero, tema, imagens)')
      .eq('cliente_id', profile.cliente_id!)
      .single()

    if (error || !data) {
      return new Response('Calendário não encontrado', { status: 404 })
    }
    calendarios = [data as unknown as CalendarioBasico]
  } else {
    const query = supabase
      .from('calendarios')
      .select('id, titulo, cliente_id, clientes(nome), entradas(id, numero, tema, imagens)')

    if (calendarioIdParam) {
      const { data, error } = await query.eq('id', calendarioIdParam).single()
      if (error || !data) {
        return new Response('Calendário não encontrado', { status: 404 })
      }
      calendarios = [data as unknown as CalendarioBasico]
    } else {
      const { data, error } = await query
      if (error) {
        return new Response(`Erro ao buscar calendários: ${error.message}`, { status: 500 })
      }
      calendarios = (data || []) as unknown as CalendarioBasico[]
    }
  }

  return await gerarZip(calendarios)
}

export async function POST(request: Request) {
  const { profile } = await getProfile()
  const supabase = await createClient()

  let body: { urls?: string[] }
  try {
    body = await request.json()
  } catch {
    return new Response('Body inválido', { status: 400 })
  }

  const urls = Array.isArray(body.urls) ? body.urls : []
  if (urls.length === 0) {
    return new Response('Selecione pelo menos uma imagem', { status: 400 })
  }

  const urlsValidas = urls.filter((u): u is string => typeof u === 'string' && u.length > 0)
  if (urlsValidas.length === 0) {
    return new Response('URLs inválidas', { status: 400 })
  }

  if (profile.papel === 'cliente') {
    // Cliente só pode exportar URLs do próprio calendário
    const { data: entradas, error } = await supabase
      .from('entradas')
      .select('imagens, calendarios!inner(cliente_id)')
      .eq('calendarios.cliente_id', profile.cliente_id!)

    if (error) {
      return new Response(`Erro de autorização: ${error.message}`, { status: 500 })
    }

    const permitidas = new Set<string>()
    for (const e of entradas || []) {
      if (Array.isArray(e.imagens)) {
        for (const u of e.imagens) {
          if (typeof u === 'string') permitidas.add(u)
        }
      }
    }

    const naoAutorizadas = urlsValidas.filter((u) => !permitidas.has(u))
    if (naoAutorizadas.length > 0) {
      return new Response('Você não tem permissão para exportar essas imagens', {
        status: 403,
      })
    }
  }

  // Converte URLs em "calendarios" virtuais para reusar gerarZip()
  const calNomeFake = profile.papel === 'cliente' ? 'meu-calendario' : 'selecionadas'
  const calVirtual: CalendarioBasico = {
    id: 'selecionadas',
    titulo: 'Exportação seletiva',
    cliente_id: profile.cliente_id ?? 'selecionadas',
    clientes: { nome: calNomeFake },
    entradas: urlsValidas.map((url, i) => ({
      id: `url-${i}`,
      numero: i + 1,
      tema: null,
      imagens: [url],
    })),
  }

  return await gerarZip([calVirtual])
}

async function gerarZip(calendarios: CalendarioBasico[]): Promise<Response> {
  const zip = new JSZip()
  const supabaseAdmin = await createAdminClient()

  const manifest: Record<string, Record<string, { numero: number; tema: string | null; arquivos: ArquivoEntrada[] }>> = {}
  let totalArquivos = 0
  let totalErros = 0

  for (const cal of calendarios) {
    const clienteNome = sanitizarNomeArquivo(cal.clientes?.nome || cal.titulo || 'cliente')
    const pasta = zip.folder(clienteNome)
    if (!pasta) continue

    const entradasCal: Record<string, { numero: number; tema: string | null; arquivos: ArquivoEntrada[] }> = {}

    for (const ent of cal.entradas || []) {
      if (!Array.isArray(ent.imagens)) continue
      const imagensValidas = ent.imagens.filter(
        (u): u is string => typeof u === 'string' && u.length > 0
      )
      if (imagensValidas.length === 0) continue

      const arquivosEntrada: ArquivoEntrada[] = []
      const temaSlug = sanitizarNomeArquivo(ent.tema || `entrada-${ent.numero}`)
      const numeroFmt = String(ent.numero).padStart(3, '0')

      for (let i = 0; i < imagensValidas.length; i++) {
        const urlOriginal = imagensValidas[i]
        const path = extrairPathStorage(urlOriginal)
        if (!path) {
          totalErros++
          continue
        }

        const { data, error } = await supabaseAdmin.storage
          .from('postagens')
          .download(path)

        if (error || !data) {
          console.error(`[export-images] Falha ao baixar ${path}: ${error?.message}`)
          totalErros++
          continue
        }

        const buffer = Buffer.from(await data.arrayBuffer())
        const ext = path.split('.').pop() || 'png'
        const fileName = `${numeroFmt}_${temaSlug}_${i + 1}.${ext}`

        pasta.file(fileName, buffer)
        arquivosEntrada.push({ fileName, originalUrl: urlOriginal })
        totalArquivos++
      }

      if (arquivosEntrada.length > 0) {
        entradasCal[ent.id] = {
          numero: ent.numero,
          tema: ent.tema,
          arquivos: arquivosEntrada,
        }
      }
    }

    if (Object.keys(entradasCal).length > 0) {
      manifest[clienteNome] = entradasCal
    }
  }

  if (totalArquivos === 0) {
    return new Response('Nenhuma imagem encontrada para exportar', { status: 404 })
  }

  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        geradoEm: new Date().toISOString(),
        totais: { arquivos: totalArquivos, erros: totalErros },
        clientes: manifest,
      },
      null,
      2
    )
  )

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

  return new Response(new Uint8Array(zipBuffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="calendzip-imagens-${new Date().toISOString().split('T')[0]}.zip"`,
    },
  })
}
