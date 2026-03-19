
-- Verificar dados reais de work_items para entender os status atuais
SELECT 
  status,
  COUNT(*) as count
FROM work_items
GROUP BY status
ORDER BY status;
