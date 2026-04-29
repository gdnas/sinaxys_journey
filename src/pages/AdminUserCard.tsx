import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Clock3,
  ExternalLink,
  FileText,
  Plus,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { brl, brlPerHourFromMonthly } from "@/lib/costs";
import { listDepartments } from "@/lib/departmentsDb";
import {
  createContractAttachment,
  createUserDocument,
  deleteContractAttachment,
  deleteUserDocument,
  listContractAttachments,
  listUserDocuments,
} from "@/lib/documentsDb";
import { getProfile, listProfilesByCompany, updateProfile } from "@/lib/profilesDb";
import { roleLabel } from "@/lib/sinaxys";
import AdminUsersOffboardDialog from "./AdminUsersOffboardDialog";
import { supabase } from "@/integrations/supabase/client";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

function isUrl(v: string) {
  const t = v.trim();
  if (!t) return false;
  try {
    new URL(t);
    return true;
  } catch {
    return false;
  }
}

function toMoney(v: string) {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t.replace(/\./g, "").replace(/,/g, "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export default function AdminUserCard() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { userId } = useParams();

  const canAdmin = !!user && (user.role === "ADMIN" || user.role === "MASTERADMIN");
  const cid = user?.companyId ?? (user as any)?.company_id ?? null;

  if (!user || !canAdmin || !cid) return null;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", cid],
    queryFn: () => listDepartments(cid),
    enabled: !!cid,
  });

  const { data: people = [] } = useQuery({
    queryKey: ["profiles", cid],
    queryFn: () => listProfilesByCompany(cid),
    enabled: !!cid,
  });

  const allowed = !!profile && profile.company_id === cid;

  const managerOptions = useMemo(() => {
    const me = userId ?? "";
    return (people ?? [])
      .filter((p) => p.id !== me)
      .filter((p) => !!p.active)
      .map((p) => ({ id: p.id, label: p.name?.trim() ? p.name.trim() : p.email }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [people, userId]);

  const managerLabel = useMemo(() => {
    const mid = profile?.manager_id;
    if (!mid) return null;
    const p = (people ?? []).find((x) => x.id === mid);
    return p ? (p.name?.trim() ? p.name.trim() : p.email) : null;
  }, [people, profile?.manager_id]);

  const departmentName = useMemo(() => {
    if (!profile?.department_id) return null;
    return departments.find((d) => d.id === profile.department_id)?.name ?? null;
  }, [profile?.department_id, departments]);

  const title = profile?.name?.trim() ? profile.name.trim() : profile?.email ?? "Pessoa";

  const { data: attachments = [] } = useQuery({
    queryKey: ["contract-attachments", cid, userId],
    queryFn: () => listContractAttachments({ companyId: cid, userId: userId! }),
    enabled: !!cid && !!userId && allowed,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["user-documents", cid, userId],
    queryFn: () => listUserDocuments({ companyId: cid, userId: userId! }),
    enabled: !!cid && !!userId && allowed,
  });

  const [name, setName] = useState("");
  const [role, setRole] = useState("COLABORADOR");
  const [managerId, setManagerId] = useState<string>("__none__");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [deptId, setDeptId] = useState<string>("");
  const [active, setActive] = useState(true);
  const [monthlyCost, setMonthlyCost] = useState("");
  const [contractUrl, setContractUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const [addAttachmentOpen, setAddAttachmentOpen] = useState(false);
  const [attTitle, setAttTitle] = useState("");
  const [attUrl, setAttUrl] = useState("");
  const [addingAttachment, setAddingAttachment] = useState(false);

  const [addDocOpen, setAddDocOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("EMPRESA");
  const [docUrl, setDocUrl] = useState("");
  const [addingDoc, setAddingDoc] = useState(false);

  const [offboardOpen, setOffboardOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty = useMemo(() => {
    if (!profile) return false;
    const baseName = profile.name ?? "";
    const baseRole = profile.role ?? "";
    const baseManager = profile.manager_id ?? "__none__";
    const basePhone = profile.phone ?? "";
    const baseJob = profile.job_title ?? "";
    const baseDept = profile.department_id ?? "";
    const baseActive = !!profile.active;
    const baseMonthly = typeof profile.monthly_cost_brl === "number" ? String(profile.monthly_cost_brl) : "";
    const baseContract = profile.contract_url ?? "";
    return (
      name.trim() !== baseName ||
      role !== baseRole ||
      managerId !== baseManager ||
      phone.trim() !== basePhone ||
      jobTitle.trim() !== baseJob ||
      deptId !== baseDept ||
      active !== baseActive ||
      monthlyCost.trim() !== baseMonthly ||
      contractUrl.trim() !== baseContract
    );
  }, [profile, name, role, managerId, phone, jobTitle, deptId, active, monthlyCost, contractUrl]);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setRole(profile.role ?? "COLABORADOR");
    setManagerId(profile.manager_id ?? "__none__");
    setPhone(profile.phone ?? "");
    setJobTitle(profile.job_title ?? "");
    setDeptId(profile.department_id ?? "");
    setActive(!!profile.active);
    setMonthlyCost(typeof profile.monthly_cost_brl === "number" ? String(profile.monthly_cost_brl) : "");
    setContractUrl(profile.contract_url ?? "");
  }, [profile?.id, profile?.updated_at, profile]);

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Admin — Pessoa</div>
            <p className="mt-1 text-sm text-muted-foreground">Editar perfil e adicionar documentos para colaboradores.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" className="h-10 rounded-xl">
                <Link to="/admin/users">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar aos usuários
                </Link>
              </Button>
              <Button variant="outline" className="h-10 rounded-xl" onClick={() => nav(-1)}>
                Voltar
              </Button>
              {profile ? (
                <>
                  <Button variant="ghost" className="h-10 rounded-xl" onClick={() => setOffboardOpen(true)}>
                    Desligamento
                  </Button>
                  <Button variant="destructive" className="h-10 rounded-xl" onClick={() => setDeleteConfirmOpen(true)}>
                    Excluir
                  </Button>
                </>
              ) : null}
            </div>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <UserRound className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        {isLoading ? (
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Carregando…</div>
        ) : !allowed ? (
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Pessoa não encontrada nesta empresa.</div>
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-[color:var(--sinaxys-border)]">
                  <AvatarImage src={profile.avatar_url ?? undefined} alt={title} />
                  <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">{initials(title)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold text-[color:var(--sinaxys-ink)]">{title}</div>
                  <div className="mt-1 truncate text-sm text-muted-foreground">{profile.email}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">{roleLabel(profile.role as any)}</Badge>
                    <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">{departmentName ?? "Sem departamento"}</Badge>
                    {managerLabel ? (
                      <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)] hover:bg-white">
                        Líder: {managerLabel}
                      </Badge>
                    ) : (
                      <Badge className="rounded-full bg-white text-muted-foreground ring-1 ring-[color:var(--sinaxys-border)] hover:bg-white">
                        Sem líder
                      </Badge>
                    )}
                    {profile.active ? (
                      <Badge className="rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                        <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />
                        Ativo
                      </Badge>
                    ) : (
                      <Badge className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100">Inativo</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:justify-items-end">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ordenado / custo mensal</div>
                <div className="text-2xl font-semibold text-[color:var(--sinaxys-ink)]">
                  {typeof profile.monthly_cost_brl === "number" && profile.monthly_cost_brl > 0 ? brl(profile.monthly_cost_brl) : "—"}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    {typeof profile.monthly_cost_brl === "number" ? brlPerHourFromMonthly(profile.monthly_cost_brl) : "—"}
                  </span>
                </div>
              </div>
            </div>

            <Separator className="my-5" />

            <Tabs defaultValue="perfil" className="w-full">
              <TabsList className="w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-[color:var(--sinaxys-tint)] p-1">
                <TabsTrigger value="perfil" className="shrink-0 rounded-xl data-[state=active]:bg-white">
                  Perfil
                </TabsTrigger>
                <TabsTrigger value="documentos" className="shrink-0 rounded-xl data-[state=active]:bg-white">
                  Documentos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="perfil" className="mt-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Dados do perfil</div>
                        <div className="mt-1 text-sm text-muted-foreground">Admin pode editar dados de qualquer colaborador da empresa.</div>
                      </div>
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                        <UserRound className="h-5 w-5" />
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <Label>Papel</Label>
                        <Select value={role} onValueChange={setRole} disabled={saving}>
                          <SelectTrigger className="h-11 rounded-2xl bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="HEAD">Head</SelectItem>
                            <SelectItem value="COLABORADOR">Colaborador</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="text-xs text-muted-foreground">Admin pode promover/rebaixar o papel do usuário na empresa.</div>
                      </div>

                      <div className="grid gap-2">
                        <Label>Nome</Label>
                        <Input className="h-11 rounded-2xl" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
                      </div>

                      <div className="grid gap-2">
                        <Label>Líder direto</Label>
                        <Select value={managerId} onValueChange={setManagerId} disabled={saving}>
                          <SelectTrigger className="h-11 rounded-2xl bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            <SelectItem value="__none__">Sem líder</SelectItem>
                            {managerOptions.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="text-xs text-muted-foreground">Define quem aparece como "Líder direto" no organograma e no card da pessoa.</div>
                      </div>

                      <div className="grid gap-2">
                        <Label>Celular</Label>
                        <Input className="h-11 rounded-2xl" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving} placeholder="(11) 99999-9999" />
                      </div>

                      <div className="grid gap-2">
                        <Label>Cargo</Label>
                        <Input className="h-11 rounded-2xl" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} disabled={saving} placeholder="Ex.: Analista" />
                      </div>

                      <div className="grid gap-2">
                        <Label>Departamento</Label>
                        <Select value={deptId || "__none__"} onValueChange={(v) => setDeptId(v === "__none__" ? "" : v)} disabled={saving}>
                          <SelectTrigger className="h-11 rounded-2xl bg-white">
                            <SelectValue placeholder="Selecione…" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
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
                        <Label>Ativo</Label>
                        <Select value={active ? "true" : "false"} onValueChange={(v) => setActive(v === "true")} disabled={saving}>
                          <SelectTrigger className="h-11 rounded-2xl bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            <SelectItem value="true">Ativo</SelectItem>
                            <SelectItem value="false">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Custo mensal (R$)</Label>
                        <Input className="h-11 rounded-2xl" value={monthlyCost} onChange={(e) => setMonthlyCost(e.target.value)} disabled={saving} placeholder="Ex.: 12000" />
                      </div>

                      <div className="grid gap-2">
                        <Label>Contrato (link)</Label>
                        <Input className="h-11 rounded-2xl" value={contractUrl} onChange={(e) => setContractUrl(e.target.value)} disabled={saving} placeholder="https://…" />
                      </div>

                      <div className="flex justify-end">
                        <Button
                          className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                          disabled={saving || !dirty}
                          onClick={async () => {
                            setSaving(true);
                            try {
                              const cost = toMoney(monthlyCost);
                              await updateProfile(profile.id, {
                                name: name.trim() || null,
                                role,
                                manager_id: managerId === "__none__" ? null : managerId,
                                phone: phone.trim() || null,
                                job_title: jobTitle.trim() || null,
                                department_id: deptId || null,
                                active,
                                monthly_cost_brl: cost,
                                contract_url: contractUrl.trim() || null,
                              });
                              await qc.invalidateQueries({ queryKey: ["profile", userId] });
                              await qc.invalidateQueries({ queryKey: ["profiles", cid] });
                              toast({ title: "Perfil atualizado" });
                            } catch (e: any) {
                              toast({ title: "Erro ao salvar", description: e?.message ?? "Tente novamente.", variant: "destructive" });
                            } finally {
                              setSaving(false);
                            }
                          }}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {saving ? "Salvando..." : "Salvar alterações"}
                        </Button>
                      </div>
                    </div>
                  </Card>

                  <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Resumo do vínculo</div>
                        <div className="mt-1 text-sm text-muted-foreground">Atalhos rápidos para informações úteis da pessoa.</div>
                      </div>
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                        <BriefcaseBusiness className="h-5 w-5" />
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Departamento</div>
                        <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{departmentName ?? "Sem departamento"}</div>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Líder</div>
                        <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{managerLabel ?? "Sem líder"}</div>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custo mensal</div>
                        <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{typeof profile.monthly_cost_brl === "number" && profile.monthly_cost_brl > 0 ? brl(profile.monthly_cost_brl) : "—"}</div>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custo / hora</div>
                        <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{typeof profile.monthly_cost_brl === "number" && profile.monthly_cost_brl > 0 ? brlPerHourFromMonthly(profile.monthly_cost_brl) : "—"}</div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-[color:var(--sinaxys-border)] p-4 text-sm text-muted-foreground">
                      {profile.contract_url ? (
                        <a href={profile.contract_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium text-[color:var(--sinaxys-primary)] hover:underline">
                          <ExternalLink className="h-4 w-4" />
                          Abrir contrato
                        </a>
                      ) : (
                        <span>Nenhum contrato vinculado.</span>
                      )}
                    </div>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="documentos" className="mt-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Anexos de contrato</div>
                        <div className="mt-1 text-sm text-muted-foreground">Links complementares relacionados ao contrato.</div>
                      </div>
                      <Button variant="outline" className="h-10 rounded-xl" onClick={() => setAddAttachmentOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar
                      </Button>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid gap-3">
                      {attachments.length ? (
                        attachments.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{item.title}</div>
                              <a href={item.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-2 truncate text-xs text-[color:var(--sinaxys-primary)] hover:underline">
                                <ExternalLink className="h-3.5 w-3.5" />
                                {item.url}
                              </a>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl"
                              onClick={async () => {
                                await deleteContractAttachment(item.id);
                                await qc.invalidateQueries({ queryKey: ["contract-attachments", cid, userId] });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhum anexo cadastrado.</div>
                      )}
                    </div>
                  </Card>

                  <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Documentos do usuário</div>
                        <div className="mt-1 text-sm text-muted-foreground">Documentos internos relacionados ao colaborador.</div>
                      </div>
                      <Button variant="outline" className="h-10 rounded-xl" onClick={() => setAddDocOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar
                      </Button>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid gap-3">
                      {documents.length ? (
                        documents.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{item.title}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">{item.category}</Badge>
                                <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[color:var(--sinaxys-primary)] hover:underline">
                                  <FileText className="h-3.5 w-3.5" />
                                  Abrir
                                </a>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl"
                              onClick={async () => {
                                await deleteUserDocument(item.id);
                                await qc.invalidateQueries({ queryKey: ["user-documents", cid, userId] });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhum documento cadastrado.</div>
                      )}
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </Card>

      <Dialog open={addAttachmentOpen} onOpenChange={setAddAttachmentOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Adicionar anexo de contrato</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input value={attTitle} onChange={(e) => setAttTitle(e.target.value)} placeholder="Ex.: Aditivo contratual" className="h-11 rounded-2xl" />
            </div>
            <div className="grid gap-2">
              <Label>URL</Label>
              <Input value={attUrl} onChange={(e) => setAttUrl(e.target.value)} placeholder="https://…" className="h-11 rounded-2xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setAddAttachmentOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl"
              disabled={addingAttachment || !attTitle.trim() || !isUrl(attUrl) || !userId}
              onClick={async () => {
                setAddingAttachment(true);
                try {
                  await createContractAttachment({
                    companyId: cid,
                    userId,
                    title: attTitle.trim(),
                    url: attUrl.trim(),
                  });
                  await qc.invalidateQueries({ queryKey: ["contract-attachments", cid, userId] });
                  setAttTitle("");
                  setAttUrl("");
                  setAddAttachmentOpen(false);
                  toast({ title: "Anexo adicionado" });
                } catch (e: any) {
                  toast({ title: "Erro ao adicionar anexo", description: e?.message ?? "Tente novamente.", variant: "destructive" });
                } finally {
                  setAddingAttachment(false);
                }
              }}
            >
              {addingAttachment ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDocOpen} onOpenChange={setAddDocOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Adicionar documento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Ex.: RG digitalizado" className="h-11 rounded-2xl" />
            </div>
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select value={docCategory} onValueChange={setDocCategory}>
                <SelectTrigger className="h-11 rounded-2xl bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="EMPRESA">Empresa</SelectItem>
                  <SelectItem value="PESSOAL">Pessoal</SelectItem>
                  <SelectItem value="CONTRATO">Contrato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>URL</Label>
              <Input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://…" className="h-11 rounded-2xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setAddDocOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl"
              disabled={addingDoc || !docTitle.trim() || !isUrl(docUrl) || !userId}
              onClick={async () => {
                setAddingDoc(true);
                try {
                  await createUserDocument({
                    companyId: cid,
                    userId,
                    title: docTitle.trim(),
                    category: docCategory,
                    url: docUrl.trim(),
                    kind: "LINK",
                  });
                  await qc.invalidateQueries({ queryKey: ["user-documents", cid, userId] });
                  setDocTitle("");
                  setDocCategory("EMPRESA");
                  setDocUrl("");
                  setAddDocOpen(false);
                  toast({ title: "Documento adicionado" });
                } catch (e: any) {
                  toast({ title: "Erro ao adicionar documento", description: e?.message ?? "Tente novamente.", variant: "destructive" });
                } finally {
                  setAddingDoc(false);
                }
              }}
            >
              {addingDoc ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminUsersOffboardDialog
        open={offboardOpen}
        onOpenChange={setOffboardOpen}
        userId={userId ?? ""}
        onDone={() => {
          void qc.invalidateQueries({ queryKey: ["profile", userId] });
          void qc.invalidateQueries({ queryKey: ["profiles", cid] });
        }}
      />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Excluir colaborador</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Esta ação remove o perfil do colaborador. Se quiser apenas retirar acesso, prefira usar o desligamento.
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={deleting || !userId}
              onClick={async () => {
                if (!userId) return;
                setDeleting(true);
                try {
                  const { error } = await supabase.from("profiles").delete().eq("id", userId);
                  if (error) throw error;
                  await qc.invalidateQueries({ queryKey: ["profiles", cid] });
                  setDeleteConfirmOpen(false);
                  toast({ title: "Colaborador excluído" });
                  nav("/admin/users");
                } catch (e: any) {
                  toast({ title: "Erro ao excluir", description: e?.message ?? "Tente novamente.", variant: "destructive" });
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}