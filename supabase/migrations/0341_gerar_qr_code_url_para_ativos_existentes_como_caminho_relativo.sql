-- Atualizar qr_code_url para ativos existentes como caminho relativo /ativo/:id
UPDATE assets
SET qr_code_url = '/ativo/' || id
WHERE qr_code_url IS NULL;