import { Activity, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { DbCommitment } from "@/lib/commitmentsDb";
import {
  getCommitmentHealthLabel,
  getCommitmentStatusLabel,
  getHealthBadgeClass,
  getStatusBadgeClass,
} from "@/components/commitments/commitmentInspectorFormat";

export function CommitmentInspectorStatusHealth({ commitment }: { commitment: DbCommitment }) {
  return (
    <Card className="rounded-[28px] border-[color:var(--sinaxys-border)] bg-white/95 p-5 shadow-sm dark:bg-[color:var(--sinaxys-tint)]/85">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--sinaxys-primary)]">Faixa operacional</div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">Status e health materializados</h2>
          <p className="mt-2 text-sm text-[color:var(--sinaxys-ink)]/70">Leitura direta do compromisso sem métricas derivadas.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[24px] border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/60 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--sinaxys-primary)]">
              <Activity className="h-3.5 w-3.5" />
              Status
            </div>
            <Badge className={`mt-3 rounded-full border px-3 py-1 text-sm ${getStatusBadgeClass(commitment.status)}`}>
              {getCommitmentStatusLabel(commitment.status)}
            </Badge>
          </div>

          <div className="rounded-[24px] border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/60 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--sinaxys-primary)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Health
            </div>
            <Badge className={`mt-3 rounded-full border px-3 py-1 text-sm ${getHealthBadgeClass(commitment.health)}`}>
              {getCommitmentHealthLabel(commitment.health)}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
