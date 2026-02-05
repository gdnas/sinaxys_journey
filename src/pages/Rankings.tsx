import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Crown, Medal, Sparkles, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

function tierBadgeClass(i: number) {
  const palette = [
    "bg-violet-100 text-violet-900 hover:bg-violet-100",
    "bg-sky-100 text-sky-900 hover:bg-sky-100",
    "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
    "bg-amber-100 text-amber-900 hover:bg-amber-100",
    "bg-rose-100 text-rose-900 hover:bg-rose-100",
  ];
  return palette[i % palette.length];
}

export default function Rankings() {
  const { user, activeCompanyId } = useAuth();
  const companyId = user?.role === "MASTERADMIN" ? activeCompanyId : user?.companyId;

  const [teamMetric, setTeamMetric] = useState<"avg" | "total">("avg");

  const departments = useMemo(() => {
    if (!companyId) return [];
    return mockDb.getDepartments(companyId);
  }, [companyId]);

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d] as const)), [departments]);

  const tiers = useMemo(() => {
    if (!companyId) return [];
    return mockDb.getRewardTiers(companyId);
  }, [companyId]);

  const people = useMemo(() => {
    if (!companyId) return [];
    return mockDb.getXpLeaderboard(companyId);
  }, [companyId]);

  const teams = useMemo(() => {
    if (!companyId) return [];
    return mockDb.getTeamXpLeaderboard(companyId);
  }, [companyId]);

  const my = useMemo(() => {
    if (!user || !companyId) return null;
    return people.find((p) => p.user.id === user.id) ?? null;
  }, [people, user?.id, companyId]);

  const myTier = my?.tier ?? null;
  const nextTier = useMemo(() => {
    if (!my || !tiers.length) return null;
    const next = tiers
      .filter((t) => t.active)
      .slice()
      .sort((a, b) => a.minXp - b.minXp)
      .find((t) => t.minXp > my.xp);
    return next ?? null;
  }, [tiers, my]);

  const progressToNext = useMemo(() => {
    if (!my || !nextTier) return null;
    const start = myTier?.minXp ?? 0;
    const end = nextTier.minXp;
    const pct = end <= start ? 0 : Math.round(((my.xp - start) / (end - start)) * 100);
    return { start, end, pct: Math.max(0, Math.min(100, pct)) };
  }, [my, myTier, nextTier]);

  const tiersWithCounts = useMemo(() => {
    const active = tiers.filter((t) => t.active).slice().sort((a, b) => a.minXp - b.minXp);
    return active.map((t, idx) => {
      const count = people.filter((p) => p.xp >= t.minXp).length;
      return { tier: t, idx, count };
    });
  }, [tiers, people]);

  if (!user || !companyId || user.role === "MASTERADMIN") return null;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Ranking de XP</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Visibilidade clara do progresso individual e de times. Tiers e premiações são configurados pela empresa.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                  Heads + Colaboradores
                </Badge>
                <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                  {people.length} pessoas
                </Badge>
              </div>
            </div>

            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Medal className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
        </div>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Seu status</div>
              <p className="mt-1 text-sm text-muted-foreground">XP total, posição e próximo tier.</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Crown className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>

          {my ? (
            <div className="mt-4 grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">XP</div>
                  <div className="text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{my.xp}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Posição</div>
                  <div className="text-2xl font-semibold text-[color:var(--sinaxys-ink)]">#{my.rank}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                  {roleLabel(my.user.role)}
                </Badge>
                {myTier ? (
                  <Badge className={"rounded-full " + tierBadgeClass(tiersWithCounts.findIndex((x) => x.tier.id === myTier.id))}>
                    {myTier.name}
                  </Badge>
                ) : (
                  <Badge className="rounded-full bg-muted text-muted-foreground hover:bg-muted">Sem tier</Badge>
                )}
              </div>

              {nextTier && progressToNext ? (
                <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Próximo tier</div>
                      <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{nextTier.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Faltam <span className="font-semibold text-[color:var(--sinaxys-ink)]">{Math.max(0, nextTier.minXp - my.xp)}</span> XP
                      </div>
                    </div>
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-[color:var(--sinaxys-primary)]">
                      <Sparkles className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Progress value={progressToNext.pct} className="h-2 rounded-full bg-white" />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                  Você já está no topo dos tiers ativos.
                </div>
              )}

              {user.role === "ADMIN" ? (
                <Button asChild variant="outline" className="rounded-xl bg-white">
                  <Link to="/admin/rewards">
                    Configurar tiers & premiações
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
              Seu usuário não entrou no ranking ainda.
            </div>
          )}
        </Card>
      </div>

      <Tabs defaultValue="people" className="w-full">
        <TabsList className="w-full justify-start rounded-2xl bg-[color:var(--sinaxys-tint)] p-1">
          <TabsTrigger value="people" className="rounded-xl">Pessoas</TabsTrigger>
          <TabsTrigger value="teams" className="rounded-xl">Times</TabsTrigger>
          <TabsTrigger value="tiers" className="rounded-xl">Tiers & premiações</TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="mt-6">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Ranking individual</div>
                <p className="mt-1 text-sm text-muted-foreground">XP acumulado em trilhas concluídas.</p>
              </div>
              <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                {people.length} participantes
              </Badge>
            </div>

            <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-[color:var(--sinaxys-border)] md:block">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[84px]">Posição</TableHead>
                    <TableHead>Pessoa</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">XP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {people.map((p) => {
                    const dept = p.user.departmentId ? deptById.get(p.user.departmentId)?.name : undefined;
                    const isMe = p.user.id === user.id;
                    const tierIndex = p.tier ? tiersWithCounts.findIndex((x) => x.tier.id === p.tier!.id) : -1;
                    return (
                      <TableRow
                        key={p.user.id}
                        className={isMe ? "bg-[color:var(--sinaxys-tint)]/60" : undefined}
                      >
                        <TableCell className="font-semibold text-[color:var(--sinaxys-ink)]">#{p.rank}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 ring-1 ring-[color:var(--sinaxys-border)]">
                              <AvatarImage src={p.user.avatarUrl} alt={p.user.name} />
                              <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                                {initials(p.user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{p.user.name}</div>
                              <div className="text-xs text-muted-foreground">{p.user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                            {roleLabel(p.user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{dept ?? "—"}</TableCell>
                        <TableCell>
                          {p.tier ? (
                            <Badge className={"rounded-full " + tierBadgeClass(tierIndex)}>{p.tier.name}</Badge>
                          ) : (
                            <Badge className="rounded-full bg-muted text-muted-foreground hover:bg-muted">—</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-[color:var(--sinaxys-ink)]">{p.xp}</TableCell>
                      </TableRow>
                    );
                  })}

                  {!people.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        Nenhum participante ainda.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 grid gap-3 md:hidden">
              {people.map((p) => {
                const dept = p.user.departmentId ? deptById.get(p.user.departmentId)?.name : undefined;
                const isMe = p.user.id === user.id;
                const tierIndex = p.tier ? tiersWithCounts.findIndex((x) => x.tier.id === p.tier!.id) : -1;

                return (
                  <div
                    key={p.user.id}
                    className={
                      "rounded-2xl border p-4 " +
                      (isMe
                        ? "border-[color:var(--sinaxys-primary)] bg-[color:var(--sinaxys-tint)]/40"
                        : "border-[color:var(--sinaxys-border)]")
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-1 ring-[color:var(--sinaxys-border)]">
                          <AvatarImage src={p.user.avatarUrl} alt={p.user.name} />
                          <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                            {initials(p.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">#{p.rank} • {p.user.name}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{dept ?? "—"}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">XP</div>
                        <div className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">{p.xp}</div>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                        {roleLabel(p.user.role)}
                      </Badge>
                      {p.tier ? (
                        <Badge className={"rounded-full " + tierBadgeClass(tierIndex)}>{p.tier.name}</Badge>
                      ) : null}
                      <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                        {dept ?? "Sem departamento"}
                      </Badge>
                    </div>
                  </div>
                );
              })}

              {!people.length ? (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                  Nenhum participante ainda.
                </div>
              ) : null}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="mt-6">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Ranking de times</div>
                <p className="mt-1 text-sm text-muted-foreground">Performance por departamento com base no XP do time.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ordenar por</div>
                <Select value={teamMetric} onValueChange={(v) => setTeamMetric(v as any)}>
                  <SelectTrigger className="h-10 w-full rounded-xl bg-white sm:w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avg">Média por pessoa</SelectItem>
                    <SelectItem value="total">Total do time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {teams
                .slice()
                .sort((a, b) => (teamMetric === "avg" ? b.avgXp - a.avgXp : b.totalXp - a.totalXp))
                .map((t, idx) => {
                  const dept = deptById.get(t.departmentId)?.name ?? "Departamento";
                  const max = teamMetric === "avg" ? (teams.reduce((m, x) => Math.max(m, x.avgXp), 0) || 1) : (teams.reduce((m, x) => Math.max(m, x.totalXp), 0) || 1);
                  const val = teamMetric === "avg" ? t.avgXp : t.totalXp;
                  const pct = Math.round((val / max) * 100);

                  return (
                    <div key={t.departmentId} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                            #{idx + 1} • {dept}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-2">
                              <Users className="h-4 w-4" /> {t.membersCount} pessoas
                            </span>
                            <span className="text-muted-foreground/60">•</span>
                            <span>Total: <span className="font-semibold text-[color:var(--sinaxys-ink)]">{t.totalXp}</span></span>
                            <span className="text-muted-foreground/60">•</span>
                            <span>Média: <span className="font-semibold text-[color:var(--sinaxys-ink)]">{t.avgXp}</span></span>
                          </div>
                        </div>
                        <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                          {teamMetric === "avg" ? `${t.avgXp} XP` : `${t.totalXp} XP`}
                        </Badge>
                      </div>

                      <div className="mt-3">
                        <Progress value={pct} className="h-2 rounded-full bg-[color:var(--sinaxys-tint)]" />
                      </div>
                    </div>
                  );
                })}

              {!teams.length ? (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                  Nenhum time disponível.
                </div>
              ) : null}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="tiers" className="mt-6">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Tiers & premiações</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tiers são metas de XP. Ao atingir, você entra no nível e passa a ser elegível ao prêmio definido pela empresa.
                </p>
              </div>
              {user.role === "ADMIN" ? (
                <Button asChild variant="outline" className="rounded-xl bg-white">
                  <Link to="/admin/rewards">Editar</Link>
                </Button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3">
              {tiersWithCounts.length ? (
                tiersWithCounts.map(({ tier, idx, count }) => (
                  <div key={tier.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={"rounded-full " + tierBadgeClass(idx)}>{tier.name}</Badge>
                          {!tier.active ? (
                            <Badge className="rounded-full bg-muted text-muted-foreground hover:bg-muted">Inativo</Badge>
                          ) : null}
                          <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                            {tier.minXp} XP
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          Prêmio: <span className="font-semibold text-[color:var(--sinaxys-ink)]">{tier.prize || "—"}</span>
                        </div>
                        {tier.description ? (
                          <div className="mt-1 text-xs text-muted-foreground">{tier.description}</div>
                        ) : null}
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Pessoas elegíveis</div>
                        <div className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">{count}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                  Nenhum tier configurado ainda.
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
