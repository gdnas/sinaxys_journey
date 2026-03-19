
-- Verificar dados reais de projects para entender os status atuais
SELECT 
  status,
  COUNT(*) as count
FROM projects
GROUP BY status
ORDER BY status;
