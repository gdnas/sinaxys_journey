import { Badge } from "@/components/ui/badge";
import type { DbCommitmentExecutionLink } from "@/lib/commitmentsDb";
import { CommitmentInspectorEmptyState } from "@/components/commitments/CommitmentInspectorEmptyState";
import {
  formatInspectorDateTime,
  getExecutionLinkReference,
} from "@/components/commitments/commitmentInspectorFormat";

export function CommitmentExecutionLinksList({ executionLinks }: { executionLinks: DbCommitmentExecutionLink[] }) {
  if (!executionLinks.length) {
    return <CommitmentInspectorEmptyState message="Sem execution links" />;
  }

  return (
    <div className="space-y-3">
      {executionLinks.map((link) => (
        <div key={link.id} className="rounded-[24px] border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/55 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border border-[color:var(--sinaxys-border)] bg-white/80 text-[color:var(--sinaxys-ink)] dark:bg-[color:var(--sinaxys-tint)]/80">
                  {link.target_type}
                </Badge>
                <Badge className="rounded-full border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200">
                  {link.role}
                </Badge>
              </div>
              <div className="mt-3 break-all text-sm font-medium text-[color:var(--sinaxys-ink)]">{getExecutionLinkReference(link)}</div>
            </div>

            <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/70 px-3 py-2 text-xs text-[color:var(--sinaxys-ink)]/72 dark:bg-[color:var(--sinaxys-tint)]/80">
              <div>created_by: {link.created_by}</div>
              <div className="mt-1">created_at: {formatInspectorDateTime(link.created_at)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
