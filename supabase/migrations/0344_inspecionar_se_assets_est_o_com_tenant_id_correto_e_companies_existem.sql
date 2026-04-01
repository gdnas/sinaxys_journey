-- Check assets and companies consistency for demo route
SELECT a.id, a.tenant_id, a.qr_code_url, c.id as company_id
FROM assets a
LEFT JOIN companies c ON a.tenant_id = c.id
WHERE a.qr_code_url LIKE '%/companies/%/assets/%/demo'
LIMIT 50;