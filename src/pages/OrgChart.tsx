import { useMemo, useState } from "react";
import { Network, Search, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrgChartTreeCanvas, type OrgNode } from "@/components/OrgChartTreeCanvas";
import { useAuth } from "@/lib/auth";
import { listDepartments } from "@/lib/departmentsDb";
import { listPublicProfilesByCompany, type DbProfilePublic } from "@/lib/profilePublicDb";
import { roleLabel } from "@/lib/sinaxys";

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

function PersonDialog({
  open,
  onOpenChange,
  profile,
  deptName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: DbProfilePublic | null;
  deptName: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Card da pessoa</DialogTitle>
        </DialogHeader>

        {profile ? (
          <div className="grid gap-4">
            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[color:var(--sinaxys-primary)]">
                  <span className="text-xs font-bold">{initials(profile.name)}</span>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{profile.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white ring-1 ring-[color:var(--sinaxys-border)]">
                      {roleLabel(profile.role as any)}
                    </Badge>
                    {deptName ? (
                      <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
                        {deptName}
                      </span>
                    ) : null}
                    {!profile.active ? <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">Inativo</span> : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Cargo</span>
                <span className="font-semibold text-[color:var(--sinaxys-ink)]">{profile.job_title?.trim() ? profile.job_title.trim() : "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-xs text-[color:var(--sinaxys-ink)]">{profile.id}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <span className="font-semibold text-[color:var(--sinaxys-ink)]">{profile.active ? "Ativo" : "Inativo"}</span>
              </div>
            </div>

            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-xs text-muted-foreground">
              Esta visão é pública dentro da empresa (sem e-mail/telefone), para permitir o organograma a todos.
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Pessoa não encontrada.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TreeRow({
  node,
  level,
  deptById,
  onOpen,
}: {
  node: OrgNode<DbProfilePublic>;
  level: number;
  deptById: Map<string, string>;
  onOpen: (p: DbProfilePublic) => void;
}) {
  const p = node.data;
  const deptName = p.department_id ? deptById.get(p.department_id) : undefined;

  return (
    <div>
      <button
        type="button"
        onClick={() => onOpen(p)}
        className={
          "flex w-full items-center justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3 text-left transition hover:bg-[color:var(--sinaxys-tint)]/40"
        }
        style={{ marginLeft: level * 16 }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
            <span className="text-xs font-bold">{initials(p.name)}</span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{p.name}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white ring-1 ring-[color:var(--sinaxys-border)]">
                {roleLabel(p.role as any)}
              </Badge>
              {deptName ? (
                <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
                  {deptName}
                </span>
              ) : null}
              {!p.active ? <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">Inativo</span> : null}
            </div>
          </div>
        </div>

        <div className="grid h-9 w-9 place-items-center rounded-xl border border-[color:var(--sinaxys-border)] bg-white text-[color:var(--sinaxys-primary)]">
          <UserRound className="h-4 w-4" />
        </div>
      </button>

      {node.children.length ? (
        <div className="mt-2 grid gap-2">
          {node.children.map((c) => (
            <TreeRow key={c.id} node={c} level={level + 1} deptById={deptById} onOpen={onOpen} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function OrgChart() {
  const { user } = useAuth();
  if (!user) return null;

  const companyId = user.companyId;

  if (!companyId) {
    return (
      <div className="grid gap-6">
        <div className="rounded-3xl border bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Organograma</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Selecione uma empresa ativa (Master Admin → Empresas) para visualizar o organograma.
              </p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Network className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: () => listDepartments(companyId),
  });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profile-public", companyId],
    queryFn: () => listPublicProfilesByCompany(companyId),
  });

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d.name] as const)), [departments]);

  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => `${p.name} ${p.role}`.toLowerCase().includes(q));
  }, [profiles, query]);

  const tree = useMemo(() => buildTree(visible), [visible]);

  const [cardOpen, setCardOpen] = useState(false);
  const [selected, setSelected] = useState<DbProfilePublic | null>(null);

  const openCard = (p: DbProfilePublic) => {
    setSelected(p);
    setCardOpen(true);
  };

  const selectedDeptName = selected?.department_id ? deptById.get(selected.department_id) ?? null : null;

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Organograma</div>
            <p className="mt-1 text-sm text-muted-foreground">Visualize a empresa como árvore ou lista. Clique para abrir o card.</p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <Network className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Estrutura</div>
            <p className="mt-1 text-sm text-muted-foreground">{isLoading ? "Carregando…" : `${profiles.length} pessoa(s) na empresa.`}</p>
          </div>
          <div className="relative w-full md:w-[360px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 rounded-xl pl-9" placeholder="Buscar por nome ou papel…" />
          </div>
        </div>

        <Separator className="my-5" />

        <Tabs defaultValue="tree" className="w-full">
          <TabsList className="w-full justify-start rounded-2xl bg-[color:var(--sinaxys-tint)] p-1">
            <TabsTrigger value="tree" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[color:var(--sinaxys-ink)]">
              Árvore
            </TabsTrigger>
            <TabsTrigger value="list" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[color:var(--sinaxys-ink)]">
              Lista
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tree" className="mt-4">
            <OrgChartTreeCanvas
              roots={tree}
              renderNode={(n) => {
                const p = n.data;
                const deptName = p.department_id ? deptById.get(p.department_id) ?? null : null;
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
                        className="grid h-12 w-12 place-items-center rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-2 ring-white"
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

          <TabsContent value="list" className="mt-4">
            <div className="grid gap-2">
              {tree.map((n) => (
                <TreeRow key={n.id} node={n} level={0} deptById={deptById} onOpen={openCard} />
              ))}

              {!tree.length && !isLoading ? (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhuma pessoa encontrada.</div>
              ) : null}
            </div>

            <div className="mt-5 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Dica: quem aparece como “raiz” está sem gestor definido.</div>
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
      />
    </div>
  );
}
