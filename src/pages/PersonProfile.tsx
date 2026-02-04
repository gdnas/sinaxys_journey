import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Mail, Phone, ShieldCheck, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";
import { roleLabel } from "@/lib/sinaxys";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

export default function PersonProfile() {
  const { user } = useAuth();
  const { userId } = useParams();

  const { person, deptName, manager, directReports } = useMemo(() => {
    const db = mockDb.get();
    const person = db.users.find((u) => u.id === userId && u.active) ?? null;
    const deptName = person?.departmentId
      ? db.departments.find((d) => d.id === person.departmentId)?.name
      : undefined;
    const manager = person?.managerId ? db.users.find((u) => u.id === person.managerId && u.active) : undefined;
    const directReports = person ? db.users.filter((u) => u.active && u.managerId === person.id) : [];
    return { person, deptName, manager, directReports };
  }, [userId]);

  if (!user) return null;

  if (!person) {
    return (
      <div className="grid gap-4">
        <div className="rounded-3xl border bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Perfil não encontrado</div>
              <div className="mt-1 text-sm text-muted-foreground">Essa pessoa pode estar inativa ou não existe.</div>
            </div>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/org">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao organograma
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-[color:var(--sinaxys-border)]">
              <AvatarImage src={person.avatarUrl} alt={person.name} />
              <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                {initials(person.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate text-xl font-semibold text-[color:var(--sinaxys-ink)]">{person.name}</div>
                <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                  {roleLabel(person.role)}
                </Badge>
                {deptName ? (
                  <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] shadow-sm ring-1 ring-[color:var(--sinaxys-border)] hover:bg-white">
                    {deptName}
                  </Badge>
                ) : null}
              </div>
              <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                  <span className="text-[color:var(--sinaxys-ink)]">{person.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                  <span className="text-[color:var(--sinaxys-ink)]">{person.phone ?? "—"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/org">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Organograma
              </Link>
            </Button>
            {user.id === person.id ? (
              <Button asChild className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                <Link to="/profile">Editar meu perfil</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Posição na estrutura</div>
          <p className="mt-1 text-sm text-muted-foreground">Gestor direto e liderados (quando aplicável).</p>

          <div className="mt-4 grid gap-4">
            <div className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reporta para</div>
              {manager ? (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{manager.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{roleLabel(manager.role)} • {manager.email}</div>
                  </div>
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link to={`/people/${manager.id}`}>Ver</Link>
                  </Button>
                </div>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">—</div>
              )}
            </div>

            <div className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lidera</div>
                  <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{directReports.length} pessoas</div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                  <Users className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                </div>
              </div>
              {directReports.length ? (
                <div className="mt-3 grid gap-2">
                  {directReports.slice(0, 5).map((r) => (
                    <Link
                      key={r.id}
                      to={`/people/${r.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl bg-[color:var(--sinaxys-tint)] px-3 py-2 text-sm"
                    >
                      <span className="truncate font-medium text-[color:var(--sinaxys-ink)]">{r.name}</span>
                      <span className="text-xs text-muted-foreground">{roleLabel(r.role)}</span>
                    </Link>
                  ))}
                  {directReports.length > 5 ? (
                    <div className="text-xs text-muted-foreground">+ {directReports.length - 5} pessoas</div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">Sem liderados diretos.</div>
              )}
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Contato rápido</div>
              <p className="mt-1 text-sm text-muted-foreground">Use os dados abaixo para falar com a pessoa certa.</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <ShieldCheck className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">E-mail</span>
              <span className="font-medium text-[color:var(--sinaxys-ink)]">{person.email}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Celular</span>
              <span className="font-medium text-[color:var(--sinaxys-ink)]">{person.phone ?? "—"}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
