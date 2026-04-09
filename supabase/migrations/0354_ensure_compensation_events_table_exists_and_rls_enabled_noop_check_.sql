-- Add a compensation_events row when scheduling offboarding to show that cost remains until date
ALTER TABLE public.compensation_events ENABLE ROW LEVEL SECURITY;

-- No-op; function already inserts events on finalize.
SELECT 1;