import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Mail, Phone, UserRound, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { listDepartments } from "@/lib/departmentsDb";
import { getPublicProfile } from "@/lib/profilePublicDb";
import { getProfile } from "@/lib/profilesDb";
import { roleLabel } from "@/lib/sinaxys";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

export default function Person() {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const { userId } = useParams();

  if (!user || !companyId || !userId) return null;

  const qPublic = useQuery({
    queryKey: ["profile-public", userId],
    queryFn: () => getPublicProfile(userId),
    enabled: !!userId,
  });

  const qLeader = useQuery({
    queryKey: ["profile-public", qPublic.data?.manager_id],
    enabled: !!qPublic.data?.manager_id,
    queryFn: () => getPublicProfile(qPublic.data!.manager_id as string),
  });

  const qDepartments = useQuery({
    queryKey: ["departments", companyId],
    queryFn: () => listDepartments(companyId),
    enabled: !!companyId,
  });

  const qSensitive = useQuery({
    queryKey: ["profile-sensitive", userId],
    enabled: !!userId,
    queryFn: async () => {
      try {
        return await getProfile(userId);
      } catch {
        return null;
      }
    },
  });

  const profile = qPublic.data;

  const departmentName = useMemo(() => {
    if (!profile?.department_id) return null;
    return (qDepartments.data ?? []).find((d) => d.id === profile.department_id)?.name ?? null;
  }, [profile?.department_id, qDepartments.data]);

  if (qPublic.isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white px-6 py-4 text-sm text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="grid gap-6">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Pessoa não encontrada</div>
          <p className="mt-2 text-sm text-muted-foreground">Esse usuário não está acessível no seu contexto.</p>
          <div className="mt-4">
            <Button asChild variant="outline" className="h-10 rounded-xl">
              <Link to="/org">Voltar ao organograma</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const title = profile.name;
  const role = roleLabel(profile.role as any);
  const jobTitle = profile.job_title?.trim() || "—";

  const email = qSensitive.data?.email ?? "—";
  const phone = qSensitive.data?.phone?.trim() || "—";

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" className="h-10 rounded-xl">
          <Link to="/org">Voltar</Link>
        </Button>
        {user.role === "ADMIN" || user.role === "MASTERADMIN" ? (
          <Button asChild className="h-10 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
            <Link to={`/admin/users/${profile.id}`}>Editar (Admin)</Link>
          </Button>
        ) : null}
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
              <span className="text-xs font-bold">{initials(title)}</span>
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-[color:var(--sinaxys-ink)]">{title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]">{role}</Badge>
                {departmentName ? (
                  <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                    {departmentName}
                  </Badge>
                ) : null}
                {!profile.active ? <Badge className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100">Inativo</Badge> : null}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{jobTitle}</div>
            </div>
          </div>

          <div className="grid gap-2 sm:min-w-[320px]">
            <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contato</div>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center gap-2 text-[color:var(--sinaxys-ink)]">
                  <Mail className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                  <span className="truncate">{email}</span>
                </div>
                <div className="flex items-center gap-2 text-[color:var(--sinaxys-ink)]">
                  <Phone className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                  <span className="truncate">{phone}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estrutura</div>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center gap-2 text-[color:var(--sinaxys-ink)]">
                  <Users className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                  <span className="text-muted-foreground">Líder direto:</span>
                  {qLeader.data ? (
                    <Link to={`/people/${qLeader.data.id}`} className="truncate font-semibold text-[color:var(--sinaxys-primary)] hover:underline">
                      {qLeader.data.name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{profile.manager_id ? "—" : "Sem líder"}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[color:var(--sinaxys-ink)]">
                  <UserRound className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono text-xs">{profile.id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-5" />
      </Card>
    </div>
  );
}