// scripts/test-diff-imagens.js
// Testa isoladamente: extrairPathStorage() + diff de URLs (antigas \u2192 removidas).

function extrairPathStorage(url) {
  try {
    const u = new URL(url)
    const match = u.pathname.match(/\/storage\/v1\/object\/public\/postagens\/(.+)$/)
    return match ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}

// --- Casos de teste ---
const cases = [
  {
    nome: 'URL v\u00e1lida do Supabase Storage',
    url: 'https://vzabsojzwccbdqbjpzxc.supabase.co/storage/v1/object/public/postagens/abc-123/entrada_1783449166228_0.png',
    esperado: 'abc-123/entrada_1783449166228_0.png',
  },
  {
    nome: 'URL com caracteres escapados',
    url: 'https://x.supabase.co/storage/v1/object/public/postagens/cal%20id/img_1.png',
    esperado: 'cal id/img_1.png',
  },
  {
    nome: 'URL que n\u00e3o \u00e9 do bucket postagens',
    url: 'https://x.supabase.co/storage/v1/object/public/outros/file.png',
    esperado: null,
  },
  {
    nome: 'URL malformada',
    url: 'n\u00e3o \u00e9 uma url',
    esperado: null,
  },
  {
    nome: 'URL vazia',
    url: '',
    esperado: null,
  },
]

let passou = 0
let falhou = 0
for (const c of cases) {
  const got = extrairPathStorage(c.url)
  const ok = got === c.esperado
  console.log(`${ok ? '\u2713' : '\u2717'} ${c.nome}`)
  if (!ok) {
    console.log(`    esperado: ${JSON.stringify(c.esperado)}`)
    console.log(`    obtido:   ${JSON.stringify(got)}`)
    falhou++
  } else {
    passou++
  }
}

// --- Teste do diff ---
console.log('\n--- Diff de imagens ---')
function calcularRemovidos(atuais, novas) {
  const conjuntoNovas = new Set(novas)
  return atuais.filter((u) => !conjuntoNovas.has(u))
}

const antes = [
  'https://x.supabase.co/storage/v1/object/public/postagens/cal/img1.png',
  'https://x.supabase.co/storage/v1/object/public/postagens/cal/img2.png',
  'https://x.supabase.co/storage/v1/object/public/postagens/cal/img3.png',
]
const depoisRemoverUma = antes.slice(0, 2)
const depoisRemoverTodas = []
const depoisSemMudanca = antes

console.log('Removeu 1:', calcularRemovidos(antes, depoisRemoverUma).length, '(esperado 1)')
console.log('Removeu todas:', calcularRemovidos(antes, depoisRemoverTodas).length, '(esperado 3)')
console.log('Sem mudan\u00e7a:', calcularRemovidos(antes, depoisSemMudanca).length, '(esperado 0)')

console.log(`\nTotal: ${passou}/${passou + falhou} casos de URL passaram`)
process.exit(falhou > 0 ? 1 : 0)
