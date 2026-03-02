import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronRight, Wallet } from "lucide-react";
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

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d] as const)), [departments]);
  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p] as const)), [profiles]);

  const headByDeptId = useMemo(() => {
    // Infer the "Head do departamento" pelo gestor mais recorrente das pessoas do dept.
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

  const companyMonthly = useMemo(() => activeWithCost.reduce((acc, p) => acc + Math.max(0, n(p.monthly_cost_brl)), 0), [activeWithCost]);

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

    // Inject head cost (when the head is not explicitly linked to the dept).
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

  const byDept = useMemo(() => {
    const m = new Map<string, { deptId: string; deptName: string; people: number; total: number }>();
    const memberIds = new Map<string, Set<string>>();

    // Start with all departments so empty-cost departments can still appear when they have people.
    for (const d of departments) {
      m.set(d.id, { deptId: d.id, deptName: d.name, people: 0, total: 0 });
    }

    for (const p of activePeople) {
      const deptId = p.department_id ?? "__none__";
      const deptName = p.department_id ? deptById.get(p.department_id)?.name ?? "(departamento)" : "Sem departamento";
      const row = m.get(deptId) ?? { deptId, deptName, people: 0, total: 0 };
      row.people += 1;
      row.total += Math.max(0, n(p.monthly_cost_brl));
      m.set(deptId, row);

      const s = memberIds.get(deptId) ?? new Set<string>();
      s.add(p.id);
      memberIds.set(deptId, s);
    }

    // Add inferred head per department (if not already counted).
    for (const d of departments) {
      const head = headByDeptId.get(d.id);
      if (!head) continue;
      if (!head.active) continue;

      const deptId = d.id;
      const already = memberIds.get(deptId);
      if (already?.has(head.id)) continue;

      const row = m.get(deptId) ?? { deptId, deptName: d.name, people: 0, total: 0 };
      row.people += 1;
      row.total += Math.max(0, n(head.monthly_cost_brl));
      m.set(deptId, row);
    }

    return Array.from(m.values())
      .filter((r) => r.people > 0)
      .sort((a, b) => (b.total !== a.total ? b.total - a.total : a.deptName.localeCompare(b.deptName)));
  }, [activePeople, departments, deptById, headByDeptId]);

  const myDeptTotal = useMemo(() => {
    if (!user.departmentId) return 0;
    return byDept.find((d) => d.deptId === user.departmentId)?.total ?? 0;
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

  return (
    <div className="grid gap-6">
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
            <p className="mt-1 text-sm text-muted-foreground">Clique no departamento para ver a discriminação por pessoa.</p>
          </div>
          <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
            {byDept.length} dept(s)
          </Badge>
        </div>

        <Separator className="my-5" />

        <ResponsiveTable minWidth="720px">
          <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white">
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
                      <TableCell className="text-right text-muted-foreground">{d.people}</TableCell>
                      <TableCell className="text-right font-semibold text-[color:var(--sinaxys-ink)]">{d.total > 0 ? brl(d.total) : "—"}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{d.total > 0 ? brlPerHourFromMonthly(d.total) : "—"}</TableCell>
                    </TableRow>
                  );
                })}

                {!byDept.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
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
                {selectedDept?.people ?? 0} pessoa(s)
              </Badge>
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                Total: {selectedDept ? (selectedDept.total > 0 ? brl(selectedDept.total) : "—") : "—"}
              </Badge>
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                {selectedDept ? (selectedDept.total > 0 ? brlPerHourFromMonthly(selectedDept.total) : "—") : "—"}
              </Badge>
            </div>

            <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
              Mostrando perfis ativos. Pessoas sem custo cadastrado aparecem como <span className="font-semibold">—</span>.
            </div>
          </div>

          <Separator />

          <ScrollArea className="h-[calc(100vh-220px)] px-6 py-5">
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

                    <div className="mt-3 grid gap-2 rounded-xl bg-white/60 p-3 ring-1 ring-[color:var(--sinaxys-border)]/60 sm:grid-cols-3">
                      <div className="text-xs text-muted-foreground">
                        <div className="font-semibold text-[color:var(--sinaxys-ink)]">Nome</div>
                        <div className="mt-0.5 truncate">{p.name}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <div className="font-semibold text-[color:var(--sinaxys-ink)]">Ordenado</div>
                        <div className="mt-0.5 truncate">{cost > 0 ? brl(cost) : "—"}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <div className="font-semibold text-[color:var(--sinaxys-ink)]">Custo / hora</div>
                        <div className="mt-0.5 truncate">{cost > 0 ? brlPerHourFromMonthly(cost) : "—"}</div>
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