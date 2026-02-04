import { useMemo } from "react";
import { Building2, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";
import { brl, brlPerHourFromMonthly, HOURS_PER_MONTH } from "@/lib/costs";

export default function AdminCosts() {
  const { user, activeCompanyId } = useAuth();

  const canView = !!user && (user.role === "ADMIN" || user.role === "MASTERADMIN");
  const companyId = user?.role === "MASTERADMIN" ? activeCompanyId : user?.companyId;

  const company = useMemo(() => {
    if (!companyId) return null;
    return mockDb.getCompany(companyId);
  }, [companyId]);

  const departments = useMemo(() => {
    if (!companyId) return [];
    return mockDb.getDepartments(companyId);
  }, [companyId]);

  const users = useMemo(() => {
    if (!companyId) return [];
    return mockDb.getUsers(companyId).filter((u) => u.active);
  }, [companyId]);

  const companyMonthly = useMemo(() => {
    return users.reduce((acc, u) => acc + (u.monthlyCostBRL ?? 0), 0);
  }, [users]);

  const missingCost = useMemo(() => users.filter((u) => !u.monthlyCostBRL).length, [users]);

  const perDepartment = useMemo(() => {
    return departments
      .map((d) => {
        const deptUsers = users.filter((u) => u.departmentId === d.id && (u.role === "COLABORADOR" || u.role === "HEAD"));
        const monthly = deptUsers.reduce((acc, u) => acc + (u.monthlyCostBRL ?? 0), 0);
        const headCount = deptUsers.filter((u) => u.role === "HEAD").length;
        const colCount = deptUsers.filter((u) => u.role === "COLABORADOR").length;
        return {
          dept: d,
          monthly,
          headCount,
          colCount,
          peopleCount: deptUsers.length,
          missingCost: deptUsers.filter((u) => !u.monthlyCostBRL).length,
        };
      })
      .sort((a, b) => b.monthly - a.monthly);
  }, [departments, users]);

  if (!canView) return null;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Custo operacional — Empresa</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Visão consolidada e por departamento. Considera {HOURS_PER_MONTH}h/mês como base para custo/hora.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                  {company?.name ?? "Empresa"}
                </Badge>
                {missingCost ? (
                  <Badge className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100">
                    {missingCost} sem custo
                  </Badge>
                ) : (
                  <Badge className="rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                    Tudo precificado
                  </Badge>
                )}
              </div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Building2 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
        </div>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Total</div>
              <p className="mt-1 text-sm text-muted-foreground">Soma de salários + encargos cadastrados.</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Wallet className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <div className="text-xs text-muted-foreground">Custo mensal</div>
            <div className="text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{brl(companyMonthly)}</div>

            <div className="text-xs text-muted-foreground">Custo por hora (empresa)</div>
            <div className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">{brlPerHourFromMonthly(companyMonthly)}</div>
          </div>
        </Card>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Departamentos</div>
        <p className="mt-1 text-sm text-muted-foreground">Custo mensal e custo/hora (base {HOURS_PER_MONTH}h/mês).</p>

        <div className="mt-4 hidden overflow-hidden rounded-2xl border border-[color:var(--sinaxys-border)] md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Departamento</TableHead>
                <TableHead>Pessoas</TableHead>
                <TableHead>Custo/mês</TableHead>
                <TableHead>Custo/hora</TableHead>
                <TableHead className="text-right">Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perDepartment.map((row) => (
                <TableRow key={row.dept.id}>
                  <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">{row.dept.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.peopleCount} (Heads: {row.headCount} • Colabs: {row.colCount})
                  </TableCell>
                  <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">{brl(row.monthly)}</TableCell>
                  <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">{brlPerHourFromMonthly(row.monthly)}</TableCell>
                  <TableCell className="text-right">
                    {row.missingCost ? (
                      <Badge className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100">
                        {row.missingCost} sem custo
                      </Badge>
                    ) : (
                      <Badge className="rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Ok</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {!perDepartment.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum departamento encontrado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 grid gap-3 md:hidden">
          {perDepartment.map((row) => (
            <div key={row.dept.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{row.dept.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {row.peopleCount} pessoas • {brl(row.monthly)} / mês
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Hora: {brlPerHourFromMonthly(row.monthly)}</div>
                </div>
                {row.missingCost ? (
                  <Badge className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100">{row.missingCost}</Badge>
                ) : (
                  <Badge className="rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Ok</Badge>
                )}
              </div>
            </div>
          ))}

          {!perDepartment.length ? (
            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhum departamento.</div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
