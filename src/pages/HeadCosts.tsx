import { useMemo } from "react";
import { Building2, ChevronRight, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { brl, brlPerHourFromMonthly } from "@/lib/costs";
import { listDepartments } from "@/lib/departmentsDb";
import { listProfilesByCompany } from "@/lib/profilesDb";

function n(v: unknown) {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

export default function HeadCosts() {
  const { user } = useAuth();
  if (!user || user.role !== "HEAD" || !user.companyId) return null;

  const companyId = user.companyId;
  const myDeptId = user.departmentId;

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

  const deptName = useMemo(() => departments.find((d) => d.id === myDeptId)?.name ?? "Departamento", [departments, myDeptId]);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles-dept", companyId, myDeptId],
    queryFn: () => listProfilesByCompany(companyId),
  });

  const people = useMemo(() => {
    return profiles
      .filter((p) => p.active)
      .filter((p) => p.department_id === myDeptId)
      .map((p) => ({
        id: p.id,
        name: p.name ?? p.email,
        job_title: p.job_title,
        monthly_cost_brl: p.monthly_cost_brl,
      }))
      .filter((p) => n(p.monthly_cost_brl) > 0)
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [profiles, myDeptId]);

  const deptMonthly = useMemo(() => people.reduce((acc, p) => acc + n(p.monthly_cost_brl), 0), [people]);

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

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Departamento</div>
              <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{brl(deptMonthly)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{brlPerHourFromMonthly(deptMonthly)} (soma)</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Building2 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pessoas com custo</div>
          <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{people.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">Apenas perfis ativos do seu dept. com valor &gt; 0.</div>
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

        <div className="overflow-x-auto rounded-2xl border border-[color:var(--sinaxys-border)]">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="text-right">Custo mensal</TableHead>
                <TableHead className="text-right">Custo/h</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((p) => (
                <TableRow key={p.id} className="hover:bg-[color:var(--sinaxys-tint)]/40">
                  <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">
                    <div className="flex items-center justify-between gap-3">
                      <span>{p.name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.job_title?.trim() ? p.job_title.trim() : "—"}</TableCell>
                  <TableCell className="text-right font-semibold text-[color:var(--sinaxys-ink)]">{brl(n(p.monthly_cost_brl))}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{brlPerHourFromMonthly(n(p.monthly_cost_brl))}</TableCell>
                </TableRow>
              ))}

              {!people.length && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum custo cadastrado no seu departamento.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
          Se algum valor estiver faltando, peça ao Admin para preencher o campo “custo mensal”.
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
