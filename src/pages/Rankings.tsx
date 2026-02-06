import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Crown,
  Sparkles,
  Users,
  Plus,
  Pencil,
  Trash2,
  Gift,
  Coins,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";
import type { PointsRule, PointsRuleCategory, PointsRuleKey } from "@/lib/domain";
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

const TAB_OPTIONS = ["people", "teams", "tiers", "points"] as const;

type TabKey = (typeof TAB_OPTIONS)[number];

const POINTS_CATEGORIES: PointsRuleCategory[] = [
  "Trilhas",
  "Tempo de casa",
  "Contribuição",
  "Aprimoramento",
  "Reconhecimento",
];

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export default function Rankings() {
  const { toast } = useToast();
  const { user, activeCompanyId } = useAuth();
  const companyId = user?.role === "MASTERADMIN" ? activeCompanyId : user?.companyId;

  const navigate = useNavigate();
  const location = useLocation();

  const [version, setVersion] = useState(0);
  const [teamMetric, setTeamMetric] = useState<"avg" | "total">("avg");

  const tabFromUrl = useMemo<TabKey>(() => {
    const sp = new URLSearchParams(location.search);
    const t = (sp.get("tab") ?? "people") as TabKey;
    return TAB_OPTIONS.includes(t) ? t : "people";
  }, [location.search]);

  const [tab, setTab] = useState<TabKey>(tabFromUrl);

  useEffect(() => {
    setTab(tabFromUrl);
  }, [tabFromUrl]);

  const setTabAndUrl = (next: TabKey) => {
    setTab(next);
    const sp = new URLSearchParams(location.search);
    sp.set("tab", next);
    navigate({ pathname: "/rankings", search: `?${sp.toString()}` }, { replace: true });
  };

  const departments = useMemo(() => {
    if (!companyId) return [];
    return mockDb.getDepartments(companyId);
  }, [companyId, version]);

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d] as const)), [departments]);

  const tiers = useMemo(() => {
    if (!companyId) return [];
    return mockDb.getRewardTiers(companyId);
  }, [companyId, version]);

  const people = useMemo(() => {
    if (!companyId) return [];
    return mockDb.getXpLeaderboard(companyId);
  }, [companyId, version]);

  const teams = useMemo(() => {
    if (!companyId) return [];
    return mockDb.getTeamXpLeaderboard(companyId);
  }, [companyId, version]);

  const my = useMemo(() => {
    if (!user || !companyId) return null;
    return people.find((p) => p.user.id === user.id) ?? null;
  }, [people, user?.id, companyId]);

  const myBreakdown = useMemo(() => {
    if (!user) return null;
    return mockDb.getUserXpBreakdown(user.id);
  }, [user?.id, version]);

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

  const pointsRules = useMemo(() => {
    if (!companyId) return [];
    return mockDb.getPointsRules(companyId);
  }, [companyId, version]);

  const rulesByCategory = useMemo(() => {
    const by = new Map<PointsRuleCategory, PointsRule[]>();
    for (const c of POINTS_CATEGORIES) by.set(c, []);
    for (const r of pointsRules) {
      const list = by.get(r.category) ?? [];
      list.push(r);
      by.set(r.category, list);
    }
    for (const [c, list] of by.entries()) {
      list.sort((a, b) => a.label.localeCompare(b.label));
      by.set(c, list);
    }
    return by;
  }, [pointsRules]);

  const myEvents = useMemo(() => {
    if (!companyId || !user) return [];
    return mockDb.getPointsEventsForUser(companyId, user.id);
  }, [companyId, user?.id, version]);

  const isAdmin = user?.role === "ADMIN";

  // --- Admin: tiers manager state
  const [tierOpen, setTierOpen] = useState(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [tierName, setTierName] = useState("");
  const [tierMinXp, setTierMinXp] = useState("100");
  const [tierPrize, setTierPrize] = useState("");
  const [tierDescription, setTierDescription] = useState("");
  const [tierActive, setTierActive] = useState(true);

  const resetTierForm = () => {
    setEditingTierId(null);
    setTierName("");
    setTierMinXp("100");
    setTierPrize("");
    setTierDescription("");
    setTierActive(true);
  };

  const saveTier = () => {
    if (!companyId) return;
    const name = tierName.trim();
    const minXp = Math.floor(Number(tierMinXp) || 0);

    if (name.length < 2) {
      toast({ title: "Nome inválido", description: "Informe um nome para o tier.", variant: "destructive" });
      return;
    }

    try {
      mockDb.upsertRewardTier(companyId, {
        id: editingTierId ?? undefined,
        name,
        minXp,
        prize: tierPrize.trim(),
        description: tierDescription.trim() || undefined,
        active: !!tierActive,
      });
      setTierOpen(false);
      resetTierForm();
      setVersion((v) => v + 1);
      toast({ title: "Tier salvo" });
    } catch (e) {
      toast({
        title: "Não foi possível salvar",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // --- Admin: points award + rules manager state
  const usersInCompany = useMemo(() => {
    if (!companyId) return [];
    return mockDb
      .getUsers(companyId)
      .filter((u) => u.active)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [companyId, version]);

  const [awardUserId, setAwardUserId] = useState<string>("");
  const [awardRuleId, setAwardRuleId] = useState<string>("");
  const selectedRule = useMemo(() => pointsRules.find((r) => r.id === awardRuleId) ?? null, [pointsRules, awardRuleId]);
  const [awardPoints, setAwardPoints] = useState("0");
  const [awardNote, setAwardNote] = useState("");

  useEffect(() => {
    if (!selectedRule) return;
    setAwardPoints(String(selectedRule.points));
  }, [selectedRule?.id]);

  const [ruleOpen, setRuleOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const editingRule = useMemo(
    () => (editingRuleId ? pointsRules.find((r) => r.id === editingRuleId) ?? null : null),
    [pointsRules, editingRuleId],
  );

  const [ruleLabel, setRuleLabel] = useState("");
  const [ruleCategory, setRuleCategory] = useState<PointsRuleCategory>("Trilhas");
  const [rulePoints, setRulePoints] = useState("0");
  const [ruleDescription, setRuleDescription] = useState("");
  const [ruleActive, setRuleActive] = useState(true);

  useEffect(() => {
    if (!editingRule) return;
    setRuleLabel(editingRule.label);
    setRuleCategory(editingRule.category);
    setRulePoints(String(editingRule.points));
    setRuleDescription(editingRule.description ?? "");
    setRuleActive(editingRule.active);
  }, [editingRule?.id]);

  if (!user || !companyId || user.role === "MASTERADMIN") return null;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Sinaxys Points</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Ranking, tiers e regras de pontuação em um só lugar. A base vem das trilhas — e os bônus refletem contribuição, evolução e tempo de casa.
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
              <Coins className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
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

              <div className="grid gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl bg-white"
                  onClick={() => setTabAndUrl("points")}
                >
                  Ver como ganhar pontos
                </Button>
                {isAdmin ? (
                  <Button
                    className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                    onClick={() => setTabAndUrl("tiers")}
                  >
                    Ajustar tiers & premiações
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
              Seu usuário não entrou no ranking ainda.
            </div>
          )}
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTabAndUrl(v as TabKey)} className="w-full">
        <TabsList className="w-full justify-start rounded-2xl bg-[color:var(--sinaxys-tint)] p-1">
          <TabsTrigger value="people" className="rounded-xl">Pessoas</TabsTrigger>
          <TabsTrigger value="teams" className="rounded-xl">Times</TabsTrigger>
          <TabsTrigger value="tiers" className="rounded-xl">Tiers & premiações</TabsTrigger>
          <TabsTrigger value="points" className="rounded-xl">Regras (Sinaxys Points)</TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="mt-6">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Ranking individual</div>
                <p className="mt-1 text-sm text-muted-foreground">XP = trilhas + bônus (tempo de casa e eventos).</p>
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
                  const max =
                    teamMetric === "avg"
                      ? teams.reduce((m, x) => Math.max(m, x.avgXp), 0) || 1
                      : teams.reduce((m, x) => Math.max(m, x.totalXp), 0) || 1;
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
                            <span>
                              Total: <span className="font-semibold text-[color:var(--sinaxys-ink)]">{t.totalXp}</span>
                            </span>
                            <span className="text-muted-foreground/60">•</span>
                            <span>
                              Média: <span className="font-semibold text-[color:var(--sinaxys-ink)]">{t.avgXp}</span>
                            </span>
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
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Tiers & premiações</div>
                  <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                    {tiersWithCounts.length} ativos
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tiers são metas de XP. Ao atingir, você entra no nível e passa a ser elegível ao prêmio definido.
                </p>
              </div>

              {isAdmin ? (
                <Dialog
                  open={tierOpen}
                  onOpenChange={(v) => {
                    setTierOpen(v);
                    if (!v) resetTierForm();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                      <Plus className="mr-2 h-4 w-4" />
                      Novo tier
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{editingTierId ? "Editar tier" : "Novo tier"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>Nome</Label>
                        <Input value={tierName} onChange={(e) => setTierName(e.target.value)} className="h-11 rounded-xl" />
                      </div>
                      <div className="grid gap-2">
                        <Label>XP mínimo</Label>
                        <Input
                          value={tierMinXp}
                          onChange={(e) => setTierMinXp(e.target.value.replace(/[^0-9]/g, ""))}
                          className="h-11 rounded-xl"
                          inputMode="numeric"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Prêmio</Label>
                        <Input value={tierPrize} onChange={(e) => setTierPrize(e.target.value)} className="h-11 rounded-xl" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Descrição (opcional)</Label>
                        <Textarea value={tierDescription} onChange={(e) => setTierDescription(e.target.value)} className="min-h-24 rounded-2xl" />
                      </div>

                      <div className="flex items-center justify-between rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-4">
                        <div>
                          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Ativo</div>
                          <div className="mt-1 text-xs text-muted-foreground">Tiers inativos não aparecem para o time.</div>
                        </div>
                        <Switch checked={tierActive} onCheckedChange={setTierActive} />
                      </div>
                    </div>
                    <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button variant="outline" className="rounded-xl" onClick={() => setTierOpen(false)}>
                        Cancelar
                      </Button>
                      <Button
                        className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                        onClick={saveTier}
                      >
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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

                    {isAdmin ? (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          className="h-9 rounded-xl"
                          onClick={() => {
                            setEditingTierId(tier.id);
                            setTierName(tier.name);
                            setTierMinXp(String(tier.minXp));
                            setTierPrize(tier.prize);
                            setTierDescription(tier.description ?? "");
                            setTierActive(tier.active);
                            setTierOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" className="h-9 rounded-xl">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remover
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-3xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover tier?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação remove a regra de premiação. O XP das pessoas não é alterado.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                                onClick={() => {
                                  try {
                                    mockDb.deleteRewardTier(tier.id);
                                    setVersion((v) => v + 1);
                                  } catch (e) {
                                    toast({
                                      title: "Não foi possível remover",
                                      description: e instanceof Error ? e.message : "Tente novamente.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                  Nenhum tier configurado ainda.
                </div>
              )}
            </div>

            {isAdmin ? (
              <>
                <Separator className="my-5" />
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white">
                      <Gift className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Dica</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Um bom padrão é ter poucos tiers bem definidos (3–5) e premiar consistência (não só volume).
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </Card>
        </TabsContent>

        <TabsContent value="points" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Como ganhar Sinaxys Points</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A base é o progresso nas trilhas. Além disso, o admin pode registrar pontos por contribuição, cursos e reconhecimentos.
                  </p>
                </div>
                <Button variant="outline" className="h-9 rounded-xl" onClick={() => setVersion((v) => v + 1)}>
                  Atualizar
                </Button>
              </div>

              <div className="mt-5 grid gap-4">
                {POINTS_CATEGORIES.map((cat) => {
                  const list = rulesByCategory.get(cat) ?? [];
                  if (!list.length) return null;

                  return (
                    <div key={cat} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat}</div>
                      <div className="mt-3 grid gap-3">
                        {list.map((r) => (
                          <div key={r.id} className="flex items-start justify-between gap-3 rounded-2xl bg-[color:var(--sinaxys-tint)] p-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{r.label}</div>
                              {r.description ? (
                                <div className="mt-0.5 text-xs text-muted-foreground">{r.description}</div>
                              ) : null}
                              {!r.active ? (
                                <div className="mt-2">
                                  <Badge className="rounded-full bg-muted text-muted-foreground hover:bg-muted">Regra inativa</Badge>
                                </div>
                              ) : null}
                            </div>
                            <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                              {r.points} XP
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Separator className="my-6" />

              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Seu extrato (eventos)</div>
                  <p className="mt-1 text-sm text-muted-foreground">Registros de bônus e reconhecimentos. Trilhas entram automaticamente.</p>
                </div>
                <Button asChild variant="outline" className="h-9 rounded-xl bg-white">
                  <Link to="/profile">Ver progresso nas trilhas</Link>
                </Button>
              </div>

              {myEvents.length ? (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-[color:var(--sinaxys-border)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Regra</TableHead>
                        <TableHead>Nota</TableHead>
                        <TableHead className="text-right">XP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myEvents.map((e) => {
                        const rule = pointsRules.find((r) => r.key === e.ruleKey);
                        return (
                          <TableRow key={e.id}>
                            <TableCell className="text-muted-foreground">{fmtDate(e.createdAt)}</TableCell>
                            <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">{rule?.label ?? e.ruleKey}</TableCell>
                            <TableCell className="text-muted-foreground">{e.note ?? "—"}</TableCell>
                            <TableCell className="text-right font-semibold text-[color:var(--sinaxys-ink)]">{e.points}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                  Nenhum evento registrado para você ainda.
                </div>
              )}
            </Card>

            <div className="grid gap-6">
              <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Seu saldo (quebra)</div>
                <p className="mt-1 text-sm text-muted-foreground">Como seu XP total é composto.</p>

                {myBreakdown ? (
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trilhas</div>
                      <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{myBreakdown.tracksXp}</div>
                    </div>
                    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tempo de casa</div>
                      <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{myBreakdown.tenureXp}</div>
                    </div>
                    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Eventos</div>
                      <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{myBreakdown.eventsXp}</div>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</div>
                      <div className="mt-1 text-3xl font-semibold text-[color:var(--sinaxys-ink)]">{myBreakdown.totalXp}</div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                    Não foi possível calcular seu saldo.
                  </div>
                )}
              </Card>

              {isAdmin ? (
                <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Admin — conceder pontos</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Registre ações como "subir vídeo", "gravação de aula", "curso de aprimoramento" ou bônus pontuais.
                  </p>

                  <div className="mt-4 grid gap-3">
                    <div className="grid gap-2">
                      <Label>Usuário</Label>
                      <Select value={awardUserId} onValueChange={setAwardUserId}>
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder="Selecione…" />
                        </SelectTrigger>
                        <SelectContent>
                          {usersInCompany.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} — {roleLabel(u.role)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Regra</Label>
                      <Select value={awardRuleId} onValueChange={setAwardRuleId}>
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder="Selecione…" />
                        </SelectTrigger>
                        <SelectContent>
                          {pointsRules
                            .filter((r) => r.active)
                            .map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.category} — {r.label} ({r.points} XP)
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Pontos</Label>
                      <Input
                        value={awardPoints}
                        onChange={(e) => setAwardPoints(e.target.value.replace(/[^0-9-]/g, ""))}
                        className="h-11 rounded-xl"
                        inputMode="numeric"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Nota (opcional)</Label>
                      <Textarea value={awardNote} onChange={(e) => setAwardNote(e.target.value)} className="min-h-24 rounded-2xl" />
                    </div>

                    <Button
                      className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                      disabled={!awardUserId || !selectedRule}
                      onClick={() => {
                        if (!companyId || !awardUserId || !selectedRule) return;
                        try {
                          mockDb.awardPoints({
                            companyId,
                            userId: awardUserId,
                            ruleKey: selectedRule.key,
                            points: Number(awardPoints) || 0,
                            note: awardNote,
                            createdByUserId: user.id,
                          });
                          toast({ title: "Pontos concedidos" });
                          setAwardNote("");
                          setVersion((v) => v + 1);
                        } catch (e) {
                          toast({
                            title: "Não foi possível conceder",
                            description: e instanceof Error ? e.message : "Tente novamente.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Conceder pontos
                    </Button>

                    <Dialog
                      open={ruleOpen}
                      onOpenChange={(v) => {
                        setRuleOpen(v);
                        if (!v) setEditingRuleId(null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" className="h-11 rounded-xl bg-white">
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar regras
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>Sinaxys Points — regras</DialogTitle>
                        </DialogHeader>

                        <div className="overflow-x-auto rounded-2xl border border-[color:var(--sinaxys-border)]">
                          <Table className="min-w-[980px]">
                            <TableHeader>
                              <TableRow>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Regra</TableHead>
                                <TableHead className="text-right">XP</TableHead>
                                <TableHead>Ativa</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pointsRules.map((r) => (
                                <TableRow key={r.id}>
                                  <TableCell className="text-muted-foreground">{r.category}</TableCell>
                                  <TableCell>
                                    <div className="font-medium text-[color:var(--sinaxys-ink)]">{r.label}</div>
                                    <div className="text-xs text-muted-foreground">{r.key}</div>
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-[color:var(--sinaxys-ink)]">{r.points}</TableCell>
                                  <TableCell>
                                    <Badge className={"rounded-full " + (r.active ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-100" : "bg-muted text-muted-foreground hover:bg-muted")}>
                                      {r.active ? "Sim" : "Não"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="outline"
                                      className="h-9 rounded-xl"
                                      onClick={() => {
                                        setEditingRuleId(r.id);
                                        setRuleOpen(false);
                                        // abre o editor logo abaixo
                                        setTimeout(() => setRuleOpen(true), 0);
                                      }}
                                    >
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Ajustar
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}

                              {!pointsRules.length ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                                    Nenhuma regra encontrada.
                                  </TableCell>
                                </TableRow>
                              ) : null}
                            </TableBody>
                          </Table>
                        </div>

                        {editingRule ? (
                          <div className="mt-5 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Editar</div>
                                <div className="mt-1 text-xs text-muted-foreground">{editingRule.key}</div>
                              </div>
                              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                                {editingRule.category}
                              </Badge>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <div className="grid gap-2 sm:col-span-2">
                                <Label>Nome</Label>
                                <Input value={ruleLabel} onChange={(e) => setRuleLabel(e.target.value)} className="h-11 rounded-xl" />
                              </div>

                              <div className="grid gap-2">
                                <Label>Categoria</Label>
                                <Select value={ruleCategory} onValueChange={(v) => setRuleCategory(v as any)}>
                                  <SelectTrigger className="h-11 rounded-xl bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {POINTS_CATEGORIES.map((c) => (
                                      <SelectItem key={c} value={c}>
                                        {c}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="grid gap-2">
                                <Label>XP</Label>
                                <Input
                                  value={rulePoints}
                                  onChange={(e) => setRulePoints(e.target.value.replace(/[^0-9-]/g, ""))}
                                  className="h-11 rounded-xl"
                                  inputMode="numeric"
                                />
                              </div>

                              <div className="grid gap-2 sm:col-span-2">
                                <Label>Descrição (opcional)</Label>
                                <Textarea value={ruleDescription} onChange={(e) => setRuleDescription(e.target.value)} className="min-h-24 rounded-2xl" />
                              </div>

                              <div className="flex items-center justify-between rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 sm:col-span-2">
                                <div>
                                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Ativa</div>
                                  <div className="mt-1 text-xs text-muted-foreground">Regras inativas não devem ser usadas para concessões.</div>
                                </div>
                                <Switch checked={ruleActive} onCheckedChange={setRuleActive} />
                              </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                              <Button variant="outline" className="rounded-xl" onClick={() => setEditingRuleId(null)}>
                                Fechar
                              </Button>
                              <Button
                                className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                                onClick={() => {
                                  if (!companyId || !editingRule) return;
                                  try {
                                    mockDb.upsertPointsRule(companyId, {
                                      id: editingRule.id,
                                      key: editingRule.key,
                                      category: ruleCategory,
                                      label: ruleLabel,
                                      points: Number(rulePoints) || 0,
                                      description: ruleDescription,
                                      active: ruleActive,
                                    });
                                    toast({ title: "Regra atualizada" });
                                    setEditingRuleId(null);
                                    setVersion((v) => v + 1);
                                  } catch (e) {
                                    toast({
                                      title: "Não foi possível salvar",
                                      description: e instanceof Error ? e.message : "Tente novamente.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                Salvar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-5 text-sm text-muted-foreground">Selecione uma regra para editar.</div>
                        )}

                        <DialogFooter>
                          <Button variant="outline" className="rounded-xl" onClick={() => setRuleOpen(false)}>
                            Fechar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </Card>
              ) : null}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}