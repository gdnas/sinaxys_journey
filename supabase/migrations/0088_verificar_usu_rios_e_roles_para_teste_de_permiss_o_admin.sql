-- Verificar usuários e seus roles
SELECT 
  id,
  name,
  email,
  role,
  company_id,
  active
FROM profiles
WHERE company_id = '15de0336-fa2e-4a8d-b4d6-d783ca295b65'
ORDER BY role, name;