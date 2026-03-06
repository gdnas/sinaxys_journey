import React, { useMemo } from "react";
import { format } from "date-fns";

type Deliverable = {
  id: string;
  title: string;
  start_date: string | null;
  due_at: string | null;
  tier?: string;
  owner_user_id?: string | null;
};

export default function DeliverableTimeline({
  deliverables,
  onBarClick,
}: {
  deliverables: Deliverable[];
  onBarClick?: (id: string) => void;
}) {
  const dates = useMemo(() => {
    const vals: Date[] = [];
    for (const d of deliverables) {
      if (d.start_date) vals.push(new Date(d.start_date));
      if (d.due_at) vals.push(new Date(d.due_at));
    }
    if (!vals.length) {
      const now = new Date();
      vals.push(now);
      vals.push(new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30));
    }
    vals.sort((a, b) => a.getTime() - b.getTime());
    return vals;
  }, [deliverables]);

  const start = dates[0];
  const end = dates[dates.length - 1];
  // add padding
  const padDays = 7 * 2; // 2 weeks
  const rangeStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() - padDays);
  const rangeEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate() + padDays);
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();

  const months = useMemo(() => {
    const arr: Date[] = [];
    const cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (cur.getTime() <= rangeEnd.getTime()) {
      arr.push(new Date(cur));
      cur.setMonth(cur.getMonth() + 1);
    }
    return arr;
  }, [rangeStart, rangeEnd]);

  const calcPct = (d: Date) => Math.max(0, Math.min(100, ((d.getTime() - rangeStart.getTime()) / totalMs) * 100));

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {months.map((m) => (
            <div key={m.toISOString()} className="w-48 text-center">
              {format(m, "MMM yyyy")}
            </div>
          ))}
        </div>

        <div className="relative h-36 border rounded-lg bg-[color:var(--sinaxys-bg)] p-3">
          {deliverables.map((d, idx) => {
            const s = d.start_date ? new Date(d.start_date) : d.due_at ? new Date(d.due_at) : new Date();
            const e = d.due_at ? new Date(d.due_at) : d.start_date ? new Date(d.start_date) : new Date(s.getTime() + 24 * 60 * 60 * 1000);
            const left = calcPct(s);
            const right = calcPct(e);
            const width = Math.max(2, right - left);
            const top = 8 + (idx % 6) * 36; // stack up to 6 rows

            return (
              <div key={d.id} className="absolute" style={{ left: `${left}%`, top: top }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onBarClick?.(d.id); }}
                  title={`${d.title} • ${d.start_date ?? "—"} → ${d.due_at ?? "—"}`}
                  className="flex items-center gap-2 rounded-md px-3 py-1 shadow-sm hover:opacity-90"
                  style={{
                    background: idx % 3 === 0 ? "#10B981" : idx % 3 === 1 ? "#60A5FA" : "#F59E0B",
                    color: "white",
                    width: `${width}%`,
                    minWidth: '48px',
                  }}
                >
                  <div className="text-sm truncate" style={{ maxWidth: "calc(100% - 40px)" }}>{d.title}</div>
                  <div className="text-[11px] opacity-80">{d.due_at ? format(new Date(d.due_at), "dd MMM") : ''}</div>
                </button>
              </div>
            );
          })}

          {/* current day line */}
          <div
            className="absolute h-full top-0"
            style={{ left: `${calcPct(new Date())}%`, width: '2px', background: 'rgba(255,0,0,0.7)' }}
          />
        </div>
      </div>
    </div>
  );
}
