-- Adiciona FKs que podem estar faltando em tabelas pré-existentes
-- e força reload do schema cache do PostgREST

-- usuarios.cliente_id -> clientes.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'usuarios_cliente_id_fkey'
      AND conrelid = 'public.usuarios'::regclass
  ) THEN
    ALTER TABLE public.usuarios
      ADD CONSTRAINT usuarios_cliente_id_fkey
      FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- calendarios.cliente_id -> clientes.id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='calendarios')
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'calendarios_cliente_id_fkey'
        AND conrelid = 'public.calendarios'::regclass
    )
  THEN
    ALTER TABLE public.calendarios
      ADD CONSTRAINT calendarios_cliente_id_fkey
      FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- entradas.calendario_id -> calendarios.id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='entradas')
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'entradas_calendario_id_fkey'
        AND conrelid = 'public.entradas'::regclass
    )
  THEN
    ALTER TABLE public.entradas
      ADD CONSTRAINT entradas_calendario_id_fkey
      FOREIGN KEY (calendario_id) REFERENCES public.calendarios(id) ON DELETE CASCADE;
  END IF;
END $$;

-- alteracoes.entrada_id -> entradas.id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='alteracoes')
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'alteracoes_entrada_id_fkey'
        AND conrelid = 'public.alteracoes'::regclass
    )
  THEN
    ALTER TABLE public.alteracoes
      ADD CONSTRAINT alteracoes_entrada_id_fkey
      FOREIGN KEY (entrada_id) REFERENCES public.entradas(id) ON DELETE CASCADE;
  END IF;
END $$;

-- alteracoes.usuario_id -> usuarios.id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='alteracoes')
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'alteracoes_usuario_id_fkey'
        AND conrelid = 'public.alteracoes'::regclass
    )
  THEN
    ALTER TABLE public.alteracoes
      ADD CONSTRAINT alteracoes_usuario_id_fkey
      FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;
  END IF;
END $$;

-- notificacoes.alteracao_id -> alteracoes.id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notificacoes')
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'notificacoes_alteracao_id_fkey'
        AND conrelid = 'public.notificacoes'::regclass
    )
  THEN
    ALTER TABLE public.notificacoes
      ADD CONSTRAINT notificacoes_alteracao_id_fkey
      FOREIGN KEY (alteracao_id) REFERENCES public.alteracoes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Força reload do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
