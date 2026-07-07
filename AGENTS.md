<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# calendZip — Notas para agentes

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript
- Tailwind CSS 4 + shadcn/ui
- Supabase (Auth + Postgres)
- SheetJS (`xlsx`) para import/export

## Convenções do projeto

- Use Server Actions para mutações de dados; Route Handlers apenas para downloads/upload de arquivos.
- Autenticação e autorização devem ser verificadas em Server Actions e Route Handlers (não confie apenas no Proxy).
- Proxy (`proxy.ts`) redireciona usuários não autenticados, mas a lógica de segurança final fica na camada de dados.
- Todos os clientes Supabase usam o tipo `Database` em `lib/supabase/database.types.ts`.
- Cores e tipografia seguem o design system gerado em `design-system/calendzip-dashboard/MASTER.md`.

## Variáveis de ambiente

Ver `/.env.local.example`.

## Banco de dados

Migrations em `/supabase/migrations/`. O schema inclui RLS para isolamento por cliente.

## Antes de commitar

- Rode `npm run build` para garantir que não há erros de TypeScript.
