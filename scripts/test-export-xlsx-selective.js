// scripts/test-export-xlsx-selective.js
// Pega 3 entradas específicas do "Calendário Alekcey" e gera um xlsx só delas,
// simulando o que o endpoint POST faz quando o admin seleciona entradas.

const XLSX = require('xlsx')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  // 1) Buscar entradas do Alekcey que têm imagens
  const { data: cals } = await supabaseAdmin
    .from('calendarios')
    .select('id, clientes!inner(nome)')
    .eq('clientes.nome', 'Alekcey')
    .single()
  if (!cals) throw new Error('Calendário Alekcey não encontrado')

  const { data: entradas, error } = await supabaseAdmin
    .from('entradas')
    .select('id, numero, tema, data_post, plataforma, pilar, objetivo, formato, gancho, legenda, cta, compliance, status, imagens')
    .eq('calendario_id', cals.id)
    .not('imagens', 'eq', '{}')
    .order('numero', { ascending: true })
    .limit(3)

  if (error) throw new Error(error.message)
  console.log(`Selecionadas ${entradas.length} entradas com imagens:`)
  entradas.forEach((e) => console.log(`  #${e.numero} ${e.tema} (${e.imagens.length} imgs)`))

  // 2) Gerar xlsx igual ao endpoint POST faria
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
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  const fs = require('fs')
  const out = '/tmp/calendzip-selectivo.xlsx'
  fs.writeFileSync(out, buf)
  console.log(`\nXLSX gerado: ${out} (${(buf.length / 1024).toFixed(1)}KB)`)

  // 3) Verificar o conteúdo de volta
  const wb2 = XLSX.readFile(out)
  const rows2 = XLSX.utils.sheet_to_json(wb2.Sheets['Calendário'])
  console.log(`\nLinhas no xlsx: ${rows2.length}`)
  console.log('Cabeçalhos:', Object.keys(rows2[0] || {}).slice(0, 5).join(', '), '...')
  console.log('\nPrimeira linha:')
  console.log('  Nº:', rows2[0]['Nº'], '| Tema:', rows2[0]['Tema'], '| Status:', rows2[0]['Status'])
  console.log('Última linha:')
  console.log('  Nº:', rows2[rows2.length - 1]['Nº'], '| Tema:', rows2[rows2.length - 1]['Tema'], '| Status:', rows2[rows2.length - 1]['Status'])
}

main().catch((err) => {
  console.error('ERRO:', err.message)
  process.exit(1)
})
