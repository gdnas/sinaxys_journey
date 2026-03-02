import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, FileText, KeyRound, Plus, Save, Trash2, UserRound } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollableTabsList } from "@/components/ScrollableTabsList";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { getCompany } from "@/lib/companiesDb";
import { brl } from "@/lib/costs";
import { listDepartments } from "@/lib/departmentsDb";
import {
  createContractAttachment,
  createUserDocument,
  deleteContractAttachment,
  deleteUserDocument,
  listContractAttachments,
  listUserDocuments,
} from "@/lib/documentsDb";
import { getProfile, updateProfile } from "@/lib/profilesDb";
import { roleLabel } from "@/lib/sinaxys";
import { FinanceiroPanel } from "@/components/FinanceiroPanel";
import VacationRequests from "@/pages/VacationRequests";
import VacationApprovals from "@/pages/VacationApprovals";

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
    // eslint-disable-next-line no-new
    new URL(t);
    return true;
  } catch {
    return false;
  }
}

export default function Profile() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user, refresh } = useAuth();

  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!user) return null;

  const isMaster = user.role === "MASTERADMIN";

  const canEditSensitive = user.role === "ADMIN" || user.role === "MASTERADMIN";
  const canEditCompanyFinance = user.role === "ADMIN" || user.role === "MASTERADMIN";
  const canApproveVacation = user.role === "ADMIN" || user.role === "HEAD";

  const { data: me } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: () => getProfile(user.id),
  });

  const { data: company } = useQuery({
    queryKey: ["company", user.companyId],
    queryFn: () => (user.companyId ? getCompany(user.companyId) : Promise.resolve(null)),
    enabled: !!user.companyId,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", user.companyId],
    queryFn: () => listDepartments(user.companyId!),
    enabled: !!user.companyId,
  });

  const deptName = useMemo(() => {
    if (!me?.department_id) return null;
    return departments.find((d) => d.id === me.department_id)?.name ?? null;
  }, [me?.department_id, departments]);

  const { data: attachments = [] } = useQuery({
    queryKey: ["contract-attachments", user.companyId, user.id],
    queryFn: () => listContractAttachments({ companyId: user.companyId!, userId: user.id }),
    enabled: !!user.companyId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["user-documents", user.companyId, user.id],
    queryFn: () => listUserDocuments({ companyId: user.companyId!, userId: user.id }),
    enabled: !!user.companyId,
  });

  // Basic profile editable
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");

  // Address (keep compact)
  const [addressZip, setAddressZip] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressCountry, setAddressCountry] = useState("Brasil");

  // Sensitive fields (view for everyone, edit for admin/master)
  const [jobTitle, setJobTitle] = useState(user.jobTitle ?? "");
  const [monthlyCost, setMonthlyCost] = useState<string>(user.monthlyCostBRL ? String(user.monthlyCostBRL) : "");
  const [contractUrl, setContractUrl] = useState(user.contractUrl ?? "");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!me) return;
    setName(me.name ?? user.name);
    setAvatarUrl(me.avatar_url ?? "");
    setPhone(me.phone ?? "");

    setAddressZip(me.address_zip ?? "");
    setAddressLine1(me.address_line1 ?? "");
    setAddressLine2(me.address_line2 ?? "");
    setAddressNeighborhood(me.address_neighborhood ?? "");
    setAddressCity(me.address_city ?? "");
    setAddressState(me.address_state ?? "");
    setAddressCountry(me.address_country ?? "Brasil");

    setJobTitle(me.job_title ?? "");
    setMonthlyCost(typeof me.monthly_cost_brl === "number" ? String(me.monthly_cost_brl) : "");
    setContractUrl(me.contract_url ?? "");
  }, [me?.id]);

  const monthlyCostNumber = useMemo(() => {
    const t = monthlyCost.trim();
    if (!t) return null;
    const n = Number(t.replace(/\./g, "").replace(/,/g, "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [monthlyCost]);

  const dirtyBasic = useMemo(() => {
    const baseName = me?.name ?? user.name;
    const baseAvatar = me?.avatar_url ?? "";
    const basePhone = me?.phone ?? "";

    const baseZip = me?.address_zip ?? "";
    const baseL1 = me?.address_line1 ?? "";
    const baseL2 = me?.address_line2 ?? "";
    const baseNb = me?.address_neighborhood ?? "";
    const baseCity = me?.address_city ?? "";
    const baseState = me?.address_state ?? "";
    const baseCountry = me?.address_country ?? "Brasil";

    return (
      name.trim() !== baseName ||
      avatarUrl.trim() !== baseAvatar ||
      phone.trim() !== basePhone ||
      addressZip.trim() !== baseZip ||
      addressLine1.trim() !== baseL1 ||
      addressLine2.trim() !== baseL2 ||
      addressNeighborhood.trim() !== baseNb ||
      addressCity.trim() !== baseCity ||
      addressState.trim() !== baseState ||
      addressCountry.trim() !== baseCountry
    );
  }, [
    name,
    avatarUrl,
    phone,
    addressZip,
    addressLine1,
    addressLine2,
    addressNeighborhood,
    addressCity,
    addressState,
    addressCountry,
    me,
    user.name,
  ]);

  const dirtySensitive = useMemo(() => {
    const baseJob = me?.job_title ?? "";
    const baseMonthly = typeof me?.monthly_cost_brl === "number" ? String(me?.monthly_cost_brl) : "";
    const baseContract = me?.contract_url ?? "";
    return jobTitle.trim() !== baseJob || monthlyCost.trim() !== baseMonthly || contractUrl.trim() !== baseContract;
  }, [jobTitle, monthlyCost, contractUrl, me]);

  // Add dialogs
  const [addAttachmentOpen, setAddAttachmentOpen] = useState(false);
  const [attTitle, setAttTitle] = useState("");
  const [attUrl, setAttUrl] = useState("");

  const [addDocOpen, setAddDocOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("EMPRESA");
  const [docUrl, setDocUrl] = useState("");

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Minha área</div>
            <p className="mt-1 text-sm text-muted-foreground">Perfil, trabalho, documentos e financeiro.</p>

            <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:gap-2">
              <Badge className="w-fit max-w-full truncate rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                {roleLabel(user.role)}
              </Badge>
              {company?.name ? (
                <Badge className="w-fit max-w-full truncate rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                  {company.name}
                </Badge>
              ) : null}
              {deptName ? (
                <Badge className="w-fit max-w-full truncate rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                  {deptName}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <UserRound className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="h-16 w-16 shrink-0 ring-2 ring-[color:var(--sinaxys-border)]">
              <AvatarImage src={avatarUrl || undefined} alt={name} />
              <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                {initials(name || user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{user.email}</div>
              <div className="mt-1 truncate text-xs text-muted-foreground">ID: {user.id}</div>
            </div>
          </div>

          <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = String(reader.result ?? "");
                  setAvatarUrl(dataUrl);
                  toast({ title: "Foto carregada", description: "Agora é só salvar." });
                };
                reader.readAsDataURL(file);
              }}
            />
            <Button variant="outline" className="h-11 w-full justify-center rounded-xl sm:h-10 sm:w-auto" onClick={() => fileRef.current?.click()}>
              Enviar foto
            </Button>
            <Button asChild variant="outline" className="h-11 w-full justify-center rounded-xl sm:h-10 sm:w-auto">
              <Link to="/password">
                <KeyRound className="mr-2 h-4 w-4" />
                Alterar senha
              </Link>
            </Button>
          </div>
        </div>

        <Separator className="my-5" />

        <Tabs defaultValue="perfil" className="w-full">
          <ScrollableTabsList
            listClassName="h-11 rounded-2xl bg-[color:var(--sinaxys-tint)] p-1"
            containerClassName="-mx-1 px-1"
          >
            <TabsTrigger value="perfil" className="shrink-0 rounded-xl">Perfil</TabsTrigger>
            <TabsTrigger value="trabalho" className="shrink-0 rounded-xl">Trabalho</TabsTrigger>
            <TabsTrigger value="docs" className="shrink-0 rounded-xl">Documentos</TabsTrigger>
            <TabsTrigger value="financeiro" className="shrink-0 rounded-xl">Financeiro</TabsTrigger>
            <TabsTrigger value="ferias" className="shrink-0 rounded-xl">Férias</TabsTrigger>
          </ScrollableTabsList>

          <TabsContent value="perfil" className="mt-5">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input className="h-11 rounded-xl" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label>Celular</Label>
                <Input className="h-11 rounded-xl" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 11 9…" />
              </div>

              <div className="grid gap-2">
                <Label>Avatar URL (opcional)</Label>
                <Input className="h-11 rounded-xl" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
              </div>

              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/60 p-1">
                <Accordion type="single" collapsible>
                  <AccordionItem value="endereco" className="border-none">
                    <AccordionTrigger className="rounded-2xl px-4 py-3 text-sm font-semibold text-[color:var(--sinaxys-ink)] hover:no-underline">
                      Endereço
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="grid gap-3">
                        <div className="grid gap-2 sm:max-w-[220px]">
                          <Label>CEP</Label>
                          <Input className="h-11 rounded-xl bg-white" value={addressZip} onChange={(e) => setAddressZip(e.target.value)} placeholder="00000-000" />
                        </div>

                        <div className="grid gap-2">
                          <Label>Endereço</Label>
                          <Input
                            className="h-11 rounded-xl bg-white"
                            value={addressLine1}
                            onChange={(e) => setAddressLine1(e.target.value)}
                            placeholder="Rua, número"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label>Complemento (opcional)</Label>
                          <Input
                            className="h-11 rounded-xl bg-white"
                            value={addressLine2}
                            onChange={(e) => setAddressLine2(e.target.value)}
                            placeholder="Apto, bloco, etc."
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="grid gap-2">
                            <Label>Bairro</Label>
                            <Input
                              className="h-11 rounded-xl bg-white"
                              value={addressNeighborhood}
                              onChange={(e) => setAddressNeighborhood(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Cidade</Label>
                            <Input className="h-11 rounded-xl bg-white" value={addressCity} onChange={(e) => setAddressCity(e.target.value)} />
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="grid gap-2">
                            <Label>Estado</Label>
                            <Input className="h-11 rounded-xl bg-white" value={addressState} onChange={(e) => setAddressState(e.target.value)} placeholder="SP" />
                          </div>
                          <div className="grid gap-2">
                            <Label>País</Label>
                            <Input
                              className="h-11 rounded-xl bg-white"
                              value={addressCountry}
                              onChange={(e) => setAddressCountry(e.target.value)}
                              placeholder="Brasil"
                            />
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                </Accordion>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">Alterações salvam em public.profiles.</div>
                <Button
                  className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  disabled={!dirtyBasic || saving || name.trim().length < 2}
                  onClick={async () => {
                    try {
                      setSaving(true);
                      await updateProfile(user.id, {
                        name: name.trim(),
                        phone: phone.trim() || null,
                        avatar_url: avatarUrl.trim() || null,

                        address_zip: addressZip.trim() || null,
                        address_line1: addressLine1.trim() || null,
                        address_line2: addressLine2.trim() || null,
                        address_neighborhood: addressNeighborhood.trim() || null,
                        address_city: addressCity.trim() || null,
                        address_state: addressState.trim() || null,
                        address_country: addressCountry.trim() || null,
                      } as any);

                      await qc.invalidateQueries({ queryKey: ["profile", user.id] });
                      await refresh();
                      toast({ title: "Perfil atualizado" });
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
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Salvando…" : "Salvar"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trabalho" className="mt-5">
            <div className="grid gap-4">
              <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                Aqui ficam os dados combinados de trabalho: <span className="font-semibold">cargo</span>, <span className="font-semibold">ordenado/custo</span> e <span className="font-semibold">contrato</span>.
                {canEditSensitive ? " Você pode editar." : " Apenas administradores editam."}
              </div>

              <div className="grid gap-2">
                <Label>Cargo</Label>
                <Input
                  className="h-11 rounded-xl"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Ex.: Analista"
                  disabled={!canEditSensitive}
                />
              </div>

              <div className="grid gap-2">
                <Label>Ordenado / custo mensal (BRL)</Label>
                <Input
                  className="h-11 rounded-xl"
                  value={monthlyCost}
                  onChange={(e) => setMonthlyCost(e.target.value)}
                  placeholder="Ex.: 6500"
                  inputMode="decimal"
                  disabled={!canEditSensitive}
                />
                <div className="text-xs text-muted-foreground">
                  {monthlyCostNumber ? `Formato: ${brl(monthlyCostNumber)}.` : "Informe um valor para aparecer nos relatórios de custos."}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Link do contrato</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    className="h-11 flex-1 rounded-xl"
                    value={contractUrl}
                    onChange={(e) => setContractUrl(e.target.value)}
                    placeholder="https://..."
                    inputMode="url"
                    disabled={!canEditSensitive}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl"
                    disabled={!isUrl(contractUrl)}
                    onClick={() => window.open(contractUrl.trim(), "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">Departamento: {deptName ?? "—"}</div>
                <Button
                  className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  disabled={!canEditSensitive || saving || !dirtySensitive}
                  onClick={async () => {
                    try {
                      setSaving(true);
                      await updateProfile(user.id, {
                        job_title: jobTitle.trim() || null,
                        monthly_cost_brl: monthlyCostNumber,
                        contract_url: contractUrl.trim() || null,
                      } as any);

                      await qc.invalidateQueries({ queryKey: ["profile", user.id] });
                      await refresh();
                      toast({ title: "Dados atualizados" });
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
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Salvando…" : "Salvar"}
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Aditivos e anexos</div>
                  <div className="mt-1 text-xs text-muted-foreground">Links extras relacionados ao contrato (ex.: aditivo).</div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl"
                  onClick={() => {
                    setAttTitle("");
                    setAttUrl("");
                    setAddAttachmentOpen(true);
                  }}
                  disabled={!user.companyId}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar
                </Button>
              </div>

              <div className="grid gap-2">
                {attachments.length ? (
                  attachments.map((a) => (
                    <div key={a.id} className="flex flex-col gap-2 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                          <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{a.title}</div>
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">{a.url ?? "—"}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 rounded-xl"
                          disabled={!a.url}
                          onClick={() => a.url && window.open(a.url, "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Abrir
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 rounded-xl"
                          onClick={async () => {
                            try {
                              await deleteContractAttachment(a.id);
                              await qc.invalidateQueries({ queryKey: ["contract-attachments", user.companyId, user.id] });
                              toast({ title: "Anexo removido" });
                            } catch (e) {
                              toast({
                                title: "Não foi possível remover",
                                description: e instanceof Error ? e.message : "Erro inesperado.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhum anexo ainda.</div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="docs" className="mt-5">
            <div className="grid gap-4">
              <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                Documentos e links relacionados ao seu cadastro (ex.: documentos pessoais, comprovantes, links internos).
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Documentos</div>
                  <div className="mt-1 text-xs text-muted-foreground">Salvos no banco (tabela public.user_documents).</div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl"
                  onClick={() => {
                    setDocTitle("");
                    setDocUrl("");
                    setDocCategory("EMPRESA");
                    setAddDocOpen(true);
                  }}
                  disabled={!user.companyId}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar
                </Button>
              </div>

              <div className="grid gap-2">
                {documents.length ? (
                  documents.map((d) => (
                    <div key={d.id} className="flex flex-col gap-2 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{d.title}</div>
                          <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                            {d.category}
                          </Badge>
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">{d.url ?? "—"}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 rounded-xl"
                          disabled={!d.url}
                          onClick={() => d.url && window.open(d.url, "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Abrir
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 rounded-xl"
                          onClick={async () => {
                            try {
                              await deleteUserDocument(d.id);
                              await qc.invalidateQueries({ queryKey: ["user-documents", user.companyId, user.id] });
                              toast({ title: "Documento removido" });
                            } catch (e) {
                              toast({
                                title: "Não foi possível remover",
                                description: e instanceof Error ? e.message : "Erro inesperado.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhum documento ainda.</div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="financeiro" className="mt-5">
            <FinanceiroPanel userId={user.id} companyId={user.companyId ?? null} canEditCompany={canEditCompanyFinance} />
          </TabsContent>

          <TabsContent value="ferias" className="mt-5">
            <div className="grid gap-4">
              <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/60 p-5">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Férias</div>
                <p className="mt-1 text-sm text-muted-foreground">Solicite férias e acompanhe aprovações — tudo aqui dentro da sua área.</p>
              </div>

              <Tabs defaultValue="meus" className="w-full">
                <ScrollableTabsList
                  listClassName="h-11 rounded-2xl bg-[color:var(--sinaxys-tint)] p-1"
                  containerClassName="-mx-1 px-1"
                >
                  <TabsTrigger value="meus" className="shrink-0 rounded-xl">Meus pedidos</TabsTrigger>
                  {canApproveVacation ? <TabsTrigger value="apro" className="shrink-0 rounded-xl">Aprovações</TabsTrigger> : null}
                </ScrollableTabsList>

                <TabsContent value="meus" className="mt-5">
                  <VacationRequests />
                </TabsContent>

                {canApproveVacation ? (
                  <TabsContent value="apro" className="mt-5">
                    <VacationApprovals />
                  </TabsContent>
                ) : null}
              </Tabs>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Add attachment dialog */}
      <Dialog open={addAttachmentOpen} onOpenChange={setAddAttachmentOpen}>
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar anexo / aditivo</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input className="h-11 rounded-xl" value={attTitle} onChange={(e) => setAttTitle(e.target.value)} placeholder="Ex.: Aditivo 2026" />
            </div>
            <div className="grid gap-2">
              <Label>URL</Label>
              <Input className="h-11 rounded-xl" value={attUrl} onChange={(e) => setAttUrl(e.target.value)} placeholder="https://..." inputMode="url" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setAddAttachmentOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!user.companyId || attTitle.trim().length < 2 || !isUrl(attUrl)}
              onClick={async () => {
                try {
                  await createContractAttachment({
                    companyId: user.companyId!,
                    userId: user.id,
                    title: attTitle,
                    url: attUrl,
                  });
                  await qc.invalidateQueries({ queryKey: ["contract-attachments", user.companyId, user.id] });
                  toast({ title: "Anexo adicionado" });
                  setAddAttachmentOpen(false);
                } catch (e) {
                  toast({
                    title: "Não foi possível adicionar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add document dialog */}
      <Dialog open={addDocOpen} onOpenChange={setAddDocOpen}>
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar documento</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Input className="h-11 rounded-xl" value={docCategory} onChange={(e) => setDocCategory(e.target.value)} placeholder="Ex.: IDENTIFICACAO" />
              <div className="text-xs text-muted-foreground">Ex.: IDENTIFICACAO, EMPRESA, etc.</div>
            </div>
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input className="h-11 rounded-xl" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Ex.: RG" />
            </div>
            <div className="grid gap-2">
              <Label>URL</Label>
              <Input className="h-11 rounded-xl" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://..." inputMode="url" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setAddDocOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!user.companyId || docTitle.trim().length < 2 || docCategory.trim().length < 2 || !isUrl(docUrl)}
              onClick={async () => {
                try {
                  await createUserDocument({
                    companyId: user.companyId!,
                    userId: user.id,
                    category: docCategory.trim(),
                    title: docTitle,
                    url: docUrl,
                  });
                  await qc.invalidateQueries({ queryKey: ["user-documents", user.companyId, user.id] });
                  toast({ title: "Documento adicionado" });
                  setAddDocOpen(false);
                } catch (e) {
                  toast({
                    title: "Não foi possível adicionar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}