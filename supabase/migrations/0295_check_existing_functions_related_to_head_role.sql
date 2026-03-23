-- Check existing functions related to head role
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%head%' 
AND routine_schema = 'public';
