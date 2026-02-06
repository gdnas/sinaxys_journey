import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Filter, Mail, Phone, UserRound, ZoomIn, ZoomOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import type { User } from "@/lib/domain";
import { mockDb } from "@/lib/mockDb";
import { roleLabel } from "@/lib/sinaxys";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

function roleRank(role: User["role"]) {
  if (role === "ADMIN") return 0;
  if (role === "HEAD") return 1;
  return 2;
}

function accentByRole(role: User["role"]) {
  if (role === "ADMIN") return "ring-[color:var(--sinaxys-primary)]/55";
  if (role === "HEAD") return "ring-amber-500/50";
  return "ring-[color:var(--sinaxys-border)]";
}

function leadersOf(u: User) {
  const all = [u.managerId, ...(u.leaderIds ?? [])].filter(Boolean) as string[];
  return Array.from(new Set(all));
}

function canEditLeaders(params: { viewer: User; target: User }) {
  const { viewer, target } = params;
  if (!target.active) return false;
  if (viewer.role === "ADMIN") return true;
  if (viewer.role !== "HEAD") return false;
  // Head pode editar se ele for um dos líderes (direto ou adicional)
  return leadersOf(target).includes(viewer.id);
}

export default function OrgChart() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [version, force] = useState(0);
  const [scope, setScope] = useState<string>("__all__");
  const [zoom, setZoom] = useState(0.92);

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [editPrimaryLeaderId, setEditPrimaryLeaderId] = useState<string>("__none__");
  const [editExtraLeaders, setEditExtraLeaders] = useState<Set<string>>(() => new Set());

  if (!user || !user.companyId) return null;

  const { allUsers, departments, departmentsById } = useMemo(() => {
    const db = mockDb.get();
    const allUsers = db.users
      .filter((u) => u.active)
      .filter((u) => u.role !== "MASTERADMIN")
      .filter((u) => u.companyId === user.companyId);
    const departments = db.departments
      .filter((d) => d.companyId === user.companyId)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    const departmentsById = new Map(departments.map((d) => [d.id, d.name] as const));
    return { allUsers, departments, departmentsById };
  }, [version, user.companyId]);

  const deptIdForScope = scope === "__my__" ? user.departmentId : scope === "__all__" ? undefined : scope;

  const users = useMemo(() => {
    if (!deptIdForScope) return allUsers;

    const byId = new Map(allUsers.map((u) => [u.id, u] as const));
    const included = new Set<string>();

    const inTeam = allUsers.filter((u) => u.departmentId === deptIdForScope);
    for (const u of inTeam) {
      included.add(u.id);
      let cursor = u.managerId;
      // inclui cadeia de gestores (apenas gestor direto) para manter contexto
      while (cursor) {
        if (included.has(cursor)) break;
        included.add(cursor);
        cursor = byId.get(cursor)?.managerId;
      }
    }

    return allUsers.filter((u) => included.has(u.id));
  }, [allUsers, deptIdForScope]);

  const byId = useMemo(() => new Map(users.map((u) => [u.id, u] as const)), [users]);

  const childrenByManager = useMemo(() => {
    const map = new Map<string, User[]>();
    for (const u of users) {
      const key = u.managerId ?? "__root__";
      const arr = map.get(key) ?? [];
      arr.push(u);
      map.set(key, arr);
    }

    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.name.localeCompare(b.name));
      map.set(k, arr);
    }

    return map;
  }, [users]);

  const roots = useMemo(() => {
    const root = childrenByManager.get("__root__") ?? [];
    const orphans = users.filter((u) => u.managerId && !byId.has(u.managerId));
    const merged = [...root, ...orphans.filter((o) => !root.some((r) => r.id === o.id))];
    merged.sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.name.localeCompare(b.name));
    return merged;
  }, [childrenByManager, users, byId]);

  const levels = useMemo(() => {
    // Layout por níveis usando apenas o gestor direto (managerId) para manter uma "árvore" legível.
    const levelById = new Map<string, number>();
    const queue: Array<{ id: string; level: number }> = [];

    for (const r of roots) {
      levelById.set(r.id, 0);
      queue.push({ id: r.id, level: 0 });
    }

    while (queue.length) {
      const cur = queue.shift()!;
      const children = childrenByManager.get(cur.id) ?? [];
      for (const c of children) {
        if (levelById.has(c.id)) continue;
        levelById.set(c.id, cur.level + 1);
        queue.push({ id: c.id, level: cur.level + 1 });
      }
    }

    // pessoas não alcançadas (ex.: loops antigos / dados incompletos)
    for (const u of users) {
      if (!levelById.has(u.id)) levelById.set(u.id, 0);
    }

    const grouped = new Map<number, User[]>();
    for (const u of users) {
      const lvl = levelById.get(u.id) ?? 0;
      const arr = grouped.get(lvl) ?? [];
      arr.push(u);
      grouped.set(lvl, arr);
    }

    const sortedLevels = Array.from(grouped.keys()).sort((a, b) => a - b);
    return sortedLevels.map((lvl) => {
      const arr = grouped.get(lvl) ?? [];
      arr.sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.name.localeCompare(b.name));
      return { level: lvl, people: arr };
    });
  }, [users, roots, childrenByManager]);

  const selectedPerson = selectedPersonId ? allUsers.find((u) => u.id === selectedPersonId) ?? null : null;

  const leaderOptions = useMemo(() => {
    if (!selectedPerson) return [];
    return allUsers
      .filter((u) => u.active)
      .filter((u) => u.id !== selectedPerson.id)
      .filter((u) => u.role === "ADMIN" || u.role === "HEAD")
      .slice()
      .sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.name.localeCompare(b.name));
  }, [allUsers, selectedPerson?.id]);

  useEffect(() => {
    if (!selectedPerson) return;
    setEditPrimaryLeaderId(selectedPerson.managerId ?? "__none__");
    setEditExtraLeaders(new Set(selectedPerson.leaderIds ?? []));
  }, [selectedPerson?.id]);

  const totalPeopleLabel = users.length;

  function LeaderBadges({ person }: { person: User }) {
    const ids = leadersOf(person);
    if (!ids.length) return <span className="text-xs text-muted-foreground">—</span>;

    const leaders = ids
      .map((id) => allUsers.find((x) => x.id === id))
      .filter(Boolean) as User[];

    return (
      <div className="flex flex-wrap gap-1.5">
        {leaders.map((l) => (
          <Badge
            key={l.id}
            className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]"
          >
            {l.name}
          </Badge>
        ))}
      </div>
    );
  }

  function AvatarNode({ person }: { person: User }) {
    const dept = person.departmentId ? departmentsById.get(person.departmentId) : undefined;

    const leaderNames = leadersOf(person)
      .map((id) => allUsers.find((x) => x.id === id)?.name)
      .filter(Boolean) as string[];

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setSelectedPersonId(person.id)}
            className="group flex flex-col items-center gap-2"
          >
            <Avatar
              className={
                "h-12 w-12 ring-2 transition group-hover:scale-[1.03] sm:h-14 sm:w-14 " + accentByRole(person.role)
              }
            >
              <AvatarImage src={person.avatarUrl} alt={person.name} />
              <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                {initials(person.name)}
              </AvatarFallback>
            </Avatar>
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px]">
          <div className="text-sm font-semibold">{person.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {roleLabel(person.role)}
            {dept ? <> • {dept}</> : null}
          </div>
          {leaderNames.length ? (
            <div className="mt-2 text-xs text-muted-foreground">
              Líder(es): <span className="font-medium text-foreground">{leaderNames.join(", ")}</span>
            </div>
          ) : null}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Organograma</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Visualização em página cheia (somente rostos). Clique em alguém para ver detalhes e editar líderes.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                {totalPeopleLabel} pessoas
              </Badge>
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                HEAD pode editar se for líder • ADMIN pode editar todos
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                <Filter className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
              </div>
              <Select
                value={scope}
                onValueChange={(v) => {
                  setScope(v);
                }}
              >
                <SelectTrigger className="h-11 w-[240px] rounded-xl">
                  <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Empresa toda</SelectItem>
                  {user.departmentId ? <SelectItem value="__my__">Meu time</SelectItem> : null}
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl"
                onClick={() => setZoom((z) => Math.max(0.65, Math.round((z - 0.05) * 100) / 100))}
                aria-label="Diminuir zoom"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>

              <div className="w-[140px] px-1">
                <Slider
                  value={[Math.round(zoom * 100)]}
                  min={65}
                  max={120}
                  step={1}
                  onValueChange={(v) => setZoom(v[0] / 100)}
                />
                <div className="mt-1 text-center text-[11px] text-muted-foreground">Zoom {Math.round(zoom * 100)}%</div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl"
                onClick={() => setZoom((z) => Math.min(1.2, Math.round((z + 0.05) * 100) / 100))}
                aria-label="Aumentar zoom"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border bg-white p-4 md:p-6">
        <div className="overflow-hidden rounded-2xl bg-[color:var(--sinaxys-bg)]">
          <ScrollArea className="h-[min(72vh,calc(100dvh-320px))]">
            <div
              className="mx-auto w-fit px-6 py-8"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
            >
              <div className="grid gap-10">
                {levels.map((lvl) => (
                  <div key={lvl.level} className="grid gap-4">
                    <div className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Nível {lvl.level + 1}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-5">
                      {lvl.people.map((p) => (
                        <AvatarNode key={p.id} person={p} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>

        {!roots.length ? (
          <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
            Não encontramos uma estrutura com gestor direto definido para este filtro.
          </div>
        ) : null}
      </div>

      <Dialog
        open={!!selectedPerson}
        onOpenChange={(open) => {
          if (!open) setSelectedPersonId(null);
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes</DialogTitle>
          </DialogHeader>

          {selectedPerson ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className={"h-14 w-14 ring-2 " + accentByRole(selectedPerson.role)}>
                      <AvatarImage src={selectedPerson.avatarUrl} alt={selectedPerson.name} />
                      <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                        {initials(selectedPerson.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                        {selectedPerson.name}
                        <span className="font-medium text-muted-foreground"> — {selectedPerson.jobTitle?.trim() || "Sem cargo"}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {roleLabel(selectedPerson.role)}
                        {selectedPerson.departmentId ? (
                          <> • {departmentsById.get(selectedPerson.departmentId) ?? "—"}</>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                      {leadersOf(selectedPerson).length ? "Tem líder" : "Topo"}
                    </Badge>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                      E-mail
                    </div>
                    <div className="font-medium text-[color:var(--sinaxys-ink)]">{selectedPerson.email}</div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                      Celular
                    </div>
                    <div className="font-medium text-[color:var(--sinaxys-ink)]">{selectedPerson.phone ?? "—"}</div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid gap-2">
                  <div className="text-xs text-muted-foreground">Líder(es)</div>
                  <LeaderBadges person={selectedPerson} />
                </div>
              </div>

              {canEditLeaders({ viewer: user, target: selectedPerson }) ? (
                <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Editar liderança</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Defina o <span className="font-medium text-[color:var(--sinaxys-ink)]">gestor direto</span> (usado para o layout) e, se necessário, adicione outros líderes.
                  </p>

                  <div className="mt-4 grid gap-4">
                    <div className="grid gap-2">
                      <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">Gestor direto</div>
                      <Select value={editPrimaryLeaderId} onValueChange={setEditPrimaryLeaderId}>
                        <SelectTrigger className="rounded-xl bg-white">
                          <SelectValue placeholder="Selecione…" />
                        </SelectTrigger>
                        <SelectContent>
                          {user.role === "ADMIN" ? (
                            <SelectItem value="__none__">Sem gestor (topo)</SelectItem>
                          ) : null}
                          {leaderOptions.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name} — {m.jobTitle?.trim() || "Sem cargo"} ({roleLabel(m.role)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">Outros líderes</div>
                      <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white">
                        <ScrollArea className="h-48">
                          <div className="p-3">
                            <div className="grid gap-2">
                              {leaderOptions.map((l) => {
                                const disabled = l.id === editPrimaryLeaderId;
                                const checked = editExtraLeaders.has(l.id);
                                return (
                                  <label
                                    key={l.id}
                                    className={
                                      "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 transition " +
                                      (disabled
                                        ? "border-[color:var(--sinaxys-border)] bg-muted/40 opacity-60"
                                        : "border-[color:var(--sinaxys-border)] hover:bg-[color:var(--sinaxys-tint)]/35")
                                    }
                                  >
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-medium text-[color:var(--sinaxys-ink)]">{l.name}</div>
                                      <div className="mt-0.5 text-xs text-muted-foreground">
                                        {roleLabel(l.role)} • {l.jobTitle?.trim() || "Sem cargo"}
                                      </div>
                                    </div>
                                    <Checkbox
                                      checked={checked}
                                      disabled={disabled}
                                      onCheckedChange={(v) => {
                                        if (disabled) return;
                                        setEditExtraLeaders((prev) => {
                                          const next = new Set(prev);
                                          if (v) next.add(l.id);
                                          else next.delete(l.id);
                                          return next;
                                        });
                                      }}
                                    />
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </ScrollArea>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Dica: o gestor direto já conta como líder; aqui você adiciona líderes adicionais.
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                        onClick={() => {
                          try {
                            const nextManager = editPrimaryLeaderId === "__none__" ? null : editPrimaryLeaderId;
                            if (user.role !== "ADMIN" && nextManager === null) {
                              toast({
                                title: "Ação não permitida",
                                description: "Apenas ADMIN pode deixar alguém sem gestor direto.",
                                variant: "destructive",
                              });
                              return;
                            }

                            mockDb.updateUserManager(selectedPerson.id, nextManager);
                            mockDb.setUserAdditionalLeaders(selectedPerson.id, Array.from(editExtraLeaders));

                            toast({
                              title: "Liderança atualizada",
                              description: "Alterações salvas com sucesso.",
                            });
                            setSelectedPersonId(null);
                            force((x) => x + 1);
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
                </Card>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setSelectedPersonId(null)}>
              Fechar
            </Button>
            {selectedPerson ? (
              <Button
                asChild
                className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              >
                <Link to={`/people/${selectedPerson.id}`}>
                  <UserRound className="mr-2 h-4 w-4" />
                  Abrir perfil
                </Link>
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
