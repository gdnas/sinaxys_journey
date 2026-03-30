import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronRight, Wallet, Plus, Receipt, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { useAuth } from "@/lib/auth";
import { brl, brlPerHourFromMonthly } from "@/lib/costs";
import { listDepartments } from "@/lib/departmentsDb";
import { listProfilesByCompany } from "@/lib/profilesDb";
import { listCostItems, listCostAllocations, type DepartmentCost } from "@/lib/costItemsDb";

function n(v: unknown) {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

function normalizeRole(raw: unknown) {
  return String(raw ?? "").trim().toUpperCase();
}

type CostPerson = {
  id: string;
  name: string;
  email: string;
  job_title: string | null;
  avatar_url: string | null;
  department_id: string | null;
  monthly_cost_brl: number | null;
  isHead?: boolean;
};

export default function AdminCosts() {
  const nav = useNavigate();
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

  const { data: costItems = [] } = useQuery({
    queryKey: ["cost-items", companyId],
    queryFn: () => listCostItems(companyId),
  });

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d] as const)), [departments]);
  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p] as const)), [profiles]);

  const headByDeptId = useMemo(() => {
    const counts = new Map<string, Map<string, number>>();

    for (const p of profiles) {
      if (!p.active) continue;
      if (!p.department_id) continue;
      if (!p.manager_id) continue;

      const deptId = p.department_id;
      const byManager = counts.get(deptId) ?? new Map<string, number>();
      byManager.set(p.manager_id, (byManager.get(p.manager_id) ?? 0) + 1);
      counts.set(deptId, byManager);
    }

    const result = new Map<string, (typeof profiles)[number]>();

    for (const [deptId, byManager] of counts.entries()) {
      const sorted = Array.from(byManager.entries()).sort((a, b) => b[1] - a[1]);
      const bestManagerId = sorted.find(([mid]) => {
        const m = profileById.get(mid);
        if (!m?.active) return false;
        const r = normalizeRole(m.role);
        return r === "HEAD" || r === "ADMIN";
      })?.[0];

      if (!bestManagerId) continue;
      const managerProfile = profileById.get(bestManagerId);
      if (managerProfile) result.set(deptId, managerProfile);
    }

    return result;
  }, [profiles, profileById]);

  const activePeople = useMemo((): CostPerson[] => {
    return profiles
      .filter((p) => p.active)
      .map((p) => ({
        id: p.id,
        name: p.name ?? p.email,
        email: p.email,
        job_title: p.job_title,
        avatar_url: p.avatar_url,
        department_id: p.department_id,
        monthly_cost_brl: p.monthly_cost_brl,
      }));
  }, [profiles]);

  const activeWithCost = useMemo(() => activePeople.filter((p) => n(p.monthly_cost_brl) > 0), [activePeople]);

  const peopleByDept = useMemo(() => {
    const m = new Map<string, CostPerson[]>();
    const memberIdByDept = new Map<string, Set<string>>();

    for (const p of activePeople) {
      const deptId = p.department_id ?? "__none__";
      const arr = m.get(deptId) ?? [];
      arr.push(p);
      m.set(deptId, arr);

      const s = memberIdByDept.get(deptId) ?? new Set<string>();
      s.add(p.id);
      memberIdByDept.set(deptId, s);
    }

    for (const d of departments) {
      const head = headByDeptId.get(d.id);
      if (!head) continue;
      if (!head.active) continue;

      const deptId = d.id;
      const already = memberIdByDept.get(deptId);
      if (already?.has(head.id)) continue;

      const arr = m.get(deptId) ?? [];
      arr.unshift({
        id: head.id,
        name: head.name ?? head.email,
        email: head.email,
        job_title: head.job_title ?? "Head de Departamento",
        avatar_url: head.avatar_url,
        department_id: head.department_id,
        monthly_cost_brl: head.monthly_cost_brl,
        isHead: true,
      });
      m.set(deptId, arr);
    }

    for (const [k, arr] of m.entries()) {
      const head = arr.find((p) => p.isHead);
      const rest = arr
        .filter((p) => !p.isHead)
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
      m.set(k, head ? [head, ...rest] : rest);
    }

    return m;
  }, [activePeople, departments, headByDeptId]);

  // Calculate department costs with expenses
  const byDept = useMemo(() => {
    const m = new Map<string, DepartmentCost & { deptId: string; deptName: string }>();
    const memberIds = new Map<string, Set<string>>();

    for (const d of departments) {
      m.set(d.id, {
        deptId: d.id,
        deptName: d.name,
        department_id: d.id,
        department_name: d.name,
        people_cost: 0,
        expense_cost: 0,
        total_cost: 0,
        people_count: 0,
      });
    }

    for (const p of activePeople) {
      const deptId = p.department_id ?? "__none__";
      const deptName = p.department_id ? deptById.get(p.department_id)?.name ?? "(departamento)" : "Sem departamento";
      const row = m.get(deptId) ?? {
        deptId,
        deptName,
        department_id: deptId,
        department_name: deptName,
        people_cost: 0,
        expense_cost: 0,
        total_cost: 0,
        people_count: 0,
      };
      row.people_cost += Math.max(0, n(p.monthly_cost_brl));
      row.people_count += 1;
      m.set(deptId, row);

      const s = memberIds.get(deptId) ?? new Set<string>();
      s.add(p.id);
      memberIds.set(deptId, s);
    }

    // Add expenses by department
    for (const costItem of costItems) {
      if (!costItem.active) continue;

      const allocations = await listCostAllocations(costItem.id);
      for (const alloc of allocations) {
        const row = m.get(alloc.department_id);
        if (row) {
          row.expense_cost += (alloc.allocation_percentage / 100) * n(costItem.total_monthly_cost);
        }
      }
    }

    // Calculate totals
    for (const row of m.values()) {
      row.total_cost = row.people_cost + row.expense_cost;
    }

    return Array.from(m.values())
      .filter((r) => r.people_count > 0)
      .sort((a, b) => b.total_cost - a.total_cost);
  }, [activePeople, departments, deptById, costItems]);

  const companyMonthly = useMemo(() => {
    const peopleTotal = activeWithCost.reduce((acc, p) => acc + Math.max(0, n(p.monthly_cost_brl)), 0);
    const expenseTotal = byDept.reduce((acc, d) => acc + d.expense_cost, 0);
    return peopleTotal + expenseTotal;
  }, [activeWithCost, byDept]);

  const companyPeopleCost = useMemo(() => {
    return activeWithCost.reduce((acc, p) => acc + Math.max(0, n(p.monthly_cost_brl)), 0);
  }, [activeWithCost]);

  const companyExpenseCost = useMemo(() => {
    return byDept.reduce((acc, d) => acc + d.expense_cost, 0);
  }, [byDept]);

  const myDeptTotal = useMemo(() => {
    if (!user.departmentId) return 0;
    return byDept.find((d) => d.deptId === user.departmentId)?.total_cost ?? 0;
  }, [byDept, user.departmentId]);

  const [openDept, setOpenDept] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  const selectedDept = useMemo(() => {
    if (!selectedDeptId) return null;
    return byDept.find((d) => d.deptId === selectedDeptId) ?? null;
  }, [byDept, selectedDeptId]);

  const selectedPeople = useMemo(() => {
    if (!selectedDeptId) return [];
    return peopleByDept.get(selectedDeptId) ?? [];
  }, [peopleByDept, selectedDeptId]);

  // Filter cost items for selected department
  const selectedDeptExpenses = useMemo(() => {
    if (!selectedDeptId) return [];
    return costItems.filter((item) => {
      if (!item.active) return false;
      // Check if this item has allocation to the selected department
      return true; // Will filter in render
    });
  }, [selectedDeptId, costItems]);

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custo Total</div>
              <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{brl(companyMonthly)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{brlPerHourFromMonthly(companyMonthly)} (soma)</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Building2 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[color:var(--sinaxys-tint)] p-3 text-xs">
            <div>
              <div className="font-medium text-[color:var(--sinaxys-ink)]">Pessoas</div>
              <div className="text-muted-foreground">{brl(companyPeopleCost)}</div>
            </div>
            <div>
              <div className="font-medium text-[color:var(--sinaxys-ink)]">Despesas</div>
              <div className="text-muted-foreground">{brl(companyExpenseCost)}</div>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pessoas com custo</div>
              <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{activeWithCost.length}</div>
              <div className="mt-1 text-xs text-muted-foreground">Apenas perfis ativos com valor > 0.</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Users className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seu departamento</div>
              <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{user.departmentId ? brl(myDeptTotal) : "—"}</div>
              <div className="mt-1 text-xs text-muted-foreground">{user.departmentId ? "Total do seu dept." : "Você está sem departamento."}</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Wallet className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Custos por departamento</div>
            <p className="mt-1 text-sm text-muted-foreground">Clique no departamento para ver a discriminação por pessoa e despesas.</p>
          </div>
          <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
            {byDept.length} dept(s)
          </Badge>
        </div>

        <Separator className="my-5" />

        <ResponsiveTable minWidth="900px">
          <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-right">Pessoas</TableHead>
                  <TableHead className="text-right">Custo Pessoas</TableHead>
                  <TableHead className="text-right">Despesas</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Custo/h</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byDept.map((d) => {
                  const isMine = !!user.departmentId && d.deptId === user.departmentId;
                  return (
                    <TableRow
                      key={d.deptId}
                      className={(isMine ? "bg-[color:var(--sinaxys-tint)]/50 " : "") + "cursor-pointer hover:bg-[color:var(--sinaxys-tint)]/40"}
                      onClick={() => {
                        setSelectedDeptId(d.deptId);
                        setOpenDept(true);
                      }}
                    >
                      <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">
                        <div className="flex items-center justify-between gap-3">
                          <span>{d.deptName}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{d.people_count}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{d.people_cost > 0 ? brl(d.people_cost) : "—"}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{d.expense_cost > 0 ? brl(d.expense_cost) : "—"}</TableCell>
                      <TableCell className="text-right font-semibold text-[color:var(--sinaxys-ink)]">{d.total_cost > 0 ? brl(d.total_cost) : "—"}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{d.total_cost > 0 ? brlPerHourFromMonthly(d.total_cost) : "—"}</TableCell>
                    </TableRow>
                  );
                })}

                {!byDept.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum colaborador ativo encontrado.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </ResponsiveTable>
      </Card>

      <Sheet
        open={openDept}
        onOpenChange={(v) => {
          setOpenDept(v);
          if (!v) setSelectedDeptId(null);
        }}
      >
        <SheetContent className="w-full max-w-[92vw] rounded-l-3xl border-l-0 p-0 sm:max-w-xl">
          <div className="p-6">
            <SheetHeader>
              <SheetTitle className="text-[color:var(--sinaxys-ink)]">{selectedDept?.deptName ?? "Departamento"}</SheetTitle>
            </SheetHeader>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                {selectedDept?.people_count ?? 0} pessoa(s)
              </Badge>
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                Total: {selectedDept ? (selectedDept.total_cost > 0 ? brl(selectedDept.total_cost) : "—") : "—"}
              </Badge>
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                {selectedDept ? (selectedDept.total_cost > 0 ? brlPerHourFromMonthly(selectedDept.total_cost) : "—") : "—"}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm">
              <div>
                <div className="font-medium text-[color:var(--sinaxys-ink)]">Custo Pessoas</div>
                <div className="text-muted-foreground">{selectedDept ? (selectedDept.people_cost > 0 ? brl(selectedDept.people_cost) : "—") : "—"}</div>
              </div>
              <div>
                <div className="font-medium text-[color:var(--sinaxys-ink)]">Despesas</div>
                <div className="text-muted-foreground">{selectedDept ? (selectedDept.expense_cost > 0 ? brl(selectedDept.expense_cost) : "—") : "—"}</div>
              </div>
            </div>
          </div>

          <Separator />

          <ScrollArea className="h-[calc(100vh-280px)] px-6 py-5">
            <div className="grid gap-4">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-[color:var(--sinaxys-ink)]">Pessoas</h3>
                <div className="grid gap-3">
                  {selectedPeople.map((p) => {
                    const cost = Math.max(0, n(p.monthly_cost_brl));
                    return (
                      <button
                        key={p.id}
                        className="group w-full rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 text-left transition hover:bg-[color:var(--sinaxys-tint)]/35"
                        onClick={() => {
                          setOpenDept(false);
                          nav(`/admin/users/${p.id}`);
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                              <span className="text-xs font-bold">{initials(p.name)}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{p.name}</div>
                                {p.isHead ? (
                                  <Badge className="h-5 rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]">Head</Badge>
                                ) : null}
                              </div>
                              <div className="mt-1 truncate text-xs text-muted-foreground">{p.job_title?.trim() ? p.job_title.trim() : "Cargo não informado"}</div>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{cost > 0 ? brl(cost) : "—"}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{cost > 0 ? brlPerHourFromMonthly(cost) : "—"}</div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="truncate">{p.email}</span>
                          <span className="font-semibold text-[color:var(--sinaxys-primary)] opacity-0 transition group-hover:opacity-100">Abrir card</span>
                        </div>
                      </button>
                    );
                  })}

                  {!selectedPeople.length ? (
                    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhuma pessoa ativa neste departamento.</div>
                  ) : null}
                </div>
              </div>

              <div className="pt-2">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Despesas</h3>
                  <Button size="sm" variant="outline" className="h-8 gap-1">
                    <Plus className="h-3 w-3" />
                    Adicionar
                  </Button>
                </div>
                <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-4 text-center text-sm text-muted-foreground">
                  <Receipt className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  Funcionalidade de despesas em desenvolvimento.
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="border-t border-[color:var(--sinaxys-border)] p-4">
            <Button variant="outline" className="h-11 w-full rounded-xl" onClick={() => setOpenDept(false)}>
              Fechar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
