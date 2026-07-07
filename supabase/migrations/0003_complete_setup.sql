-- =====================================================
-- Setup completo idempotente do calendZip
-- Pode rodar quantas vezes quiser; corrige o estado
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== Tabelas =====
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

-- ===== Índices =====
CREATE INDEX IF NOT EXISTS idx_entradas_calendario ON public.entradas(calendario_id);
CREATE INDEX IF NOT EXISTS idx_entradas_data_post ON public.entradas(data_post);
CREATE INDEX IF NOT EXISTS idx_alteracoes_entrada ON public.alteracoes(entrada_id);
CREATE INDEX IF NOT EXISTS idx_alteracoes_usuario ON public.alteracoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_alteracao ON public.notificacoes(alteracao_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_estado ON public.notificacoes(estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_cliente ON public.usuarios(cliente_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);

-- ===== Trigger updated_at =====
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS entradas_updated_at ON public.entradas;
CREATE TRIGGER entradas_updated_at
BEFORE UPDATE ON public.entradas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ===== Funções auxiliares (SECURITY DEFINER para evitar recursão) =====
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

-- ===== RLS =====
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alteracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Remove policies antigas (caso existam com nomes diferentes)
DROP POLICY IF EXISTS "usuarios_admin_all" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_cliente_read_own" ON public.usuarios;
DROP POLICY IF EXISTS "clientes_admin_all" ON public.clientes;
DROP POLICY IF EXISTS "clientes_cliente_read_own" ON public.clientes;
DROP POLICY IF EXISTS "calendarios_admin_all" ON public.calendarios;
DROP POLICY IF EXISTS "calendarios_cliente_read_own" ON public.calendarios;
DROP POLICY IF EXISTS "entradas_admin_all" ON public.entradas;
DROP POLICY IF EXISTS "entradas_cliente_read_own" ON public.entradas;
DROP POLICY IF EXISTS "alteracoes_admin_all" ON public.alteracoes;
DROP POLICY IF EXISTS "alteracoes_cliente_read_own" ON public.alteracoes;
DROP POLICY IF EXISTS "notificacoes_admin_all" ON public.notificacoes;

-- Cria policies sem recursão
CREATE POLICY "usuarios_admin_all" ON public.usuarios FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "usuarios_cliente_read_own" ON public.usuarios FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "clientes_admin_all" ON public.clientes FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "clientes_cliente_read_own" ON public.clientes FOR SELECT TO authenticated
  USING (id = public.current_user_cliente_id());

CREATE POLICY "calendarios_admin_all" ON public.calendarios FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "calendarios_cliente_read_own" ON public.calendarios FOR SELECT TO authenticated
  USING (cliente_id = public.current_user_cliente_id());

CREATE POLICY "entradas_admin_all" ON public.entradas FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "entradas_cliente_all_own" ON public.entradas FOR ALL TO authenticated
  USING (calendario_id IN (SELECT id FROM public.calendarios WHERE cliente_id = public.current_user_cliente_id()))
  WITH CHECK (calendario_id IN (SELECT id FROM public.calendarios WHERE cliente_id = public.current_user_cliente_id()));

CREATE POLICY "alteracoes_admin_all" ON public.alteracoes FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "alteracoes_cliente_read_own" ON public.alteracoes FOR SELECT TO authenticated
  USING (entrada_id IN (SELECT e.id FROM public.entradas e JOIN public.calendarios c ON c.id = e.calendario_id WHERE c.cliente_id = public.current_user_cliente_id()));

CREATE POLICY "notificacoes_admin_all" ON public.notificacoes FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

-- ===== Trigger para criar perfil automaticamente =====
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
