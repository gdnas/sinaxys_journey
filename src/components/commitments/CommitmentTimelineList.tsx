import { Badge } from "@/components/ui/badge";
import type { DbCommitmentEventRow } from "@/lib/commitmentEventsDb";
import { CommitmentInspectorEmptyState } from "@/components/commitments/CommitmentInspectorEmptyState";
import {
  formatInspectorDateTime,
  getTimelineTypeLabel,
  summarizeEventPayload,
} from "@/components/commitments/commitmentInspectorFormat";

export function CommitmentTimelineList({ timeline }: { timeline: DbCommitmentEventRow[] }) {
  if (!timeline.length) {
    return <CommitmentInspectorEmptyState message="Sem eventos registrados" />;
  }

  return (
    <div className="space-y-3">
      {timeline.map((item) => {
        const summary = summarizeEventPayload(item.payload);

        return (
          <div key={item.id} className="rounded-[24px] border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/55 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-[color:var(--sinaxys-border)] bg-white/80 text-[color:var(--sinaxys-ink)] dark:bg-[color:var(--sinaxys-tint)]/80">
                    {getTimelineTypeLabel(item)}
                  </Badge>
                  <span className="text-xs text-[color:var(--sinaxys-ink)]/65">{formatInspectorDateTime(item.created_at)}</span>
                </div>
                {item.actor_user_id ? (
                  <div className="mt-2 break-all text-xs text-[color:var(--sinaxys-ink)]/70">actor_user_id: {item.actor_user_id}</div>
                ) : null}
                {summary ? <div className="mt-3 text-sm leading-6 text-[color:var(--sinaxys-ink)]/80">{summary}</div> : null}
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-[color:var(--sinaxys-ink)]/60">
                {item.raw_event_type !== item.canonical_event_type ? (
                  <Badge className="rounded-full border border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200">
                    raw: {item.raw_event_type}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
