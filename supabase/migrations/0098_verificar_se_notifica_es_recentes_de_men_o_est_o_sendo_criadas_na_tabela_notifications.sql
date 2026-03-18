select id, user_id, actor_user_id, title, notif_type, is_read, created_at, content
from public.notifications
order by created_at desc
limit 20;