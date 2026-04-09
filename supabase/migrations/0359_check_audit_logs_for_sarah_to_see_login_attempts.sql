SELECT id, action, actor_user_id, target_user_id, created_at, meta
FROM public.audit_logs
WHERE target_user_id = 'ffdf5772-7445-420e-9c99-13f291964d08'
ORDER BY created_at DESC
LIMIT 20;