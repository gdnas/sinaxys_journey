import { Badge } from "@/components/ui/badge";
import type { DbCommitmentDependency } from "@/lib/commitmentsDb";
import { CommitmentInspectorEmptyState } from "@/components/commitments/CommitmentInspectorEmptyState";
import {
  formatInspectorDateTime,
  getDependencyReference,
} from "@/components/commitments/commitmentInspectorFormat";

export function CommitmentDependenciesList({ dependencies }: { dependencies: DbCommitmentDependency[] }) {
  if (!dependencies.length) {
    return <CommitmentInspectorEmptyState message="Sem dependências abertas" />;
  }

  return (
    <div className="space-y-3">
      {dependencies.map((dependency) => (
        <div key={dependency.id} className="rounded-[24px] border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/55 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border border-[color:var(--sinaxys-border)] bg-white/80 text-[color:var(--sinaxys-ink)] dark:bg-[color:var(--sinaxys-tint)]/80">
                  {dependency.dependency_kind}
                </Badge>
                <Badge className="rounded-full border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  {dependency.depends_on_type}
                </Badge>
                <Badge className={`rounded-full border ${dependency.is_blocking ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200" : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"}`}>
                  {dependency.is_blocking ? "Bloqueante" : "Não bloqueante"}
                </Badge>
              </div>
              <div className="mt-3 break-all text-sm font-medium text-[color:var(--sinaxys-ink)]">{getDependencyReference(dependency)}</div>
              {dependency.external_label ? (
                <div className="mt-2 text-xs text-[color:var(--sinaxys-ink)]/65">external_label: {dependency.external_label}</div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/70 px-3 py-2 text-xs text-[color:var(--sinaxys-ink)]/72 dark:bg-[color:var(--sinaxys-tint)]/80">
              <div>status: {dependency.status}</div>
              <div className="mt-1">due_at: {formatInspectorDateTime(dependency.due_at)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
