-- =====================================================
-- calendZip — setup completo à prova de falhas
-- Roda uma vez e não importa em que estado está o banco.
-- Cria o que falta, recria functions/policies/triggers.
-- Nunca aborta no meio: tudo que pode falhar por objeto
-- inexistente está dentro de DO ... EXCEPTION.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TABELAS (CREATE IF NOT EXISTS, ordem respeitando FKs)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  papel TEXT NOT NULL CHECK (papel IN ('admin', 'cliente')),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.calendarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.entradas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendario_id UUID NOT NULL REFERENCES public.calendarios(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  data_post DATE NOT NULL,
  plataforma TEXT,
  pilar TEXT,
  tema TEXT,
  objetivo TEXT,
  formato TEXT,
  gancho TEXT,
  legenda TEXT,
  cta TEXT,
  compliance TEXT,
  status TEXT NOT NULL DEFAULT 'planejado' CHECK (status IN ('planejado', 'alterado', 'publicado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alteracoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entrada_id UUID NOT NULL REFERENCES public.entradas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  diff JSONB NOT NULL DEFAULT '{}',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alteracao_id UUID NOT NULL REFERENCES public.alteracoes(id) ON DELETE CASCADE,
  canal TEXT NOT NULL DEFAULT 'email',
  estado TEXT NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente', 'enviada', 'falha', 'falha_definitiva')),
  tentativas INTEGER NOT NULL DEFAULT 0,
  enviado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. ÍNDICES (IF NOT EXISTS)
-- =====================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='entradas') THEN
    CREATE INDEX IF NOT EXISTS idx_entradas_calendario ON public.entradas(calendario_id);
    CREATE INDEX IF NOT EXISTS idx_entradas_data_post ON public.entradas(data_post);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='alteracoes') THEN
    CREATE INDEX IF NOT EXISTS idx_alteracoes_entrada ON public.alteracoes(entrada_id);
    CREATE INDEX IF NOT EXISTS idx_alteracoes_usuario ON public.alteracoes(usuario_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notificacoes') THEN
    CREATE INDEX IF NOT EXISTS idx_notificacoes_alteracao ON public.notificacoes(alteracao_id);
    CREATE INDEX IF NOT EXISTS idx_notificacoes_estado ON public.notificacoes(estado);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='usuarios') THEN
    CREATE INDEX IF NOT EXISTS idx_usuarios_cliente ON public.usuarios(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
  END IF;
END $$;

-- =====================================================
-- 3. FUNÇÕES AUXILIARES (SECURITY DEFINER — evita recursão)
-- =====================================================
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND papel = 'admin' AND ativo = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_cliente_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT cliente_id FROM public.usuarios
  WHERE id = auth.uid() AND ativo = TRUE
  LIMIT 1;
$$;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop + create trigger (à prova de tabela inexistente)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='entradas') THEN
    DROP TRIGGER IF EXISTS entradas_updated_at ON public.entradas;
    CREATE TRIGGER entradas_updated_at
    BEFORE UPDATE ON public.entradas
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- Trigger para criar perfil quando um usuário é criado em auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, nome, email, papel, cliente_id, ativo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'papel', 'cliente'),
    (NEW.raw_user_meta_data->>'cliente_id')::UUID,
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    papel = EXCLUDED.papel,
    cliente_id = EXCLUDED.cliente_id,
    ativo = TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recria trigger no auth.users (sempre existe no Supabase)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 4. RLS + POLICIES (drop de policies em DO blocks)
-- =====================================================

-- Habilita RLS nas tabelas existentes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clientes') THEN
    ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='usuarios') THEN
    ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='calendarios') THEN
    ALTER TABLE public.calendarios ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='entradas') THEN
    ALTER TABLE public.entradas ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='alteracoes') THEN
    ALTER TABLE public.alteracoes ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notificacoes') THEN
    ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Remove policies antigas (genérico: por tabela)
DO $$
DECLARE
  tname text;
  pname text;
BEGIN
  FOREACH tname IN ARRAY ARRAY['clientes','usuarios','calendarios','entradas','alteracoes','notificacoes'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=tname) THEN
      FOR pname IN
        SELECT policyname FROM pg_policies
        WHERE schemaname='public' AND tablename=tname
      LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', pname, tname);
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Cria policies (só onde a tabela existe, e sem recursão via funções SECURITY DEFINER)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='usuarios') THEN
    CREATE POLICY "usuarios_admin_all" ON public.usuarios FOR ALL TO authenticated
      USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
    CREATE POLICY "usuarios_cliente_read_own" ON public.usuarios FOR SELECT TO authenticated
      USING (id = auth.uid());
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clientes') THEN
    CREATE POLICY "clientes_admin_all" ON public.clientes FOR ALL TO authenticated
      USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
    CREATE POLICY "clientes_cliente_read_own" ON public.clientes FOR SELECT TO authenticated
      USING (id = public.current_user_cliente_id());
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='calendarios') THEN
    CREATE POLICY "calendarios_admin_all" ON public.calendarios FOR ALL TO authenticated
      USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
    CREATE POLICY "calendarios_cliente_read_own" ON public.calendarios FOR SELECT TO authenticated
      USING (cliente_id = public.current_user_cliente_id());
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='entradas') THEN
    CREATE POLICY "entradas_admin_all" ON public.entradas FOR ALL TO authenticated
      USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
    CREATE POLICY "entradas_cliente_all_own" ON public.entradas FOR ALL TO authenticated
      USING (calendario_id IN (SELECT id FROM public.calendarios WHERE cliente_id = public.current_user_cliente_id()))
      WITH CHECK (calendario_id IN (SELECT id FROM public.calendarios WHERE cliente_id = public.current_user_cliente_id()));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='alteracoes') THEN
    CREATE POLICY "alteracoes_admin_all" ON public.alteracoes FOR ALL TO authenticated
      USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
    CREATE POLICY "alteracoes_cliente_read_own" ON public.alteracoes FOR SELECT TO authenticated
      USING (entrada_id IN (SELECT e.id FROM public.entradas e JOIN public.calendarios c ON c.id = e.calendario_id WHERE c.cliente_id = public.current_user_cliente_id()));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notificacoes') THEN
    CREATE POLICY "notificacoes_admin_all" ON public.notificacoes FOR ALL TO authenticated
      USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
  END IF;
END $$;
