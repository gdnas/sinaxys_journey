import { useMemo, useState } from "react";
import { MailPlus, Pencil, Search, Shield, UserRound } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { listDepartments } from "@/lib/departmentsDb";
import { listProfilesByCompany, updateProfile, type DbProfile } from "@/lib/profilesDb";
import { roleLabel } from "@/lib/sinaxys";

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

async function describeFunctionError(e: unknown): Promise<string> {
  // Supabase Functions errors (FunctionsHttpError/FunctionsRelayError/FunctionsFetchError)
  const anyErr = e as any;

  // For FunctionsHttpError, context is usually a Response.
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

  if (!user || user.role !== "ADMIN" || !user.companyId) return null;
  const companyId = user.companyId;

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: () => listDepartments(companyId),
  });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles", companyId],
    queryFn: () => listProfilesByCompany(companyId),
  });

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d] as const)), [departments]);

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const hay = `${p.name ?? ""} ${p.email}`.toLowerCase();
      return hay.includes(q);
    });
  }, [profiles, query]);

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
    setEditOpen(true);
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

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Admin — Usuários</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Gerencie usuários da sua empresa. Você pode criar com senha temporária (o usuário troca no primeiro acesso) ou enviar convite por e-mail.
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
            <p className="mt-1 text-sm text-muted-foreground">{isLoading ? "Carregando…" : `${profiles.length} usuários nesta empresa.`}</p>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <Button
              className="h-11 w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 md:w-auto"
              onClick={() => {
                resetInvite();
                setInviteOpen(true);
              }}
            >
              <MailPlus className="mr-2 h-4 w-4" />
              Adicionar usuário
            </Button>

            <div className="relative w-full md:w-[360px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome ou e-mail…" className="h-11 rounded-xl pl-9" />
            </div>
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
                <TableHead>Departamento</TableHead>
                <TableHead className="text-right">Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const dept = p.department_id ? deptById.get(p.department_id)?.name : "—";
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">{p.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.email}</TableCell>
                    <TableCell>
                      <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                        {roleLabel(p.role as any)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{dept ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        <Switch
                          checked={!!p.active}
                          onCheckedChange={async (v) => {
                            try {
                              await updateProfile(p.id, { active: v });
                              await qc.invalidateQueries({ queryKey: ["profiles", companyId] });
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
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Se você criar com senha temporária, o sistema força a troca no primeiro acesso.</div>
      </Card>

      {/* Invite / Create */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(v) => {
          setInviteOpen(v);
          if (!v) resetInvite();
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
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
                      role: inviteRole,
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
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
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
                    department_id: editDeptId || null,
                    job_title: editJobTitle.trim() || null,
                    phone: editPhone.trim() || null,
                    contract_url: editContractUrl.trim() || null,
                    monthly_cost_brl: toMonthlyCostNumber(editMonthlyCost),
                    active: editActive,
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}