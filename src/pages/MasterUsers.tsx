import { useMemo, useState } from "react";
import { KeyRound, MailPlus, Pencil, Search, Shield, Copy } from "lucide-react";
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
import { listCompanies } from "@/lib/companiesDb";
import { listDepartments } from "@/lib/departmentsDb";
import { listAllProfiles, updateProfile, type DbProfile } from "@/lib/profilesDb";
import { roleLabel } from "@/lib/sinaxys";

const ROLE_OPTIONS = [
  { value: "MASTERADMIN", label: "Master Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "HEAD", label: "Head" },
  { value: "COLABORADOR", label: "Colaborador" },
] as const;

type AnyRole = (typeof ROLE_OPTIONS)[number]["value"];

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

  const emailQuery = query.trim().toLowerCase();
  const showAuthHint = !isLoading && !!emailQuery && emailQuery.includes("@") && filtered.length === 0;

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

  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<DbProfile | null>(null);
  const [resetting, setResetting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string>("");

  const openReset = (p: DbProfile) => {
    setResetTarget(p);
    setTempPassword("");
    setResetOpen(true);
  };

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCompanyId, setInviteCompanyId] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<AnyRole>("COLABORADOR");
  const [inviteDeptId, setInviteDeptId] = useState<string>("");
  const [inviteJobTitle, setInviteJobTitle] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteSetTempPassword, setInviteSetTempPassword] = useState(false);
  const [inviteTempPassword, setInviteTempPassword] = useState("");
  const [inviting, setInviting] = useState(false);

  const resetInvite = () => {
    setInviteCompanyId("");
    setInviteEmail("");
    setInviteName("");
    setInviteRole("COLABORADOR");
    setInviteDeptId("");
    setInviteJobTitle("");
    setInvitePhone("");
    setInviteSetTempPassword(false);
    setInviteTempPassword("");
  };

  const { data: inviteDepts = [] } = useQuery({
    queryKey: ["departments", inviteCompanyId],
    queryFn: () => listDepartments(inviteCompanyId),
    enabled: !!inviteCompanyId,
  });

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

            <div className="relative w-full md:w-[340px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome ou e-mail…" className="h-11 rounded-xl pl-9" />
            </div>
          </div>
        </div>

        <Separator className="my-5" />

        {showAuthHint ? (
          <div className="mb-4 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-4 text-sm text-[color:var(--sinaxys-ink)]">
            <div className="font-semibold">Não encontrou este e-mail aqui?</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Esta tela lista apenas registros de <span className="font-medium text-[color:var(--sinaxys-ink)]">profiles</span>. Se o usuário existir apenas no login (Supabase Auth), ele não aparece
              até você usar <span className="font-medium text-[color:var(--sinaxys-ink)]">Adicionar usuário</span> para vincular/criar o perfil.
            </div>
          </div>
        ) : null}

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
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-xl"
                          title="Resetar senha (temporária)"
                          onClick={() => openReset(p)}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" title="Editar" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
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

      {/* Reset password */}
      <Dialog
        open={resetOpen}
        onOpenChange={(v) => {
          setResetOpen(v);
          if (!v) {
            setResetTarget(null);
            setTempPassword("");
          }
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resetar senha (temporária)</DialogTitle>
          </DialogHeader>

          {resetTarget ? (
            <div className="grid gap-4">
              <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                Você vai gerar uma <span className="font-semibold text-[color:var(--sinaxys-ink)]">senha temporária</span> para <span className="font-semibold text-[color:var(--sinaxys-ink)]">{resetTarget.email}</span>. No próximo login,
                o usuário será obrigado a trocar a senha.
              </div>

              {tempPassword ? (
                <div className="grid gap-2">
                  <Label>Senha temporária gerada</Label>
                  <div className="flex items-center gap-2">
                    <Input className="h-11 rounded-xl font-mono" value={tempPassword} readOnly />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 rounded-xl"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(tempPassword);
                          toast({ title: "Copiado" });
                        } catch {
                          toast({ title: "Não foi possível copiar", variant: "destructive" });
                        }
                      }}
                      title="Copiar"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">Envie esta senha para o usuário por um canal seguro (ex.: WhatsApp corporativo).</div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Usuário não encontrado.</div>
          )}

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setResetOpen(false)}>
              Fechar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!resetTarget || resetting}
              onClick={async () => {
                if (!resetTarget) return;
                try {
                  setResetting(true);
                  const { data, error } = await supabase.functions.invoke("master-reset-password", {
                    body: { userId: resetTarget.id },
                  });
                  if (error) throw error;
                  if (!data?.tempPassword) throw new Error("Não foi possível gerar a senha.");
                  setTempPassword(String(data.tempPassword));
                  await qc.invalidateQueries({ queryKey: ["profiles-all"] });
                  toast({ title: "Senha temporária criada" });
                } catch (e) {
                  const msg = await describeFunctionError(e);
                  toast({ title: "Não foi possível resetar", description: msg, variant: "destructive" });
                } finally {
                  setResetting(false);
                }
              }}
            >
              {resetting ? "Gerando…" : tempPassword ? "Gerar novamente" : "Gerar senha temporária"}
            </Button>
          </DialogFooter>
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
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar usuário</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Modo</div>
              <p className="mt-1 text-xs text-muted-foreground">Ative "senha temporária" para criar o usuário agora. Desativado = envia convite por e-mail.</p>
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
              <Label>Papel</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => {
                  const next = v as AnyRole;
                  setInviteRole(next);
                  if (next === "MASTERADMIN") {
                    setInviteDeptId("");
                  }
                }}
              >
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

            {inviteRole !== "MASTERADMIN" ? (
              <div className="grid gap-2">
                <Label>Empresa</Label>
                <Select
                  value={inviteCompanyId || "__none__"}
                  onValueChange={(v) => {
                    const next = v === "__none__" ? "" : v;
                    setInviteCompanyId(next);
                    setInviteDeptId("");
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecione…</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Empresa (opcional para Master Admin)</Label>
                <Select value={inviteCompanyId || "__none__"} onValueChange={(v) => setInviteCompanyId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Sem empresa" />
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
            )}

            <div className="grid gap-2">
              <Label>E-mail</Label>
              <Input className="h-11 rounded-xl" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="nome@empresa.com" inputMode="email" />
            </div>

            <div className="grid gap-2">
              <Label>Nome (opcional)</Label>
              <Input className="h-11 rounded-xl" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Ex.: Maria Silva" />
            </div>

            {inviteRole !== "MASTERADMIN" ? (
              <div className="grid gap-2">
                <Label>Departamento</Label>
                <Select value={inviteDeptId || "__none__"} onValueChange={(v) => setInviteDeptId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder={inviteCompanyId ? "Selecione…" : "Selecione uma empresa"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem departamento</SelectItem>
                    {inviteDepts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

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
              disabled={
                inviting ||
                inviteEmail.trim().length < 6 ||
                (inviteSetTempPassword && inviteTempPassword.trim().length < 6) ||
                (inviteRole !== "MASTERADMIN" && !inviteCompanyId)
              }
              onClick={async () => {
                try {
                  setInviting(true);
                  const { data, error } = await supabase.functions.invoke("admin-invite-user", {
                    body: {
                      companyId: inviteCompanyId || null,
                      email: inviteEmail,
                      name: inviteName,
                      role: inviteRole,
                      departmentId: inviteRole === "MASTERADMIN" ? null : inviteDeptId || null,
                      jobTitle: inviteJobTitle || null,
                      phone: invitePhone || null,
                      password: inviteSetTempPassword ? inviteTempPassword : null,
                    },
                  });

                  if (error) throw error;

                  if (data?.alreadyMember) {
                    toast({ title: "Usuário já existe", description: data?.message ?? "Este e-mail já está na empresa." });
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

                  await qc.invalidateQueries({ queryKey: ["profiles-all"] });
                  setInviteOpen(false);
                } catch (e) {
                  const msg = await describeFunctionError(e);
                  const maybeEmailIssue = msg.toLowerCase().includes("email") || msg.toLowerCase().includes("smtp") || msg.toLowerCase().includes("mail");

                  toast({
                    title: "Não foi possível adicionar",
                    description: maybeEmailIssue
                      ? `${msg} (Dica: ative "senha temporária" para criar sem depender de e-mail.)`
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

              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Segurança</div>
                    <div className="mt-1 text-xs text-muted-foreground">Resete a senha e force troca no próximo login.</div>
                  </div>
                  <Button
                    variant="outline"
                    className="h-10 rounded-xl"
                    onClick={() => {
                      // Close edit and open reset
                      setEditOpen(false);
                      openReset(editing);
                    }}
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    Resetar senha
                  </Button>
                </div>
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