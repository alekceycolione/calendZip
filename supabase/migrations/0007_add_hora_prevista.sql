-- Adiciona coluna hora_prevista para resolver conflitos de posts no mesmo dia.
-- NOT NULL sem DEFAULT: app é obrigado a fornecer valor (não tem "12:00 surpresa").
-- Entradas existentes recebem '12:00:00' explicitamente nesta migration.

ALTER TABLE public.entradas
  ADD COLUMN IF NOT EXISTS hora_prevista TIME;

UPDATE public.entradas
  SET hora_prevista = '12:00:00'
  WHERE hora_prevista IS NULL;

ALTER TABLE public.entradas
  ALTER COLUMN hora_prevista SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_entradas_data_hora
  ON public.entradas(calendario_id, data_post, hora_prevista);
