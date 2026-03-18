-- Criar um novo comentário para testar o evento de criação
INSERT INTO work_item_comments (work_item_id, user_id, content)
VALUES (
  '748ffad4-ef17-442a-969b-285458bbc799',
  '60068567-3bf8-4686-a9b2-476b07037dca',
  'Comentário de teste para evento de criação'
)
RETURNING id, user_id, content, created_at;