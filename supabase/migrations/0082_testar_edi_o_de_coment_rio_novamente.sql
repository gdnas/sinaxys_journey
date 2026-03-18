-- Testar edição de comentário novamente
UPDATE work_item_comments
SET content = 'Comentário editado para teste da Sprint 2',
    updated_at = NOW()
WHERE id = '3d759fb2-3870-4f85-bb98-d7f96af611a5'
RETURNING id, content, updated_at;