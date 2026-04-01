-- Atualizar qr_code_url para ativos que estão com qr_code_url relativo, transformando em URL absoluta com ORIGIN
UPDATE assets
SET qr_code_url = CONCAT(COALESCE(current_setting('app.origin', true), ''), qr_code_url)
WHERE qr_code_url IS NOT NULL AND qr_code_url NOT LIKE 'http%';