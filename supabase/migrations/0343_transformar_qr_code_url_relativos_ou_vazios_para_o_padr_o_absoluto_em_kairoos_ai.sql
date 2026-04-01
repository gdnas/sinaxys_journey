-- Atualizar qr_code_url existentes para usar domínio https://kairoos.ai com padrão multitenant /companies/{tenant}/assets/{id}/demo
UPDATE assets
SET qr_code_url = 'https://kairoos.ai/companies/' || tenant_id || '/assets/' || id || '/demo'
WHERE qr_code_url IS NULL OR qr_code_url = '' OR qr_code_url NOT LIKE 'http%';