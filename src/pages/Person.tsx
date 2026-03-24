import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarClock, Mail, MessageSquareText, Phone, Target, UserRound, Users } from "lucide-react";
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
import { objectiveLevelLabel, objectiveTypeBadgeClass, objectiveTypeLabel } from "@/lib/okrUi";
import { listOkrCycles, listOkrObjectives, listOkrObjectivesByIds, listOkrObjectivesForOwner, listTasksForUserWithContext } from "@/lib/okrDb";
import { PersonFeedbackCard } from "@/components/PersonFeedbackCard";
import { getAssignmentsForUser } from "@/lib/journeyDb";
import { getSharedFeedbacksForUser } from "@/lib/feedbackSharesDb";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

function shortDate(isoOrDate: string | null | undefined) {
  if (!isoOrDate) return null;
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
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

  // --- OKR involvement ---
  const qCycles = useQuery({
    queryKey: ["okr", "cycles", companyId],
    queryFn: () => listOkrCycles(companyId),
    enabled: !!companyId,
  });

  const activeCycleId = useMemo(() => {
    const cycles = qCycles.data ?? [];
    return cycles.find((c) => c.status === "ACTIVE")?.id ?? cycles[0]?.id ?? null;
  }, [qCycles.data]);

  const qOwnedObjectives = useQuery({
    queryKey: ["okr", "objectives", "owner", companyId, userId],
    queryFn: () => listOkrObjectivesForOwner(companyId, userId),
    enabled: !!companyId && !!userId,
  });

  const qTasks = useQuery({
    queryKey: ["okr", "tasks", "user", userId],
    queryFn: () => listTasksForUserWithContext(userId),
    enabled: !!userId,
  });

  const qAssignments = useQuery({
    queryKey: ["assignments-for-person", userId],
    queryFn: () => getAssignmentsForUser(userId),
    enabled: !!userId,
  });

  const qSharedFeedbacks = useQuery({
    queryKey: ["shared-feedbacks", userId],
    queryFn: () => getSharedFeedbacksForUser(userId),
    enabled: !!userId,
  });

  const qActiveCycleObjectives = useQuery({
    queryKey: ["okr", "objectives", "cycle", companyId, activeCycleId],
    queryFn: () => listOkrObjectives(companyId, activeCycleId as string),
    enabled: !!companyId && !!activeCycleId,
  });

  const taskObjectiveIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of qTasks.data ?? []) ids.add(t.objective_id);
    return Array.from(ids);
  }, [qTasks.data]);

  const qObjectivesFromTasks = useQuery({
    queryKey: ["okr", "objectives", "byIds", taskObjectiveIds.join(",")],
    queryFn: () => listOkrObjectivesByIds(taskObjectiveIds),
    enabled: taskObjectiveIds.length > 0,
  });

  const okrInvolvement = useMemo(() => {
    const byId = new Map<string, any>();
    const add = (o: any, kind: "dono" | "tarefas") => {
      const prev = byId.get(o.id);
      if (!prev) {
        byId.set(o.id, { objective: o, kinds: new Set([kind]) });
      } else {
        prev.kinds.add(kind);
      }
    };

    for (const o of qOwnedObjectives.data ?? []) add(o, "dono");
    for (const o of qObjectivesFromTasks.data ?? []) add(o, "tarefas");

    // enrich with cycle label
    const cycleById = new Map((qCycles.data ?? []).map((c) => [c.id, c] as const));
    const rows = Array.from(byId.values()).map((r) => {
      const c = cycleById.get(r.objective.cycle_id);
      const cycleLabel = c
        ? c.type === "ANNUAL"
          ? `${c.year}`
          : `${c.year} • Q${c.quarter ?? "—"}`
        : "—";
      const isActiveCycle = c?.status === "ACTIVE";
      return {
        objective: r.objective,
        kinds: Array.from(r.kinds) as Array<"dono" | "tarefas">,
        cycleLabel,
        isActiveCycle,
      };
    });

    // prioritize active cycle, then newest
    rows.sort((a, b) => {
      if (a.isActiveCycle !== b.isActiveCycle) return a.isActiveCycle ? -1 : 1;
      const da = a.objective.created_at ? new Date(a.objective.created_at).getTime() : 0;
      const db = b.objective.created_at ? new Date(b.objective.created_at).getTime() : 0;
      return db - da;
    });

    return rows;
  }, [qCycles.data, qObjectivesFromTasks.data, qOwnedObjectives.data]);

  const tasksByObjectiveId = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of qTasks.data ?? []) {
      m.set(t.objective_id, (m.get(t.objective_id) ?? 0) + 1);
    }
    return m;
  }, [qTasks.data]);

  // --- profile cards ---
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

  const okrCount = okrInvolvement.length;

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" className="h-10 rounded-xl">
          <Link to="/org">Voltar</Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="h-10 rounded-xl bg-white">
            <Link to="/pdi-performance">Abrir PDI</Link>
          </Button>
          {user.role === "ADMIN" || user.role === "MASTERADMIN" ? (
            <Button asChild className="h-10 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
              <Link to={`/admin/users/${profile.id}`}>Editar (Admin)</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={title} className="h-full w-full object-cover rounded-full" />
              ) : (
                <span className="text-sm font-bold">{initials(title)}</span>
              )}
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
                <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white ring-1 ring-[color:var(--sinaxys-border)]">
                  {okrCount} OKR{okrCount === 1 ? "" : "s"}
                </Badge>
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

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div>
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">OKRs em que está envolvido</div>
                  <p className="mt-1 text-sm text-muted-foreground">Dono do objetivo ou com tarefas atribuídas.</p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                  <Target className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                </div>
              </div>

              <Separator className="my-5" />

              {qOwnedObjectives.isLoading || qTasks.isLoading || qObjectivesFromTasks.isLoading || qCycles.isLoading ? (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Carregando OKRs…</div>
              ) : null}

              {okrInvolvement.length === 0 && !(qOwnedObjectives.isLoading || qTasks.isLoading) ? (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhum OKR encontrado para esta pessoa.</div>
              ) : null}

              <div className="grid gap-2">
                {okrInvolvement.map((row) => {
                  const o = row.objective;
                  const isOwner = row.kinds.includes("dono");
                  const hasTasks = row.kinds.includes("tarefas");
                  const nTasks = tasksByObjectiveId.get(o.id) ?? 0;

                  return (
                    <Link
                      key={o.id}
                      to={`/okr/objetivos/${o.id}`}
                      className="block rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 transition hover:bg-[color:var(--sinaxys-tint)]/40"
                      title="Abrir OKR"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={"rounded-full " + objectiveTypeBadgeClass(o.level)}>{objectiveLevelLabel(o.level)}</Badge>
                            <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white ring-1 ring-[color:var(--sinaxys-border)]">
                              {row.cycleLabel}{row.isActiveCycle ? " • ativo" : ""}
                            </Badge>
                            {isOwner ? (
                              <Badge className="rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]">dono</Badge>
                            ) : null}
                            {hasTasks ? (
                              <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                                {nTasks} tarefa{nTasks === 1 ? "" : "s"}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-2 truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{o.title}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{objectiveTypeLabel(o.level)}</span>
                            {shortDate(o.due_at) ? (
                              <span className="inline-flex items-center gap-1">
                                <CalendarClock className="h-3.5 w-3.5" /> {shortDate(o.due_at)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-xs font-semibold text-[color:var(--sinaxys-primary)]">Abrir</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Card>
          </div>

          <aside className="grid gap-6">
            <div>
              <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Trilhas de Conhecimento</div>
                <p className="mt-1 text-sm text-muted-foreground">Trilhas de Conhecimento que essa pessoa está envolvida (atribuições e em andamento).</p>
                <Separator className="my-4" />
                <div className="grid gap-2">
                  {qAssignments.data?.map((a: any) => (
                    <div key={a.assignment.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-3">
                      <div className="text-sm font-semibold">{a.track.title}</div>
                      <div className="text-xs text-muted-foreground">Progresso: {a.progressPct}% — {a.completedModules}/{a.totalModules}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div>
              <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Feedbacks públicos</div>
                <p className="mt-1 text-sm text-muted-foreground">Feedbacks que a pessoa optou por compartilhar publicamente.</p>
                <Separator className="my-4" />
                <div className="grid gap-3">
                  {qSharedFeedbacks.data?.length ? (
                    qSharedFeedbacks.data.map((s: any) => (
                      <div key={s.feedback_id} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-3">
                        <div className="text-sm font-semibold">{s.feedbacks?.message}</div>
                        <div className="text-xs text-muted-foreground">{new Date(s.feedbacks?.created_at).toLocaleString()}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">Nenhum feedback público.</div>
                  )}
                </div>
              </Card>
            </div>

            <div>
              <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Atalhos</div>
                <Separator className="my-4" />
                <div className="grid gap-2">
                  <Button asChild variant="outline" className="h-11 rounded-xl bg-white">
                    <Link to="/pdi-performance">Ver histórico (PDI)</Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 rounded-xl bg-white">
                    <Link to="/okr/hoje">OKRs</Link>
                  </Button>
                </div>
              </Card>
            </div>
          </aside>
        </div>
      </Card>

      <PersonFeedbackCard tenantId={companyId} fromUserId={user.id} toUserId={profile.id} toUserLabel={title} />
    </div>
  );
}