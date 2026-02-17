import { useMemo, useState } from "react";
import { Network, Pencil, Search, UserRound } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrgChartTreeCanvas, type OrgNode } from "@/components/OrgChartTreeCanvas";
import { OrgPersonDialog } from "@/components/OrgPersonDialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { listDepartments } from "@/lib/departmentsDb";
import { fetchLeaderboard, listRewardTiers } from "@/lib/pointsDb";
import { listProfilesByCompany, updateProfile, type DbProfile } from "@/lib/profilesDb";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

function displayName(p: DbProfile) {
  return p.name?.trim() ? p.name.trim() : p.email;
}

const deptPalette = [
  { bar: "bg-indigo-500" },
  { bar: "bg-emerald-500" },
  { bar: "bg-rose-500" },
  { bar: "bg-amber-500" },
  { bar: "bg-sky-500" },
  { bar: "bg-violet-500" },
  { bar: "bg-teal-500" },
  { bar: "bg-lime-500" },
] as const;

function deptTheme(deptIndex: number | null) {
  if (deptIndex == null || deptIndex < 0) {
    return { bar: "bg-[color:var(--sinaxys-border)]" };
  }
  return deptPalette[deptIndex % deptPalette.length];
}

function buildTree(profiles: DbProfile[]): OrgNode<DbProfile>[] {
  const byId = new Map(profiles.map((p) => [p.id, p] as const));
  const childrenByManager = new Map<string, DbProfile[]>();
  const roots: DbProfile[] = [];

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

  const makeNode = (p: DbProfile): OrgNode<DbProfile> => {
    const kids = (childrenByManager.get(p.id) ?? [])
      .slice()
      .sort((a, b) => displayName(a).localeCompare(displayName(b)))
      .map(makeNode);
    return { id: p.id, data: p, children: kids };
  };

  return roots
    .slice()
    .sort((a, b) => displayName(a).localeCompare(displayName(b)))
    .map(makeNode);
}

export default function AdminOrgChart() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();

  if (!user || user.role !== "ADMIN" || !user.companyId) return null;
  const companyId = user.companyId;

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: () => listDepartments(companyId),
  });

  const { data: profilesAll = [] } = useQuery({
    queryKey: ["profiles", companyId],
    queryFn: () => listProfilesByCompany(companyId),
  });

  // Keep org chart clean: inactive users do not appear.
  const profiles = useMemo(() => profilesAll.filter((p) => !!p.active), [profilesAll]);

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d.name] as const)), [departments]);

  const deptIndexById = useMemo(() => {
    const sorted = [...departments].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const m = new Map<string, number>();
    sorted.forEach((d, idx) => m.set(d.id, idx));
    return m;
  }, [departments]);

  const visibleProfiles = useMemo(() => profiles.slice().sort((a, b) => displayName(a).localeCompare(displayName(b))), [profiles]);

  const [query, setQuery] = useState("");
  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visibleProfiles;
    return visibleProfiles.filter((p) => `${displayName(p)} ${p.email}`.toLowerCase().includes(q));
  }, [visibleProfiles, query]);

  const tree = useMemo(() => buildTree(filteredProfiles), [filteredProfiles]);

  const qPoints = useQuery({
    queryKey: ["points", "leaderboard", companyId],
    queryFn: () => fetchLeaderboard(companyId, 200),
  });

  const qTiers = useQuery({
    queryKey: ["points", "tiers", companyId],
    queryFn: () => listRewardTiers(companyId),
  });

  const pointsByUserId = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of qPoints.data ?? []) m.set(row.user_id, row.total_points);
    return m;
  }, [qPoints.data]);

  const tierByUserId = useMemo(() => {
    const active = (qTiers.data ?? []).filter((t) => t.active).sort((a, b) => a.min_points - b.min_points);
    const m = new Map<string, string | null>();

    const getTier = (pts: number) => {
      const cur = [...active].reverse().find((t) => pts >= t.min_points) ?? null;
      return cur?.name ?? null;
    };

    for (const p of profiles) {
      const pts = pointsByUserId.get(p.id) ?? 0;
      m.set(p.id, getTier(pts));
    }

    return m;
  }, [profiles, pointsByUserId, qTiers.data]);

  const [cardOpen, setCardOpen] = useState(false);
  const [selected, setSelected] = useState<DbProfile | null>(null);

  const openCard = (p: DbProfile) => {
    setSelected(p);
    setCardOpen(true);
  };

  // Edit manager
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DbProfile | null>(null);
  const [managerId, setManagerId] = useState<string>("__none__");

  const openEdit = (p: DbProfile) => {
    setEditing(p);
    setManagerId(p.manager_id ?? "__none__");
    setOpen(true);
  };

  const managerOptions = useMemo(() => visibleProfiles.filter((p) => p.active), [visibleProfiles]);

  const selectedPoints = selected ? pointsByUserId.get(selected.id) ?? 0 : 0;
  const selectedTier = selected ? tierByUserId.get(selected.id) ?? null : null;

  const isLoading = qPoints.isLoading || qTiers.isLoading;

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Admin — Organograma</div>
            <p className="mt-1 text-sm text-muted-foreground">Mapa único da estrutura. Clique para abrir card, ou use o lápis para definir gestor.</p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <Network className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Mapa</div>
            <p className="mt-1 text-sm text-muted-foreground">{filteredProfiles.length} perfis no mapa.</p>
          </div>
          <div className="relative w-full md:w-[360px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 rounded-xl pl-9" placeholder="Buscar por nome ou e-mail…" />
          </div>
        </div>

        <div className="mt-5">
          <OrgChartTreeCanvas
            roots={tree}
            className={cn(isLoading ? "opacity-70" : "")}
            renderNode={(n) => {
              const p = n.data;
              const deptName = p.department_id ? deptById.get(p.department_id) ?? null : null;
              const deptIdx = p.department_id ? deptIndexById.get(p.department_id) ?? null : null;
              const theme = deptTheme(deptIdx);
              const title = displayName(p);
              const inactive = !p.active;

              return (
                <div className="relative grid place-items-center">
                  <button
                    type="button"
                    onClick={() => openCard(p)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="group relative grid place-items-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--sinaxys-primary)] focus-visible:ring-offset-2"
                    aria-label={`Abrir card de ${title}`}
                    title={title}
                  >
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-white shadow-sm ring-1 ring-[color:var(--sinaxys-border)] transition group-hover:shadow-md">
                      <div
                        className={cn("grid h-12 w-12 place-items-center rounded-full text-white ring-2 ring-white", theme.bar)}
                        style={inactive ? { opacity: 0.6 } : undefined}
                      >
                        <span className="text-xs font-bold">{initials(title)}</span>
                      </div>
                    </div>

                    <div className="mt-2 w-[170px] text-center">
                      <div className={"truncate text-xs font-semibold " + (inactive ? "text-muted-foreground" : "text-[color:var(--sinaxys-ink)]")}>
                        {title}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {p.job_title?.trim() ? p.job_title.trim() : deptName ?? ""}
                      </div>
                    </div>

                    {!p.active ? (
                      <span className="absolute -right-1 -top-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 ring-1 ring-white">
                        Inativo
                      </span>
                    ) : null}
                  </button>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute -right-1 top-0 h-8 w-8 rounded-full bg-white"
                    data-no-drag
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(p);
                    }}
                    aria-label={`Definir gestor de ${title}`}
                    title="Definir gestor"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              );
            }}
          />

          {!tree.length ? (
            <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhum perfil encontrado.</div>
          ) : null}
        </div>
      </Card>

      <OrgPersonDialog
        open={cardOpen}
        onOpenChange={(v) => {
          setCardOpen(v);
          if (!v) setSelected(null);
        }}
        profile={selected}
        companyId={companyId}
        departmentName={selected?.department_id ? deptById.get(selected.department_id) ?? null : null}
        points={selectedPoints}
        tier={selectedTier}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Definir gestor</DialogTitle>
          </DialogHeader>

          {editing ? (
            <div className="grid gap-4">
              <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-[color:var(--sinaxys-primary)]">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{displayName(editing)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{editing.email}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Gestor</Label>
                <Select value={managerId} onValueChange={setManagerId}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem gestor</SelectItem>
                    {managerOptions
                      .filter((p) => p.id !== editing.id)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {displayName(p)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">Evite ciclos (A &gt; B &gt; A). O sistema não valida automaticamente.</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Usuário não encontrado.</div>
          )}

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!editing}
              onClick={async () => {
                if (!editing) return;
                try {
                  await updateProfile(editing.id, { manager_id: managerId === "__none__" ? null : managerId });
                  await qc.invalidateQueries({ queryKey: ["profiles", companyId] });
                  toast({ title: "Gestor atualizado" });
                  setOpen(false);
                } catch (e) {
                  toast({
                    title: "Não foi possível salvar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
