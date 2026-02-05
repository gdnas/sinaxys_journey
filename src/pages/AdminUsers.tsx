import { useMemo, useState } from "react";
import { Check, Pencil, Search, UserPlus, UserRound, X, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";
import type { Role, User } from "@/lib/domain";
import { roleLabel } from "@/lib/sinaxys";
import { UserDetailsDialog } from "@/components/users/UserDetailsDialog";

export default function AdminUsers() {
  const { toast } = useToast();
  const { user, activeCompanyId } = useAuth();
  const [version, setVersion] = useState(0);

  const companyId = user?.role === "MASTERADMIN" ? activeCompanyId : user?.companyId;

  const departments = useMemo(() => {
    if (!companyId) return [];
    return mockDb.getDepartments(companyId);
  }, [version, companyId]);

  const users = useMemo(() => {
    if (!companyId) return [];
    return mockDb
      .getUsers(companyId)
      .filter((u) => u.role !== "MASTERADMIN")
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [version, companyId]);

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, query]);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("COLABORADOR");
  const [deptId, setDeptId] = useState<string>(departments[0]?.id ?? "");

  const [detailsUserId, setDetailsUserId] = useState<string | null>(null);
  const detailsUser = detailsUserId ? users.find((u) => u.id === detailsUserId) ?? null : null;

  const [rowEditId, setRowEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    name: string;
    email: string;
    role: Role;
    departmentId?: string;
    active: boolean;
  } | null>(null);

  const deptLabel = (deptId?: string) => departments.find((d) => d.id === deptId)?.name ?? "—";

  const deptOptionsForRole = (r: Role) => (r === "ADMIN" ? [] : departments);

  const beginEdit = (u: User) => {
    setRowEditId(u.id);
    setDraft({
      name: u.name,
      email: u.email,
      role: u.role,
      departmentId: u.departmentId,
      active: u.active,
    });
  };

  const cancelEdit = () => {
    setRowEditId(null);
    setDraft(null);
  };

  const saveEdit = () => {
    if (!companyId || !rowEditId || !draft) return;
    try {
      mockDb.updateUserAdmin(rowEditId, {
        name: draft.name.trim(),
        email: draft.email.trim().toLowerCase(),
        role: draft.role,
        companyId,
        departmentId: draft.role === "ADMIN" ? undefined : draft.departmentId,
        active: draft.active,
      });
      setVersion((x) => x + 1);
      cancelEdit();
    } catch (e) {
      toast({
        title: "Não foi possível salvar",
        description: e instanceof Error ? e.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const canView = !!user && (user.role === "ADMIN" || user.role === "MASTERADMIN");

  if (!canView) return null;

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Admin — Usuários</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastre colaboradores e heads. O papel Master Admin é global e não é gerenciado aqui.
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <Shield className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Base de usuários</div>
            <p className="mt-1 text-sm text-muted-foreground">Ative/desative acesso sem apagar histórico.</p>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="relative w-full md:w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="h-11 rounded-xl pl-9"
              />
            </div>

            <Dialog
              open={open}
              onOpenChange={(v) => {
                setOpen(v);
                if (!v) {
                  setName("");
                  setEmail("");
                  setRole("COLABORADOR");
                  setDeptId(departments[0]?.id ?? "");
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  className="h-11 w-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  aria-label="Novo usuário"
                  title="Novo usuário"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Criar usuário</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Nome</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="grid gap-2">
                    <Label>E-mail</Label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" placeholder="nome@empresa.com" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Papel</Label>
                    <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COLABORADOR">Colaborador</SelectItem>
                        <SelectItem value="HEAD">Head de Departamento</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {role !== "ADMIN" ? (
                    <div className="grid gap-2">
                      <Label>Departamento</Label>
                      <Select value={deptId} onValueChange={setDeptId}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </div>
                <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    className="w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 sm:w-auto"
                    disabled={name.trim().length < 3 || email.trim().length < 6 || !companyId}
                    onClick={() => {
                      if (!companyId) return;
                      try {
                        mockDb.createUser({
                          companyId,
                          name,
                          email,
                          role,
                          departmentId: role === "ADMIN" ? undefined : deptId,
                        });
                        setOpen(false);
                        setVersion((x) => x + 1);
                      } catch (e) {
                        toast({
                          title: "Não foi possível criar",
                          description: e instanceof Error ? e.message : "Erro inesperado.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Criar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="mt-5 grid gap-3 md:hidden">
          {filtered.map((u) => {
            const dept = u.departmentId ? departments.find((d) => d.id === u.departmentId) : undefined;
            return (
              <div key={u.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{u.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-xl"
                      aria-label="Detalhes"
                      onClick={() => setDetailsUserId(u.id)}
                    >
                      <UserRound className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={u.active}
                      onCheckedChange={(v) => {
                        mockDb.setUserActive(u.id, v);
                        setVersion((x) => x + 1);
                      }}
                    />
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                    {roleLabel(u.role)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{dept?.name ?? "—"}</span>
                  {!u.active ? (
                    <Badge className="rounded-full bg-muted text-muted-foreground hover:bg-muted">Inativo</Badge>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="mt-5 hidden max-w-full overflow-x-auto rounded-2xl border border-[color:var(--sinaxys-border)] md:block">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead className="text-right">Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const isEditing = rowEditId === u.id;
                const d = isEditing ? draft : null;

                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">
                      {isEditing && d ? (
                        <Input
                          className="h-9 rounded-xl"
                          value={d.name}
                          onChange={(e) => setDraft({ ...d, name: e.target.value })}
                        />
                      ) : (
                        u.name
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {isEditing && d ? (
                        <Input
                          className="h-9 rounded-xl"
                          value={d.email}
                          onChange={(e) => setDraft({ ...d, email: e.target.value })}
                        />
                      ) : (
                        u.email
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing && d ? (
                        <Select
                          value={d.role}
                          onValueChange={(v) => {
                            const nextRole = v as Role;
                            const nextDept = nextRole === "ADMIN" ? undefined : (d.departmentId ?? departments[0]?.id);
                            setDraft({ ...d, role: nextRole, departmentId: nextDept });
                          }}
                        >
                          <SelectTrigger className="h-9 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="COLABORADOR">Colaborador</SelectItem>
                            <SelectItem value="HEAD">Head de Departamento</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                          {roleLabel(u.role)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {isEditing && d ? (
                        d.role === "ADMIN" ? (
                          "—"
                        ) : (
                          <Select
                            value={d.departmentId ?? departments[0]?.id ?? ""}
                            onValueChange={(v) => setDraft({ ...d, departmentId: v })}
                          >
                            <SelectTrigger className="h-9 rounded-xl">
                              <SelectValue placeholder="Selecione…" />
                            </SelectTrigger>
                            <SelectContent>
                              {deptOptionsForRole(d.role).map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )
                      ) : (
                        deptLabel(u.departmentId)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        {isEditing && d ? (
                          <Switch checked={d.active} onCheckedChange={(v) => setDraft({ ...d, active: v })} />
                        ) : (
                          <Switch
                            checked={u.active}
                            onCheckedChange={(v) => {
                              mockDb.setUserActive(u.id, v);
                              setVersion((x) => x + 1);
                            }}
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              size="icon"
                              className="h-9 w-9 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                              aria-label="Salvar"
                              onClick={saveEdit}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" aria-label="Cancelar" onClick={cancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 rounded-xl"
                              aria-label="Detalhes"
                              onClick={() => setDetailsUserId(u.id)}
                            >
                              <UserRound className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 rounded-xl"
                              aria-label="Editar na tabela"
                              onClick={() => beginEdit(u)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {!filtered.length ? (
          <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
            Nenhum usuário encontrado para este filtro.
          </div>
        ) : null}
      </Card>

      <UserDetailsDialog
        open={!!detailsUserId}
        onOpenChange={(v) => setDetailsUserId(v ? detailsUserId : null)}
        viewerRole={(user?.role ?? "ADMIN") as Role}
        viewerCompanyId={companyId}
        companies={mockDb.getCompanies()}
        user={detailsUser}
        onSaved={() => setVersion((x) => x + 1)}
      />
    </div>
  );
}