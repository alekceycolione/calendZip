-- Habilita UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de clientes (tenants)
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de usuários (espelha auth.users)
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  papel TEXT NOT NULL CHECK (papel IN ('admin', 'cliente')),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de calendários (1 por cliente na v1)
CREATE TABLE public.calendarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de entradas do calendário
CREATE TABLE public.entradas (
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

-- Tabela de histórico de alterações
CREATE TABLE public.alteracoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entrada_id UUID NOT NULL REFERENCES public.entradas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  diff JSONB NOT NULL DEFAULT '{}',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de notificações
CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alteracao_id UUID NOT NULL REFERENCES public.alteracoes(id) ON DELETE CASCADE,
  canal TEXT NOT NULL DEFAULT 'email',
  estado TEXT NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente', 'enviada', 'falha', 'falha_definitiva')),
  tentativas INTEGER NOT NULL DEFAULT 0,
  enviado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_entradas_calendario ON public.entradas(calendario_id);
CREATE INDEX idx_entradas_data_post ON public.entradas(data_post);
CREATE INDEX idx_alteracoes_entrada ON public.alteracoes(entrada_id);
CREATE INDEX idx_alteracoes_usuario ON public.alteracoes(usuario_id);
CREATE INDEX idx_notificacoes_alteracao ON public.notificacoes(alteracao_id);
CREATE INDEX idx_notificacoes_estado ON public.notificacoes(estado);
CREATE INDEX idx_usuarios_cliente ON public.usuarios(cliente_id);
CREATE INDEX idx_usuarios_email ON public.usuarios(email);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entradas_updated_at
BEFORE UPDATE ON public.entradas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: habilita em todas as tabelas
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alteracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS

-- clientes: admin lê tudo; cliente lê apenas o próprio
CREATE POLICY "clientes_admin_all"
ON public.clientes
FOR ALL
TO authenticated
USING (auth.uid() IN (SELECT id FROM public.usuarios WHERE papel = 'admin' AND ativo = TRUE))
WITH CHECK (auth.uid() IN (SELECT id FROM public.usuarios WHERE papel = 'admin' AND ativo = TRUE));

CREATE POLICY "clientes_cliente_read_own"
ON public.clientes
FOR SELECT
TO authenticated
USING (id IN (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid() AND ativo = TRUE));

-- usuarios: admin gerencia tudo; cliente vê apenas si mesmo
CREATE POLICY "usuarios_admin_all"
ON public.usuarios
FOR ALL
TO authenticated
USING (auth.uid() IN (SELECT id FROM public.usuarios WHERE papel = 'admin' AND ativo = TRUE))
WITH CHECK (auth.uid() IN (SELECT id FROM public.usuarios WHERE papel = 'admin' AND ativo = TRUE));

CREATE POLICY "usuarios_cliente_read_own"
ON public.usuarios
FOR SELECT
TO authenticated
USING (id = auth.uid() AND ativo = TRUE);

-- calendarios: admin tudo; cliente apenas o próprio
CREATE POLICY "calendarios_admin_all"
ON public.calendarios
FOR ALL
TO authenticated
USING (auth.uid() IN (SELECT id FROM public.usuarios WHERE papel = 'admin' AND ativo = TRUE))
WITH CHECK (auth.uid() IN (SELECT id FROM public.usuarios WHERE papel = 'admin' AND ativo = TRUE));

CREATE POLICY "calendarios_cliente_read_own"
ON public.calendarios
FOR SELECT
TO authenticated
USING (cliente_id IN (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid() AND ativo = TRUE));

-- entradas: admin tudo; cliente apenas do próprio calendário
CREATE POLICY "entradas_admin_all"
ON public.entradas
FOR ALL
TO authenticated
USING (
  auth.uid() IN (SELECT id FROM public.usuarios WHERE papel = 'admin' AND ativo = TRUE)
  OR calendario_id IN (
    SELECT c.id FROM public.calendarios c
    JOIN public.usuarios u ON u.cliente_id = c.cliente_id
    WHERE u.id = auth.uid() AND u.ativo = TRUE
  )
)
WITH CHECK (
  auth.uid() IN (SELECT id FROM public.usuarios WHERE papel = 'admin' AND ativo = TRUE)
  OR calendario_id IN (
    SELECT c.id FROM public.calendarios c
    JOIN public.usuarios u ON u.cliente_id = c.cliente_id
    WHERE u.id = auth.uid() AND u.ativo = TRUE
  )
);

-- alteracoes: leitura conforme acesso à entrada
CREATE POLICY "alteracoes_admin_all"
ON public.alteracoes
FOR ALL
TO authenticated
USING (auth.uid() IN (SELECT id FROM public.usuarios WHERE papel = 'admin' AND ativo = TRUE))
WITH CHECK (auth.uid() IN (SELECT id FROM public.usuarios WHERE papel = 'admin' AND ativo = TRUE));

CREATE POLICY "alteracoes_cliente_read_own"
ON public.alteracoes
FOR SELECT
TO authenticated
USING (entrada_id IN (
  SELECT e.id FROM public.entradas e
  JOIN public.calendarios c ON c.id = e.calendario_id
  JOIN public.usuarios u ON u.cliente_id = c.cliente_id
  WHERE u.id = auth.uid() AND u.ativo = TRUE
));

-- notificacoes: apenas admin
CREATE POLICY "notificacoes_admin_all"
ON public.notificacoes
FOR ALL
TO authenticated
USING (auth.uid() IN (SELECT id FROM public.usuarios WHERE papel = 'admin' AND ativo = TRUE))
WITH CHECK (auth.uid() IN (SELECT id FROM public.usuarios WHERE papel = 'admin' AND ativo = TRUE));

-- Função para manter usuário sincronizado com auth.users
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

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
