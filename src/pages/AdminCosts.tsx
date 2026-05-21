import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronRight, Pencil, Plus, Receipt, Trash2, Wallet } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { ExpenseItemDialog } from "@/components/costs/ExpenseItemDialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { brl } from "@/lib/costs";
import {
  deleteCostItem,
  listCostAllocations,
  listCostItems,
  type CostAllocation,
  type CostItem,
} from "@/lib/costItemsDb";
import { listDepartments } from "@/lib/departmentsDb";
import { listProfilesByCompany } from "@/lib/profilesDb";

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

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function prorateForCurrentMonth(monthlyCost: number | null | undefined, scheduledAtIso: string | null | undefined) {
  const cost = typeof monthlyCost === "number" ? monthlyCost : monthlyCost ? Number(monthlyCost) : 0;
  if (!cost || cost <= 0) return 0;
  if (!scheduledAtIso) return cost;

  try {
    const sched = new Date(scheduledAtIso);
    const now = new Date();
    if (sched.getFullYear() > now.getFullYear() || (sched.getFullYear() === now.getFullYear() && sched.getMonth() > now.getMonth())) {
      return cost;
    }
    if (sched.getFullYear() === now.getFullYear() && sched.getMonth() === now.getMonth()) {
      const daysThisMonth = daysInMonth(now);
      const dayNow = now.getDate();
      const daySched = sched.getDate();
      const remaining = Math.max(0, daySched - dayNow);
      return Math.round(cost * (remaining / daysThisMonth));
    }
    if (sched < now) return 0;
    return cost;
  } catch {
    return cost;
  }
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

type DepartmentRow = {
  deptId: string;
  deptName: string;
  people: number;
  peopleCost: number;
  expenseCost: number;
  total: number;
};

type DepartmentExpenseRow = {
  itemId: string;
  name: string;
  category: string | null;
  billingCycle: CostItem["billing_cycle"];
  notes: string | null;
  allocatedCost: number;
  allocationPercentage: number;
};

export default function AdminCosts() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const companyId = user?.companyId ?? (user as any)?.company_id ?? null;
  const myDepartmentId = user?.departmentId ?? (user as any)?.department_id ?? null;

  const [openDept, setOpenDept] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<CostItem | null>(null);

  if (!user || !["MASTERADMIN", "ADMIN"].includes(user.role) || !companyId) return null;

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: () => listDepartments(companyId),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", companyId],
    queryFn: () => listProfilesByCompany(companyId),
  });

  const { data: costItems = [] } = useQuery({
    queryKey: ["cost-items", companyId, "all"],
    queryFn: () => listCostItems(companyId, true),
  });

  const { data: allocationsByItem = {} } = useQuery({
    queryKey: ["cost-allocations-by-item", companyId, costItems.map((item) => item.id).join(",")],
    enabled: costItems.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        costItems.map(async (item) => [item.id, await listCostAllocations(item.id)] as const),
      );
      return Object.fromEntries(entries) as Record<string, CostAllocation[]>;
    },
  });

  const deptById = useMemo(() => new Map(departments.map((department) => [department.id, department] as const)), [departments]);
  const profileById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile] as const)), [profiles]);
  const nowIso = useMemo(() => new Date().toISOString(), []);

  const headByDeptId = useMemo(() => {
    const counts = new Map<string, Map<string, number>>();

    for (const profile of profiles) {
      if (!profile.active || !profile.department_id || !profile.manager_id) continue;
      const byManager = counts.get(profile.department_id) ?? new Map<string, number>();
      byManager.set(profile.manager_id, (byManager.get(profile.manager_id) ?? 0) + 1);
      counts.set(profile.department_id, byManager);
    }

    const result = new Map<string, (typeof profiles)[number]>();

    for (const [deptId, byManager] of counts.entries()) {
      const bestManagerId = Array.from(byManager.entries())
        .sort((a, b) => b[1] - a[1])
        .find(([managerId]) => {
          const manager = profileById.get(managerId);
          if (!manager?.active) return false;
          const role = normalizeRole(manager.role);
          return role === "HEAD" || role === "ADMIN";
        })?.[0];

      if (!bestManagerId) continue;
      const managerProfile = profileById.get(bestManagerId);
      if (managerProfile) result.set(deptId, managerProfile);
    }

    return result;
  }, [profiles, profileById]);

  const activePeople = useMemo((): CostPerson[] => {
    return profiles
      .filter((profile) => {
        if (profile.active) return true;
        if (profile.offboarding_state !== "PENDING") return false;
        const scheduledAt = profile.offboarding_scheduled_at;
        if (!scheduledAt) return true;
        try {
          return new Date(scheduledAt).toISOString() > nowIso;
        } catch {
          return true;
        }
      })
      .map((profile) => ({
        id: profile.id,
        name: profile.name ?? profile.email,
        email: profile.email,
        job_title: profile.job_title,
        avatar_url: profile.avatar_url,
        department_id: profile.department_id,
        monthly_cost_brl: profile.monthly_cost_brl,
      }));
  }, [profiles, nowIso]);

  const activeCostItems = useMemo(() => costItems.filter((item) => item.active), [costItems]);

  const peopleByDept = useMemo(() => {
    const map = new Map<string, CostPerson[]>();
    const memberIds = new Map<string, Set<string>>();

    for (const person of activePeople) {
      const deptId = person.department_id ?? "__none__";
      const list = map.get(deptId) ?? [];
      list.push(person);
      map.set(deptId, list);

      const ids = memberIds.get(deptId) ?? new Set<string>();
      ids.add(person.id);
      memberIds.set(deptId, ids);
    }

    for (const department of departments) {
      const head = headByDeptId.get(department.id);
      if (!head?.active) continue;
      const ids = memberIds.get(department.id);
      if (ids?.has(head.id)) continue;

      const list = map.get(department.id) ?? [];
      list.unshift({
        id: head.id,
        name: head.name ?? head.email,
        email: head.email,
        job_title: head.job_title ?? "Head de Departamento",
        avatar_url: head.avatar_url,
        department_id: head.department_id,
        monthly_cost_brl: head.monthly_cost_brl,
        isHead: true,
      });
      map.set(department.id, list);
    }

    for (const [deptId, list] of map.entries()) {
      const head = list.find((person) => person.isHead);
      const others = list.filter((person) => !person.isHead).sort((a, b) => a.name.localeCompare(b.name));
      map.set(deptId, head ? [head, ...others] : others);
    }

    return map;
  }, [activePeople, departments, headByDeptId]);

  const departmentExpenses = useMemo(() => {
    const map = new Map<string, DepartmentExpenseRow[]>();

    for (const item of activeCostItems) {
      const allocations = allocationsByItem[item.id] ?? [];
      for (const allocation of allocations) {
        const allocatedCost = (n(item.total_monthly_cost) * n(allocation.allocation_percentage)) / 100;
        const list = map.get(allocation.department_id) ?? [];
        list.push({
          itemId: item.id,
          name: item.name,
          category: item.category,
          billingCycle: item.billing_cycle,
          notes: item.notes,
          allocatedCost,
          allocationPercentage: n(allocation.allocation_percentage),
        });
        map.set(allocation.department_id, list);
      }
    }

    for (const [deptId, list] of map.entries()) {
      map.set(
        deptId,
        [...list].sort((a, b) => b.allocatedCost - a.allocatedCost || a.name.localeCompare(b.name)),
      );
    }

    return map;
  }, [activeCostItems, allocationsByItem]);

  const byDept = useMemo(() => {
    const map = new Map<string, DepartmentRow>();
    const memberIds = new Map<string, Set<string>>();

    for (const department of departments) {
      map.set(department.id, {
        deptId: department.id,
        deptName: department.name,
        people: 0,
        peopleCost: 0,
        expenseCost: 0,
        total: 0,
      });
    }

    for (const person of activePeople) {
      const deptId = person.department_id ?? "__none__";
      const deptName = person.department_id ? deptById.get(person.department_id)?.name ?? "(departamento)" : "Sem departamento";
      const row = map.get(deptId) ?? { deptId, deptName, people: 0, peopleCost: 0, expenseCost: 0, total: 0 };
      row.people += 1;
      row.peopleCost += Math.max(0, n(person.monthly_cost_brl));
      row.total = row.peopleCost + row.expenseCost;
      map.set(deptId, row);

      const ids = memberIds.get(deptId) ?? new Set<string>();
      ids.add(person.id);
      memberIds.set(deptId, ids);
    }

    for (const department of departments) {
      const head = headByDeptId.get(department.id);
      if (!head?.active) continue;
      const ids = memberIds.get(department.id);
      if (ids?.has(head.id)) continue;

      const row = map.get(department.id) ?? { deptId: department.id, deptName: department.name, people: 0, peopleCost: 0, expenseCost: 0, total: 0 };
      row.people += 1;
      row.peopleCost += Math.max(0, n(head.monthly_cost_brl));
      row.total = row.peopleCost + row.expenseCost;
      map.set(department.id, row);
    }

    for (const [deptId, expenses] of departmentExpenses.entries()) {
      const departmentName = deptById.get(deptId)?.name ?? "Departamento";
      const row = map.get(deptId) ?? { deptId, deptName: departmentName, people: 0, peopleCost: 0, expenseCost: 0, total: 0 };
      row.expenseCost += expenses.reduce((sum, expense) => sum + expense.allocatedCost, 0);
      row.total = row.peopleCost + row.expenseCost;
      map.set(deptId, row);
    }

    return Array.from(map.values())
      .filter((row) => row.people > 0 || row.expenseCost > 0)
      .sort((a, b) => b.total - a.total || a.deptName.localeCompare(b.deptName));
  }, [activePeople, departments, departmentExpenses, deptById, headByDeptId]);

  const companyPeopleCost = useMemo(() => {
    let sum = 0;
    for (const profile of profiles) {
      if (!(profile.active || profile.offboarding_state === "PENDING")) continue;
      const scheduledAt = profile.offboarding_scheduled_at;
      const include = profile.active || (profile.offboarding_state === "PENDING" && (!scheduledAt || new Date(scheduledAt).toISOString() > nowIso));
      if (!include) continue;
      sum += prorateForCurrentMonth(n(profile.monthly_cost_brl), profile.offboarding_scheduled_at);
    }
    return sum;
  }, [profiles, nowIso]);

  const companyExpenseCost = useMemo(
    () => Array.from(departmentExpenses.values()).flat().reduce((sum, expense) => sum + expense.allocatedCost, 0),
    [departmentExpenses],
  );

  const companyMonthly = companyPeopleCost + companyExpenseCost;

  const offboardingTotals = useMemo(() => {
    let count = 0;
    let total = 0;
    for (const profile of profiles) {
      if (profile.offboarding_state !== "PENDING") continue;
      const scheduledAt = profile.offboarding_scheduled_at;
      const stillCounted = !scheduledAt || new Date(scheduledAt).toISOString() > nowIso;
      if (!stillCounted) continue;
      count += 1;
      total += prorateForCurrentMonth(n(profile.monthly_cost_brl), scheduledAt);
    }
    return { count, total };
  }, [profiles, nowIso]);

  const activeWithCost = useMemo(() => activePeople.filter((person) => n(person.monthly_cost_brl) > 0), [activePeople]);

  const myDeptTotal = useMemo(() => {
    if (!myDepartmentId) return 0;
    return byDept.find((row) => row.deptId === myDepartmentId)?.total ?? 0;
  }, [byDept, myDepartmentId]);

  const selectedDept = useMemo(() => {
    if (!selectedDeptId) return null;
    return byDept.find((row) => row.deptId === selectedDeptId) ?? null;
  }, [byDept, selectedDeptId]);

  const selectedPeople = useMemo(() => {
    if (!selectedDeptId) return [];
    return peopleByDept.get(selectedDeptId) ?? [];
  }, [peopleByDept, selectedDeptId]);

  const selectedDeptExpenses = useMemo(() => {
    if (!selectedDeptId) return [];
    return departmentExpenses.get(selectedDeptId) ?? [];
  }, [departmentExpenses, selectedDeptId]);

  async function refreshCosts() {
    await queryClient.invalidateQueries({ queryKey: ["cost-items", companyId] });
    await queryClient.invalidateQueries({ queryKey: ["cost-items", companyId, "all"] });
    await queryClient.invalidateQueries({ queryKey: ["cost-allocations-by-item", companyId] });
  }

  async function handleDeleteExpense(item: CostItem) {
    if (!window.confirm(`Excluir a despesa "${item.name}"?`)) return;

    try {
      await deleteCostItem(item.id);
      await refreshCosts();
      toast({ title: "Despesa removida", description: "A ferramenta/despesa foi excluída com sucesso." });
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: error instanceof Error ? error.message : "Não foi possível excluir a despesa.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custo total</div>
              <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{brl(companyMonthly)}</div>
              <div className="mt-2 text-xs text-muted-foreground">Pessoas + ferramentas + demais despesas</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Building2 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pessoas</div>
          <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{brl(companyPeopleCost)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{activeWithCost.length} pessoa(s) com custo cadastrado</div>
          {offboardingTotals.count ? (
            <div className="mt-3 text-xs text-amber-900">{offboardingTotals.count} em desligamento • {offboardingTotals.total > 0 ? brl(offboardingTotals.total) : "—"}</div>
          ) : null}
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ferramentas e despesas</div>
          <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{brl(companyExpenseCost)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{activeCostItems.length} despesa(s) ativa(s)</div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seu departamento</div>
          <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{myDepartmentId ? brl(myDeptTotal) : "—"}</div>
          <div className="mt-1 text-xs text-muted-foreground">{myDepartmentId ? "Total do seu dept." : "Você está sem departamento."}</div>
        </Card>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Ferramentas e despesas não-humanas</div>
            <p className="mt-1 text-sm text-muted-foreground">Cadastre SaaS, licenças, fornecedores, mídia, infraestrutura e rateie por departamento.</p>
          </div>
          <Button
            className="rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
            onClick={() => {
              setEditingExpense(null);
              setExpenseDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />Nova despesa
          </Button>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-4 lg:grid-cols-2">
          {costItems.map((item) => {
            const allocations = allocationsByItem[item.id] ?? [];
            const ownerDepartmentName = item.owner_department_id ? deptById.get(item.owner_department_id)?.name ?? "Departamento" : null;
            return (
              <Card key={item.id} className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/35 p-5 shadow-none">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-base font-semibold text-[color:var(--sinaxys-ink)]">{item.name}</div>
                      <Badge className={item.active ? "rounded-full bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10" : "rounded-full bg-slate-500/10 text-slate-700 hover:bg-slate-500/10"}>
                        {item.active ? "Ativa" : "Inativa"}
                      </Badge>
                      <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                        {item.is_shared ? "Compartilhada" : "Exclusiva"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{item.category || "Sem categoria"}</span>
                      <span>•</span>
                      <span>{item.billing_cycle === "monthly" ? "Mensal" : item.billing_cycle === "annual" ? "Anual" : "Única"}</span>
                      <span>•</span>
                      <span>{item.type === "fixed" ? "Fixa" : "Variável"}</span>
                    </div>
                    {item.notes ? <p className="mt-3 text-sm text-muted-foreground">{item.notes}</p> : null}
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">{brl(n(item.total_monthly_cost))}</div>
                    <div className="text-xs text-muted-foreground">equivalente mensal</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {ownerDepartmentName ? (
                    <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">Dono: {ownerDepartmentName}</Badge>
                  ) : null}
                  {allocations.map((allocation) => (
                    <Badge key={allocation.id} className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                      {(allocation.department_name || deptById.get(allocation.department_id)?.name || "Departamento")} · {n(allocation.allocation_percentage).toFixed(0)}%
                    </Badge>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      setEditingExpense(item);
                      setExpenseDialogOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />Editar
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleDeleteExpense(item)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />Excluir
                  </Button>
                </div>
              </Card>
            );
          })}

          {!costItems.length && (
            <Card className="rounded-3xl border-dashed border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/35 p-8 text-center text-sm text-muted-foreground lg:col-span-2">
              Nenhuma despesa cadastrada ainda. Use “Nova despesa” para lançar ferramentas, softwares e fornecedores.
            </Card>
          )}
        </div>
      </Card>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Custos por departamento</div>
            <p className="mt-1 text-sm text-muted-foreground">Agora o consolidado inclui pessoas e ferramentas/despesas rateadas.</p>
          </div>
          <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
            {byDept.length} dept(s)
          </Badge>
        </div>

        <Separator className="my-5" />

        <ResponsiveTable minWidth="920px">
          <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white">
            <Table className="min-w-[920px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-right">Pessoas</TableHead>
                  <TableHead className="text-right">Custo pessoas</TableHead>
                  <TableHead className="text-right">Despesas</TableHead>
                  <TableHead className="text-right">Total mensal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byDept.map((row) => {
                  const isMine = !!myDepartmentId && row.deptId === myDepartmentId;
                  return (
                    <TableRow
                      key={row.deptId}
                      className={(isMine ? "bg-[color:var(--sinaxys-tint)]/55 " : "") + "cursor-pointer hover:bg-[color:var(--sinaxys-tint)]/40"}
                      onClick={() => {
                        setSelectedDeptId(row.deptId);
                        setOpenDept(true);
                      }}
                    >
                      <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">
                        <div className="flex items-center justify-between gap-3">
                          <span>{row.deptName}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{row.people}</TableCell>
                      <TableCell className="text-right">{row.peopleCost > 0 ? brl(row.peopleCost) : "—"}</TableCell>
                      <TableCell className="text-right">{row.expenseCost > 0 ? brl(row.expenseCost) : "—"}</TableCell>
                      <TableCell className="text-right font-semibold text-[color:var(--sinaxys-ink)]">{row.total > 0 ? brl(row.total) : "—"}</TableCell>
                    </TableRow>
                  );
                })}

                {!byDept.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum custo encontrado ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </ResponsiveTable>
      </Card>

      <Sheet
        open={openDept}
        onOpenChange={(nextOpen) => {
          setOpenDept(nextOpen);
          if (!nextOpen) setSelectedDeptId(null);
        }}
      >
        <SheetContent className="w-full max-w-[95vw] rounded-l-3xl border-l-0 p-0 sm:max-w-2xl">
          <div className="p-6">
            <SheetHeader>
              <SheetTitle className="text-[color:var(--sinaxys-ink)]">{selectedDept?.deptName ?? "Departamento"}</SheetTitle>
            </SheetHeader>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">{selectedDept?.people ?? 0} pessoa(s)</Badge>
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">Pessoas: {selectedDept ? brl(selectedDept.peopleCost) : "—"}</Badge>
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">Despesas: {selectedDept ? brl(selectedDept.expenseCost) : "—"}</Badge>
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">Total: {selectedDept ? brl(selectedDept.total) : "—"}</Badge>
            </div>

            <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
              Esta visão mostra tanto custos de pessoas quanto ferramentas e despesas rateadas para o departamento.
            </div>
          </div>

          <Separator />

          <ScrollArea className="h-[calc(100vh-220px)] px-6 py-5">
            <div className="grid gap-6">
              <section className="grid gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                  <Wallet className="h-4 w-4" />Pessoas
                </div>

                {selectedPeople.map((person) => {
                  const cost = Math.max(0, n(person.monthly_cost_brl));
                  return (
                    <button
                      key={person.id}
                      className="group w-full rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 text-left transition hover:bg-[color:var(--sinaxys-tint)]/35"
                      onClick={() => {
                        setOpenDept(false);
                        nav(`/admin/users/${person.id}`);
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                            <span className="text-xs font-bold">{initials(person.name)}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{person.name}</div>
                              {person.isHead ? <Badge className="h-5 rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]">Head</Badge> : null}
                            </div>
                            <div className="mt-1 truncate text-xs text-muted-foreground">{person.job_title?.trim() ? person.job_title.trim() : "Cargo não informado"}</div>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{cost > 0 ? brl(cost) : "—"}</div>
                          <div className="mt-1 text-xs text-muted-foreground">mensal</div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {!selectedPeople.length && <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhuma pessoa ativa neste departamento.</div>}
              </section>

              <section className="grid gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                  <Receipt className="h-4 w-4" />Ferramentas e despesas
                </div>

                {selectedDeptExpenses.map((expense) => (
                  <div key={`${expense.itemId}-${expense.name}`} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{expense.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {expense.category || "Sem categoria"} • {expense.billingCycle === "monthly" ? "Mensal" : expense.billingCycle === "annual" ? "Anual" : "Única"} • {expense.allocationPercentage.toFixed(0)}%
                        </div>
                        {expense.notes ? <div className="mt-2 text-sm text-muted-foreground">{expense.notes}</div> : null}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{brl(expense.allocatedCost)}</div>
                        <div className="text-xs text-muted-foreground">parcela do dept.</div>
                      </div>
                    </div>
                  </div>
                ))}

                {!selectedDeptExpenses.length && <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhuma despesa rateada para este departamento.</div>}
              </section>
            </div>
          </ScrollArea>

          <div className="border-t border-[color:var(--sinaxys-border)] p-4">
            <Button variant="outline" className="h-11 w-full rounded-xl" onClick={() => setOpenDept(false)}>
              Fechar
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ExpenseItemDialog
        open={expenseDialogOpen}
        onOpenChange={(nextOpen) => {
          setExpenseDialogOpen(nextOpen);
          if (!nextOpen) setEditingExpense(null);
        }}
        companyId={companyId}
        departments={departments.map((department) => ({ id: department.id, name: department.name }))}
        costItem={editingExpense}
        initialAllocations={editingExpense ? allocationsByItem[editingExpense.id] ?? [] : []}
        onSaved={refreshCosts}
      />
    </div>
  );
}
