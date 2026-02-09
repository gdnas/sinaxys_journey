import { useMemo, useState } from "react";
import { Pencil, Search, Shield } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { listCompanies } from "@/lib/companiesDb";
import { listAllProfiles, updateProfile, type DbProfile } from "@/lib/profilesDb";
import { roleLabel } from "@/lib/sinaxys";

const ROLE_OPTIONS = [
  { value: "MASTERADMIN", label: "Master Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "HEAD", label: "Head" },
  { value: "COLABORADOR", label: "Colaborador" },
] as const;

type AnyRole = (typeof ROLE_OPTIONS)[number]["value"];

export default function MasterUsers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();

  if (!user || user.role !== "MASTERADMIN") return null;

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => listCompanies(),
  });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: () => listAllProfiles(),
  });

  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c] as const)), [companies]);

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => `${p.email} ${p.name ?? ""}`.toLowerCase().includes(q));
  }, [profiles, query]);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<DbProfile | null>(null);

  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<AnyRole>("COLABORADOR");
  const [editCompanyId, setEditCompanyId] = useState<string>("");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const openEdit = (p: DbProfile) => {
    setEditing(p);
    setEditName(p.name ?? "");
    setEditRole((p.role as AnyRole) ?? "COLABORADOR");
    setEditCompanyId(p.company_id ?? "");
    setEditActive(!!p.active);
    setEditOpen(true);
  };

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Master Admin — Usuários</div>
            <p className="mt-1 text-sm text-muted-foreground">Diretório global de perfis (Supabase).</p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <Shield className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Diretório global</div>
            <p className="mt-1 text-sm text-muted-foreground">{isLoading ? "Carregando…" : `${profiles.length} perfis`}</p>
          </div>

          <div className="relative w-full md:w-[340px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome ou e-mail…" className="h-11 rounded-xl pl-9" />
          </div>
        </div>

        <Separator className="my-5" />

        <div className="max-w-full overflow-x-auto rounded-2xl border border-[color:var(--sinaxys-border)]">
          <Table className="min-w-[1050px]">
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-right">Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const companyName = p.company_id ? companyById.get(p.company_id)?.name ?? p.company_id : "—";
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">{p.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.email}</TableCell>
                    <TableCell>
                      <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                        {roleLabel(p.role as any)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{companyName}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        <Switch
                          checked={!!p.active}
                          onCheckedChange={async (v) => {
                            try {
                              await updateProfile(p.id, { active: v });
                              await qc.invalidateQueries({ queryKey: ["profiles-all"] });
                            } catch (e) {
                              toast({
                                title: "Não foi possível atualizar",
                                description: e instanceof Error ? e.message : "Erro inesperado.",
                                variant: "destructive",
                              });
                            }
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!isLoading && !filtered.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditing(null);
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
          </DialogHeader>

          {editing ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input className="h-11 rounded-xl" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label>Papel</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as AnyRole)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editRole !== "MASTERADMIN" ? (
                <div className="grid gap-2">
                  <Label>Empresa</Label>
                  <Select value={editCompanyId || "__none__"} onValueChange={(v) => setEditCompanyId(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Selecione…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem empresa</SelectItem>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                  MASTERADMIN pode ter company_id para contexto, mas não é usado para RLS (is_masteradmin libera tudo).
                </div>
              )}

              <div className="flex items-center justify-between rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Ativo</div>
                  <div className="mt-1 text-xs text-muted-foreground">Bloqueia acesso sem apagar histórico.</div>
                </div>
                <Switch checked={editActive} onCheckedChange={setEditActive} />
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Perfil não encontrado.</div>
          )}

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!editing || saving || editName.trim().length < 2}
              onClick={async () => {
                if (!editing) return;
                try {
                  setSaving(true);

                  await updateProfile(editing.id, {
                    name: editName.trim(),
                    role: editRole,
                    company_id: editRole === "MASTERADMIN" ? (editCompanyId || null) : (editCompanyId || null),
                    active: editActive,
                  });

                  await qc.invalidateQueries({ queryKey: ["profiles-all"] });
                  toast({ title: "Perfil atualizado" });
                  setEditOpen(false);
                } catch (e) {
                  toast({
                    title: "Não foi possível salvar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setSaving(false);
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
