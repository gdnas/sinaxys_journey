import { CalendarDays, FileText, Flag, Layers3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { DbCommitment } from "@/lib/commitmentsDb";
import {
  formatInspectorDate,
  getCommitmentFieldLabel,
} from "@/components/commitments/commitmentInspectorFormat";

function MetadataItem({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/55 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--sinaxys-primary)]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-[color:var(--sinaxys-ink)]">{value}</div>
    </div>
  );
}

export function CommitmentInspectorHeader({ commitment }: { commitment: DbCommitment }) {
  const chips = [
    getCommitmentFieldLabel(commitment.category),
    getCommitmentFieldLabel(commitment.priority),
    getCommitmentFieldLabel(commitment.commitment_type),
  ].filter(Boolean) as string[];

  return (
    <Card className="overflow-hidden rounded-[32px] border-[color:var(--sinaxys-border)] bg-white/95 shadow-sm dark:bg-[color:var(--sinaxys-tint)]/85">
      <div className="space-y-6 p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/70 px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]/75">
              <FileText className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" />
              Commitment Inspector
            </div>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-[color:var(--sinaxys-ink)] sm:text-4xl">
              {commitment.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[color:var(--sinaxys-ink)]/70">
              <span className="rounded-full border border-[color:var(--sinaxys-border)] bg-white/70 px-3 py-1 font-mono text-xs dark:bg-[color:var(--sinaxys-tint)]/70">
                {commitment.code}
              </span>
              {chips.map((chip) => (
                <Badge
                  key={chip}
                  variant="secondary"
                  className="rounded-full border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/70 px-3 py-1 text-[color:var(--sinaxys-ink)]"
                >
                  {chip}
                </Badge>
              ))}
            </div>
            {commitment.description ? (
              <p className="mt-4 max-w-3xl text-sm leading-6 text-[color:var(--sinaxys-ink)]/78 sm:text-base">{commitment.description}</p>
            ) : null}
            {commitment.purpose ? (
              <div className="mt-4 rounded-[24px] border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/60 p-4 text-sm leading-6 text-[color:var(--sinaxys-ink)]/82">
                <span className="font-semibold text-[color:var(--sinaxys-ink)]">Purpose:</span> {commitment.purpose}
              </div>
            ) : null}
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-[360px] lg:grid-cols-1">
            <MetadataItem icon={CalendarDays} label="Início" value={formatInspectorDate(commitment.start_date)} />
            <MetadataItem icon={Flag} label="Prazo" value={formatInspectorDate(commitment.due_date)} />
            <MetadataItem icon={Layers3} label="Criado em" value={formatInspectorDate(commitment.created_at)} />
          </div>
        </div>
      </div>
    </Card>
  );
}
