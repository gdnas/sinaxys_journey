-- Criar um comentário como usuário COLABORADOR (André Moreira)
INSERT INTO work_item_comments (work_item_id, user_id, content)
VALUES (
  '748ffad4-ef17-442a-969b-285458bbc799',
  '60068567-3bf8-4686-a9b2-476b07037dca',
  'Comentário criado por COLABORADOR para teste de permissão ADMIN'
)
RETURNING id, user_id, content, created_at;