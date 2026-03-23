-- Adicionar birth_date na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;