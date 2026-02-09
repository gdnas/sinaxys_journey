import { useMemo, useState } from "react";
import { Network, Pencil, UserRound } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrgChartTreeCanvas, type OrgNode } from "@/components/OrgChartTreeCanvas";
import { OrgPersonDialog } from "@/components/OrgPersonDialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { listDepartments } from "@/lib/departmentsDb";
import { listProfilesByCompany, updateProfile, type DbProfile } from "@/lib/profilesDb";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

function displayName(p: DbProfile) {
  return p.name?.trim() ? p.name.trim() : p.email;
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

function TreeRow({
  node,
  level,
  deptById,
  onEdit,
}: {
  node: OrgNode<DbProfile>;
  level: number;
  deptById: Map<string, string>;
  onEdit: (p: DbProfile) => void;
}) {
  const p = node.data;
  const deptName = p.department_id ? deptById.get(p.department_id) : undefined;

  return (
    <div>
      <div
        className={
          "flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3 transition hover:bg-[color:var(--sinaxys-tint)]/40"
        }
        style={{ marginLeft: level * 16 }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
            <span className="text-xs font-bold">{initials(displayName(p))}</span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{displayName(p)}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate">{p.email}</span>
              {deptName ? (
                <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
                  {deptName}
                </span>
              ) : null}
              {!p.active ? <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">Inativo</span> : null}
            </div>
          </div>
        </div>

        <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => onEdit(p)}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>

      {node.children.length ? (
        <div className="mt-2 grid gap-2">
          {node.children.map((c) => (
            <TreeRow key={c.id} node={c} level={level + 1} deptById={deptById} onEdit={onEdit} />
          ))}
        </div>
      ) : null}
    </div>
  );
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

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d.name] as const)), [departments]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", companyId],
    queryFn: () => listProfilesByCompany(companyId),
  });

  const visibleProfiles = useMemo(() => profiles.slice().sort((a, b) => displayName(a).localeCompare(displayName(b))), [profiles]);

  const [query, setQuery] = useState("");
  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visibleProfiles;
    return visibleProfiles.filter((p) => `${displayName(p)} ${p.email}`.toLowerCase().includes(q));
  }, [visibleProfiles, query]);

  const tree = useMemo(() => buildTree(filteredProfiles), [filteredProfiles]);

  // Quick card from node
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

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Admin — Organograma</div>
            <p className="mt-1 text-sm text-muted-foreground">Visualize a empresa como lista ou como árvore. Clique na bolinha para ver o card.</p>
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
            <p className="mt-1 text-sm text-muted-foreground">{profiles.length} perfis na empresa.</p>
          </div>
          <div className="w-full md:w-[360px]">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 rounded-xl" placeholder="Buscar por nome ou e-mail…" />
          </div>
        </div>

        <Separator className="my-5" />

        <Tabs defaultValue="tree" className="w-full">
          <TabsList className="w-full justify-start rounded-2xl bg-[color:var(--sinaxys-tint)] p-1">
            <TabsTrigger
              value="tree"
              className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[color:var(--sinaxys-ink)]"
            >
              Árvore
            </TabsTrigger>
            <TabsTrigger
              value="list"
              className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[color:var(--sinaxys-ink)]"
            >
              Lista
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tree" className="mt-4">
            <OrgChartTreeCanvas
              roots={tree}
              renderNode={(n) => {
                const p = n.data;
                const deptName = p.department_id ? deptById.get(p.department_id) ?? null : null;
                const title = displayName(p);
                const inactive = !p.active;

                return (
                  <button
                    type="button"
                    onClick={() => openCard(p)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={
                      "group relative grid place-items-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--sinaxys-primary)] focus-visible:ring-offset-2"
                    }
                    aria-label={`Abrir card de ${title}`}
                    title={title}
                  >
                    <div
                      className={
                        "grid h-14 w-14 place-items-center rounded-full bg-white shadow-sm ring-1 ring-[color:var(--sinaxys-border)] transition group-hover:shadow-md"
                      }
                    >
                      <div
                        className={
                          "grid h-12 w-12 place-items-center rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-2 ring-white"
                        }
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
                );
              }}
            />

            {!tree.length ? (
              <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhum perfil encontrado.</div>
            ) : null}
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            <div className="grid gap-2">
              {tree.map((n) => (
                <TreeRow key={n.id} node={n} level={0} deptById={deptById} onEdit={openEdit} />
              ))}

              {!tree.length ? (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhum perfil encontrado.</div>
              ) : null}
            </div>

            <div className="mt-5 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
              Dica: se uma pessoa aparece como "raiz", ela não tem gestor definido.
            </div>
          </TabsContent>
        </Tabs>
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
      />

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
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