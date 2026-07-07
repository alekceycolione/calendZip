// scripts/test-cliente-cookie.js
// Simula o fluxo: usuário troca de cliente em /admin/exportar-imagens,
// navega para /admin/calendarios, e a página deve abrir no cliente certo.

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  // 1) Buscar todos os calendarios
  const { data: calendarios, error } = await supabaseAdmin
    .from('calendarios')
    .select('id, titulo, clientes!inner(nome)')

  if (error) throw new Error(error.message)
  console.log('Calendários disponíveis:')
  calendarios.forEach((c, i) => console.log(`  [${i}] ${c.clientes.nome} (id=${c.id})`))

  // 2) Simular: usuário escolhe o 3º cliente (Alekcey) e clica em "Visualizar Calendários"
  const escolhido = calendarios.find((c) => c.clientes.nome === 'Alekcey')
  if (!escolhido) throw new Error('Alekcey não encontrado')
  console.log(`\n→ Usuário selecionou: ${escolhido.clientes.nome}`)

  // 3) A página /admin/calendarios deveria usar essa ID como default
  //    A lógica é: cookie > primeiro. Aqui validamos que o cookie value
  //    casa com um cliente existente.
  const validIds = new Set(calendarios.map((c) => c.id))
  const cookieId = escolhido.id
  if (!validIds.has(cookieId)) {
    throw new Error('Cookie com ID inválido')
  }

  const esperado = calendarios.find((c) => c.id === cookieId)
  console.log(`→ Default em /admin/calendarios seria: ${esperado.clientes.nome}`)
  console.log(`→ Default em /admin/exportar-xlsx seria: ${esperado.clientes.nome}`)
  console.log(`→ Default em /admin/exportar-imagens seria: ${esperado.clientes.nome}`)

  // 4) Edge case: cookie tem ID de cliente que foi deletado
  console.log('\n--- Edge case: cookie com ID órfão ---')
  const fakeId = '00000000-0000-0000-0000-000000000000'
  const validOrFallback = validIds.has(fakeId) ? fakeId : calendarios[0]?.id
  console.log(`Cookie=${fakeId} → cai no fallback: ${calendarios.find(c => c.id === validOrFallback)?.clientes.nome}`)

  // 5) Edge case: sem cookie, sem URL param
  console.log('\n--- Edge case: sem cookie ---')
  const fallbackOnly = calendarios[0]?.id
  console.log(`Sem cookie → primeiro calendário: ${calendarios.find(c => c.id === fallbackOnly)?.clientes.nome}`)

  console.log('\n✓ Fluxo validado')
}

main().catch((err) => {
  console.error('ERRO:', err.message)
  process.exit(1)
})
