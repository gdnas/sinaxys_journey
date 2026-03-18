select tg.trigger_name,
       tg.event_manipulation,
       tg.action_timing,
       tg.action_orientation,
       tg.action_statement
from information_schema.triggers tg
where tg.event_object_schema = 'public'
  and tg.event_object_table = 'work_items'
order by tg.action_timing, tg.event_manipulation, tg.trigger_name;