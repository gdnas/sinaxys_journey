import { useMemo, useState } from "react";
import { Building2, Receipt, UserRound, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { useAuth } from "@/lib/auth";
import { isCompanyWideDepartmentName } from "@/lib/companyWideDepartment";
import { brl } from "@/lib/costs";
import { listCostAllocations, listCostItems, type CostAllocation, type CostItem } from "@/lib/costItemsDb";
import { listDepartments } from "@/lib/departmentsDb";
import { listProfilesByCompany } from "@/lib/profilesDb";

function n(v: unknown) {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

function billingCycleLabel(value: CostItem["billing_cycle"]) {
  if (value === "monthly") return "Mensal";
  if (value === "annual") return "Anual";
  return "Única";
}

type DepartmentExpenseRow = {
  itemId: string;
  name: string;
  category: string | null;
  billingCycle: CostItem["billing_cycle"];
  allocatedCost: number;
  allocationPercentage: number;
  notes: string | null;
  targetProfileName: string | null;
};

export default function HeadCosts() {
  const { user } = useAuth();
  const companyId = user?.companyId ?? (user as any)?.company_id ?? null;
  const myDeptId = user?.departmentId ?? (user as any)?.department_id ?? null;
  const [expenseSearch, setExpenseSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  if (!user || user.role !== "HEAD" || !companyId) return null;

  if (!myDeptId) {
    return (
      <div className="grid gap-6">
        <div className="rounded-3xl border bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Head — Custos</div>
              <p className="mt-1 text-sm text-muted-foreground">Você está sem departamento. Defina seu departamento em Usuários/Organograma.</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Wallet className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: () => listDepartments(companyId),
  });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles-dept", companyId, myDeptId],
    queryFn: () => listProfilesByCompany(companyId),
  });

  const { data: costItems = [] } = useQuery({
    queryKey: ["cost-items", companyId],
    queryFn: () => listCostItems(companyId),
  });

  const { data: allocationsByItem = {} } = useQuery({
    queryKey: ["cost-allocations-by-item", companyId, costItems.map((item) => item.id).join(",")],
    enabled: costItems.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(costItems.map(async (item) => [item.id, await listCostAllocations(item.id)] as const));
      return Object.fromEntries(entries) as Record<string, CostAllocation[]>;
    },
  });

  const costDepartmentIds = useMemo(
    () => new Set(departments.filter((department) => !isCompanyWideDepartmentName(department.name)).map((department) => department.id)),
    [departments],
  );
  const profileById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile] as const)), [profiles]);
  const deptName = useMemo(() => departments.find((department) => department.id === myDeptId)?.name ?? "Departamento", [departments, myDeptId]);

  const people = useMemo(() => {
    return profiles
      .filter((profile) => profile.active)
      .filter((profile) => profile.department_id === myDeptId)
      .map((profile) => ({
        id: profile.id,
        name: profile.name ?? profile.email,
        job_title: profile.job_title,
        monthly_cost_brl: profile.monthly_cost_brl,
      }))
      .filter((profile) => n(profile.monthly_cost_brl) > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [profiles, myDeptId]);

  const deptMonthly = useMemo(() => people.reduce((sum, person) => sum + n(person.monthly_cost_brl), 0), [people]);

  const departmentExpenses = useMemo(() => {
    const rows: DepartmentExpenseRow[] = [];

    for (const item of costItems) {
      const allocations = allocationsByItem[item.id] ?? [];
      const targetProfileName = item.target_profile_id
        ? profileById.get(item.target_profile_id)?.name ?? profileById.get(item.target_profile_id)?.email ?? null
        : null;
      for (const allocation of allocations) {
        if (allocation.department_id !== myDeptId || !costDepartmentIds.has(allocation.department_id)) continue;
        rows.push({
          itemId: item.id,
          name: item.name,
          category: item.category,
          billingCycle: item.billing_cycle,
          allocatedCost: (n(item.total_monthly_cost) * n(allocation.allocation_percentage)) / 100,
          allocationPercentage: n(allocation.allocation_percentage),
          notes: item.notes,
          targetProfileName,
        });
      }
    }

    return rows.sort((a, b) => b.allocatedCost - a.allocatedCost || a.name.localeCompare(b.name));
  }, [allocationsByItem, costDepartmentIds, costItems, myDeptId, profileById]);

  const expenseCategories = useMemo(() => {
    return Array.from(new Set(departmentExpenses.map((expense) => expense.category?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));
  }, [departmentExpenses]);

  const filteredDepartmentExpenses = useMemo(() => {
    return departmentExpenses.filter((expense) => {
      const matchesSearch = !expenseSearch.trim() || [expense.name, expense.category, expense.notes, expense.targetProfileName]
        .some((value) => value?.toLowerCase().includes(expenseSearch.trim().toLowerCase()));
      const matchesCategory = categoryFilter === "all" || (expense.category ?? "") === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, departmentExpenses, expenseSearch]);

  const deptExpenses = useMemo(() => departmentExpenses.reduce((sum, expense) => sum + expense.allocatedCost, 0), [departmentExpenses]);
  const filteredDeptExpenses = useMemo(() => filteredDepartmentExpenses.reduce((sum, expense) => sum + expense.allocatedCost, 0), [filteredDepartmentExpenses]);
  const deptTotal = deptMonthly + deptExpenses;

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Head — Custos</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Visão de custos do seu departamento: <span className="font-medium text-[color:var(--sinaxys-ink)]">{deptName}</span>.
            </p>
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
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Departamento</div>
              <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{brl(deptTotal)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Total com pessoas + despesas rateadas</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Building2 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pessoas</div>
          <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{brl(deptMonthly)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{people.length} pessoa(s) com custo no departamento</div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ferramentas, reembolsos e despesas</div>
          <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{brl(deptExpenses)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{departmentExpenses.length} item(ns) rateado(s) para o seu departamento</div>
        </Card>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Discriminação por pessoa</div>
            <p className="mt-1 text-sm text-muted-foreground">Resumo apenas do seu departamento.</p>
          </div>
          <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">{deptName}</Badge>
        </div>

        <Separator className="my-5" />

        <ResponsiveTable minWidth="760px">
          <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="text-right">Custo mensal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.map((person) => (
                  <TableRow key={person.id} className="hover:bg-[color:var(--sinaxys-tint)]/40">
                    <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">{person.name}</TableCell>
                    <TableCell className="text-muted-foreground">{person.job_title?.trim() ? person.job_title.trim() : "—"}</TableCell>
                    <TableCell className="text-right font-semibold text-[color:var(--sinaxys-ink)]">{brl(n(person.monthly_cost_brl))}</TableCell>
                  </TableRow>
                ))}

                {!people.length && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum custo de pessoa cadastrado no seu departamento.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </ResponsiveTable>
      </Card>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-ink)]">
              <Receipt className="h-4 w-4" />Ferramentas, reembolsos e despesas rateadas
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Aqui entram licenças, softwares, fornecedores, reembolsos e outras despesas alocadas ao seu departamento.</p>
          </div>
          <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
            Filtrado: {brl(filteredDeptExpenses)}
          </Badge>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-3 md:grid-cols-[1.4fr_220px]">
          <Input value={expenseSearch} onChange={(e) => setExpenseSearch(e.target.value)} placeholder="Buscar despesa ou colaborador" className="h-11 rounded-2xl" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {expenseCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
            {filteredDepartmentExpenses.length} despesa(s)
          </Badge>
          <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
            {expenseCategories.length || 1} categoria(s)
          </Badge>
        </div>

        <div className="mt-5 grid gap-3">
          {filteredDepartmentExpenses.map((expense) => (
            <div key={`${expense.itemId}-${expense.name}`} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/35 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{expense.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {expense.category || "Sem categoria"} • {billingCycleLabel(expense.billingCycle)} • {expense.allocationPercentage.toFixed(0)}%
                  </div>
                  {expense.targetProfileName ? (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-[color:var(--sinaxys-primary)]">
                      <UserRound className="h-3.5 w-3.5" />
                      {expense.targetProfileName}
                    </div>
                  ) : null}
                  {expense.notes ? <div className="mt-2 text-sm text-muted-foreground">{expense.notes}</div> : null}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{brl(expense.allocatedCost)}</div>
                  <div className="text-xs text-muted-foreground">parcela mensal</div>
                </div>
              </div>
            </div>
          ))}

          {!filteredDepartmentExpenses.length && (
            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
              Nenhuma despesa não-humana encontrada com os filtros atuais.
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
          Se algum valor estiver faltando, peça ao Admin para cadastrar a despesa em Costs e definir o rateio do seu departamento.
        </div>

        <div className="mt-4">
          <Button variant="outline" className="h-11 w-full rounded-xl" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Voltar ao topo
          </Button>
        </div>
      </Card>
    </div>
  );
}
