-- Testar edição de comentário de outro usuário por ADMIN
-- O comentário foi criado por André Moreira (COLABORADOR)
-- Vamos tentar editar como se fôssemos Guilherme Nastrini (ADMIN)
-- Isso deve funcionar devido à política RLS que permite ADMIN editar qualquer comentário

-- Primeiro, vamos verificar a política UPDATE
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'work_item_comments' AND cmd = 'UPDATE';