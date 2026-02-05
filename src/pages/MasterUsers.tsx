import { useMemo, useState } from "react";
import { Pencil, Search, Shield, UserPlus } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";
import type { Role, User } from "@/lib/domain";
import { roleLabel } from "@/lib/sinaxys";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "MASTERADMIN", label: "Master Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "HEAD", label: "Head" },
  { value: "COLABORADOR", label: "Colaborador" },
];

export default function MasterUsers() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [version, setVersion] = useState(0);

  if (!user || user.role !== "MASTERADMIN") return null;

  const db = useMemo(() => mockDb.get(), [version]);
  const companies = useMemo(() => mockDb.getCompanies(), [version]);

  const [companyFilter, setCompanyFilter] = useState<string>("ALL");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.users
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((u) => {
        if (companyFilter !== "ALL") {
          if ((u.companyId ?? "") !== companyFilter) return false;
        }
        if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
        if (!q) return true;
        const hay = `${u.name} ${u.email}`.toLowerCase();
        return hay.includes(q);
      });
  }, [db.users, companyFilter, roleFilter, query]);

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState<Role>("ADMIN");
  const [createCompanyId, setCreateCompanyId] = useState<string>(companies[0]?.id ?? "");
  const createDepartments = useMemo(() => (createCompanyId ? mockDb.getDepartments(createCompanyId) : []), [createCompanyId, version]);
  const [createDeptId, setCreateDeptId] = useState<string>(createDepartments[0]?.id ?? "");

  // Edit
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const editing = editUserId ? db.users.find((u) => u.id === editUserId) ?? null : null;

  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<Role>("COLABORADOR");
  const [editCompanyId, setEditCompanyId] = useState<string>(companies[0]?.id ?? "");
  const editDepartments = useMemo(() => (editCompanyId ? mockDb.getDepartments(editCompanyId) : []), [editCompanyId, version]);
  const [editDeptId, setEditDeptId] = useState<string>(editDepartments[0]?.id ?? "");

  useMemo(() => {
    if (!editing) return;
    setEditName(editing.name);
    setEditRole(editing.role);
    setEditCompanyId(editing.companyId ?? companies[0]?.id ?? "");
  }, [editing?.id]);

  useMemo(() => {
    if (!editing) return;
    if (editing.departmentId) setEditDeptId(editing.departmentId);
    else setEditDeptId(editDepartments[0]?.id ?? "");
  }, [editing?.id, editDepartments.length]);

  const companyLabel = (cid?: string) => companies.find((c) => c.id === cid)?.name ?? "—";

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Master Admin — Usuários</div>
            <p className="mt-1 text-sm text-muted-foreground">Administração global: todas as empresas, todos os papéis.</p>
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
            <p className="mt-1 text-sm text-muted-foreground">Filtre por empresa/papel e gerencie acesso.</p>
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

            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="h-11 rounded-xl md:w-[220px]">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as empresas</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
              <SelectTrigger className="h-11 rounded-xl md:w-[200px]">
                <SelectValue placeholder="Papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os papéis</SelectItem>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog
              open={createOpen}
              onOpenChange={(v) => {
                setCreateOpen(v);
                if (!v) {
                  setCreateName("");
                  setCreateEmail("");
                  setCreateRole("ADMIN");
                  setCreateCompanyId(companies[0]?.id ?? "");
                  setCreateDeptId(mockDb.getDepartments(companies[0]?.id ?? "")[0]?.id ?? "");
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  className="h-11 w-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  aria-label="Criar usuário"
                  title="Criar usuário"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Criar usuário (global)</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Nome</Label>
                    <Input className="h-11 rounded-xl" value={createName} onChange={(e) => setCreateName(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>E-mail</Label>
                    <Input className="h-11 rounded-xl" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} />
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

                  {createRole !== "MASTERADMIN" ? (
                    <>
                      <div className="grid gap-2">
                        <Label>Empresa</Label>
                        <Select value={createCompanyId} onValueChange={setCreateCompanyId}>
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {companies.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
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
                              {createDepartments.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>

                <DialogFooter>
                  <Button
                    className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                    disabled={createName.trim().length < 3 || createEmail.trim().length < 6}
                    onClick={() => {
                      try {
                        mockDb.createUser({
                          companyId: createRole === "MASTERADMIN" ? undefined : createCompanyId,
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

        <Separator className="my-5" />

        <div className="max-w-full overflow-x-auto rounded-2xl border border-[color:var(--sinaxys-border)]">
          <Table className="min-w-[980px]">
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
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                      {roleLabel(u.role)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.role === "MASTERADMIN" ? "—" : companyLabel(u.companyId)}</TableCell>
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
                    <div className="flex items-center justify-end gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-xl"
                            onClick={() => {
                              setEditUserId(u.id);
                              setEditName(u.name);
                              setEditRole(u.role);
                              setEditCompanyId(u.companyId ?? companies[0]?.id ?? "");
                              setEditDeptId(u.departmentId ?? editDepartments[0]?.id ?? "");
                            }}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

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

      <Dialog
        open={!!editUserId}
        onOpenChange={(v) => {
          if (!v) setEditUserId(null);
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>

          {editing ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input className="h-11 rounded-xl" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>

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

              {editRole !== "MASTERADMIN" ? (
                <>
                  <div className="grid gap-2">
                    <Label>Empresa</Label>
                    <Select value={editCompanyId} onValueChange={setEditCompanyId}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {editRole !== "ADMIN" ? (
                    <div className="grid gap-2">
                      <Label>Departamento</Label>
                      <Select value={editDeptId} onValueChange={setEditDeptId}>
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {editDepartments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Usuário não encontrado.</div>
          )}

          <DialogFooter>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!editing || editName.trim().length < 3}
              onClick={() => {
                if (!editing) return;
                try {
                  const data: Partial<User> = {
                    name: editName.trim(),
                    role: editRole,
                    companyId: editRole === "MASTERADMIN" ? undefined : editCompanyId,
                    departmentId: editRole === "HEAD" || editRole === "COLABORADOR" ? editDeptId : undefined,
                  };
                  mockDb.updateUserAdmin(editing.id, data);
                  toast({ title: "Atualizado" });
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
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
