import { useMemo, useState } from "react";
import { Search, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { useAuth } from "@/lib/auth";
import { listDepartments } from "@/lib/departmentsDb";
import { listProfilesByCompany } from "@/lib/profilesDb";
import { listAccessStatsByCompany } from "@/lib/accessStatsDb";
import { roleLabel } from "@/lib/sinaxys";

function fmtDateTime(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function HeadUsers() {
  const { user } = useAuth();
  if (!user || user.role !== "HEAD" || !user.companyId) return null;

  const companyId = user.companyId;

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: () => listDepartments(companyId),
  });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles-team", companyId],
    queryFn: () => listProfilesByCompany(companyId),
  });

  const { data: accessStats = [] } = useQuery({
    queryKey: ["access-stats", companyId],
    queryFn: () => listAccessStatsByCompany(companyId),
  });

  const statsByUserId = useMemo(() => new Map(accessStats.map((s) => [s.user_id, s] as const)), [accessStats]);
  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d] as const)), [departments]);

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => `${p.name ?? ""} ${p.email}`.toLowerCase().includes(q));
  }, [profiles, query]);

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Usuários — Liderados</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Aqui você vê apenas as pessoas que estão no seu organograma (diretas e indiretas), pelo campo <span className="font-medium text-[color:var(--sinaxys-ink)]">gestor</span>.
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <Shield className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Base do seu time</div>
            <p className="mt-1 text-sm text-muted-foreground">{isLoading ? "Carregando…" : `${profiles.length} pessoa(s) visíveis para você.`}</p>
          </div>

          <div className="relative w-full md:w-[360px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome ou e-mail…" className="h-11 rounded-xl pl-9" />
          </div>
        </div>

        <Separator className="my-5" />

        <ResponsiveTable minWidth="1120px">
          <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white">
            <Table className="min-w-[1120px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-right">Acessos</TableHead>
                  <TableHead className="text-right">Último acesso</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const dept = p.department_id ? deptById.get(p.department_id)?.name : "—";
                  const stat = statsByUserId.get(p.id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">{p.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{p.email}</TableCell>
                      <TableCell>
                        <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                          {roleLabel(p.role as any)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{dept ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium text-[color:var(--sinaxys-ink)]">{stat ? stat.access_count : "—"}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{fmtDateTime(stat?.last_access_at)}</TableCell>
                      <TableCell className="text-right">
                        {p.active ? (
                          <Badge className="rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Ativo</Badge>
                        ) : (
                          <Badge className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100">Inativo</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {!isLoading && !filtered.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </ResponsiveTable>

        <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
          Acessos são registrados quando a pessoa entra no sistema (inclui recarregar a aplicação). Se alguém nunca entrou, os campos aparecem como "—".
        </div>
      </Card>
    </div>
  );
}