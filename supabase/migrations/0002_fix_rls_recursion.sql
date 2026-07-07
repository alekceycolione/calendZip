-- Corrige recursão infinita em todas as policies que consultavam
-- public.usuarios para verificar se o usuário é admin.
-- A solução é usar funções SECURITY DEFINER que bypassam RLS.

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

-- ===== public.usuarios =====
DROP POLICY IF EXISTS "usuarios_admin_all" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_cliente_read_own" ON public.usuarios;

CREATE POLICY "usuarios_admin_all"
ON public.usuarios FOR ALL TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

CREATE POLICY "usuarios_cliente_read_own"
ON public.usuarios FOR SELECT TO authenticated
USING (id = auth.uid());

-- ===== public.clientes =====
DROP POLICY IF EXISTS "clientes_admin_all" ON public.clientes;
DROP POLICY IF EXISTS "clientes_cliente_read_own" ON public.clientes;

CREATE POLICY "clientes_admin_all"
ON public.clientes FOR ALL TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

CREATE POLICY "clientes_cliente_read_own"
ON public.clientes FOR SELECT TO authenticated
USING (id = public.current_user_cliente_id());

-- ===== public.calendarios =====
DROP POLICY IF EXISTS "calendarios_admin_all" ON public.calendarios;
DROP POLICY IF EXISTS "calendarios_cliente_read_own" ON public.calendarios;

CREATE POLICY "calendarios_admin_all"
ON public.calendarios FOR ALL TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

CREATE POLICY "calendarios_cliente_read_own"
ON public.calendarios FOR SELECT TO authenticated
USING (cliente_id = public.current_user_cliente_id());

-- ===== public.entradas =====
DROP POLICY IF EXISTS "entradas_admin_all" ON public.entradas;
DROP POLICY IF EXISTS "entradas_cliente_read_own" ON public.entradas;

CREATE POLICY "entradas_admin_all"
ON public.entradas FOR ALL TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

CREATE POLICY "entradas_cliente_all_own"
ON public.entradas FOR ALL TO authenticated
USING (
  calendario_id IN (
    SELECT id FROM public.calendarios
    WHERE cliente_id = public.current_user_cliente_id()
  )
)
WITH CHECK (
  calendario_id IN (
    SELECT id FROM public.calendarios
    WHERE cliente_id = public.current_user_cliente_id()
  )
);

-- ===== public.alteracoes =====
DROP POLICY IF EXISTS "alteracoes_admin_all" ON public.alteracoes;
DROP POLICY IF EXISTS "alteracoes_cliente_read_own" ON public.alteracoes;

CREATE POLICY "alteracoes_admin_all"
ON public.alteracoes FOR ALL TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

CREATE POLICY "alteracoes_cliente_read_own"
ON public.alteracoes FOR SELECT TO authenticated
USING (
  entrada_id IN (
    SELECT e.id FROM public.entradas e
    JOIN public.calendarios c ON c.id = e.calendario_id
    WHERE c.cliente_id = public.current_user_cliente_id()
  )
);

-- ===== public.notificacoes =====
DROP POLICY IF EXISTS "notificacoes_admin_all" ON public.notificacoes;

CREATE POLICY "notificacoes_admin_all"
ON public.notificacoes FOR ALL TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());
