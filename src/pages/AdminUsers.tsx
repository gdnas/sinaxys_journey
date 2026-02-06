import { useEffect, useMemo, useState } from "react";
import { KeyRound, Pencil, Search, Shield, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";
import type { Role, User } from "@/lib/domain";
import { roleLabel } from "@/lib/sinaxys";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "HEAD", label: "Head" },
  { value: "COLABORADOR", label: "Colaborador" },
];

function isoToDateInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  // YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

export default function AdminUsers() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [version, setVersion] = useState(0);

  if (!user || user.role !== "ADMIN" || !user.companyId) return null;
  const companyId = user.companyId;

  const departments = useMemo(() => mockDb.getDepartments(companyId), [companyId, version]);

  const users = useMemo(() => {
    return mockDb
      .getUsers(companyId)
      .filter((u) => u.role !== "MASTERADMIN")
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [companyId, version]);

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, query]);

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d] as const)), [departments]);

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState<Role>("COLABORADOR");
  const [createDeptId, setCreateDeptId] = useState<string>(departments[0]?.id ?? "");

  useEffect(() => {
    if (!createDeptId && departments[0]?.id) setCreateDeptId(departments[0].id);
  }, [departments.length]);

  // Edit
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const editing = editUserId ? users.find((u) => u.id === editUserId) ?? null : null;

  const [editTab, setEditTab] = useState<"basico" | "org" | "financeiro" | "acesso">("basico");

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<Role>("COLABORADOR");
  const [editDeptId, setEditDeptId] = useState<string>(departments[0]?.id ?? "");
  const [editActive, setEditActive] = useState(true);

  const [editJobTitle, setEditJobTitle] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editContractUrl, setEditContractUrl] = useState("");

  const [editJoinedAt, setEditJoinedAt] = useState(""); // YYYY-MM-DD
  const [editManagerId, setEditManagerId] = useState<string>("");
  const [editMonthlyCost, setEditMonthlyCost] = useState<string>("");

  useEffect(() => {
    if (!editing) return;
    setEditTab("basico");

    setEditName(editing.name);
    setEditEmail(editing.email);
    setEditRole(editing.role);
    setEditDeptId(editing.departmentId ?? departments[0]?.id ?? "");
    setEditActive(editing.active);

    setEditJobTitle(editing.jobTitle ?? "");
    setEditPhone(editing.phone ?? "");
    setEditAvatarUrl(editing.avatarUrl ?? "");
    setEditContractUrl(editing.contractUrl ?? "");

    setEditJoinedAt(isoToDateInput(editing.joinedAt));
    setEditManagerId(editing.managerId ?? "");
    setEditMonthlyCost(typeof editing.monthlyCostBRL === "number" ? String(editing.monthlyCostBRL) : "");
  }, [editing?.id, departments.length]);

  const managers = useMemo(() => {
    return users
      .filter((u) => u.active)
      .filter((u) => u.role === "ADMIN" || u.role === "HEAD")
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  // Reset password
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const resetting = resetUserId ? users.find((u) => u.id === resetUserId) ?? null : null;
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resetMustChange, setResetMustChange] = useState(true);

  const openEdit = (u: User) => {
    setEditUserId(u.id);
  };

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Admin — Usuários</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Gerencie pessoas da sua empresa: dados, papel, acesso, gestor, remuneração e data de entrada.
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
            <p className="mt-1 text-sm text-muted-foreground">Crie usuários e ajuste tudo o que for necessário.</p>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="relative w-full md:w-[320px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="h-11 rounded-xl pl-9"
              />
            </div>

            <Dialog
              open={createOpen}
              onOpenChange={(v) => {
                setCreateOpen(v);
                if (!v) {
                  setCreateName("");
                  setCreateEmail("");
                  setCreateRole("COLABORADOR");
                  setCreateDeptId(departments[0]?.id ?? "");
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
                    <Input value={createName} onChange={(e) => setCreateName(e.target.value)} className="h-11 rounded-xl" />
                  </div>
                  <div className="grid gap-2">
                    <Label>E-mail</Label>
                    <Input value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} className="h-11 rounded-xl" placeholder="nome@empresa.com" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Papel</Label>
                    <Select value={createRole} onValueChange={(v) => setCreateRole(v as Role)}>
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

                  {createRole !== "ADMIN" ? (
                    <div className="grid gap-2">
                      <Label>Departamento</Label>
                      <Select value={createDeptId} onValueChange={setCreateDeptId}>
                        <SelectTrigger className="h-11 rounded-xl">
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

                  <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                    Dica: após criar, use “Editar” para definir senha temporária, gestor, remuneração, cargo e outros dados.
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                    disabled={createName.trim().length < 3 || createEmail.trim().length < 6}
                    onClick={() => {
                      try {
                        mockDb.createUser({
                          companyId,
                          name: createName,
                          email: createEmail,
                          role: createRole,
                          departmentId: createRole === "HEAD" || createRole === "COLABORADOR" ? createDeptId : undefined,
                        });
                        setCreateOpen(false);
                        setVersion((x) => x + 1);
                        toast({ title: "Usuário criado" });
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
            const dept = u.departmentId ? deptById.get(u.departmentId)?.name : undefined;
            return (
              <div key={u.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{u.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{u.email}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                        {roleLabel(u.role)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{dept ?? "—"}</span>
                      {!u.active ? (
                        <Badge className="rounded-full bg-muted text-muted-foreground hover:bg-muted">Inativo</Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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
                  <Button variant="outline" className="h-10 rounded-xl" onClick={() => openEdit(u)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 rounded-xl"
                    onClick={() => {
                      setResetUserId(u.id);
                      setResetPassword("");
                      setResetPasswordConfirm("");
                      setResetMustChange(true);
                    }}
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    Senha
                  </Button>
                </div>
              </div>
            );
          })}

          {!filtered.length ? (
            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
              Nenhum usuário encontrado para este filtro.
            </div>
          ) : null}
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
                const dept = u.departmentId ? deptById.get(u.departmentId)?.name : undefined;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                        {roleLabel(u.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{dept ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        <Switch
                          checked={u.active}
                          onCheckedChange={(v) => {
                            mockDb.setUserActive(u.id, v);
                            setVersion((x) => x + 1);
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-xl"
                          onClick={() => {
                            setResetUserId(u.id);
                            setResetPassword("");
                            setResetPasswordConfirm("");
                            setResetMustChange(true);
                          }}
                          aria-label="Resetar senha"
                          title="Resetar senha"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-xl"
                          onClick={() => openEdit(u)}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!filtered.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Reset password dialog */}
      <Dialog
        open={!!resetUserId}
        onOpenChange={(v) => {
          if (!v) setResetUserId(null);
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resetar senha</DialogTitle>
          </DialogHeader>

          {resetting ? (
            <div className="grid gap-4">
              <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm">
                <div className="font-semibold text-[color:var(--sinaxys-ink)]">{resetting.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{resetting.email} • {roleLabel(resetting.role)}</div>
              </div>

              <div className="grid gap-2">
                <Label>Nova senha</Label>
                <Input
                  className="h-11 rounded-xl"
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div className="grid gap-2">
                <Label>Confirmar senha</Label>
                <Input
                  className="h-11 rounded-xl"
                  type="password"
                  value={resetPasswordConfirm}
                  onChange={(e) => setResetPasswordConfirm(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Exigir troca no próximo login</div>
                  <div className="mt-1 text-xs text-muted-foreground">Recomendado para senhas temporárias.</div>
                </div>
                <Switch checked={resetMustChange} onCheckedChange={setResetMustChange} />
              </div>

              {resetPassword && resetPasswordConfirm && resetPassword !== resetPasswordConfirm ? (
                <div className="text-xs text-red-600">As senhas não coincidem.</div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Usuário não encontrado.</div>
          )}

          <DialogFooter>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!resetting || resetPassword.trim().length < 6 || resetPassword !== resetPasswordConfirm}
              onClick={() => {
                if (!resetting) return;
                try {
                  mockDb.setUserPassword(resetting.id, resetPassword.trim(), { mustChangePassword: resetMustChange });
                  toast({ title: "Senha atualizada" });
                  setResetUserId(null);
                  setVersion((x) => x + 1);
                } catch (e) {
                  toast({
                    title: "Não foi possível salvar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Salvar senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog
        open={!!editUserId}
        onOpenChange={(v) => {
          if (!v) setEditUserId(null);
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>

          {editing ? (
            <div className="grid gap-4">
              <div className="flex flex-col justify-between gap-3 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{editing.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{editing.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">{roleLabel(editing.role)}</Badge>
                  {!editing.active ? (
                    <Badge className="rounded-full bg-muted text-muted-foreground hover:bg-muted">Inativo</Badge>
                  ) : null}
                </div>
              </div>

              <Tabs value={editTab} onValueChange={(v) => setEditTab(v as any)} className="w-full">
                <TabsList className="w-full justify-start rounded-2xl bg-[color:var(--sinaxys-tint)] p-1">
                  <TabsTrigger value="basico" className="rounded-xl">Básico</TabsTrigger>
                  <TabsTrigger value="org" className="rounded-xl">Organização</TabsTrigger>
                  <TabsTrigger value="financeiro" className="rounded-xl">Financeiro</TabsTrigger>
                  <TabsTrigger value="acesso" className="rounded-xl">Acesso</TabsTrigger>
                </TabsList>

                <TabsContent value="basico" className="mt-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2 sm:col-span-2">
                      <Label>Nome</Label>
                      <Input className="h-11 rounded-xl" value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </div>

                    <div className="grid gap-2 sm:col-span-2">
                      <Label>E-mail</Label>
                      <Input className="h-11 rounded-xl" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                    </div>

                    <div className="grid gap-2">
                      <Label>Cargo</Label>
                      <Input className="h-11 rounded-xl" value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)} placeholder="Ex.: Analista, Dev..." />
                    </div>

                    <div className="grid gap-2">
                      <Label>Celular</Label>
                      <Input className="h-11 rounded-xl" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="(11) 99999-9999" />
                    </div>

                    <div className="grid gap-2 sm:col-span-2">
                      <Label>Avatar (URL ou data URL)</Label>
                      <Input className="h-11 rounded-xl" value={editAvatarUrl} onChange={(e) => setEditAvatarUrl(e.target.value)} placeholder="https://..." />
                    </div>

                    <div className="grid gap-2 sm:col-span-2">
                      <Label>Contrato (link)</Label>
                      <Input className="h-11 rounded-xl" value={editContractUrl} onChange={(e) => setEditContractUrl(e.target.value)} placeholder="https://..." />
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 sm:col-span-2">
                      <div>
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Ativo</div>
                        <div className="mt-1 text-xs text-muted-foreground">Desative para bloquear o acesso sem apagar histórico.</div>
                      </div>
                      <Switch checked={editActive} onCheckedChange={setEditActive} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="org" className="mt-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Papel</Label>
                      <Select value={editRole} onValueChange={(v) => setEditRole(v as Role)}>
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

                    <div className="grid gap-2">
                      <Label>Data de entrada</Label>
                      <Input className="h-11 rounded-xl" type="date" value={editJoinedAt} onChange={(e) => setEditJoinedAt(e.target.value)} />
                    </div>

                    {editRole !== "ADMIN" ? (
                      <div className="grid gap-2">
                        <Label>Departamento</Label>
                        <Select value={editDeptId} onValueChange={setEditDeptId}>
                          <SelectTrigger className="h-11 rounded-xl">
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
                    ) : (
                      <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                        Admin não possui departamento.
                      </div>
                    )}

                    <div className={"grid gap-2 " + (editRole === "ADMIN" ? "sm:col-span-2" : "") }>
                      <Label>Gestor direto</Label>
                      <Select
                        value={editRole === "ADMIN" ? "" : editManagerId}
                        onValueChange={(v) => setEditManagerId(v)}
                        disabled={editRole === "ADMIN"}
                      >
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder={editRole === "ADMIN" ? "—" : "Selecione..."} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sem gestor</SelectItem>
                          {managers
                            .filter((m) => m.id !== editing.id)
                            .map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name} — {roleLabel(m.role)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-muted-foreground">O gestor deve ser Admin ou Head da mesma empresa.</div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="financeiro" className="mt-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Custo mensal (BRL)</Label>
                      <Input
                        className="h-11 rounded-xl"
                        value={editMonthlyCost}
                        onChange={(e) => setEditMonthlyCost(e.target.value.replace(/[^0-9.]/g, ""))}
                        inputMode="decimal"
                        placeholder="Ex.: 8000"
                      />
                      <div className="text-xs text-muted-foreground">Salvo como número (histórico é registrado).</div>
                    </div>

                    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                      Use este campo para estimativas de custo/hora e relatórios no painel.
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="acesso" className="mt-5">
                  <div className="grid gap-4">
                    <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Senha</div>
                          <div className="mt-1 text-xs text-muted-foreground">Defina uma nova senha para este usuário.</div>
                        </div>
                        <Button
                          variant="outline"
                          className="h-10 rounded-xl"
                          onClick={() => {
                            setResetUserId(editing.id);
                            setResetPassword("");
                            setResetPasswordConfirm("");
                            setResetMustChange(true);
                          }}
                        >
                          <KeyRound className="mr-2 h-4 w-4" />
                          Alterar senha
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                      Dica: se você definir uma senha temporária, marque “Exigir troca no próximo login”.
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Usuário não encontrado.</div>
          )}

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditUserId(null)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!editing || editName.trim().length < 3 || editEmail.trim().length < 6}
              onClick={() => {
                if (!editing) return;

                if (editRole !== "ADMIN" && !editDeptId) {
                  toast({ title: "Departamento obrigatório", description: "Selecione um departamento.", variant: "destructive" });
                  setEditTab("org");
                  return;
                }

                const cost = editMonthlyCost.trim() ? Number(editMonthlyCost) : undefined;

                try {
                  mockDb.updateUserCompanyAdmin(
                    editing.id,
                    {
                      name: editName,
                      email: editEmail,
                      role: editRole,
                      departmentId: editRole === "HEAD" || editRole === "COLABORADOR" ? editDeptId : undefined,
                      active: editActive,
                      jobTitle: editJobTitle,
                      phone: editPhone,
                      avatarUrl: editAvatarUrl,
                      contractUrl: editContractUrl,
                      joinedAt: editJoinedAt,
                      managerId: editRole === "ADMIN" ? "" : editManagerId,
                      monthlyCostBRL: typeof cost === "number" && Number.isFinite(cost) ? cost : undefined,
                    },
                    { createdByUserId: user.id },
                  );

                  toast({ title: "Usuário atualizado" });
                  setEditUserId(null);
                  setVersion((x) => x + 1);
                } catch (e) {
                  toast({
                    title: "Não foi possível salvar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
