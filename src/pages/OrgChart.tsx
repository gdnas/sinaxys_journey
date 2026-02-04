import { useMemo, useState } from "react";
import { ArrowUpDown, ChevronDown, ChevronRight, Network } from "lucide-react";
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
  // gentle, consistent (no gradients) using existing palette
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

  const { users, departmentsById } = useMemo(() => {
    const db = mockDb.get();
    const users = db.users.filter((u) => u.active);
    const departmentsById = new Map(db.departments.map((d) => [d.id, d.name] as const));
    return { users, departmentsById };
  }, [version]);

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
    // also treat "orphan" users whose managerId is invalid as roots
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
      m.set(u.managerId, (m.get(u.managerId) ?? 0) + 1);
    }
    return m;
  }, [users]);

  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const [movingUserId, setMovingUserId] = useState<string | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");

  const movingUser = movingUserId ? byId.get(movingUserId) ?? null : null;

  const managerOptions = useMemo(() => {
    if (!movingUser) return [] as User[];
    return users
      .filter((u) => u.id !== movingUser.id)
      .filter((u) => u.role === "ADMIN" || u.role === "HEAD")
      .sort((a, b) => {
        const rr = roleRank(a.role) - roleRank(b.role);
        if (rr !== 0) return rr;
        return a.name.localeCompare(b.name);
      });
  }, [movingUser, users]);

  if (!user) return null;

  function Node({ node, depth }: { node: User; depth: number }) {
    const directReports = childrenByManager.get(node.id) ?? [];
    const isCollapsed = collapsed.has(node.id);

    const mgr = node.managerId ? byId.get(node.managerId) : undefined;
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
          </button>

          <Card
            className={
              "w-full rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-4 shadow-sm md:p-5 " +
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
                    onClick={() => {
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
                Visão de estrutura, reporte e times. Cards destacam sua posição e o nível na hierarquia.
              </p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Network className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-[color:var(--sinaxys-tint)] px-3 py-1 text-[color:var(--sinaxys-ink)]">
              Dica: clique na setinha para recolher/expandir equipes.
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
              Para aparecer como organograma, os usuários precisam ter um gestor definido.
            </p>
          </div>
        )}
      </div>

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
                  // permission check (defensive)
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
