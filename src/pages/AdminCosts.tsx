import { useMemo } from "react";
import { Building2, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { listDepartments } from "@/lib/departmentsDb";
import { listProfilesByCompany } from "@/lib/profilesDb";
import { brl, brlPerHourFromMonthly } from "@/lib/costs";

function n(v: unknown) {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

export default function AdminCosts() {
  const { user } = useAuth();
  if (!user || user.role !== "ADMIN" || !user.companyId) return null;

  const companyId = user.companyId;

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: () => listDepartments(companyId),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", companyId],
    queryFn: () => listProfilesByCompany(companyId),
  });

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d] as const)), [departments]);

  const activeWithCost = useMemo(() => {
    return profiles
      .filter((p) => p.active)
      .map((p) => ({
        id: p.id,
        name: p.name ?? p.email,
        email: p.email,
        department_id: p.department_id,
        monthly_cost_brl: p.monthly_cost_brl,
      }))
      .filter((p) => n(p.monthly_cost_brl) > 0);
  }, [profiles]);

  const companyMonthly = useMemo(() => activeWithCost.reduce((acc, p) => acc + n(p.monthly_cost_brl), 0), [activeWithCost]);

  const byDept = useMemo(() => {
    const m = new Map<string, { deptId: string; deptName: string; people: number; total: number }>();
    for (const p of activeWithCost) {
      const deptId = p.department_id ?? "__none__";
      const deptName = p.department_id ? deptById.get(p.department_id)?.name ?? "(departamento)" : "Sem departamento";
      const row = m.get(deptId) ?? { deptId, deptName, people: 0, total: 0 };
      row.people += 1;
      row.total += n(p.monthly_cost_brl);
      m.set(deptId, row);
    }
    return Array.from(m.values()).sort((a, b) => b.total - a.total);
  }, [activeWithCost, deptById]);

  const myDeptTotal = useMemo(() => {
    if (!user.departmentId) return 0;
    return byDept.find((d) => d.deptId === user.departmentId)?.total ?? 0;
  }, [byDept, user.departmentId]);

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Admin — Custos</div>
            <p className="mt-1 text-sm text-muted-foreground">Resumo de custo mensal (baseado em profiles.monthly_cost_brl). Inclui o próprio admin.</p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <Wallet className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Empresa</div>
              <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{brl(companyMonthly)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{brlPerHourFromMonthly(companyMonthly)} (soma)</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Building2 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pessoas com custo</div>
          <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{activeWithCost.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">Apenas perfis ativos com valor &gt; 0.</div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seu departamento</div>
          <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{user.departmentId ? brl(myDeptTotal) : "—"}</div>
          <div className="mt-1 text-xs text-muted-foreground">{user.departmentId ? "Total do seu dept." : "Você está sem departamento."}</div>
        </Card>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Custos por departamento</div>
            <p className="mt-1 text-sm text-muted-foreground">Total mensal por departamento (somatório).</p>
          </div>
          <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
            {byDept.length} dept(s)
          </Badge>
        </div>

        <Separator className="my-5" />

        <div className="overflow-x-auto rounded-2xl border border-[color:var(--sinaxys-border)]">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Departamento</TableHead>
                <TableHead className="text-right">Pessoas</TableHead>
                <TableHead className="text-right">Custo mensal</TableHead>
                <TableHead className="text-right">Custo/h</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byDept.map((d) => {
                const isMine = !!user.departmentId && d.deptId === user.departmentId;
                return (
                  <TableRow key={d.deptId} className={isMine ? "bg-[color:var(--sinaxys-tint)]/50" : undefined}>
                    <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">{d.deptName}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{d.people}</TableCell>
                    <TableCell className="text-right font-semibold text-[color:var(--sinaxys-ink)]">{brl(d.total)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{brlPerHourFromMonthly(d.total)}</TableCell>
                  </TableRow>
                );
              })}

              {!byDept.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum custo cadastrado ainda. Edite usuários e preencha “custo mensal”.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
