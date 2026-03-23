import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { listVacationRequestsForApprover } from "@/lib/vacationDb";

export function VacationSummaryCard() {
  const { user } = useAuth();
  const { companyId } = useCompany();

  const canSee = !!user && !!companyId && (user.role === "ADMIN" || user.role === "HEAD");

  const { data: rows = [] } = useQuery({
    queryKey: ["vacation", "approver", companyId],
    enabled: canSee,
    queryFn: () => listVacationRequestsForApprover(String(companyId)),
  });

  const pending = useMemo(() => rows.filter((r) => r.status === "PENDING").length, [rows]);

  if (!canSee) return null;

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5 transition hover:bg-[color:var(--sinaxys-tint)]/30">
      <Link to="/vacation/approvals" className="block">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Indisponibilidade</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">{pending}</div>
            <div className="mt-1 text-xs text-muted-foreground">Solicitações pendentes para revisar</div>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
            <CalendarCheck2 className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4">
          <Badge className="rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
            Abrir aprovações
          </Badge>
        </div>
      </Link>
    </Card>
  );
}
