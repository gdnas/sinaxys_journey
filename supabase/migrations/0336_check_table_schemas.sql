-- Check table schemas
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name IN ('cost_items', 'cost_allocations', 'squads', 'squad_members')
ORDER BY table_name;