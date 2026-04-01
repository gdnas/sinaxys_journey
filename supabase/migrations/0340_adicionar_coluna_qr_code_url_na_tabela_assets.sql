-- Adicionar coluna qr_code_url na tabela assets
ALTER TABLE assets ADD COLUMN IF NOT EXISTS qr_code_url TEXT;