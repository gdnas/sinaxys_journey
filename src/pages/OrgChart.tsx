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
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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

export default function OrgChart() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [version, force] = useState(0);

  const { allUsers, departments, departmentsById } = useMemo(() => {
    const db = mockDb.get();
    const allUsers = db.users.filter((u) => u.active);
    const departments = db.departments.slice().sort((a, b) => a.name.localeCompare(b.name));
    const departmentsById = new Map(db.departments.map((d) => [d.id, d.name] as const));
    return { allUsers, departments, departmentsById };
  }, [version]);

  const [scope, setScope] = useState<string>("__all__");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

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

  const teamSizeById = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of users) m.set(u.id, 0);
    for (const u of users) {
      if (!u.managerId) continue;
      if (!m.has(u.managerId)) continue;
      m.set(u.managerId, (m.get(u.managerId) ?? 0) + 1);
    }
    return m;
  }, [users]);

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

  const selectedPerson = selectedPersonId ? allUsers.find((u) => u.id === selectedPersonId && u.active) ?? null : null;

  function Node({ node, depth }: { node: User; depth: number }) {
    const directReports = childrenByManager.get(node.id) ?? [];
    const isCollapsed = collapsed.has(node.id);

    const mgr = node.managerId ? allUsers.find((u) => u.id === node.managerId && u.active) : undefined;
    const dept = node.departmentId ? departmentsById.get(node.departmentId) : undefined;
    const teamSize = teamSizeById.get(node.id) ?? 0;

    const isMe = user.id === node.id;
    const canMove = canMoveNode({ viewer: user, node });

    return (
      <div className="grid gap-3">
        <div className="flex items-stretch gap-3">
          <button
            type="button"
            className={
              "mt-3 grid h-8 w-8 place-items-center rounded-xl border bg-white text-muted-foreground transition hover:bg-[color:var(--sinaxys-tint)] " +
              (directReports.length ? "opacity-100" : "opacity-0 pointer-events-none")
            }
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
          </button>

          <Card
            role="button"
            tabIndex={0}
            onClick={() => setSelectedPersonId(node.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setSelectedPersonId(node.id);
            }}
            className={
              "w-full cursor-pointer rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-4 shadow-sm transition hover:bg-[color:var(--sinaxys-tint)]/35 md:p-5 " +
              (isMe ? "ring-2 ring-[color:var(--sinaxys-primary)]/40" : "")
            }
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 ring-2 ring-[color:var(--sinaxys-border)]">
                  <AvatarImage src={node.avatarUrl} alt={node.name} />
                  <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                    {initials(node.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)] md:text-base">
                      {node.name}
                    </div>
                    {isMe ? (
                      <Badge className="rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]">
                        Você
                      </Badge>
                    ) : null}
                    <Badge className={"rounded-full " + nodeAccent(depth)}>
                      Nível {depth + 1}
                    </Badge>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-[color:var(--sinaxys-ink)]">{roleLabel(node.role)}</span>
                    {dept ? (
                      <span className="rounded-full bg-[color:var(--sinaxys-tint)] px-2 py-0.5 text-[color:var(--sinaxys-ink)]">
                        {dept}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-muted px-2 py-0.5">Lidera {teamSize}</span>
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">
                    Reporta para:{" "}
                    <span className="font-medium text-[color:var(--sinaxys-ink)]">{mgr?.name ?? "—"}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canMove ? (
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMovingUserId(node.id);
                      setSelectedManagerId(node.managerId ?? "__none__");
                    }}
                  >
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    Mover
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
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

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Organograma</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Clique em qualquer card para ver contato e abrir o perfil.
              </p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Network className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-[color:var(--sinaxys-tint)] px-3 py-1 text-[color:var(--sinaxys-ink)]">
                  Dica: use a setinha para recolher/expandir equipes.
                </span>
                {user.role === "HEAD" ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">
                    Você pode mover apenas seus liderados diretos.
                  </span>
                ) : user.role === "ADMIN" ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-900">
                    Admin pode reorganizar qualquer pessoa.
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-3 py-1">Somente visualização.</span>
                )}
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

            <div className="text-xs text-muted-foreground">
              Mostrando: <span className="font-medium text-[color:var(--sinaxys-ink)]">{users.length}</span> pessoas
              {deptIdForScope ? (
                <>
                  {" "}• Inclui cadeia de gestores para manter o contexto
                </>
              ) : null}
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
          roots.map((r) => <Node key={r.id} node={r} depth={0} />)
        ) : (
          <div className="rounded-3xl border bg-white p-6">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Nenhuma estrutura encontrada</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Neste filtro, não encontramos pessoas com time/gestor definido.
            </p>
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
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-12 w-12 ring-2 ring-[color:var(--sinaxys-border)]">
                      <AvatarImage src={selectedPerson.avatarUrl} alt={selectedPerson.name} />
                      <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                        {initials(selectedPerson.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                        {selectedPerson.name}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {roleLabel(selectedPerson.role)}
                        {selectedPerson.departmentId ? (
                          <> • {departmentsById.get(selectedPerson.departmentId) ?? "—"}</>
                        ) : null}
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
                    {selectedPerson.managerId
                      ? allUsers.find((u) => u.id === selectedPerson.managerId)?.name ?? "—"
                      : "—"}
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
