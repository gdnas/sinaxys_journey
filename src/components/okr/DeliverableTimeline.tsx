import React, { useMemo, useRef, useState, useEffect } from "react";
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
  onReschedule,
}: {
  deliverables: Deliverable[];
  onBarClick?: (id: string) => void;
  onReschedule?: (id: string, startDateIso: string | null, dueDateIso: string | null) => Promise<void> | void;
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
  const rangeStart = new Date(start.getFullYear(), start.getMonth(), Math.max(1, start.getDate() - padDays));
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
  const pctToDate = (pct: number) => new Date(rangeStart.getTime() + (pct / 100) * totalMs);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<null | {
    id: string;
    mode: "move" | "resize-left" | "resize-right";
    startPct: number;
    endPct: number;
    originX: number;
  }>(null);

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!dragState || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = (x / rect.width) * 100;
      let nextStart = dragState.startPct;
      let nextEnd = dragState.endPct;
      if (dragState.mode === "move") {
        const delta = pct - dragState.originX;
        nextStart = dragState.startPct + delta;
        nextEnd = dragState.endPct + delta;
      } else if (dragState.mode === "resize-left") {
        nextStart = Math.min(dragState.endPct - 0.5, pct);
      } else if (dragState.mode === "resize-right") {
        nextEnd = Math.max(dragState.startPct + 0.5, pct);
      }
      // clamp
      nextStart = Math.max(0, Math.min(100, nextStart));
      nextEnd = Math.max(0, Math.min(100, nextEnd));
      setDragState({ ...dragState, startPct: nextStart, endPct: nextEnd, originX: dragState.originX });
    }

    function onPointerUp() {
      if (!dragState) return;
      const d = deliverables.find((x) => x.id === dragState.id);
      if (d && onReschedule) {
        const newStart = pctToDate(dragState.startPct);
        const newEnd = pctToDate(dragState.endPct);
        // normalize to ISO date strings (YYYY-MM-DD)
        const toIsoDate = (dt: Date) => dt.toISOString().slice(0, 10);
        const startIso = toIsoDate(newStart);
        const endIso = toIsoDate(newEnd);
        onReschedule(dragState.id, startIso, endIso);
      }
      setDragState(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    }

    if (dragState) {
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragState, deliverables, onReschedule]);

  const startDrag = (id: string, mode: "move" | "resize-left" | "resize-right", startPct: number, endPct: number, originPct: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    setDragState({ id, mode, startPct, endPct, originX: originPct });
  };

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

        <div ref={containerRef} className="relative h-48 border rounded-lg bg-[color:var(--sinaxys-bg)] p-3">
          {deliverables.map((d, idx) => {
            const s = d.start_date ? new Date(d.start_date) : d.due_at ? new Date(d.due_at) : new Date();
            const e = d.due_at ? new Date(d.due_at) : d.start_date ? new Date(d.start_date) : new Date(s.getTime() + 24 * 60 * 60 * 1000);
            const left = calcPct(s);
            const right = calcPct(e);
            const width = Math.max(2, right - left);
            const top = 8 + (idx % 8) * 44; // stack up to 8 rows

            const isDragging = dragState?.id === d.id;
            const curLeft = isDragging ? dragState!.startPct : left;
            const curRight = isDragging ? dragState!.endPct : right;
            const curWidth = Math.max(2, curRight - curLeft);

            const startDateLabel = d.start_date ? format(new Date(d.start_date), "dd MMM") : "";
            const dueDateLabel = d.due_at ? format(new Date(d.due_at), "dd MMM") : "";

            const originPct = dragState ? dragState.originX : 0;

            return (
              <div key={d.id} className="absolute" style={{ left: `${curLeft}%`, top: top, width: `${curWidth}%` }}>
                <div className="relative">
                  {/* left handle */}
                  <div
                    onPointerDown={startDrag(d.id, "resize-left", left, right, originPct)}
                    className="absolute -left-2 top-0 h-full w-4 cursor-col-resize"
                    aria-hidden
                  />

                  {/* right handle */}
                  <div
                    onPointerDown={startDrag(d.id, "resize-right", left, right, originPct)}
                    className="absolute -right-2 top-0 h-full w-4 cursor-col-resize"
                    aria-hidden
                  />

                  <button
                    onPointerDown={startDrag(d.id, "move", left, right, originPct)}
                    onClick={(e) => { e.stopPropagation(); onBarClick?.(d.id); }}
                    title={`${d.title} • ${d.start_date ?? "—"} → ${d.due_at ?? "—"}`}
                    className="flex items-center gap-2 rounded-md px-3 py-1 shadow-sm hover:opacity-90"
                    style={{
                      background: idx % 3 === 0 ? "#10B981" : idx % 3 === 1 ? "#60A5FA" : "#F59E0B",
                      color: "white",
                      minWidth: '48px',
                    }}
                  >
                    <div className="text-sm truncate" style={{ maxWidth: "calc(100% - 40px)" }}>{d.title}</div>
                    <div className="text-[11px] opacity-80">{d.due_at ? format(new Date(d.due_at), "dd MMM") : ''}</div>
                  </button>
                </div>
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