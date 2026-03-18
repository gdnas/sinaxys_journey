-- Show the work_item_events row(s) that caused the failing delete (recent entries)
SELECT * FROM work_item_events WHERE created_at > now() - interval '10 minutes' ORDER BY created_at DESC LIMIT 50;