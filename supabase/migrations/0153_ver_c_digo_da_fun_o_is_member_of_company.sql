-- Ver a função is_member_of_company
SELECT 
  pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'is_member_of_company';