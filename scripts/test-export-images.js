// scripts/test-export-images.js
// Testa a geração do zip chamando diretamente o Supabase (mesma lógica do
// route handler, sem precisar de dev server nem login).

const JSZip = require('jszip')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function extrairPathStorage(url) {
  try {
    const u = new URL(url)
    const match = u.pathname.match(/\/storage\/v1\/object\/public\/postagens\/(.+)$/)
    return match ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}

function sanitizarNomeArquivo(nome) {
  return (
    nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50) || 'sem-nome'
  )
}

async function main() {
  const { data: calendarios, error } = await supabaseAdmin
    .from('calendarios')
    .select('id, titulo, cliente_id, clientes(nome), entradas(id, numero, tema, imagens)')

  if (error) throw new Error(error.message)

  console.log(`Calendários encontrados: ${calendarios.length}`)

  const zip = new JSZip()
  const manifest = {}
  let totalArquivos = 0
  let totalErros = 0

  for (const cal of calendarios) {
    const clienteNome = sanitizarNomeArquivo(cal.clientes?.nome || cal.titulo || 'cliente')
    console.log(`\nProcessando: ${clienteNome} (${cal.entradas.length} entradas)`)
    const pasta = zip.folder(clienteNome)
    const entradasCal = {}

    for (const ent of cal.entradas) {
      if (!Array.isArray(ent.imagens) || ent.imagens.length === 0) continue
      const imagensValidas = ent.imagens.filter((u) => typeof u === 'string' && u.length > 0)
      if (imagensValidas.length === 0) continue

      const arquivos = []
      const temaSlug = sanitizarNomeArquivo(ent.tema || `entrada-${ent.numero}`)
      const numeroFmt = String(ent.numero).padStart(3, '0')

      for (let i = 0; i < imagensValidas.length; i++) {
        const urlOriginal = imagensValidas[i]
        const path = extrairPathStorage(urlOriginal)
        if (!path) {
          totalErros++
          continue
        }

        const { data, error: dlErr } = await supabaseAdmin.storage
          .from('postagens')
          .download(path)

        if (dlErr || !data) {
          console.error(`  ✗ #${ent.numero} [${i}] ${path}: ${dlErr?.message}`)
          totalErros++
          continue
        }

        const buffer = Buffer.from(await data.arrayBuffer())
        const ext = path.split('.').pop() || 'png'
        const fileName = `${numeroFmt}_${temaSlug}_${i + 1}.${ext}`
        pasta.file(fileName, buffer)
        arquivos.push({ fileName, originalUrl: urlOriginal, size: buffer.length })
        totalArquivos++
        console.log(`  ✓ #${ent.numero} [${i + 1}/${imagensValidas.length}] ${fileName} (${(buffer.length / 1024).toFixed(1)}KB)`)
      }

      if (arquivos.length > 0) {
        entradasCal[ent.id] = { numero: ent.numero, tema: ent.tema, arquivos }
      }
    }

    if (Object.keys(entradasCal).length > 0) manifest[clienteNome] = entradasCal
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
  const fs = require('fs')
  const out = '/tmp/calendzip-test.zip'
  fs.writeFileSync(out, zipBuffer)

  console.log(`\n=== Resultado ===`)
  console.log(`Arquivos no zip: ${totalArquivos}`)
  console.log(`Erros:           ${totalErros}`)
  console.log(`Tamanho do zip:  ${(zipBuffer.length / 1024).toFixed(1)}KB`)
  console.log(`Salvo em:        ${out}`)
}

main().catch((err) => {
  console.error('ERRO:', err.message)
  process.exit(1)
})
