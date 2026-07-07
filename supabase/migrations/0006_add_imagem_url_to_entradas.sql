-- 1. Cria a coluna imagens (array de textos) na tabela entradas se ela não existir
ALTER TABLE public.entradas DROP COLUMN IF EXISTS imagem_url;
ALTER TABLE public.entradas ADD COLUMN IF NOT EXISTS imagens TEXT[] NOT NULL DEFAULT '{}';

-- 2. Cria o bucket "postagens" no Supabase Storage se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('postagens', 'postagens', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Adiciona políticas de RLS para o bucket "postagens"
-- Remove políticas duplicadas anteriores para evitar conflito
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload para usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir alteração e exclusão para usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir remoção para usuários autenticados" ON storage.objects;

-- Permite que qualquer usuário autenticado leia as imagens do bucket
CREATE POLICY "Permitir leitura para usuários autenticados"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'postagens');

-- Permite que qualquer usuário autenticado faça upload/inserção no bucket
CREATE POLICY "Permitir upload para usuários autenticados"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'postagens');

-- Permite que qualquer usuário autenticado atualize objetos no bucket
CREATE POLICY "Permitir alteração e exclusão para usuários autenticados"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'postagens');

-- Permite que qualquer usuário autenticado remova objetos do bucket
CREATE POLICY "Permitir remoção para usuários autenticados"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'postagens');
