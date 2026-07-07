// Script de debug: consulta o formato real do campo imagens no Supabase
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  // Busca calendários com suas entradas (todos, sem limite)
  const { data: calendarios, error } = await supabase
    .from('calendarios')
    .select('id, titulo, cliente_id, entradas(id, numero, tema, imagens)')

  if (error) {
    console.error('ERRO:', error)
    return
  }

  let totalEntradas = 0
  let entradasComImagens = 0
  let totalImagensArmazenadas = 0

  console.log('--- RESUMO POR CALENDÁRIO ---')
  for (const cal of calendarios || []) {
    const comImg = (cal.entradas || []).filter(e => Array.isArray(e.imagens) && e.imagens.length > 0)
    entradasComImagens += comImg.length
    totalEntradas += (cal.entradas || []).length
    totalImagensArmazenadas += comImg.reduce((acc, e) => acc + e.imagens.length, 0)
    console.log(`${cal.titulo}: ${(cal.entradas||[]).length} entradas, ${comImg.length} com imagens`)
  }
  console.log('---')
  console.log('TOTAL entradas:', totalEntradas)
  console.log('TOTAL com imagens:', entradasComImagens)
  console.log('TOTAL urls armazenadas:', totalImagensArmazenadas)

  // Agora detalhe apenas das que têm imagens
  if (entradasComImagens > 0) {
    console.log('\n--- DETALHE DAS ENTRADAS COM IMAGENS ---')
    for (const cal of calendarios || []) {
      for (const ent of cal.entradas || []) {
        if (Array.isArray(ent.imagens) && ent.imagens.length > 0) {
          console.log(`\n#${ent.numero} - ${ent.tema} (cal: ${cal.titulo})`)
          console.log('  type:', typeof ent.imagens, 'isArray:', Array.isArray(ent.imagens))
          console.log('  raw:', JSON.stringify(ent.imagens))
          ent.imagens.forEach((url, i) => {
            console.log(`  [${i}]:`, url.substring(0, 100))
            console.log(`       starts http:`, url.startsWith('http'), 'isString:', typeof url === 'string')
          })
        }
      }
    }
  } else {
    console.log('\nNenhuma entrada tem imagens armazenadas no DB.')
    console.log('Verificando arquivos no Storage...')

    // Lista arquivos no bucket postagens
    const { data: files, error: storageError } = await supabase.storage
      .from('postagens')
      .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })

    if (storageError) {
      console.log('Erro storage:', storageError.message)
    } else {
      console.log('Arquivos no bucket postagens:', (files||[]).length)
      for (const f of (files||[]).slice(0, 20)) {
        console.log(`  - ${f.name} (${f.metadata?.size || '?'} bytes)`)
      }
    }
  }
  return

  for (const cal of calendarios || []) {
    console.log('\n=== Calendário:', cal.titulo, '===')
    for (const ent of cal.entradas || []) {
      console.log(`\nEntrada #${ent.numero} - ${ent.tema}`)
      console.log('  imagens typeof:', typeof ent.imagens)
      console.log('  imagens isArray:', Array.isArray(ent.imagens))
      console.log('  imagens isNull:', ent.imagens === null)
      console.log('  imagens value (raw):', JSON.stringify(ent.imagens))
      console.log('  imagens length:', Array.isArray(ent.imagens) ? ent.imagens.length : 'N/A')
      if (Array.isArray(ent.imagens) && ent.imagens.length > 0) {
        console.log('  imagens[0]:', ent.imagens[0])
      }
    }
  }

  if (error) {
    console.error('ERRO:', error)
    return
  }

  for (const cal of calendarios || []) {
    console.log('\n=== Calendário:', cal.titulo, '===')
    for (const ent of cal.entradas || []) {
      console.log(`\nEntrada #${ent.numero} - ${ent.tema}`)
      console.log('  imagens typeof:', typeof ent.imagens)
      console.log('  imagens isArray:', Array.isArray(ent.imagens))
      console.log('  imagens isNull:', ent.imagens === null)
      console.log('  imagens value (raw):', JSON.stringify(ent.imagens))
      console.log('  imagens length:', Array.isArray(ent.imagens) ? ent.imagens.length : 'N/A')
      if (Array.isArray(ent.imagens) && ent.imagens.length > 0) {
        console.log('  imagens[0]:', ent.imagens[0])
      }
    }
  }
}

main().catch(console.error)
