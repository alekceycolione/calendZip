# calendZip

Aplicação web para gestão de calendário editorial de redes sociais, construída com Next.js 16, Supabase (Auth + Postgres + RLS) e shadcn/ui.

## Funcionalidades

- Login com e-mail/senha (Supabase Auth via Route Handler)
- Cliente visualiza e edita seu próprio calendário
- Salvamento atômico em lote com aviso de alterações não salvas
- Histórico de alterações (diff campo a campo)
- Notificação ao admin (fallback no painel + mock/processamento de e-mail)
- Painel admin: criação de clientes/usuários, importação de xlsx, exportação de xlsx, histórico de alterações
- Isolamento por cliente via Row Level Security (RLS)

## Setup (ordem importa!)

### 1. Variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Preencha **obrigatoriamente**:

- `NEXT_PUBLIC_SUPABASE_URL` — ex.: `https://xxxxx.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — chave **anon/public** (encontrada em Settings → API)
- `SUPABASE_SERVICE_ROLE_KEY` — chave **service_role** (NUNCA exponha ao client)
- `NEXT_PUBLIC_SITE_URL` — ex.: `http://localhost:3000`

Em `next.config.ts`, em `allowedDevOrigins`, adicione o IP da sua máquina na rede local (ex.: `192.168.1.4`) para que o Next.js 16 aceite server actions de origens não-localhost.

### 2. Schema do banco

No Supabase → **SQL Editor** → New query, cole e rode **nesta ordem**:

1. `supabase/migrations/0001_initial.sql` — tabelas, índices, trigger e RLS
2. `supabase/migrations/0002_fix_rls_recursion.sql` — funções `SECURITY DEFINER` + policies sem recursão
3. `supabase/migrations/0005_fix_relationships.sql` — adiciona FKs em tabelas pré-existentes e faz reload do schema PostgREST

> **Por que as 3 migrations?** A 0001 original tinha policies com subquery em `usuarios` que causavam recursão infinita no RLS. A 0002 corrige isso. A 0005 é um fix de segurança para o caso de `usuarios` ter sido criada sem a FK para `clientes` (o que faz o PostgREST retornar "Could not find a relationship between 'usuarios' and 'clientes'").

**Atalho:** as migrations 0002 e 0005 juntas equivalem à `0004_bulletproof_setup.sql`. Se quiser, rode apenas a 0004 (que já tem as funções SECURITY DEFINER e policies sem recursão) **e depois** a 0005. Se as tabelas não existirem, rode 0001 + 0002 + 0005. **Nunca rode só a 0001**, ela tem a policy recursiva.

### 3. Criar o primeiro admin

O jeito mais simples é criar pelo painel do Supabase:

1. **Authentication → Users → Add user → Create new user**
2. Defina e-mail e senha (anote a senha!)
3. Em **SQL Editor**, rode:
   ```sql
   UPDATE public.usuarios
   SET papel = 'admin', ativo = true
   WHERE email = 'seu@email.com';
   ```

Alternativa via SQL (requer extensão `pgcrypto`):
```sql
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES (
  gen_random_uuid(),
  'admin@calendzip.com',
  crypt('SuaSenhaAqui', gen_salt('bf')),
  now(),
  jsonb_build_object('nome', 'Administrador', 'papel', 'admin')
);
```
O trigger `on_auth_user_created` cria a linha em `public.usuarios` automaticamente.

### 4. Rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000` (ou `http://SEU_IP:3000` se acessando de outro dispositivo na rede).

## Estrutura de pastas

- `app/actions/` — Server Actions
- `app/(dashboard)/` — Telas autenticadas (cliente e admin)
- `app/api/` — Route Handlers (`/api/auth/login`, `/api/calendario/export`, `/api/notificacoes`)
- `app/api/debug/` — Endpoints de debug (`/api/debug/users`, `/api/debug/reset`, `/api/debug/login-test`)
- `components/` — Componentes React
- `lib/` — Utilitários, Supabase client/server, autenticação
- `supabase/migrations/` — Schema do banco e RLS

## Autenticação: como funciona

O login **não** usa Server Action. Usa uma **Route Handler** (`app/api/auth/login/route.ts`) que:

1. Recebe `email` + `password` via POST
2. Chama `supabase.auth.signInWithPassword()` usando o `createServerClient` do `@supabase/ssr` com cookies manuais
3. Os cookies de sessão são setados no `cookieStore` do Next.js
4. Constrói um `NextResponse.redirect()` para `/admin` ou `/cliente` **copiando os cookies do cookieStore** (essencial, senão o navegador não recebe a sessão)
5. Faz `getUser()` + `select * from public.usuarios` para descobrir o papel
6. Em caso de erro, redireciona para `/login?erro=MENSAGEM`

> ⚠️ No Next.js 16, Server Actions com `redirect()` **não propagam cookies de sessão** corretamente. Sempre use Route Handler para mutações que setam cookies de auth.

## RLS: o que aprendemos

A RLS original tinha este problema clássico:

```sql
CREATE POLICY admin ON public.usuarios FOR ALL TO authenticated
USING (auth.uid() IN (SELECT id FROM public.usuarios WHERE papel = 'admin'));
```

→ **Recursão infinita**: para avaliar a policy em `usuarios`, a subquery lê `usuarios`, que dispara a policy de novo. O Postgres retorna `infinite recursion detected (42P17)`.

**Solução:** funções `SECURITY DEFINER` que bypassam RLS:

```sql
CREATE FUNCTION public.current_user_is_admin() RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel = 'admin' AND ativo = true); $$;

CREATE POLICY admin ON public.usuarios FOR ALL TO authenticated
USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
```

A função roda com permissões do dono (`postgres`), então não dispara RLS. A policy chama a função — sem recursão.

## Debug: endpoints úteis

Quando algo dá errado no login/RLS:

- `GET  /api/debug/users` — lista todos os usuários de `auth.users` e `public.usuarios` (usa service_role)
- `POST /api/debug/reset` body `{email, password, papel}` — redefine senha + confirma email + faz upsert em `public.usuarios`
- `DELETE /api/debug/reset` body `{email}` — deleta usuário de `auth.users`
- `POST /api/debug/login-test` body `{email, password}` — executa o fluxo de login e mostra em qual passo falha (signIn, getUser, query RLS, query admin)

Exemplo:
```bash
curl -X POST http://localhost:3000/api/debug/login-test \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@x.com","password":"SuaSenha"}'
```

## Template xlsx

A planilha deve conter uma aba chamada `Calendário` com as colunas:

`Nº`, `Data`, `Plataforma`, `Pilar`, `Tema`, `Objetivo`, `Formato`, `Gancho`, `Legenda Completa`, `CTA`, `Compliance`.

## Deploy

O projeto está configurado para deploy na Vercel. Configure as variáveis de ambiente no painel da Vercel. Em `allowedDevOrigins`, **remova** os IPs locais em produção.
