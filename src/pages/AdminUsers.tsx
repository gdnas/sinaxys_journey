import { useMemo, useState } from "react";
import { MailPlus, Pencil, Search, Shield, UploadCloud, UserRound, CalendarDays, Filter, Key, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { listAccessStatsByCompany } from "@/lib/accessStatsDb";
import { listDepartments } from "@/lib/departmentsDb";
import { listProfilesByCompany, updateProfile, type DbProfile } from "@/lib/profilesDb";
import { roleLabel } from "@/lib/sinaxys";
import { ImportUsersPanel } from "@/components/admin/ImportUsersPanel";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "HEAD", label: "Head" },
  { value: "COLABORADOR", label: "Colaborador" },
] as const;

type CompanyRole = (typeof ROLE_OPTIONS)[number]["value"];

function toMonthlyCostNumber(v: string) {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t.replace(/\./g, "").replace(/,/g, "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function fmtDateTime(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function displayFromIso(iso?: string | null) {
  if (!iso) return "";
  const core = iso.length >= 10 ? iso.slice(0, 10) : iso;
  const parts = core.split("-");
  if (parts.length !== 3) return "";
  const [y, m, d] = parts;
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

function parseDisplayToIso(s: string) {
  const t = s.trim();
  if (!t) return null;
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const iso = `${yyyy}-${mm}-${dd}`;
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  return iso;
}

function maskDateInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const parts: string[] = [];
  if (digits.length <= 2) {
    parts.push(digits);
  } else {
    parts.push(digits.slice(0, 2));
    if (digits.length <= 4) {
      parts.push(digits.slice(2));
    } else {
      parts.push(digits.slice(2, 4));
      parts.push(digits.slice(4, 8));
    }
  }
  return parts.filter(Boolean).join("/").slice(0, 10);
}

async function describeFunctionError(e: unknown): Promise<string> {
  const anyErr = e as any;
  const ctx = anyErr?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const payload = await ctx.json();
      const msg = payload?.message;
      if (typeof msg === "string" && msg.trim()) return msg;
    } catch {
      // ignore
    }
  }

  const msg = anyErr?.message;
  if (typeof msg === "string" && msg.trim()) return msg;

  return "Erro inesperado.";
}

export default function AdminUsers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();

  if (!user || !(user.role === "ADMIN" || user.role === "MASTERADMIN")) return null;

  const companyId = user.companyId;
  if (!companyId) {
    return (
      <div className="grid gap-6">
        <div className="rounded-3xl border bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Usuários — Empresa</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Para adicionar usuários, selecione uma empresa ativa em <span className="font-medium text-[color:var(--sinaxys-ink)]">Master Admin → Empresas</span>.
              </p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Shield className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
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
    queryKey: ["profiles", companyId],
    queryFn: () => listProfilesByCompany(companyId),
  });

  const { data: accessStats = [] } = useQuery({
    queryKey: ["access-stats", companyId],
    queryFn: () => listAccessStatsByCompany(companyId),
  });

  const statsByUserId = useMemo(() => new Map(accessStats.map((s) => [s.user_id, s] as const)), [accessStats]);

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d] as const)), [departments]);

  const [query, setQuery] = useState("");
  const [hideInactive, setHideInactive] = useState(true);

  const [deptFilter, setDeptFilter] = useState<string>("__all__");
  const [sortKey, setSortKey] = useState<"name" | "department">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = hideInactive ? profiles.filter((p) => !!p.active) : profiles;
    if (deptFilter && deptFilter !== "__all__") {
      base = base.filter((p) => (p.department_id ?? "") === deptFilter);
    }
    if (q) {
      base = base.filter((p) => {
        const hay = `${p.name ?? ""} ${p.email}`.toLowerCase();
        return hay.includes(q);
      });
    }
    const by = sortKey;
    const dir = sortDir === "asc" ? 1 : -1;
    base = [...base].sort((a, b) => {
      if (by === "department") {
        const da = a.department_id ? (deptById.get(a.department_id)?.name ?? "") : "";
        const db = b.department_id ? (deptById.get(b.department_id)?.name ?? "") : "";
        const cmp = da.localeCompare(db, "pt-BR", { sensitivity: "base" }) || (a.name ?? "").localeCompare(b.name ?? "", "pt-BR", { sensitivity: "base" });
        return cmp * dir;
      } else {
        const cmp = (a.name ?? "").localeCompare(b.name ?? "", "pt-BR", { sensitivity: "base" });
        return cmp * dir;
      }
    });
    return base;
  }, [profiles, query, hideInactive, deptFilter, sortKey, sortDir, deptById]);

  const emailQuery = query.trim().toLowerCase();
  const showAuthHint = !isLoading && !!emailQuery && emailQuery.includes("@") && filtered.length === 0;

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<DbProfile | null>(null);

  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<CompanyRole>("COLABORADOR");
  const [editDeptId, setEditDeptId] = useState<string>("");
  const [editActive, setEditActive] = useState(true);
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editMonthlyCost, setEditMonthlyCost] = useState<string>("");
  const [editContractUrl, setEditContractUrl] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [editJoinedAtStr, setEditJoinedAtStr] = useState("");
  const [editManagerId, setEditManagerId] = useState<string>("");

  // Reset password dialog state
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTempPassword, setResetTempPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<DbProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openEdit = (p: DbProfile) => {
    setEditing(p);
    setEditName(p.name ?? "");
    setEditRole((p.role as CompanyRole) ?? "COLABORADOR");
    setEditDeptId(p.department_id ?? "");
    setEditActive(!!p.active);
    setEditJobTitle(p.job_title ?? "");
    setEditPhone(p.phone ?? "");
    setEditMonthlyCost(typeof p.monthly_cost_brl === "number" ? String(p.monthly_cost_brl) : "");
    setEditContractUrl(p.contract_url ?? "");
    setEditJoinedAtStr(displayFromIso(p.joined_at));
    setEditManagerId(p.manager_id ?? "");
    setResetTempPassword("");
    setEditOpen(true);
  };

  const openDeleteConfirm = (p: DbProfile) => {
    setDeletingUser(p);
    setDeleteConfirmOpen(true);
  };

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<CompanyRole>("COLABORADOR");
  const [inviteDeptId, setInviteDeptId] = useState<string>("");
  const [inviteJobTitle, setInviteJobTitle] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteSetTempPassword, setInviteSetTempPassword] = useState(false);
  const [inviteTempPassword, setInviteTempPassword] = useState("");
  const [inviting, setInviting] = useState(false);

  const inviteRoleForFunction = inviteRole as unknown as string;

  const [importOpen, setImportOpen] = useState(false);

  const resetInvite = () => {
    setInviteEmail("");
    setInviteName("");
    setInviteRole("COLABORADOR");
    setInviteDeptId("");
    setInviteJobTitle("");
    setInvitePhone("");
    setInviteSetTempPassword(false);
    setInviteTempPassword("");
  };

  // Call master-reset-password function
  const handleResetPassword = async (userId: string) => {
    try {
      setResetting(true);
      const payload = {
        userId,
        tempPassword: resetTempPassword.trim() || null,
      };
      const { data, error } = await supabase.functions.invoke("master-reset-password", {
        body: payload,
      });

      if (error) throw error;

      if (!data?.ok) {
        throw new Error(data?.message ?? "Erro ao resetar senha.");
      }

      // Show the generated/used temp password to the admin (so they can copy it)
      toast({
        title: "Senha redefinida",
        description: `Senha temporária: ${data.tempPassword}`,
      });

      // Refresh profiles
      await qc.invalidateQueries({ queryKey: ["profiles", companyId] });
      setResetOpen(false);
    } catch (e) {
      const msg = await describeFunctionError(e);
      toast({
        title: "Não foi possível redefinir a senha",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top info */}
      <div className="mb-6">
        <div className="rounded-2xl border bg-[color:var(--sinaxys-bg)] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Usuários — Empresa</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Gerencie usuários desta empresa. Você pode criar com senha temporária (o usuário troca no primeiro acesso) ou enviar convite por e-mail.
              </p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Shield className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-2xl border-[color:var(--sinaxys-border)] bg-white p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Base de usuários</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {isLoading ? "Carregando…" : `${profiles.length} usuários nesta empresa${hideInactive ? ` • ${filtered.length} ativos visíveis` : ""}.`}
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-2">
                <Button
                  className="h-10 rounded-lg bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  onClick={() => {
                    resetInvite();
                    setInviteOpen(true);
                  }}
                >
                  <MailPlus className="mr-2 h-4 w-4" />
                  Adicionar usuário
                </Button>

                <Button variant="outline" className="h-10 rounded-lg" onClick={() => setImportOpen(true)}>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Importar
                </Button>
              </div>

              <div className="flex items-center gap-3 px-2">
                <div className="text-xs font-semibold text-[color:var(--sinaxys-ink)]">Ocultar inativos</div>
                <Switch checked={hideInactive} onCheckedChange={setHideInactive} />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={deptFilter} onValueChange={(v) => setDeptFilter(v)}>
                  <SelectTrigger className="h-10 rounded-lg md:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos departamentos</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Select value={sortKey} onValueChange={(v) => setSortKey(v as "name" | "department")}>
                  <SelectTrigger className="h-10 rounded-lg md:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Ordenar por nome</SelectItem>
                    <SelectItem value="department">Ordenar por departamento</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="h-10 rounded-lg" onClick={() => setSortDir((s) => (s === "asc" ? "desc" : "asc"))}>
                  {sortDir === "asc" ? "▲" : "▼"}
                </Button>
              </div>

              <div className="relative flex-1 min-w-[180px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome ou e-mail…" className="h-10 rounded-lg pl-9" />
              </div>
            </div>
          </div>

          <Separator />

          {showAuthHint ? (
            <div className="mb-4 rounded-lg border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-3 text-sm text-[color:var(--sinaxys-ink)]">
              <div className="font-semibold">Não encontrou este e-mail?</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Aqui aparecem apenas usuários com registro em <span className="font-medium text-[color:var(--sinaxys-ink)]">profiles</span>. Se a pessoa existir apenas no login (Supabase Auth), use
                <span className="font-medium text-[color:var(--sinaxys-ink)]"> Adicionar usuário</span> para vincular/criar o perfil nesta empresa.
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-[color:var(--sinaxys-border)] bg-white/5 p-3">
            <ResponsiveTable className="mt-0" minWidth="900px">
              <div className="rounded-md overflow-hidden">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead className="text-right">Acessos</TableHead>
                      <TableHead className="text-right">Último acesso</TableHead>
                      <TableHead className="text-right">Ativo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => {
                      const dept = p.department_id ? deptById.get(p.department_id)?.name : "—";
                      const stat = statsByUserId.get(p.id);
                      return (
                        <TableRow key={p.id} className="hover:bg-[color:var(--sinaxys-bg)]">
                          <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">
                            <Link to={`/admin/users/${p.id}`} className="inline-flex items-center gap-3 hover:underline">
                              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                                <UserRound className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 truncate">{p.name ?? "—"}</span>
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{p.email}</TableCell>
                          <TableCell>
                            <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                              {roleLabel(p.role as any)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{dept ?? "—"}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{stat?.access_count ?? 0}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{fmtDateTime(stat?.last_access_at)}</TableCell>
                          <TableCell className="text-right">
                            <Badge className={p.active ? "rounded-full bg-emerald-50 text-emerald-800 hover:bg-emerald-50" : "rounded-full bg-amber-50 text-amber-800 hover:bg-amber-50"}>
                              {p.active ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" className="h-8 rounded-lg" onClick={() => openEdit(p)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </Button>
                              <Button variant="destructive" className="h-8 rounded-lg" onClick={() => openDeleteConfirm(p)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {!filtered.length ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                          Nenhum usuário encontrado.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </ResponsiveTable>
          </div>
        </div>
      </Card>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Importar usuários</DialogTitle>
          </DialogHeader>
          <ImportUsersPanel
            companyId={companyId}
            onImported={() => {
              setImportOpen(false);
              qc.invalidateQueries({ queryKey: ["profiles", companyId] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Invite / Create */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(v) => {
          setInviteOpen(v);
          if (!v) resetInvite();
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar usuário</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Escolha o modo</div>
              <p className="mt-1 text-xs text-muted-foreground">Ative "senha temporária" para criar o usuário agora. Desativado = enviamos convite por e-mail.</p>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Definir senha temporária</div>
                <div className="mt-1 text-xs text-muted-foreground">O usuário entra com essa senha e é obrigado a trocar.</div>
              </div>
              <Switch
                checked={inviteSetTempPassword}
                onCheckedChange={(v) => {
                  setInviteSetTempPassword(v);
                  if (!v) setInviteTempPassword("");
                }}
              />
            </div>

            {inviteSetTempPassword ? (
              <div className="grid gap-2">
                <Label>Senha temporária (mín. 6)</Label>
                <Input
                  className="h-11 rounded-xl"
                  value={inviteTempPassword}
                  onChange={(e) => setInviteTempPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Defina uma senha inicial"
                />
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label>E-mail</Label>
              <Input className="h-11 rounded-xl" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="nome@empresa.com" inputMode="email" />
            </div>

            <div className="grid gap-2">
              <Label>Nome (opcional)</Label>
              <Input className="h-11 rounded-xl" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Ex.: Maria Silva" />
            </div>

            <div className="grid gap-2">
              <Label>Papel</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as CompanyRole)}>
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
              <Label>Departamento</Label>
              <Select value={inviteDeptId || "__none__"} onValueChange={(v) => setInviteDeptId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem departamento</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Cargo (opcional)</Label>
              <Input className="h-11 rounded-xl" value={inviteJobTitle} onChange={(e) => setInviteJobTitle(e.target.value)} placeholder="Ex.: Analista" />
            </div>

            <div className="grid gap-2">
              <Label>Celular (opcional)</Label>
              <Input className="h-11 rounded-xl" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setInviteOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={inviting || inviteEmail.trim().length < 6 || (inviteSetTempPassword && inviteTempPassword.trim().length < 6)}
              onClick={async () => {
                try {
                  setInviting(true);
                  const { data, error } = await supabase.functions.invoke("admin-invite-user", {
                    body: {
                      email: inviteEmail,
                      name: inviteName,
                      role: inviteRoleForFunction,
                      departmentId: inviteDeptId || null,
                      jobTitle: inviteJobTitle || null,
                      phone: invitePhone || null,
                      password: inviteSetTempPassword ? inviteTempPassword : null,
                    },
                  });

                  if (error) throw error;

                  if (data?.alreadyMember) {
                    toast({ title: "Usuário já existe", description: data?.message ?? "Este e-mail já está na sua empresa." });
                  } else if (data?.mode === "created") {
                    toast({
                      title: "Usuário criado",
                      description: "Senha temporária definida. No primeiro acesso, o usuário será obrigado a trocar a senha.",
                    });
                  } else if (data?.mode === "linked") {
                    toast({
                      title: "Usuário vinculado",
                      description: data?.passwordSet
                        ? "O e-mail já existia no login. Vinculamos o perfil e definimos a senha temporária."
                        : "O e-mail já existia no login. Vinculamos o perfil nesta empresa.",
                    });
                  } else {
                    toast({ title: "Convite enviado", description: `Enviamos um convite para ${inviteEmail.trim()}.` });
                  }

                  await qc.invalidateQueries({ queryKey: ["profiles", companyId] });
                  setInviteOpen(false);
                } catch (e) {
                  const msg = await describeFunctionError(e);
                  const maybeEmailIssue = msg.toLowerCase().includes("email") || msg.toLowerCase().includes("smtp") || msg.toLowerCase().includes("mail");

                  toast({
                    title: "Não foi possível adicionar",
                    description: maybeEmailIssue
                      ? `${msg} (Dica: ative \"senha temporária\" para criar sem depender de e-mail.)`
                      : msg,
                    variant: "destructive",
                  });
                } finally {
                  setInviting(false);
                }
              }}
            >
              {inviting ? "Salvando…" : inviteSetTempPassword ? "Criar usuário" : "Enviar convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>

          {editing ? (
            <div className="grid gap-4">
              <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-[color:var(--sinaxys-primary)]">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{editing.email}</div>
                    <div className="mt-1 text-xs text-muted-foreground">ID: {editing.id}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input className="h-11 rounded-xl" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label>Papel</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as CompanyRole)}>
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
                <Label>Departamento</Label>
                <Select value={editDeptId || "__none__"} onValueChange={(v) => setEditDeptId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem departamento</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Manager selection */}
              <div className="grid gap-2">
                <Label>Líder direto</Label>
                <Select value={editManagerId || "__none__"} onValueChange={(v) => setEditManagerId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem líder</SelectItem>
                    {profiles
                      .filter((p) => p.id !== editing.id)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name ?? p.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">Escolha o líder direto (manager) deste usuário.</div>
              </div>

              <div className="grid gap-2">
                <Label>Cargo</Label>
                <Input className="h-11 rounded-xl" value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label>Celular</Label>
                <Input className="h-11 rounded-xl" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label>Custo mensal (BRL)</Label>
                <Input className="h-11 rounded-xl" value={editMonthlyCost} onChange={(e) => setEditMonthlyCost(e.target.value)} inputMode="decimal" placeholder="Ex.: 6500" />
                <div className="text-xs text-muted-foreground">Usado no relatório de custos da empresa e do departamento.</div>
              </div>

              <div className="grid gap-2">
                <Label>Contrato (URL)</Label>
                <Input className="h-11 rounded-xl" value={editContractUrl} onChange={(e) => setEditContractUrl(e.target.value)} inputMode="url" placeholder="https://..." />
              </div>

              <div className="grid gap-2">
                <Label>Data de admissão</Label>
                <div className="relative">
                  <Input
                    className="h-11 rounded-xl pr-10"
                    value={editJoinedAtStr}
                    onChange={(e) => setEditJoinedAtStr(maskDateInput(e.target.value))}
                    placeholder="dd/mm/yyyy"
                    inputMode="numeric"
                    maxLength={10}
                  />
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <CalendarDays className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">Digite a data no formato dd/mm/yyyy</div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Ativo</div>
                  <div className="mt-1 text-xs text-muted-foreground">Desative para bloquear acesso (sem apagar dados).</div>
                </div>
                <Switch checked={editActive} onCheckedChange={setEditActive} />
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Usuário não encontrado.</div>
          )}

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {/* Reset password action for admins */}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto rounded-xl flex items-center gap-2"
                onClick={() => setResetOpen(true)}
                disabled={!editing}
                title="Redefinir senha temporária do usuário"
              >
                <Key className="h-4 w-4" />
                Redefinir senha
              </Button>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" className="rounded-xl w-full sm:w-auto" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 w-full sm:w-auto"
                disabled={!editing || saving || editName.trim().length < 2}
                onClick={async () => {
                  if (!editing) return;
                  try {
                    const joinedIso = editJoinedAtStr.trim() ? parseDisplayToIso(editJoinedAtStr) : null;
                    if (editJoinedAtStr.trim() && !joinedIso) {
                      toast({ title: "Data inválida", description: "Use o formato dd/mm/yyyy.", variant: "destructive" });
                      return;
                    }

                    setSaving(true);
                    await updateProfile(editing.id, {
                      name: editName.trim(),
                      role: editRole,
                      department_id: editDeptId || null,
                      job_title: editJobTitle.trim() || null,
                      phone: editPhone.trim() || null,
                      contract_url: editContractUrl.trim() || null,
                      monthly_cost_brl: toMonthlyCostNumber(editMonthlyCost),
                      active: editActive,
                      joined_at: joinedIso,
                      manager_id: editManagerId || null,
                    });
                    await qc.invalidateQueries({ queryKey: ["profiles", companyId] });
                    toast({ title: "Usuário atualizado" });
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
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={resetOpen} onOpenChange={(v) => setResetOpen(v)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-3">
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Gerar ou definir senha temporária</div>
              <div className="mt-1 text-xs text-muted-foreground">Deixe em branco para gerar automaticamente uma senha forte; caso contrário, digite a senha temporária desejada (mín. 6 caracteres).</div>
            </div>

            <div className="grid gap-2">
              <Label>Senha temporária (opcional)</Label>
              <Input className="h-11 rounded-xl" value={resetTempPassword} onChange={(e) => setResetTempPassword(e.target.value)} placeholder="Deixe em branco para gerar automaticamente" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setResetOpen(false)} disabled={resetting}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              onClick={async () => {
                if (!editing) return;
                if (resetTempPassword.trim() && resetTempPassword.trim().length < 6) {
                  toast({ title: "Senha inválida", description: "A senha temporária deve ter ao menos 6 caracteres.", variant: "destructive" });
                  return;
                }
                await handleResetPassword(editing.id);
              }}
              disabled={resetting}
            >
              {resetting ? "Redefinindo…" : "Redefinir senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Excluir usuário</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="rounded-2xl bg-amber-50 p-3">
              <div className="text-sm font-semibold text-amber-900">Atenção</div>
              <div className="mt-1 text-xs text-amber-900">A exclusão remove permanentemente o acesso e o perfil do usuário. Esta ação não pode ser desfeita.</div>
            </div>

            <div className="text-sm">
              {deletingUser ? (
                <>
                  Confirma excluir <span className="font-semibold">{deletingUser.name ?? deletingUser.email}</span> ({deletingUser.email})?
                </>
              ) : (
                "Selecione um usuário."
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-red-600 text-white hover:bg-red-700"
              onClick={async () => {
                if (!deletingUser) return;
                try {
                  setDeleting(true);
                  const { data, error } = await supabase.functions.invoke("admin-delete-user", { body: { userId: deletingUser.id } });
                  if (error) throw error;
                  if (!data?.ok) throw new Error(data?.message ?? "Erro ao excluir usuário.");

                  toast({ title: "Usuário excluído" });
                  await qc.invalidateQueries({ queryKey: ["profiles", companyId] });
                  setDeleteConfirmOpen(false);
                } catch (e) {
                  const msg = await describeFunctionError(e);
                  toast({ title: "Não foi possível excluir usuário", description: msg, variant: "destructive" });
                } finally {
                  setDeleting(false);
                }
              }}
              disabled={deleting}
            >
              {deleting ? "Excluindo…" : "Excluir usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}