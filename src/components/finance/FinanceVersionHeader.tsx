import { ArrowLeft, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FinanceVersion } from "@/lib/financeDb";

export function FinanceVersionHeader({
  version,
  onLock,
  saving,
  canEdit,
}: {
  version: FinanceVersion;
  onLock: () => void;
  saving: boolean;
  canEdit: boolean;
}) {
  return (
    <section className="rounded-[28px] border border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="h-9 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 px-4 text-[color:var(--sinaxys-ink)] hover:bg-white/5">
              <Link to="/finance/versions"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link>
            </Button>
            <Badge className={version.status === "locked" ? "rounded-full bg-slate-500/10 text-slate-700 hover:bg-slate-500/10" : "rounded-full bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10"}>{version.status}</Badge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">{version.name}</h1>
          <p className="mt-3 text-sm text-[color:var(--sinaxys-ink)]/70 md:text-base">
            {version.scenario?.name ?? "Sem cenário"} · {version.period_type} {version.fiscal_year}
            {version.fiscal_quarter ? ` · Q${version.fiscal_quarter}` : ""}
            {version.fiscal_month ? ` · M${version.fiscal_month}` : ""}
          </p>
        </div>
        {canEdit && version.status !== "locked" && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={onLock} disabled={saving} className="rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
              <Lock className="mr-2 h-4 w-4" />
              {saving ? "Bloqueando..." : "Bloquear versão"}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}