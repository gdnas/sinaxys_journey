import { useMemo } from "react";
import { BarChart3, Building2, GraduationCap, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";

function statCard(props: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{props.label}</div>
          <div className="mt-2 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{props.value}</div>
          {props.hint ? <div className="mt-1 text-xs text-muted-foreground">{props.hint}</div> : null}
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
          {props.icon}
        </div>
      </div>
    </Card>
  );
}

export default function MasterOverview() {
  const { user } = useAuth();
  if (!user || user.role !== "MASTERADMIN") return null;

  const db = useMemo(() => mockDb.get(), []);

  const totalCompanies = db.companies.length;
  const activeUsers = db.users.filter((u) => u.active).length;
  const totalTracks = db.tracks.length;
  const publishedTracks = db.tracks.filter((t) => t.published).length;
  const totalAssignments = db.assignments.length;
  const completedAssignments = db.assignments.filter((a) => a.status === "COMPLETED").length;

  const byCompany = useMemo(() => {
    return db.companies
      .map((c) => {
        const users = db.users.filter((u) => u.companyId === c.id);
        const active = users.filter((u) => u.active).length;
        const tracks = db.tracks.filter((t) => t.companyId === c.id);
        const published = tracks.filter((t) => t.published).length;
        const assignments = db.assignments.filter((a) => {
          const track = db.tracks.find((t) => t.id === a.trackId);
          return track?.companyId === c.id;
        });
        const completed = assignments.filter((a) => a.status === "COMPLETED").length;
        return {
          company: c,
          activeUsers: active,
          totalUsers: users.length,
          tracks: tracks.length,
          publishedTracks: published,
          assignments: assignments.length,
          completedAssignments: completed,
        };
      })
      .sort((a, b) => b.activeUsers - a.activeUsers);
  }, [db]);

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Master Admin — Visão geral</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Métricas de uso da plataforma (multi-empresa). O Master Admin não opera organograma ou marca — apenas administração global.
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <BarChart3 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {statCard({ icon: <Building2 className="h-5 w-5" />, label: "Empresas", value: String(totalCompanies) })}
        {statCard({ icon: <Users className="h-5 w-5" />, label: "Usuários ativos", value: String(activeUsers) })}
        {statCard({ icon: <GraduationCap className="h-5 w-5" />, label: "Trilhas", value: String(totalTracks), hint: `${publishedTracks} publicadas` })}
        {statCard({ icon: <BarChart3 className="h-5 w-5" />, label: "Atribuições", value: String(totalAssignments), hint: `${completedAssignments} concluídas` })}
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Uso por empresa</div>
        <p className="mt-1 text-sm text-muted-foreground">Uma leitura rápida de adoção, conteúdo e progresso.</p>

        <div className="mt-4 max-w-full overflow-x-auto rounded-2xl border border-[color:var(--sinaxys-border)]">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead>Trilhas</TableHead>
                <TableHead>Atribuições</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byCompany.map((row) => (
                <TableRow key={row.company.id}>
                  <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">{row.company.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.activeUsers} ativos • {row.totalUsers} total
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.publishedTracks} publicadas • {row.tracks} total
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.completedAssignments} concluídas • {row.assignments} total
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      className={
                        "rounded-full " +
                        (row.activeUsers === 0
                          ? "bg-muted text-muted-foreground hover:bg-muted"
                          : row.completedAssignments > 0
                            ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-100"
                            : "bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]")
                      }
                    >
                      {row.activeUsers === 0 ? "Inativa" : row.completedAssignments > 0 ? "Ativa" : "Em adoção"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}

              {!byCompany.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma empresa cadastrada.
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
