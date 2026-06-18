import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DbCommitmentEvidence } from "@/lib/commitmentsDb";
import { CommitmentInspectorEmptyState } from "@/components/commitments/CommitmentInspectorEmptyState";
import {
  formatInspectorDateTime,
  getEvidenceReference,
  getEvidenceTitle,
  summarizeEventPayload,
} from "@/components/commitments/commitmentInspectorFormat";

export function CommitmentEvidenceList({ evidence }: { evidence: DbCommitmentEvidence[] }) {
  if (!evidence.length) {
    return <CommitmentInspectorEmptyState message="Sem evidências" />;
  }

  return (
    <div className="space-y-3">
      {evidence.map((item) => {
        const reference = getEvidenceReference(item);
        const payloadSummary = summarizeEventPayload(item.payload);

        return (
          <div key={item.id} className="rounded-[24px] border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/55 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-[color:var(--sinaxys-border)] bg-white/80 text-[color:var(--sinaxys-ink)] dark:bg-[color:var(--sinaxys-tint)]/80">
                    {item.evidence_type}
                  </Badge>
                  {item.is_final ? (
                    <Badge className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                      Final
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-3 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{getEvidenceTitle(item)}</div>
                {item.description ? <div className="mt-2 text-sm leading-6 text-[color:var(--sinaxys-ink)]/78">{item.description}</div> : null}
                {reference ? (
                  <div className="mt-3 break-all text-xs text-[color:var(--sinaxys-ink)]/68">
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[color:var(--sinaxys-primary)] underline-offset-4 hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" />
                        {reference}
                      </a>
                    ) : (
                      reference
                    )}
                  </div>
                ) : null}
                {payloadSummary ? <div className="mt-2 text-xs text-[color:var(--sinaxys-ink)]/65">{payloadSummary}</div> : null}
              </div>

              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/70 px-3 py-2 text-xs text-[color:var(--sinaxys-ink)]/72 dark:bg-[color:var(--sinaxys-tint)]/80">
                <div>submitted_by: {item.submitted_by}</div>
                <div className="mt-1">submitted_at: {formatInspectorDateTime(item.submitted_at)}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
