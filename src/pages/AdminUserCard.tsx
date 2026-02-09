import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, BriefcaseBusiness, Building2, Clock3, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { brl, brlPerHourFromMonthly } from "@/lib/costs";
import { listDepartments } from "@/lib/departmentsDb";
import { getProfile } from "@/lib/profilesDb";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

export default function AdminUserCard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { userId } = useParams();

  if (!user || user.role !== "ADMIN" || !user.companyId) return null;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", user.companyId],
    queryFn: () => listDepartments(user.companyId!),
    enabled: !!user.companyId,
  });

  const departmentName = useMemo(() => {
    if (!profile?.department_id) return null;
    return departments.find((d) => d.id === profile.department_id)?.name ?? null;
  }, [profile?.department_id, departments]);

  const allowed = !!profile && profile.company_id === user.companyId;

  const title = profile?.name?.trim() ? profile.name.trim() : profile?.email ?? "Pessoa";

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Admin — Card da pessoa</div>
            <p className="mt-1 text-sm text-muted-foreground">Detalhes de trabalho e custos.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" className="h-10 rounded-xl">
                <Link to="/admin/costs">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar aos custos
                </Link>
              </Button>
              <Button variant="outline" className="h-10 rounded-xl" onClick={() => nav(-1)}>
                Voltar
              </Button>
            </div>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <UserRound className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        {isLoading ? (
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Carregando…</div>
        ) : !allowed ? (
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Pessoa não encontrada nesta empresa.</div>
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-[color:var(--sinaxys-border)]">
                  <AvatarImage src={profile.avatar_url ?? undefined} alt={title} />
                  <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                    {initials(title)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold text-[color:var(--sinaxys-ink)]">{title}</div>
                  <div className="mt-1 truncate text-sm text-muted-foreground">{profile.email}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {departmentName ? (
                      <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">{departmentName}</Badge>
                    ) : (
                      <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">Sem departamento</Badge>
                    )}
                    {profile.active ? (
                      <Badge className="rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                        <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />
                        Ativo
                      </Badge>
                    ) : (
                      <Badge className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100">Inativo</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:justify-items-end">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ordenado / custo mensal</div>
                <div className="text-2xl font-semibold text-[color:var(--sinaxys-ink)]">
                  {typeof profile.monthly_cost_brl === "number" && profile.monthly_cost_brl > 0 ? brl(profile.monthly_cost_brl) : "—"}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    {typeof profile.monthly_cost_brl === "number" ? brlPerHourFromMonthly(profile.monthly_cost_brl) : "—"}
                  </span>
                </div>
              </div>
            </div>

            <Separator className="my-5" />

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cargo</div>
                    <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{profile.job_title?.trim() ? profile.job_title.trim() : "—"}</div>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                    <BriefcaseBusiness className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Departamento</div>
                    <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{departmentName ?? "Sem departamento"}</div>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                    <Building2 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ID do usuário</div>
                <div className="mt-1 break-all text-sm font-semibold text-[color:var(--sinaxys-ink)]">{profile.id}</div>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
