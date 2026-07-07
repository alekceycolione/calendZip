// scripts/cleanup-orphan-images.js
// Varre o bucket "postagens" e apaga arquivos cujos URLs não estão em
// nenhuma entradas.imagens do banco (imagens órfãs).
//
// Uso:
//   node scripts/cleanup-orphan-images.js           # dry-run (apenas lista)
//   node scripts/cleanup-orphan-images.js --delete  # apaga de verdade
//
// Requer .env.local com SUPABASE_SERVICE_ROLE_KEY.

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const BUCKET = 'postagens'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const args = new Set(process.argv.slice(2))
const isDryRun = !args.has('--delete')
const isYes = args.has('--yes')

async function listAllFiles(path = '', acc = []) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(path, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })

  if (error) {
    throw new Error(`Falha ao listar ${path || '/'}: ${error.message}`)
  }

  for (const item of data || []) {
    const fullPath = path ? `${path}/${item.name}` : item.name
    // item.id é null para "pastas" e uuid para arquivos
    if (item.id) {
      acc.push(fullPath)
    } else {
      await listAllFiles(fullPath, acc)
    }
  }
  return acc
}

async function getAllValidUrls() {
  const valid = new Set()
  let from = 0
  const PAGE = 1000
  // Loop com paginação para suportar qualquer volume
  // (a tabela pode ter milhares de entradas).
  while (true) {
    const { data, error } = await supabase
      .from('entradas')
      .select('imagens')
      .range(from, from + PAGE - 1)

    if (error) throw new Error(`Falha ao buscar entradas: ${error.message}`)

    for (const row of data || []) {
      const imgs = row.imagens
      if (Array.isArray(imgs)) {
        for (const url of imgs) {
          if (typeof url === 'string' && url.length > 0) valid.add(url)
        }
      }
    }

    if (!data || data.length < PAGE) break
    from += PAGE
  }
  return valid
}

function buildPublicUrl(filePath) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}

async function removeInBatches(paths) {
  const BATCH = 100
  let ok = 0
  let fail = 0
  for (let i = 0; i < paths.length; i += BATCH) {
    const slice = paths.slice(i, i + BATCH)
    const { data, error } = await supabase.storage.from(BUCKET).remove(slice)
    if (error) {
      console.error(`  ✗ Lote ${i / BATCH + 1}: ${error.message}`)
      fail += slice.length
    } else {
      const removed = (data || []).length
      ok += removed
      // O que não voltou em `data` é considerado falha
      fail += slice.length - removed
    }
  }
  return { ok, fail }
}

async function main() {
  console.log(`Bucket: ${BUCKET}`)
  console.log(`Modo: ${isDryRun ? 'DRY-RUN (apenas listar)' : 'DELETE (apagar)'}`)
  console.log('')

  console.log('Listando arquivos no Storage...')
  const files = await listAllFiles()
  console.log(`  → ${files.length} arquivo(s) encontrado(s)`)

  if (files.length === 0) {
    console.log('Nada a fazer.')
    return
  }

  console.log('Coletando URLs válidas do banco...')
  const validUrls = await getAllValidUrls()
  console.log(`  → ${validUrls.size} URL(s) referenciada(s) em public.entradas`)

  const orphanPaths = []
  for (const filePath of files) {
    const publicUrl = buildPublicUrl(filePath)
    if (!validUrls.has(publicUrl)) {
      orphanPaths.push(filePath)
    }
  }

  console.log('')
  console.log(`Órfãs detectadas: ${orphanPaths.length}`)
  for (const p of orphanPaths.slice(0, 30)) {
    console.log(`  - ${p}`)
  }
  if (orphanPaths.length > 30) {
    console.log(`  ... e mais ${orphanPaths.length - 30}`)
  }

  if (isDryRun) {
    console.log('')
    console.log('DRY-RUN: nenhum arquivo foi apagado.')
    console.log('Para apagar, rode: node scripts/cleanup-orphan-images.js --delete')
    return
  }

  if (orphanPaths.length === 0) {
    console.log('')
    console.log('Nada para apagar.')
    return
  }

  if (!isYes) {
    console.log('')
    console.log('Confirme com --yes para apagar de verdade.')
    return
  }

  console.log('')
  console.log('Apagando...')
  const { ok, fail } = await removeInBatches(orphanPaths)
  console.log(`  Apagados: ${ok} | Falhas: ${fail}`)
}

main().catch((err) => {
  console.error('ERRO:', err.message)
  process.exit(1)
})
