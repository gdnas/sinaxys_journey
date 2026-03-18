SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%okr%' OR table_name LIKE '%cycle%' OR table_name LIKE '%objective%'
ORDER BY table_name;