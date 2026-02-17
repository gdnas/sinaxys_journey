import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, CalendarClock, Medal, Network, Search, Sparkles, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollableTabsList } from "@/components/ScrollableTabsList";
import { OrgChartTreeCanvas, type OrgNode } from "@/components/OrgChartTreeCanvas";
import { useAuth } from "@/lib/auth";
import { listDepartments } from "@/lib/departmentsDb";
import { fetchLeaderboard, listRewardTiers } from "@/lib/pointsDb";
import { fetchXpLeaderboard } from "@/lib/journeyDb";
import { listPublicProfilesByCompany, type DbProfilePublic } from "@/lib/profilePublicDb";
import { roleLabel } from "@/lib/sinaxys";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

function buildTree(profiles: DbProfilePublic[]): OrgNode<DbProfilePublic>[] {
  const byId = new Map(profiles.map((p) => [p.id, p] as const));
  const childrenByManager = new Map<string, DbProfilePublic[]>();
  const roots: DbProfilePublic[] = [];

  for (const p of profiles) {
    const mid = p.manager_id;
    if (mid && byId.has(mid)) {
      const arr = childrenByManager.get(mid) ?? [];
      arr.push(p);
      childrenByManager.set(mid, arr);
    } else {
      roots.push(p);
    }
  }

  const makeNode = (p: DbProfilePublic): OrgNode<DbProfilePublic> => {
    const kids = (childrenByManager.get(p.id) ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(makeNode);
    return { id: p.id, data: p, children: kids };
  };

  return roots
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(makeNode);
}

function formatJoinedAt(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { year: "numeric", month: "short" });
}

const deptPalette = [
  { bar: "bg-indigo-500", chip: "bg-indigo-50 text-indigo-900 ring-indigo-200", hover: "hover:bg-indigo-50/60" },
  { bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-900 ring-emerald-200", hover: "hover:bg-emerald-50/60" },
  { bar: "bg-rose-500", chip: "bg-rose-50 text-rose-900 ring-rose-200", hover: "hover:bg-rose-50/60" },
  { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-950 ring-amber-200", hover: "hover:bg-amber-50/60" },
  { bar: "bg-sky-500", chip: "bg-sky-50 text-sky-900 ring-sky-200", hover: "hover:bg-sky-50/60" },
  { bar: "bg-violet-500", chip: "bg-violet-50 text-violet-900 ring-violet-200", hover: "hover:bg-violet-50/60" },
  { bar: "bg-teal-500", chip: "bg-teal-50 text-teal-900 ring-teal-200", hover: "hover:bg-teal-50/60" },
  { bar: "bg-lime-500", chip: "bg-lime-50 text-lime-950 ring-lime-200", hover: "hover:bg-lime-50/60" },
] as const;

function deptTheme(deptIndex: number | null) {
  if (deptIndex == null || deptIndex < 0) {
    return { bar: "bg-[color:var(--sinaxys-border)]", chip: "bg-white text-[color:var(--sinaxys-ink)] ring-[color:var(--sinaxys-border)]", hover: "hover:bg-[color:var(--sinaxys-tint)]/40" };
  }
  return deptPalette[deptIndex % deptPalette.length];
}

function PersonDialog({
  open,
  onOpenChange,
  profile,
  deptName,
  deptThemeIdx,
  points,
  xp,
  tier,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: DbProfilePublic | null;
  deptName: string | null;
  deptThemeIdx: number | null;
  points: number;
  xp: number;
  tier: string | null;
}) {
  const theme = deptTheme(deptThemeIdx);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Card da pessoa</DialogTitle>
        </DialogHeader>

        {profile ? (
          <div className="grid gap-4">
            <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={cn("grid h-12 w-12 place-items-center rounded-2xl text-white", theme.bar)}>
                    <span className="text-xs font-bold">{initials(profile.name)}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-[color:var(--sinaxys-ink)]">{profile.name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                        {roleLabel(profile.role as any)}
                      </Badge>
                      {deptName ? (
                        <span className={cn("rounded-full px-2 py-0.5 font-semibold ring-1", theme.chip)}>{deptName}</span>
                      ) : null}
                      {tier ? (
                        <span className="rounded-full bg-[color:var(--sinaxys-primary)] px-2 py-0.5 font-semibold text-white">{tier}</span>
                      ) : null}
                      {!profile.active ? <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">Inativo</span> : null}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">{profile.job_title?.trim() ? profile.job_title.trim() : "—"}</div>
                  </div>
                </div>

                <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-[260px]">
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pontos</div>
                    <div className="mt-1 text-lg font-semibold text-[color:var(--sinaxys-ink)]">{points}</div>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">XP</div>
                    <div className="mt-1 text-lg font-semibold text-[color:var(--sinaxys-ink)]">{xp}</div>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Admissão</div>
                    <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{formatJoinedAt(profile.joined_at)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-xs text-muted-foreground">
              Esta visão é interna (somente membros da empresa). Dados sensíveis como e-mail/telefone não aparecem aqui.
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Pessoa não encontrada.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ListNode({
  node,
  level,
  collapsed,
  setCollapsed,
  deptById,
  deptIndexById,
  onOpen,
  pointsByUserId,
  xpByUserId,
  tierByUserId,
}: {
  node: OrgNode<DbProfilePublic>;
  level: number;
  collapsed: Set<string>;
  setCollapsed: (fn: (prev: Set<string>) => Set<string>) => void;
  deptById: Map<string, string>;
  deptIndexById: Map<string, number>;
  onOpen: (p: DbProfilePublic) => void;
  pointsByUserId: Map<string, number>;
  xpByUserId: Map<string, number>;
  tierByUserId: Map<string | null, string | null>;
}) {
  const p = node.data;
  const deptName = p.department_id ? deptById.get(p.department_id) : undefined;
  const deptIdx = p.department_id ? deptIndexById.get(p.department_id) ?? null : null;
  const theme = deptTheme(deptIdx);

  const isCollapsed = collapsed.has(p.id);
  const hasKids = node.children.length > 0;

  const points = pointsByUserId.get(p.id) ?? 0;
  const xp = xpByUserId.get(p.id) ?? 0;
  const tier = tierByUserId.get(p.id) ?? null;

  return (
    <div>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-[color:var(--sinaxys-border)] bg-white",
          theme.hover,
        )}
        style={{ marginLeft: level * 14 }}
      >
        <div className={cn("absolute left-0 top-0 h-full w-1.5", theme.bar)} />

        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => onOpen(p)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white", theme.bar)}>
              <span className="text-xs font-bold">{initials(p.name)}</span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{p.name}</div>
                {tier ? <Badge className="rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]">{tier}</Badge> : null}
                {!p.active ? <Badge className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100">Inativo</Badge> : null}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white ring-1 ring-[color:var(--sinaxys-border)]">
                  {roleLabel(p.role as any)}
                </Badge>
                {deptName ? <span className={cn("rounded-full px-2 py-0.5 font-semibold ring-1", theme.chip)}>{deptName}</span> : null}
                <span className="truncate">{p.job_title?.trim() || "—"}</span>
              </div>
            </div>
          </button>

          <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--sinaxys-tint)] px-2 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]">
                <Sparkles className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" /> {points}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--sinaxys-tint)] px-2 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]">
                <Medal className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" /> {xp} XP
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--sinaxys-tint)] px-2 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]">
                <CalendarClock className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" /> {formatJoinedAt(p.joined_at)}
              </span>
            </div>

            {hasKids ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl"
                onClick={(e) => {
                  e.stopPropagation();
                  setCollapsed((prev) => {
                    const next = new Set(prev);
                    if (next.has(p.id)) next.delete(p.id);
                    else next.add(p.id);
                    return next;
                  });
                }}
                aria-label={isCollapsed ? "Expandir time" : "Recolher time"}
                title={isCollapsed ? "Expandir" : "Recolher"}
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            ) : (
              <div className="grid h-9 w-9 place-items-center rounded-xl border border-[color:var(--sinaxys-border)] bg-white text-[color:var(--sinaxys-primary)]">
                <UserRound className="h-4 w-4" />
              </div>
            )}
          </div>
        </div>
      </div>

      {hasKids && !isCollapsed ? (
        <div className="mt-2 grid gap-2">
          {node.children.map((c) => (
            <ListNode
              key={c.id}
              node={c}
              level={level + 1}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
              deptById={deptById}
              deptIndexById={deptIndexById}
              onOpen={onOpen}
              pointsByUserId={pointsByUserId}
              xpByUserId={xpByUserId}
              tierByUserId={tierByUserId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function OrgChart() {
  const { user } = useAuth();
  if (!user || !user.companyId) return null;

  const companyId = user.companyId;

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: () => listDepartments(companyId),
  });

  const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery({
    queryKey: ["profiles-public", companyId],
    queryFn: () => listPublicProfilesByCompany(companyId),
  });

  // Requirement: inactive users should not appear in the company org chart.
  const activeProfiles = useMemo(() => profiles.filter((p) => !!p.active), [profiles]);

  // IMPORTANT: this file has multiple computations; we keep changes minimal by switching the main source.
  const profilesSource = activeProfiles;

  const qPoints = useQuery({
    queryKey: ["points", "leaderboard", companyId],
    queryFn: () => fetchLeaderboard(companyId, 200),
  });

  const qTiers = useQuery({
    queryKey: ["points", "tiers", companyId],
    queryFn: () => listRewardTiers(companyId),
  });

  const qXp = useQuery({
    queryKey: ["xp", "leaderboard", companyId],
    queryFn: () => fetchXpLeaderboard(companyId, 200),
  });

  const isLoading = isLoadingProfiles || qPoints.isLoading || qTiers.isLoading || qXp.isLoading;

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d.name] as const)), [departments]);

  const deptIndexById = useMemo(() => {
    const sorted = [...departments].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const m = new Map<string, number>();
    sorted.forEach((d, idx) => m.set(d.id, idx));
    return m;
  }, [departments]);

  const pointsByUserId = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of qPoints.data ?? []) m.set(row.user_id, row.total_points);
    return m;
  }, [qPoints.data]);

  const xpByUserId = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of qXp.data ?? []) m.set(row.user_id, row.total_xp);
    return m;
  }, [qXp.data]);

  const tierByUserId = useMemo(() => {
    const active = (qTiers.data ?? []).filter((t) => t.active).sort((a, b) => a.min_points - b.min_points);
    const m = new Map<string, string | null>();

    const getTier = (pts: number) => {
      const cur = [...active].reverse().find((t) => pts >= t.min_points) ?? null;
      return cur?.name ?? null;
    };

    for (const p of profilesSource) {
      const pts = pointsByUserId.get(p.id) ?? 0;
      m.set(p.id, getTier(pts));
    }

    return m;
  }, [profilesSource, pointsByUserId, qTiers.data]);

  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profilesSource;
    return profilesSource.filter((p) => `${p.name} ${p.role} ${p.job_title ?? ""}`.toLowerCase().includes(q));
  }, [profilesSource, query]);

  const tree = useMemo(() => buildTree(visible), [visible]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const [cardOpen, setCardOpen] = useState(false);
  const [selected, setSelected] = useState<DbProfilePublic | null>(null);

  const openCard = (p: DbProfilePublic) => {
    setSelected(p);
    setCardOpen(true);
  };

  const selectedDeptName = selected?.department_id ? deptById.get(selected.department_id) ?? null : null;
  const selectedDeptIdx = selected?.department_id ? deptIndexById.get(selected.department_id) ?? null : null;
  const selectedPoints = selected ? pointsByUserId.get(selected.id) ?? 0 : 0;
  const selectedXp = selected ? xpByUserId.get(selected.id) ?? 0 : 0;
  const selectedTier = selected ? tierByUserId.get(selected.id) ?? null : null;

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Organograma</div>
            <p className="mt-1 text-sm text-muted-foreground">
              A lista é a visão primária. Recolha/expanda times pelos líderes e clique para abrir o card.
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <Network className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <Tabs defaultValue="tree" className="w-full">
          <ScrollableTabsList
            listClassName="w-full justify-start rounded-2xl bg-[color:var(--sinaxys-tint)] p-1"
            containerClassName="-mx-1 px-1"
          >
            <TabsTrigger value="list" className="shrink-0 rounded-xl data-[state=active]:bg-white data-[state=active]:text-[color:var(--sinaxys-ink)]">
              Lista
            </TabsTrigger>
            <TabsTrigger value="tree" className="shrink-0 rounded-xl data-[state=active]:bg-white data-[state=active]:text-[color:var(--sinaxys-ink)]">
              Árvore
            </TabsTrigger>
          </ScrollableTabsList>

          <TabsContent value="list" className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">Dica: use o botão ▸/▾ para recolher/expandir o time de um líder.</div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl"
                  onClick={() => setCollapsed(new Set())}
                >
                  Expandir tudo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl"
                  onClick={() => setCollapsed(new Set(tree.map((n) => n.id)))}
                >
                  Recolher topo
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {tree.map((n) => (
                <ListNode
                  key={n.id}
                  node={n}
                  level={0}
                  collapsed={collapsed}
                  setCollapsed={setCollapsed}
                  deptById={deptById}
                  deptIndexById={deptIndexById}
                  onOpen={openCard}
                  pointsByUserId={pointsByUserId}
                  xpByUserId={xpByUserId}
                  tierByUserId={tierByUserId}
                />
              ))}

              {!tree.length && !isLoading ? (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhuma pessoa encontrada.</div>
              ) : null}
            </div>

            <div className="mt-5 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Dica: quem aparece como "raiz" está sem gestor definido.</div>
          </TabsContent>

          <TabsContent value="tree" className="mt-4">
            <OrgChartTreeCanvas
              roots={tree}
              renderNode={(n) => {
                const p = n.data;
                const deptName = p.department_id ? deptById.get(p.department_id) ?? null : null;
                const deptIdx = p.department_id ? deptIndexById.get(p.department_id) ?? null : null;
                const theme = deptTheme(deptIdx);
                const inactive = !p.active;

                return (
                  <button
                    type="button"
                    onClick={() => openCard(p)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="group relative grid place-items-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--sinaxys-primary)] focus-visible:ring-offset-2"
                    aria-label={`Abrir card de ${p.name}`}
                    title={p.name}
                  >
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-white shadow-sm ring-1 ring-[color:var(--sinaxys-border)] transition group-hover:shadow-md">
                      <div
                        className={cn("grid h-12 w-12 place-items-center rounded-full text-white ring-2 ring-white", theme.bar)}
                        style={inactive ? { opacity: 0.6 } : undefined}
                      >
                        <span className="text-xs font-bold">{initials(p.name)}</span>
                      </div>
                    </div>

                    <div className="mt-2 w-[170px] text-center">
                      <div className={"truncate text-xs font-semibold " + (inactive ? "text-muted-foreground" : "text-[color:var(--sinaxys-ink)]")}>{p.name}</div>
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{p.job_title?.trim() || deptName || roleLabel(p.role as any)}</div>
                    </div>

                    {!p.active ? (
                      <span className="absolute -right-1 -top-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 ring-1 ring-white">
                        Inativo
                      </span>
                    ) : null}
                  </button>
                );
              }}
            />

            {!tree.length && !isLoading ? (
              <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhuma pessoa encontrada.</div>
            ) : null}
          </TabsContent>
        </Tabs>
      </Card>

      <PersonDialog
        open={cardOpen}
        onOpenChange={(v) => {
          setCardOpen(v);
          if (!v) setSelected(null);
        }}
        profile={selected}
        deptName={selectedDeptName}
        deptThemeIdx={selectedDeptIdx}
        points={selectedPoints}
        xp={selectedXp}
        tier={selectedTier}
      />

      {(qPoints.isError || qXp.isError) && (profiles.length > 0) ? (
        <div className={cn("rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 text-sm text-muted-foreground")}>
          Não foi possível carregar pontos/XP para todas as pessoas no momento.
        </div>
      ) : null}
    </div>
  );
}