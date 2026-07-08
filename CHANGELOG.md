# Changelog — calendZip

Documentação das mudanças feitas em sessão com Claude Code em **2026-07-07**.
Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 + shadcn/ui (base-ui) · Supabase (Auth + Postgres + Storage) · SheetJS · @react-pdf/renderer · @dnd-kit.

## ✨ Kanban por semana (sessão de 2026-07-07, continuação)

### O que
View alternativa em **formato kanban** agrupando postagens por **semana** (Seg–Dom). Cards podem ser **arrastados entre colunas** para re-agendar (`data_post`). Disponível em `/admin/calendarios` e `/cliente/calendario` via **toggle (Tabela | Kanban)** que preserva a view de tabela como padrão.

### Por que
Tabela fica densa quando o calendário cresce. Kanban dá visão de fluxo temporal mais intuitiva e drag-and-drop torna reagendamento trivial.

### Fluxo
1. Admin/cliente acessa a página de calendário
2. Vê a tabela (default) ou clica na tab "Kanban"
3. URL muda para `?view=kanban` (compartilhável)
4. Vê colunas por semana, da mais antiga à mais futura, com scroll horizontal
5. Arrasta um card pra outra coluna → `data_post` atualiza otimista (rollback em erro)
6. Clica num card → abre o dialog de edição (mesmo da tabela)

### Estrutura do card
- Thumbnail 32×32 com fallback `ImageOff`
- Header: `#N · tema` (2 linhas max, ellipsis)
- Meta: `data · plataforma`
- Badge de status colorido: planejado (cinza), alterado (âmbar), publicado (verde)
- Cursor `grab` quando draggable

### Comportamento do drag
- **Otimista:** card muda de coluna na hora; erro → card volta com shake + toast
- **Preserva dia da semana:** era quarta → vai pra quarta da semana destino
- **Past weeks:** cursor `not-allowed`, drop rejeitado, cards desabilitados
- **Touch:** `activationConstraint: { distance: 6 }` no PointerSensor pra não conflitar com scroll

### Arquivos
- `lib/utils-semana.ts` — `inicioSemana`, `gerarSemanasDoIntervalo`, `agruparPorSemana`, `preservarDiaDaSemana`, `semanaPassada`
- `app/actions/calendario.ts` — + `reagendarEntrada(id, novaData)` com validação de passado e RLS
- `components/calendario-view-toggle.tsx` — Tabs Tabela/Kanban, atualiza URL `?view=`
- `components/calendario-kanban.tsx` — DndContext, colunas, filtro plataforma
- `components/kanban-card.tsx` — `useSortable`, card draggable
- `components/kanban-column.tsx` — `useDroppable`, coluna da semana
- `components/calendario-cliente.tsx` — + `viewMode?: 'table' | 'kanban'`
- `app/(dashboard)/admin/calendarios/page.tsx` — + `?view=` + toggle no header
- `app/(dashboard)/cliente/calendario/page.tsx` — mesmo
- `doc/KANBAN.md` — design completo

### Decisões importantes
- **Por semana** (Mon–Sun), não status/pilar/plataforma
- **Drag-and-drop** com @dnd-kit (funciona em Vercel serverless, sem deps nativas)
- **Toggle** (Tabela | Kanban) — view padrão continua tabela
- **Todas as semanas** com scroll horizontal (não janela fixa)
- **Admin E cliente podem arrastar** (decisão do usuário)
- **Bloquear drag pra passado** (não faz sentido re-agendar publicadas)
- **Sem reordenação** dentro da coluna (drag só muda de semana)
- **Filtro plataforma** dentro do kanban (não na tabela, feature do kanban)
- **Optimistic update** com rollback em erro
- **Registra alteração** na tabela `alteracoes` (diff `data_post`) para auditoria

### Dependência
- `@dnd-kit/core@^6.3.1` + `@dnd-kit/sortable@^10.0.0` + `@dnd-kit/utilities@^3.2.2` — ~30kb gzip, suporta touch, acessível (keyboard sensor)

### Limites
- **Sem undo/redo** (não-objetivo)
- **Sem drag multi-select** (não-objetivo)
- **Sem indicador de presença** (outra pessoa editando)
- **Filtro simples** só por plataforma; sem combinação com pilar

---

### O que
Admin gera um **PDF pesquisável** de um calendário em um intervalo de datas, faz **hard delete** dos mesmos dados do banco principal, e o PDF vai direto pro download. Sem persistência no servidor.

### Por que
Manter o banco de dados principal sempre enxuto. PDF fica na máquina do admin (organiza como quiser), e o texto nativo do PDF permite `Cmd+F` para pesquisar quando precisar revisitar conteúdo antigo.

### Fluxo
1. `/admin/backup` → seleciona cliente + data início + data fim
2. Confirma no dialog (aviso amarelo de delete permanente)
3. Server: lê entradas + alterações no intervalo → renderiza PDF → DELETE alteracoes → DELETE entradas → responde com o PDF
4. Browser baixa `backup-<slug>-<inicio>_<fim>.pdf`
5. Toast mostra quantas entradas e alterações foram removidas

### Estrutura do PDF
- **Capa** — cliente, calendário, período, gerado em/por, totais (postagens / alterações / imagens referenciadas)
- **Sumário** — tabela com #, data, plataforma, pilar, tema, status
- **Detalhe** — 1 página por postagem: campos completos + URLs das imagens + histórico de alterações

### Arquivos
- `app/api/backup/pdf/route.ts` — POST: query + render + delete + response
- `app/(dashboard)/admin/backup/page.tsx` — server component com lista de clientes
- `components/backup-form.tsx` — form com validação + dialog de confirmação + download via blob
- `components/pdf/backup-document.tsx` — layout do PDF (capa, sumário, detalhe)
- `lib/utils-backup.ts` — `slugifyCliente`, `formatarDataPtBr`, `nomeArquivoBackup`
- `app/(dashboard)/layout.tsx` — + "Backup PDF" no nav admin (ícone `FileDown`)
- `doc/BACKUP.md` — design completo (decisions, riscos, não-objetivos)

### Decisões importantes
- **Hard delete** (não soft): atende o objetivo de "banco pequeno". Soft delete foi rejeitado porque não encolhe
- **Sem persistência:** nada no Supabase Storage, Vercel Blob ou Postgres. PDF vai direto pro admin
- **Ordem do delete:** `alteracoes` primeiro (FK), depois `entradas`. PDF é gerado **antes** do delete
- **Texto nativo:** PDF renderiza `<Text>` real do @react-pdf/renderer → pesquisável
- **Validação:** `inicio <= fim`, ambos no formato `YYYY-MM-DD`
- **Stats no header:** `X-Backup-Stats` (JSON) com contagem de removidos, exibido no toast
- **Content-Disposition:** suporta UTF-8 (`filename*`) pra nomes com acento

### Dependência
- `@react-pdf/renderer@^4.5.1` — declarativo (componentes React → PDF), funciona em Vercel serverless, texto nativo

### Limites
- **Sem restauração a partir do PDF** (não-objetivo)
- **Sem logs de auditoria** centralizados (admin guarda o arquivo)
- **Sem limite explícito de tamanho** — para calendários muito grandes (>500 posts), considerar paginar o PDF
- **Imagens não embutidas no PDF** — só as URLs (admin baixa separadamente se quiser)

---

---

## 📐 Regra de tamanho de preview (referência rápida)

| Local | Tamanho do preview | Por quê |
|---|---|---|
| `Visualizar Calendários` (tabela) | **32×32** (h-8 w-8) | Visão geral rápida, lista densa |
| `Editar postagem` (dialog) | **540×540** (50% de 1080×1080) | Detalhe da imagem ao editar |
| `Exportar imagens` (seleção) | **540×540** (50% de 1080×1080) | Conferir antes de baixar |

> A imagem **real no Storage permanece intacta** — só o `<img>` é dimensionado, com `object-cover`. O zoom é 50% do tamanho de post esperado (1080×1080 padrão Instagram), não 50% do tamanho real do arquivo.

---

## 🐛 Bugfixes

### 1. Imagens não persistiam ao salvar entradas

**Sintoma:** Cliente fazia upload de imagens, clicava em "Salvar alterações", os arquivos iam pro Storage, mas o array `entradas.imagens` no banco continuava vazio. Após refresh, a contagem voltava a 0 e o ícone da imagem aparecia quebrado.

**Causa raiz:** `app/actions/calendario.ts:salvarAlteracoes` reconstruía o payload do `upsert` listando campo a campo e **esquecia `imagens`**. Os bytes ficavam orfãos no bucket.

**Fix:** Adicionado `imagens: alt.campos.imagens ?? atual.imagens` no objeto do `upsert`.

### 2. Célula "Imagens" na tabela (admin/calendarios)

**Sintomas:**
- Ícone da imagem aparecia quebrado quando a URL era inválida
- Contagem parecia errada (mostrava 0 mesmo após upload recente)
- Badge `+N` (`+1`, `+3`) ao lado da thumbnail confundia mais do que ajudava

**Causa raiz:** Imagens órfãs no Storage (de uploads feitos antes do fix #1) + UX do badge.

**Fix:**
- Extraído sub-componente `ImagensCell` com fallback `ImageOff` (`onError` → placeholder)
- Filtragem de URLs inválidas (`normalizarImagens` em `components/calendario-cliente.tsx`)
- Removido badge `+N` (só número agora)
- Reflete estado pendente: `edicoes[entrada.id]?.imagens ?? entrada.imagens`
- Bolinha âmbar (`bg-amber-500`) indica alteração não salva
- `useEffect` reseta `imgError` quando a URL da capa muda

### 3. Tamanho de visualização das imagens no dialog

**Solicitação:** Imagens no carrossel do dialog devem aparecer do mesmo tamanho, 50% do post (1080×1080 → 540×540), independente do tamanho real do arquivo.

**Fix:** `DialogImage` usa `aspect-square w-[540px] max-w-full`. Container ganhou `overflow-x-auto` para mobile. Imagem real no Storage não é alterada.

**Decisão final (resumo da sessão):** A regra 50% aplica-se a **dois lugares** (dialog e export), mas **NÃO** à tabela do Visualizar Calendários (mantida em 32×32 para visão geral densa). Ver tabela no topo deste changelog.

### 4. Dropdowns mostravam ID ao invés do nome

**Sintoma:** No `Select` de cliente, o trigger mostrava o UUID (`09fe3240-...`) em vez do nome.

**Causa raiz:** O shadcn Select deste projeto é baseado em `@base-ui/react` (não Radix). O `SelectValue` da base-ui precisa do label passado como **children** — sem isso, mostra o `value` (que é o ID).

**Fix:** Computar `selectedLabel` no parent e passar como children do `SelectValue` em 4 dropdowns:
- `SelectCliente` (Visualizar Calendários)
- `ExportarXlsxClient`
- `ExportarImagensClient`
- `ImportarForm`

```tsx
<SelectValue placeholder="Selecione um cliente">
  {selectedLabel}
</SelectValue>
```

### 5. Cabeçalho ausente nas páginas de export

**Solicitação:** Páginas de export não mostravam `Calendário X / Proprietário: Y` como `/admin/calendarios`.

**Fix:** Adicionado bloco idêntico nas 2 páginas (`components/exportar-xlsx-client.tsx` e `components/exportar-imagens-client.tsx`):

```tsx
{selectedCalendario && (
  <div className="border-b pb-4">
    <h2 className="text-xl font-medium text-foreground">
      {selectedCalendario.titulo}
    </h2>
    <p className="text-sm text-muted-foreground">
      Proprietário: {selectedCalendario.clientes?.nome || 'N/A'}
    </p>
  </div>
)}
```

### 6. Títulos `h1` pequenos

**Solicitação:** Títulos das páginas pouco visíveis.

**Fix:** `text-2xl font-semibold` → `text-3xl font-bold tracking-tight` em 9 páginas (todas do dashboard).

---

## ✨ Features

### 1. Exportação de imagens (zip) preservando qualidade original

**O que:** Permite baixar todas as imagens de um calendário (ou seleção específica) como um `.zip`, com a **qualidade original** do arquivo no Storage (MD5 idêntico, sem re-encoding).

**Estrutura do zip:**
```
calendzip-imagens-2026-07-07.zip
├── Alekcey/
│   ├── 001_Por-que-perfis-medicos..._1.png
│   ├── 001_Por-que-perfis-medicos..._2.png
│   ├── 002_O-paciente-pesquisa..._1.png
│   └── ...
├── Lucas-Dall-Stella/        (vazio se sem imagens)
└── manifest.json             # mapeamento entradaId → numero/tema/arquivos
```

**Arquivos:**
- `app/api/calendario/export-images/route.ts` — `GET` (calendário inteiro) e `POST { urls: string[] }` (seletivo)
- `lib/utils-storage.ts` — `extrairPathStorage()`, `sanitizarNomeArquivo()`

**Dependência:** `jszip@^3.10.1` (pura JS, sem deps nativas).

**Segurança:** Cliente só pode exportar URLs do próprio calendário (validado via JOIN com `calendarios.cliente_id`).

### 2. Exportação xlsx com seleção de entradas

**O que:** Download de planilha com as colunas: `Nº, Data, Plataforma, Pilar, Tema, Objetivo, Formato, Gancho, Legenda Completa, CTA, Compliance, Status`.

**Arquivos:**
- `app/api/calendario/export/route.ts` — `GET` (tudo) e `POST { entradaIds: string[] }` (seletivo)
- Entradas ordenadas por `numero` no servidor

### 3. Páginas dedicadas de seleção (admin)

**Solicitação original:** Botão de export não deve ficar em "Visualizar Calendários" — deve ser por cliente, com escolha de quais entradas/imagens exportar.

**Páginas criadas:**
- `/admin/exportar-xlsx` → `components/exportar-xlsx-client.tsx`
- `/admin/exportar-imagens` → `components/exportar-imagens-client.tsx`

**Padrão comum:**
- Cliente selector (com cookie de "último selecionado")
- Cabeçalho `Calendário X / Proprietário: Y`
- Action bar sticky com contador "X de Y selecionadas" + Selecionar/Desmarcar todas + Exportar
- Tabela (xlsx) ou grid de imagens (imagens) com checkbox por item
- Botão Exportar com spinner + toast de sucesso/erro
- Header grande `text-3xl font-bold`

### 4. Cookie "último cliente selecionado" (admin)

**Problema:** Admin trocava de cliente numa página, navegava pra outra, e a nova página sempre abria no primeiro calendário cadastrado.

**Solução:** Cookie `adminSelectedCliente` (1 ano, `SameSite=Lax`).

**Ordem de prioridade em cada página admin:**
1. `?id=xxx` (ou `?clienteId=xxx`) na URL
2. Cookie `adminSelectedCliente`
3. Primeiro calendário cadastrado

**Validação:** Se o cookie tem ID de cliente deletado, cai no fallback (primeiro calendário).

**Arquivos:**
- `lib/utils-cliente.server.ts` — `getSelectedClienteServer()` (server-only)
- `lib/utils-cliente.ts` — `setSelectedClienteClient()`, `getSelectedClienteClient()`

**Por que dois arquivos:** `next/headers` `cookies()` é server-only. Cliente components só podem usar `document.cookie`. Separar evita o erro de build.

### 5. Nav lateral admin atualizado

- ➕ "Exportar xlsx" (ícone `Download`)
- ➕ "Exportar imagens" (ícone `ImageDown`)
- Removido botão de export do header de `/admin/calendarios` (movido para as novas páginas)

---

## ♻️ Refactor / Infra

### 1. Prevenção de imagens órfãs no `salvarAlteracoes`

**Antes:** Usuário removia imagem pelo dialog → array no DB atualizava, mas o arquivo continuava no bucket.

**Depois:** `salvarAlteracoes` calcula o diff de `imagens` (URLs que existiam antes e não existem mais) e apaga do Storage via `createAdminClient().storage.remove(paths)`.

- Best-effort: se o `storage.remove` falhar, o save não é desfeito (apenas loga)
- Refatoração: helper `extrairPathStorage()` extraído para `lib/utils-storage.ts` (compartilhado entre action e route handler)

### 2. Helper compartilhado `normalizarImagens`

Lida com diferentes shapes do campo `imagens`:
- `string[]` (esperado)
- `null` / `undefined`
- PostgreSQL array literal: `'{url1,url2}'`
- JSON string: `'["url1","url2"]'`

Usado em `components/calendario-cliente.tsx` (UI) e indiretamente no cálculo do diff no servidor.

### 3. Sub-componente `DialogImage`

Extraído do JSX inline do dialog. Cada `<img>` no carrossel agora tem:
- `onError` → fallback com ícone `ImageOff` + texto "Indisponível"
- Hover overlay com botão "Remover" e badge de índice

### 4. Refator de `salvarAlteracoes`

Reorganizado:
- Busca de entradas atuais (mapa por id)
- Validação (cliente não pode mudar status)
- Cálculo de `updates` com merge inteligente
- **NOVO:** Cálculo de `arquivosParaRemover` (diff de imagens)
- `upsert`
- **NOVO:** Remoção do Storage (best-effort)
- Registro de histórico (`alteracoes`)
- Notificações pendentes

---

## 📂 Scripts / Testes

Todos em `app/scripts/`:

| Script | Função |
|---|---|
| `debug-imagens.js` | Inspeção: lista calendarios, contagem de imagens, formato do campo `imagens` |
| `cleanup-orphan-images.js` | **DRY-RUN / `--delete` / `--yes`**: varre bucket, cruza com DB, remove arquivos não referenciados |
| `test-diff-imagens.js` | Teste unitário de `extrairPathStorage` (5 casos) + diff de URLs (3 cenários) |
| `test-export-images.js` | Gera zip localmente sem precisar de dev server, valida estrutura e contagem |
| `test-export-xlsx-selective.js` | Gera xlsx com subset de entradas, valida cabeçalhos e ordenação |
| `test-cliente-cookie.js` | Simula fluxo de seleção de cliente + edge cases (cookie órfão, sem cookie) |
| `test-storage-cleanup.js` | **Requer dev server**: teste end-to-end do fluxo upload→save→remove→cleanup |

**Uso típico:**
```bash
# Verificar se há órfãs (não apaga nada)
node scripts/cleanup-orphan-images.js

# Apagar de verdade (pede confirmação)
node scripts/cleanup-orphan-images.js --delete

# Apagar sem confirmação
node scripts/cleanup-orphan-images.js --delete --yes
```

---

## 📁 Arquivos modificados / criados

### Criados
- `lib/utils-storage.ts`
- `lib/utils-cliente.ts`
- `lib/utils-cliente.server.ts`
- `components/exportar-xlsx-client.tsx`
- `components/exportar-imagens-client.tsx`
- `app/(dashboard)/admin/exportar-xlsx/page.tsx`
- `app/(dashboard)/admin/exportar-imagens/page.tsx`
- `app/api/calendario/export-images/route.ts` (POST)
- `scripts/cleanup-orphan-images.js`
- `scripts/test-diff-imagens.js`
- `scripts/test-export-images.js`
- `scripts/test-export-xlsx-selective.js`
- `scripts/test-cliente-cookie.js`
- `scripts/test-storage-cleanup.js`
- `app/CHANGELOG.md` (este arquivo)

### Modificados
- `app/actions/calendario.ts` — adicionou `imagens` no upsert, cleanup de Storage no save, importou `extrairPathStorage` do helper compartilhado
- `app/api/calendario/export/route.ts` — extraiu `buildXlsx()` helper, adicionou `POST { entradaIds }`
- `app/(dashboard)/admin/calendarios/page.tsx` — lê cookie como default, removido `ExportButton`
- `app/(dashboard)/layout.tsx` — nav admin: + "Exportar xlsx" + "Exportar imagens"
- `app/(dashboard)/admin/page.tsx` — h1 maior
- `app/(dashboard)/admin/usuarios/page.tsx` — h1 maior
- `app/(dashboard)/admin/importar/page.tsx` — h1 maior
- `app/(dashboard)/admin/alteracoes/page.tsx` — h1 maior
- `app/(dashboard)/cliente/page.tsx` — h1 maior
- `app/(dashboard)/cliente/calendario/page.tsx` — h1 maior
- `components/calendario-cliente.tsx` — `ImagensCell` extraído, `DialogImage` extraído, `normalizarImagens` helper, valor 540×540
- `components/select-cliente.tsx` — passa `selectedLabel` ao `SelectValue`, grava cookie no change
- `components/importar-form.tsx` — passa label ao `SelectValue`
- `package.json` / `package-lock.json` — adicionou `jszip@^3.10.1`

### Continuação: regra de tamanho de preview

Aplicada a regra 50% na página de export. Tabela do Visualizar Calendários confirmada em 32×32 (não muda).

- `components/exportar-imagens-client.tsx` — grid de seleção mudou para `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, cada `<label>` agora `aspect-square w-[540px] max-w-full`

**Revertido (decisão final):** tentativa de aplicar 540×540 na célula da tabela — revertido porque torna a row gigante e polui a visão geral. Tabela fica em 32×32.

---

## 🔜 Follow-ups sugeridos

1. **Prevenção de órfãs em outros fluxos:** Quando o usuário deleta uma entrada inteira (não tem UI ainda), ou quando um cliente é excluído, o Storage ainda tem os arquivos. A deleção de cliente no `excluirUsuarioECliente` (em `app/actions/admin.ts`) já cascateia calendarios/entradas via FK, mas não apaga os arquivos do bucket.

2. **Página de export para o cliente (`/cliente/exportar-*`):** Hoje o cliente só tem o botão simples no calendar page (export all). Para paridade com o admin, criar seleção dedicada.

3. **Streaming do zip para calendários grandes:** O JSZip bufferiza tudo em memória. Para clientes com 100+ imagens, considerar streaming.

4. **`onError` em mais lugares:** Adicionado nas imagens da tabela e do dialog, mas falta em avatares, logos, etc. (audit visual).

5. **Testes automatizados (Vitest):** Temos scripts `.js` ad-hoc. Migrar para `vitest` (skill `vitest-skill` disponível) para rodar em CI.

6. **Teste de carga do cleanup:** O `cleanup-orphan-images.js` funciona com 55 arquivos, mas precisa ser validado com 10k+ para garantir que não estoura memória ou timeout.

7. **Logs estruturados:** Console.error em vários lugares. Migrar para um logger com níveis (info/warn/error) e contexto.

8. **Remover o `ExportButton` solto de `/admin` (dashboard):** Ainda existe, hoje só exporta o primeiro calendário ou todos. Substituir pelo novo fluxo de seleção.

---

## 🔬 Skills / Metodologia usada

- `ui-ux-pro-max` — guidelines de design (botões, ícones, contraste, etc.)
- `debugging-code` — processo de debugging interativo
- `bug-hunter` — reproduzir → evidência → hipótese → causa raiz → fix
- `diagnosing-bugs` — feedback loop apertado, bisection, hypothesis testing
- `doc-coauthoring` — este changelog
- Supabase queries via service_role key do `.env.local` (com cuidado para não commitar)

---

## 📊 Métricas da sessão

- **Builds executados:** ~25 (todos OK)
- **Testes de regressão:** 5 scripts, ~12 cenários
- **Órfãs removidas no início:** 45 de 55 arquivos
- **Storage final:** 10 arquivos / 10 URLs no DB (0 órfãs)
- **Tamanho do zip de teste:** 18.4MB (11 imagens, byte-perfect MD5 contra o Storage)
- **Rotas adicionadas:** 2 (export-xlsx POST, export-images POST)
- **Páginas adicionadas:** 2 (`/admin/exportar-xlsx`, `/admin/exportar-imagens`)
- **Componentes adicionados:** 4 (`ExportarXlsxClient`, `ExportarImagensClient`, `ImagensCell`, `DialogImage`)
- **Helpers compartilhados:** 4 (`utils-storage.ts`, `utils-cliente*.ts`, `normalizarImagens`, `sanitizarNomeArquivo`)
- **Reverts:** 1 (tentativa de 540×540 na tabela → voltou a 32×32)
- **Linhas de changelog:** ~320 (este arquivo)
