import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Filter,
  Mail,
  Network,
  Phone,
  UserRound,
  WrapText,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

function nodeAccent(depth: number) {
  if (depth <= 0) return "bg-[color:var(--sinaxys-primary)]/10 text-[color:var(--sinaxys-primary)]";
  if (depth === 1) return "bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)]";
  return "bg-muted text-muted-foreground";
}

function canMoveNode(params: { viewer: User; node: User }) {
  const { viewer, node } = params;
  if (!node.active) return false;
  if (viewer.role === "ADMIN") return true;
  if (viewer.role !== "HEAD") return false;
  return node.managerId === viewer.id;
}

type OrgViewMode = "list" | "tree";

export default function OrgChart() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [version, force] = useState(0);

  const { allUsers, departments, departmentsById } = useMemo(() => {
    const db = mockDb.get();
    const allUsers = db.users.filter((u) => u.active && u.role !== "MASTERADMIN");
    const departments = db.departments.slice().sort((a, b) => a.name.localeCompare(b.name));
    const departmentsById = new Map(db.departments.map((d) => [d.id, d.name] as const));
    return { allUsers, departments, departmentsById };
  }, [version]);

  const [scope, setScope] = useState<string>("__all__");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [view, setView] = useState<OrgViewMode>("list");

  const [movingUserId, setMovingUserId] = useState<string | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  if (!user) return null;

  const deptIdForScope = scope === "__my__" ? user.departmentId : scope === "__all__" ? undefined : scope;

  const users = useMemo(() => {
    if (!deptIdForScope) return allUsers;

    const byId = new Map(allUsers.map((u) => [u.id, u] as const));
    const included = new Set<string>();

    const inTeam = allUsers.filter((u) => u.departmentId === deptIdForScope);
    for (const u of inTeam) {
      included.add(u.id);
      let cursor = u.managerId;
      // include chain up to root to keep structure readable
      while (cursor) {
        if (included.has(cursor)) break;
        included.add(cursor);
        cursor = byId.get(cursor)?.managerId;
      }
    }

    // if team is empty, fallback to empty (still show UI)
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
      arr.sort((a, b) => {
        const rr = roleRank(a.role) - roleRank(b.role);
        if (rr !== 0) return rr;
        return a.name.localeCompare(b.name);
      });
      map.set(k, arr);
    }

    return map;
  }, [users]);

  const roots = useMemo(() => {
    const root = childrenByManager.get("__root__") ?? [];
    const orphans = users.filter((u) => u.managerId && !byId.has(u.managerId));
    const merged = [...root, ...orphans.filter((o) => !root.some((r) => r.id === o.id))];
    merged.sort((a, b) => {
      const rr = roleRank(a.role) - roleRank(b.role);
      if (rr !== 0) return rr;
      return a.name.localeCompare(b.name);
    });
    return merged;
  }, [childrenByManager, users, byId]);

  const movingUser = movingUserId ? byId.get(movingUserId) ?? null : null;

  const managerOptions = useMemo(() => {
    if (!movingUser) return [] as User[];

    return allUsers
      .filter((u) => u.active && u.id !== movingUser.id)
      .filter((u) => u.role === "ADMIN" || u.role === "HEAD")
      .sort((a, b) => {
        const rr = roleRank(a.role) - roleRank(b.role);
        if (rr !== 0) return rr;
        return a.name.localeCompare(b.name);
      });
  }, [movingUser, allUsers]);

  const selectedPerson = selectedPersonId
    ? allUsers.find((u) => u.id === selectedPersonId && u.active) ?? null
    : null;

  function PersonCard({
    node,
    depth,
    compact,
    showCollapseButton = true,
  }: {
    node: User;
    depth: number;
    compact?: boolean;
    showCollapseButton?: boolean;
  }) {
    const directReports = childrenByManager.get(node.id) ?? [];
    const isCollapsed = collapsed.has(node.id);

    const mgr = node.managerId ? allUsers.find((u) => u.id === node.managerId && u.active) : undefined;
    const dept = node.departmentId ? departmentsById.get(node.departmentId) : undefined;

    const isMe = user.id === node.id;
    const canMove = canMoveNode({ viewer: user, node });

    return (
      <Card
        role="button"
        tabIndex={0}
        onClick={() => setSelectedPersonId(node.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setSelectedPersonId(node.id);
        }}
        className={
          (compact
            ? "w-[220px] rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-3 shadow-sm transition hover:bg-[color:var(--sinaxys-tint)]/35"
            : "w-full cursor-pointer rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-4 shadow-sm transition hover:bg-[color:var(--sinaxys-tint)]/35 md:p-5") +
          (isMe ? " ring-2 ring-[color:var(--sinaxys-primary)]/40" : "")
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className={compact ? "h-9 w-9 ring-2 ring-[color:var(--sinaxys-border)]" : "h-11 w-11 ring-2 ring-[color:var(--sinaxys-border)]"}>
              <AvatarImage src={node.avatarUrl} alt={node.name} />
              <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                {initials(node.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className={compact ? "truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]" : "truncate text-sm font-semibold text-[color:var(--sinaxys-ink)] md:text-base"}>
                  {node.name}
                </div>
              </div>

              <div className={compact ? "mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground" : "mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"}>
                <span className="font-medium text-[color:var(--sinaxys-ink)]">{roleLabel(node.role)}</span>
                {dept ? (
                  <span className="rounded-full bg-[color:var(--sinaxys-tint)] px-2 py-0.5 text-[color:var(--sinaxys-ink)]">
                    {dept}
                  </span>
                ) : null}
              </div>

              {!compact ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  Reporta para:{" "}
                  <span className="font-medium text-[color:var(--sinaxys-ink)]">{mgr?.name ?? "—"}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showCollapseButton && directReports.length ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    aria-label={isCollapsed ? "Expandir" : "Recolher"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCollapsed((prev) => {
                        const next = new Set(prev);
                        if (next.has(node.id)) next.delete(node.id);
                        else next.add(node.id);
                        return next;
                      });
                    }}
                  >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isCollapsed ? "Expandir" : "Recolher"}</TooltipContent>
              </Tooltip>
            ) : null}

            {canMove ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    aria-label="Mover"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMovingUserId(node.id);
                      setSelectedManagerId(node.managerId ?? "__none__");
                    }}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mover</TooltipContent>
              </Tooltip>
            ) : null}

            {!compact ? (
              <Badge className={"rounded-full " + nodeAccent(depth)}>Nível {depth + 1}</Badge>
            ) : null}
          </div>
        </div>
      </Card>
    );
  }

  function Node({ node, depth }: { node: User; depth: number }) {
    const directReports = childrenByManager.get(node.id) ?? [];
    const isCollapsed = collapsed.has(node.id);

    return (
      <div className="grid gap-3">
        <div className="flex items-stretch gap-3">
          {directReports.length ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="mt-3 h-8 w-8 rounded-xl"
                  aria-label={isCollapsed ? "Expandir" : "Recolher"}
                  onClick={() => {
                    setCollapsed((prev) => {
                      const next = new Set(prev);
                      if (next.has(node.id)) next.delete(node.id);
                      else next.add(node.id);
                      return next;
                    });
                  }}
                >
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isCollapsed ? "Expandir" : "Recolher"}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="mt-3 h-8 w-8 opacity-0" aria-hidden />
          )}

          <PersonCard node={node} depth={depth} showCollapseButton={false} />
        </div>

        {directReports.length && !isCollapsed ? (
          <div className="ml-7 border-l border-[color:var(--sinaxys-border)] pl-5">
            <div className="grid gap-3">
              {directReports.map((child) => (
                <Node key={child.id} node={child} depth={depth + 1} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  function TreeNode({ node, depth }: { node: User; depth: number }) {
    const children = childrenByManager.get(node.id) ?? [];
    const isCollapsed = collapsed.has(node.id);

    return (
      <div className="inline-flex flex-col items-center">
        <PersonCard node={node} depth={depth} compact />

        {children.length && !isCollapsed ? (
          <div className="mt-3 flex flex-col items-center">
            <div className="h-6 w-px bg-[color:var(--sinaxys-border)]" />

            <div className="relative inline-flex items-start gap-6 pt-6">
              <div className="absolute left-0 right-0 top-0 h-px bg-[color:var(--sinaxys-border)]" />
              {children.map((c) => (
                <div key={c.id} className="relative flex flex-col items-center">
                  <div className="absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-[color:var(--sinaxys-border)]" />
                  <TreeNode node={c} depth={depth + 1} />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Organograma</div>
              <p className="mt-1 text-sm text-muted-foreground">Clique em qualquer pessoa para ver contato e abrir o perfil.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div />

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex items-center justify-end gap-2">
                  <ToggleGroup
                    type="single"
                    value={view}
                    onValueChange={(v) => {
                      const next = (v as OrgViewMode) || "list";
                      setView(next);
                    }}
                    className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-1"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ToggleGroupItem
                          value="list"
                          aria-label="Lista"
                          className="h-10 w-10 rounded-xl data-[state=on]:bg-[color:var(--sinaxys-tint)]"
                        >
                          <WrapText className="h-4 w-4" />
                        </ToggleGroupItem>
                      </TooltipTrigger>
                      <TooltipContent>Lista</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ToggleGroupItem
                          value="tree"
                          aria-label="Árvore"
                          className="h-10 w-10 rounded-xl data-[state=on]:bg-[color:var(--sinaxys-tint)]"
                        >
                          <Network className="h-4 w-4" />
                        </ToggleGroupItem>
                      </TooltipTrigger>
                      <TooltipContent>Árvore</TooltipContent>
                    </Tooltip>
                  </ToggleGroup>
                </div>

                <div className="flex items-center gap-2">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                    <Filter className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                  </div>
                  <Select
                    value={scope}
                    onValueChange={(v) => {
                      setScope(v);
                      setCollapsed(new Set());
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
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Mostrando: <span className="font-medium text-[color:var(--sinaxys-ink)]">{users.length}</span> pessoas
              {deptIdForScope ? <> • Inclui cadeia de gestores para manter o contexto</> : null}
            </div>
          </div>
        </div>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Legenda</div>
          <p className="mt-1 text-sm text-muted-foreground">A posição de cada pessoa aparece no próprio card.</p>
          <Separator className="my-4" />
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Nível</span>
              <span className="font-medium text-[color:var(--sinaxys-ink)]">Topo → base</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Reporta para</span>
              <span className="font-medium text-[color:var(--sinaxys-ink)]">Gestor direto</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Lidera</span>
              <span className="font-medium text-[color:var(--sinaxys-ink)]">Nº de liderados diretos</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4">
        {roots.length ? (
          view === "list" ? (
            roots.map((r) => <Node key={r.id} node={r} depth={0} />)
          ) : (
            <div className="max-w-full overflow-x-auto rounded-3xl border bg-white p-4 md:p-6">
              <div className="min-w-max">
                <div className="flex items-start justify-center gap-10">
                  {roots.map((r) => (
                    <TreeNode key={r.id} node={r} depth={0} />
                  ))}
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="rounded-3xl border bg-white p-6">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Nenhuma estrutura encontrada</div>
            <p className="mt-1 text-sm text-muted-foreground">Neste filtro, não encontramos pessoas com time/gestor definido.</p>
          </div>
        )}
      </div>

      {/* Detalhe de pessoa (clicando no card) */}
      <Dialog
        open={!!selectedPerson}
        onOpenChange={(open) => {
          if (!open) setSelectedPersonId(null);
        }}
      >
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes</DialogTitle>
          </DialogHeader>

          {selectedPerson ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-12 w-12 ring-2 ring-[color:var(--sinaxys-border)]">
                      <AvatarImage src={selectedPerson.avatarUrl} alt={selectedPerson.name} />
                      <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                        {initials(selectedPerson.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{selectedPerson.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {roleLabel(selectedPerson.role)}
                        {selectedPerson.departmentId ? <> • {departmentsById.get(selectedPerson.departmentId) ?? "—"}</> : null}
                      </div>
                    </div>
                  </div>

                  <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                    {selectedPerson.managerId ? "Tem gestor" : "Topo"}
                  </Badge>
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

                <div className="text-xs text-muted-foreground">
                  Reporta para:{" "}
                  <span className="font-medium text-[color:var(--sinaxys-ink)]">
                    {selectedPerson.managerId ? allUsers.find((u) => u.id === selectedPerson.managerId)?.name ?? "—" : "—"}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setSelectedPersonId(null)}>
              Fechar
            </Button>
            {selectedPerson ? (
              <Button asChild className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                <Link to={`/people/${selectedPerson.id}`}>
                  <UserRound className="mr-2 h-4 w-4" />
                  Abrir perfil
                </Link>
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mover no organograma */}
      <Dialog
        open={!!movingUser}
        onOpenChange={(open) => {
          if (!open) {
            setMovingUserId(null);
            setSelectedManagerId("");
          }
        }}
      >
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Mover no organograma</DialogTitle>
          </DialogHeader>

          {movingUser ? (
            <div className="grid gap-4">
              <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{movingUser.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">Selecione o novo gestor direto.</div>
              </div>

              <div className="grid gap-2">
                <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">Novo gestor</div>
                <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {user.role === "ADMIN" ? <SelectItem value="__none__">Sem gestor (topo)</SelectItem> : null}
                    {managerOptions.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} — {roleLabel(m.role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setMovingUserId(null)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!movingUser || !selectedManagerId}
              onClick={() => {
                if (!movingUser) return;
                try {
                  if (!canMoveNode({ viewer: user, node: movingUser })) {
                    toast({
                      title: "Ação não permitida",
                      description: "Você só pode mover seus liderados diretos.",
                      variant: "destructive",
                    });
                    return;
                  }

                  const next = selectedManagerId === "__none__" ? null : selectedManagerId;
                  mockDb.updateUserManager(movingUser.id, next);

                  toast({
                    title: "Organograma atualizado",
                    description: "A posição foi alterada.",
                  });
                  setMovingUserId(null);
                  setSelectedManagerId("");
                  force((x) => x + 1);
                } catch (e) {
                  toast({
                    title: "Não foi possível mover",
                    description: e instanceof Error ? e.message : "Tente novamente.",
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