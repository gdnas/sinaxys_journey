import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  ExternalLink,
  FileText,
  ImagePlus,
  KeyRound,
  LayoutDashboard,
  ReceiptText,
  Save,
  ShieldCheck,
  Trash2,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { brl, brlPerHourFromMonthly } from "@/lib/costs";
import { mockDb } from "@/lib/mockDb";
import { roleLabel } from "@/lib/sinaxys";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function formatDateUtc(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function isHttpUrl(s: string) {
  return /^https?:\/\//i.test(s.trim());
}

export default function Profile() {
  const { toast } = useToast();
  const { user, refresh } = useAuth();
  const navigate = useNavigate();

  const fileRef = useRef<HTMLInputElement | null>(null);
  const invoiceFileRef = useRef<HTMLInputElement | null>(null);
  const contractFileRef = useRef<HTMLInputElement | null>(null);

  const [version, setVersion] = useState(0);

  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [contractUrl, setContractUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [invoiceTitle, setInvoiceTitle] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState<string>("");
  const [invoiceIssuedDate, setInvoiceIssuedDate] = useState<string>("");
  const [savingInvoice, setSavingInvoice] = useState(false);

  const [contractTitle, setContractTitle] = useState("");
  const [contractAttachmentMode, setContractAttachmentMode] = useState<"FILE" | "LINK">("FILE");
  const [contractFileDataUrl, setContractFileDataUrl] = useState("");
  const [contractLinkUrl, setContractLinkUrl] = useState("");
  const [savingContract, setSavingContract] = useState(false);

  const [vacationStartDate, setVacationStartDate] = useState<string>("");
  const [savingVacation, setSavingVacation] = useState(false);

  const canEditContracts = user?.role === "ADMIN";

  const dirty =
    !!user &&
    (name.trim() !== user.name.trim() ||
      (avatarUrl.trim() || "") !== (user.avatarUrl ?? "") ||
      (canEditContracts ? (contractUrl.trim() || "") !== (user.contractUrl ?? "") : false) ||
      (phone.trim() || "") !== (user.phone ?? ""));

  const contractUrlDirty = !!user && canEditContracts && (contractUrl.trim() || "") !== (user.contractUrl ?? "");

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setAvatarUrl(user.avatarUrl ?? "");
    setContractUrl(user.contractUrl ?? "");
    setPhone(user.phone ?? "");
  }, [user?.id]);

  const company = useMemo(() => {
    if (!user?.companyId) return null;
    return mockDb.getCompany(user.companyId);
  }, [user?.companyId, version]);

  const department = useMemo(() => {
    if (!user?.companyId || !user.departmentId) return null;
    const db = mockDb.get();
    return db.departments.find((d) => d.id === user.departmentId && d.companyId === user.companyId) ?? null;
  }, [user?.companyId, user?.departmentId, version]);

  const leader = useMemo(() => {
    if (!user?.managerId) return null;
    const db = mockDb.get();
    return db.users.find((u) => u.id === user.managerId && u.active) ?? null;
  }, [user?.id, user?.managerId, version]);

  const assignments = useMemo(() => {
    if (!user) return [];
    return mockDb.getAssignmentsForUser(user.id);
  }, [user?.id, version]);

  const points = useMemo(() => {
    if (!user) return null;
    return mockDb.getUserXpBreakdown(user.id);
  }, [user?.id, version]);

  const invoices = useMemo(() => {
    if (!user) return [];
    return mockDb.getInvoicesForUser(user.id);
  }, [user?.id, version]);

  const notifications = useMemo(() => {
    if (!user) return [];
    return mockDb.getNotificationsForUser(user.id);
  }, [user?.id, version]);

  const unreadCount = useMemo(() => {
    if (!user) return 0;
    return mockDb.getUnreadNotificationsCount(user.id);
  }, [user?.id, version]);

  const contractAttachments = useMemo(() => {
    if (!user) return [];
    return mockDb.getContractAttachmentsForUser(user.id);
  }, [user?.id, version]);

  const compensationHistory = useMemo(() => {
    if (!user) return [];
    return mockDb.getCompensationHistoryForUser(user.id);
  }, [user?.id, version]);

  const vacationRequests = useMemo(() => {
    if (!user) return [];
    return mockDb.getVacationRequestsForUser(user.id);
  }, [user?.id, version]);

  const totalXp = points?.totalXp ?? 0;

  const completedTracks = assignments.filter((a) => a.assignment.status === "COMPLETED").length;
  const completedTrackTitles = assignments
    .filter((a) => a.assignment.status === "COMPLETED")
    .map((a) => a.track.title)
    .slice()
    .sort((a, b) => a.localeCompare(b));

  const canUseFinance = user?.role !== "MASTERADMIN" && !!user?.companyId;

  const vacationInfo = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const used = vacationRequests.filter((r) => new Date(r.startDate).getUTCFullYear() === year && r.status !== "REJECTED").length;
    const remainingPeriods = Math.max(0, 2 - used);
    return { year, used, remainingPeriods };
  }, [vacationRequests]);

  if (!user) return null;

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Minha área</div>
            <div className="mt-1 text-xl font-semibold text-[color:var(--sinaxys-ink)]">{user.name}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {roleLabel(user.role)} • {user.email}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {company ? (
                <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                  {company.name}
                </Badge>
              ) : null}
              {department ? (
                <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                  {department.name}
                </Badge>
              ) : null}
              {user.joinedAt ? (
                <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] border border-[color:var(--sinaxys-border)] hover:bg-white">
                  Entrada: {formatDate(user.joinedAt)}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {user.role === "COLABORADOR" ? (
              <Button asChild variant="outline" className="rounded-xl">
                <Link to="/app">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Minha jornada
                </Link>
              </Button>
            ) : user.role === "HEAD" ? (
              <Button asChild variant="outline" className="rounded-xl">
                <Link to="/head">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Painel do departamento
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main sections */}
      <Tabs defaultValue="perfil" className="w-full">
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-full justify-start gap-1 rounded-2xl bg-[color:var(--sinaxys-tint)] p-1 overflow-x-auto">
            <TabsTrigger value="perfil" className="rounded-xl whitespace-nowrap">
              <UserRound className="mr-2 h-4 w-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="progresso" className="rounded-xl whitespace-nowrap">
              <TrendingUp className="mr-2 h-4 w-4" />
              Progresso
            </TabsTrigger>
            <TabsTrigger value="documentos" className="rounded-xl whitespace-nowrap">
              <FileText className="mr-2 h-4 w-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="gestao" className="rounded-xl whitespace-nowrap">
              <CalendarDays className="mr-2 h-4 w-4" />
              Gestão
            </TabsTrigger>
            <TabsTrigger value="seguranca" className="rounded-xl whitespace-nowrap">
              <KeyRound className="mr-2 h-4 w-4" />
              Segurança
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Perfil */}
        <TabsContent value="perfil" className="mt-6">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Perfil</div>
            <p className="mt-1 text-sm text-muted-foreground">Atualize sua foto e mantenha seus dados em dia.</p>

            <div className="mt-5 grid gap-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar className="h-16 w-16 ring-2 ring-[color:var(--sinaxys-border)]">
                  <AvatarImage src={avatarUrl || undefined} alt={user.name} />
                  <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-wrap gap-2">
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
                        toast({
                          title: "Foto carregada",
                          description: "Agora é só salvar o perfil.",
                        });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />

                  <Button variant="outline" className="rounded-xl" onClick={() => fileRef.current?.click()}>
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Enviar foto
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
              </div>

              <div className="grid gap-2">
                <Label>Celular</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-xl"
                  placeholder="Ex.: +55 11 98888-1111"
                />
              </div>

              <div className="grid gap-2">
                <Label>Foto (URL opcional)</Label>
                <Input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="rounded-xl"
                  placeholder="https://..."
                />
                <div className="text-xs text-muted-foreground">Você pode colar um link de imagem ou enviar uma foto acima.</div>
              </div>

              <div className="grid gap-2">
                <Label>Contrato principal (Clicksign)</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={contractUrl}
                    onChange={(e) => setContractUrl(e.target.value)}
                    className="rounded-xl"
                    placeholder="https://app.clicksign.com/..."
                    disabled={!canEditContracts}
                  />
                  <Button asChild variant="outline" className="rounded-xl" disabled={!isHttpUrl(contractUrl)}>
                    <a href={contractUrl || "#"} target="_blank" rel="noreferrer">
                      <FileText className="mr-2 h-4 w-4" />
                      Abrir
                    </a>
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  {canEditContracts
                    ? "Para versões/aditivos, use a aba \"Documentos\"."
                    : "Somente o admin pode alterar o contrato. Você pode apenas visualizar."}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">As mudanças são aplicadas no seu perfil imediatamente.</div>
                <Button
                  className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  disabled={saving || !dirty || name.trim().length < 3}
                  onClick={() => {
                    try {
                      setSaving(true);
                      const updated = mockDb.updateUserProfile(user.id, {
                        name,
                        avatarUrl,
                        contractUrl: canEditContracts ? contractUrl : undefined,
                        phone,
                      });
                      if (!updated) {
                        toast({
                          title: "Não foi possível salvar",
                          description: "Tente novamente.",
                          variant: "destructive",
                        });
                        return;
                      }
                      refresh?.();
                      setVersion((v) => v + 1);
                      toast({
                        title: "Perfil atualizado",
                        description: "Dados salvos com sucesso.",
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
          </Card>
        </TabsContent>

        {/* Progresso */}
        <TabsContent value="progresso" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="grid gap-6">
              <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Avanços</div>
                <p className="mt-1 text-sm text-muted-foreground">Uma visão clara do seu progresso (por trilha).</p>

                <div className="mt-4">
                  <Tabs defaultValue="tracks" className="w-full">
                    <TabsList className="w-full justify-start rounded-2xl bg-[color:var(--sinaxys-tint)] p-1">
                      <TabsTrigger value="tracks" className="rounded-xl">
                        Trilhas
                      </TabsTrigger>
                      <TabsTrigger value="stats" className="rounded-xl">
                        Resumo
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="tracks" className="mt-4">
                      <div className="grid gap-3">
                        {assignments.length ? (
                          assignments.map((a) => {
                            const done = a.assignment.status === "COMPLETED";
                            return (
                              <div key={a.assignment.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                                        {a.track.title}
                                      </div>
                                      {done ? (
                                        <Badge className="rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                                          Concluída
                                        </Badge>
                                      ) : (
                                        <Badge className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100">
                                          Em andamento
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      {a.completedModules} de {a.totalModules} módulos
                                      {done && a.assignment.completedAt
                                        ? ` • Concluída em ${formatDate(a.assignment.completedAt)}`
                                        : ""}
                                    </div>
                                  </div>
                                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{a.progressPct}%</div>
                                </div>
                                <div className="mt-3">
                                  <Progress value={a.progressPct} className="h-2 rounded-full bg-[color:var(--sinaxys-tint)]" />
                                </div>

                                {user.role === "COLABORADOR" ? (
                                  <div className="mt-4">
                                    <Button
                                      asChild
                                      className="w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 sm:w-auto"
                                    >
                                      <Link to={`/app/tracks/${a.assignment.id}`}>Abrir</Link>
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                            Nenhuma trilha atribuída para você ainda.
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="stats" className="mt-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sinaxys Points</div>
                          <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{totalXp}</div>
                          <div className="mt-1 text-xs text-muted-foreground">Trilhas + tempo de casa + eventos.</div>
                        </div>
                        <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trilhas</div>
                          <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{assignments.length}</div>
                        </div>
                        <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Concluídas</div>
                          <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{completedTracks}</div>
                        </div>
                      </div>

                      {completedTrackTitles.length ? (
                        <>
                          <Separator className="my-4" />
                          <div>
                            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Trilhas concluídas</div>
                            <ul className="mt-2 grid gap-2">
                              {completedTrackTitles.map((t) => (
                                <li
                                  key={t}
                                  className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3 text-sm text-[color:var(--sinaxys-ink)]"
                                >
                                  {t}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </>
                      ) : null}
                    </TabsContent>
                  </Tabs>
                </div>
              </Card>
            </div>

            <div className="grid gap-6">
              <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Notificações</div>
                    <p className="mt-1 text-sm text-muted-foreground">Atualizações importantes para você.</p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                    <Bell className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                    {unreadCount} não lidas
                  </Badge>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={!unreadCount}
                    onClick={() => {
                      mockDb.markAllNotificationsRead(user.id);
                      setVersion((v) => v + 1);
                    }}
                  >
                    Marcar todas como lidas
                  </Button>
                </div>

                <div className="mt-4 grid gap-3">
                  {notifications.length ? (
                    notifications.slice(0, 8).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        className={
                          "w-full rounded-2xl border border-[color:var(--sinaxys-border)] p-4 text-left transition hover:bg-[color:var(--sinaxys-tint)]/40"
                        }
                        onClick={() => {
                          mockDb.markNotificationRead(user.id, n.id);
                          setVersion((v) => v + 1);
                          if (n.href) navigate(n.href);
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{n.title}</div>
                              {!n.readAt ? (
                                <Badge className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100">Novo</Badge>
                              ) : null}
                            </div>
                            {n.message ? <div className="mt-1 text-sm text-muted-foreground">{n.message}</div> : null}
                            <div className="mt-2 text-xs text-muted-foreground">{formatDate(n.createdAt)}</div>
                          </div>
                          {n.href ? (
                            <div className="mt-1 flex shrink-0 items-center text-xs font-medium text-[color:var(--sinaxys-primary)]">
                              Ver
                            </div>
                          ) : null}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                      Nenhuma notificação por enquanto.
                    </div>
                  )}
                </div>
              </Card>

              {user.role === "COLABORADOR" ? (
                <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Seu líder direto</div>
                  <p className="mt-1 text-sm text-muted-foreground">Para alinhamentos e desbloqueios, aqui está o seu ponto focal.</p>

                  <div className="mt-4">
                    {leader ? (
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10 ring-2 ring-[color:var(--sinaxys-border)]">
                            <AvatarImage src={leader.avatarUrl} alt={leader.name} />
                            <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                              {initials(leader.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{leader.name}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {roleLabel(leader.role)} • {leader.email}
                            </div>
                          </div>
                        </div>

                        <Button asChild variant="outline" className="rounded-xl">
                          <Link to={`/people/${leader.id}`}>
                            <UserRound className="mr-2 h-4 w-4" />
                            Ver perfil
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                        Nenhum líder definido ainda.
                      </div>
                    )}
                  </div>
                </Card>
              ) : null}
            </div>
          </div>
        </TabsContent>

        {/* Documentos */}
        <TabsContent value="documentos" className="mt-6">
          <div className="grid gap-6">
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Contrato principal (Clicksign)</div>
                  <p className="mt-1 text-sm text-muted-foreground">Cole o link do documento assinado para acesso rápido.</p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                  <FileText className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={contractUrl}
                    onChange={(e) => setContractUrl(e.target.value)}
                    className="h-11 rounded-xl"
                    placeholder="https://app.clicksign.com/..."
                    disabled={!canEditContracts}
                  />
                  <Button asChild variant="outline" className="h-11 rounded-xl" disabled={!isHttpUrl(contractUrl)}>
                    <a href={contractUrl || "#"} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Abrir
                    </a>
                  </Button>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-muted-foreground">
                    {canEditContracts
                      ? "Esse campo é separado dos aditivos/versões abaixo."
                      : "Somente o admin pode alterar o contrato principal."}
                  </div>
                  {canEditContracts ? (
                    <Button
                      className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                      disabled={saving || !contractUrlDirty}
                      onClick={() => {
                        try {
                          setSaving(true);
                          const updated = mockDb.updateUserProfile(user.id, {
                            contractUrl,
                          });
                          if (!updated) {
                            toast({
                              title: "Não foi possível salvar",
                              description: "Tente novamente.",
                              variant: "destructive",
                            });
                            return;
                          }
                          refresh?.();
                          setVersion((v) => v + 1);
                          toast({
                            title: "Contrato principal atualizado",
                            description: "Link salvo com sucesso.",
                          });
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Salvando…" : "Salvar"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Contratos & aditivos</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Salve versões/aditivos como arquivo (PDF) ou apenas o link (ex.: Clicksign).
                    </p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                    <FileText className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {canEditContracts ? (
                    <>
                      <div className="grid gap-2">
                        <Label>Título</Label>
                        <Input
                          className="h-11 rounded-xl"
                          value={contractTitle}
                          onChange={(e) => setContractTitle(e.target.value)}
                          placeholder="Ex.: Aditivo 01 — Ajuste de escopo"
                        />
                      </div>

                      <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-2">
                        <Tabs
                          value={contractAttachmentMode}
                          onValueChange={(v) => setContractAttachmentMode(v as "FILE" | "LINK")}
                        >
                          <TabsList className="w-full justify-start rounded-xl bg-white p-1">
                            <TabsTrigger value="FILE" className="rounded-lg">
                              Arquivo
                            </TabsTrigger>
                            <TabsTrigger value="LINK" className="rounded-lg">
                              Link
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="FILE" className="mt-3">
                            <input
                              ref={contractFileRef}
                              type="file"
                              accept="application/pdf,image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = () => {
                                  const dataUrl = String(reader.result ?? "");
                                  setContractFileDataUrl(dataUrl);
                                  setContractTitle((t) => (t.trim() ? t : file.name));
                                  toast({ title: "Arquivo anexado", description: "Agora é só enviar." });
                                };
                                reader.readAsDataURL(file);
                              }}
                            />

                            <div className="grid gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full rounded-xl"
                                onClick={() => contractFileRef.current?.click()}
                              >
                                Selecionar arquivo
                              </Button>

                              {contractFileDataUrl.startsWith("data:") ? (
                                <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-medium text-[color:var(--sinaxys-ink)]">
                                      Arquivo pronto para envio
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">Fica armazenado no navegador.</div>
                                  </div>
                                  <Button asChild variant="outline" className="rounded-xl" size="sm">
                                    <a href={contractFileDataUrl} target="_blank" rel="noreferrer">
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      Abrir
                                    </a>
                                  </Button>
                                </div>
                              ) : (
                                <div className="rounded-2xl bg-white/70 p-3 text-sm text-muted-foreground">
                                  Nenhum arquivo selecionado.
                                </div>
                              )}
                            </div>
                          </TabsContent>

                          <TabsContent value="LINK" className="mt-3">
                            <div className="grid gap-2">
                              <Label>Link do documento</Label>
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <Input
                                  className="h-11 rounded-xl"
                                  value={contractLinkUrl}
                                  onChange={(e) => setContractLinkUrl(e.target.value)}
                                  placeholder="https://app.clicksign.com/..."
                                />
                                <Button
                                  asChild
                                  variant="outline"
                                  className="rounded-xl"
                                  disabled={!isHttpUrl(contractLinkUrl)}
                                >
                                  <a href={contractLinkUrl || "#"} target="_blank" rel="noreferrer">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Abrir
                                  </a>
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Dica: cole o link do Clicksign (ou de onde o documento estiver hospedado).
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>

                      <Button
                        className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                        disabled={
                          savingContract ||
                          (contractAttachmentMode === "FILE"
                            ? !contractFileDataUrl.startsWith("data:")
                            : !isHttpUrl(contractLinkUrl))
                        }
                        onClick={() => {
                          try {
                            setSavingContract(true);
                            const url =
                              contractAttachmentMode === "FILE" ? contractFileDataUrl.trim() : contractLinkUrl.trim();

                            mockDb.addContractAttachment({
                              userId: user.id,
                              title: contractTitle.trim() || "Contrato",
                              url,
                              kind: contractAttachmentMode,
                            });

                            setContractTitle("");
                            setContractFileDataUrl("");
                            setContractLinkUrl("");
                            if (contractFileRef.current) contractFileRef.current.value = "";

                            setVersion((v) => v + 1);
                            toast({
                              title: "Documento salvo",
                              description:
                                contractAttachmentMode === "FILE" ? "Arquivo enviado." : "Link registrado.",
                            });
                          } catch (e) {
                            toast({
                              title: "Não foi possível salvar",
                              description: e instanceof Error ? e.message : "Tente novamente.",
                              variant: "destructive",
                            });
                          } finally {
                            setSavingContract(false);
                          }
                        }}
                      >
                        Enviar
                      </Button>
                    </>
                  ) : (
                    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                      Somente o admin pode adicionar ou remover aditivos. Abaixo você pode visualizar o que já foi cadastrado.
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Meus itens</div>
                    <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                      {contractAttachments.length}
                    </Badge>
                  </div>

                  <div className="grid gap-2">
                    {contractAttachments.length ? (
                      contractAttachments.map((c) => {
                        const href = (c.url ?? c.fileDataUrl ?? "").trim();
                        const kind = c.kind ?? (href.startsWith("data:") ? "FILE" : "LINK");
                        return (
                          <div key={c.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{c.title}</div>
                                  <Badge
                                    className={
                                      kind === "LINK"
                                        ? "rounded-full bg-blue-100 text-blue-900 hover:bg-blue-100"
                                        : "rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100"
                                    }
                                  >
                                    {kind === "LINK" ? "Link" : "Arquivo"}
                                  </Badge>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">Salvo em {formatDate(c.createdAt)}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl" disabled={!href}>
                                  <a href={href || "#"} target="_blank" rel="noreferrer" aria-label="Abrir">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                                {canEditContracts ? (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 rounded-xl"
                                    aria-label="Remover"
                                    onClick={() => {
                                      mockDb.deleteContractAttachment({ userId: user.id, contractAttachmentId: c.id });
                                      setVersion((v) => v + 1);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                        Você ainda não salvou nenhum aditivo.
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {canUseFinance ? (
                <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Notas fiscais</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Envie suas NFs (PDF ou imagem) para mantermos o controle financeiro.
                      </p>
                    </div>
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                      <ReceiptText className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4">
                    <div className="grid gap-2">
                      <Label>Título</Label>
                      <Input
                        className="h-11 rounded-xl"
                        value={invoiceTitle}
                        onChange={(e) => setInvoiceTitle(e.target.value)}
                        placeholder="Ex.: NF Janeiro/2026"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Arquivo da nota fiscal</Label>

                      <input
                        ref={invoiceFileRef}
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          const reader = new FileReader();
                          reader.onload = () => {
                            const dataUrl = String(reader.result ?? "");
                            setInvoiceUrl(dataUrl);
                            setInvoiceTitle((t) => (t.trim() ? t : file.name));
                            toast({
                              title: "Arquivo anexado",
                              description: "Agora é só registrar a nota.",
                            });
                          };
                          reader.readAsDataURL(file);
                        }}
                      />

                      <Button type="button" variant="outline" className="w-full rounded-xl" onClick={() => invoiceFileRef.current?.click()}>
                        Selecionar arquivo
                      </Button>

                      {invoiceUrl.startsWith("data:") ? (
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-[color:var(--sinaxys-ink)]">Arquivo pronto para envio</div>
                            <div className="mt-1 text-xs text-muted-foreground">O arquivo ficará armazenado no navegador.</div>
                          </div>
                          <Button asChild variant="outline" className="rounded-xl" size="sm">
                            <a href={invoiceUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Abrir
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhum arquivo selecionado.</div>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label>Valor (opcional)</Label>
                      <Input
                        className="h-11 rounded-xl"
                        value={invoiceAmount}
                        onChange={(e) => setInvoiceAmount(e.target.value)}
                        placeholder="Ex.: 3500"
                        inputMode="decimal"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Data de emissão (opcional)</Label>
                      <Input
                        className="h-11 rounded-xl"
                        type="date"
                        value={invoiceIssuedDate}
                        onChange={(e) => setInvoiceIssuedDate(e.target.value)}
                      />
                    </div>

                    <Button
                      className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                      disabled={savingInvoice || !invoiceUrl.startsWith("data:")}
                      onClick={() => {
                        try {
                          setSavingInvoice(true);
                          const amount = invoiceAmount.trim() ? Number(invoiceAmount.replace(",", ".")) : undefined;
                          const issuedAt = invoiceIssuedDate ? new Date(invoiceIssuedDate).toISOString() : undefined;
                          mockDb.createInvoice({
                            userId: user.id,
                            title: invoiceTitle.trim() || "Nota fiscal",
                            invoiceUrl: invoiceUrl.trim(),
                            amountBRL: typeof amount === "number" && Number.isFinite(amount) ? amount : undefined,
                            issuedAt,
                          });

                          setInvoiceTitle("");
                          setInvoiceUrl("");
                          setInvoiceAmount("");
                          setInvoiceIssuedDate("");
                          if (invoiceFileRef.current) invoiceFileRef.current.value = "";

                          setVersion((v) => v + 1);
                          toast({ title: "Nota registrada" });
                        } catch (e) {
                          toast({
                            title: "Não foi possível registrar",
                            description: e instanceof Error ? e.message : "Tente novamente.",
                            variant: "destructive",
                          });
                        } finally {
                          setSavingInvoice(false);
                        }
                      }}
                    >
                      Registrar nota
                    </Button>

                    <Separator />

                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Minhas notas enviadas</div>
                        <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                          {invoices.length}
                        </Badge>
                      </div>

                      <div className="mt-3 grid gap-3">
                        {invoices.length ? (
                          invoices.map((inv) => (
                            <div key={inv.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{inv.title}</div>
                                    {inv.status === "PAID" ? (
                                      <Badge className="rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Pago</Badge>
                                    ) : (
                                      <Badge className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100">Pendente</Badge>
                                    )}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    Criada em {formatDate(inv.createdAt)}
                                    {inv.issuedAt ? ` • Emitida em ${formatDate(inv.issuedAt)}` : ""}
                                    {typeof inv.amountBRL === "number" ? ` • ${brl(inv.amountBRL)}` : ""}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl">
                                    <a href={inv.invoiceUrl} target="_blank" rel="noreferrer" aria-label="Abrir nota">
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </Button>

                                  {inv.status !== "PAID" ? (
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-9 w-9 rounded-xl"
                                      aria-label="Remover nota"
                                      onClick={() => {
                                        try {
                                          mockDb.deleteInvoice(inv.id, user.id);
                                          setVersion((v) => v + 1);
                                          toast({ title: "Nota removida" });
                                        } catch (e) {
                                          toast({
                                            title: "Não foi possível remover",
                                            description: e instanceof Error ? e.message : "Tente novamente.",
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                            Você ainda não enviou nenhuma nota fiscal.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Notas fiscais</div>
                  <p className="mt-1 text-sm text-muted-foreground">Disponível para usuários com empresa (não master).</p>
                  <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                    Se você precisa enviar NFs, fale com um admin para ajustar seu acesso.
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Gestão */}
        <TabsContent value="gestao" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Férias remuneradas</div>
                  <p className="mt-1 text-sm text-muted-foreground">20 dias/ano em 2 períodos de 10 dias.</p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                  <CalendarDays className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                  Ano {vacationInfo.year}: {vacationInfo.used}/2 períodos usados • restantes: {vacationInfo.remainingPeriods}
                </div>

                <div className="grid gap-2">
                  <Label>Data de início (10 dias)</Label>
                  <Input
                    type="date"
                    className="h-11 rounded-xl"
                    value={vacationStartDate}
                    onChange={(e) => setVacationStartDate(e.target.value)}
                  />
                </div>

                <Button
                  className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  disabled={
                    savingVacation ||
                    !vacationStartDate ||
                    vacationInfo.remainingPeriods <= 0 ||
                    user.role === "MASTERADMIN" ||
                    !user.companyId
                  }
                  onClick={() => {
                    try {
                      setSavingVacation(true);
                      mockDb.requestPaidVacation({ userId: user.id, startDate: vacationStartDate });
                      setVacationStartDate("");
                      setVersion((v) => v + 1);
                      toast({
                        title: "Pedido enviado",
                        description: "Seu gestor recebeu uma notificação.",
                      });
                    } catch (e) {
                      toast({
                        title: "Não foi possível solicitar",
                        description: e instanceof Error ? e.message : "Tente novamente.",
                        variant: "destructive",
                      });
                    } finally {
                      setSavingVacation(false);
                    }
                  }}
                >
                  Solicitar férias
                </Button>

                <Separator />

                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Meus pedidos</div>
                <div className="grid gap-2">
                  {vacationRequests.length ? (
                    vacationRequests.map((r) => (
                      <div key={r.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                              {formatDateUtc(r.startDate)} • {r.days} dias
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">Solicitado em {formatDate(r.createdAt)}</div>
                          </div>
                          <Badge
                            className={
                              r.status === "APPROVED"
                                ? "rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100"
                                : r.status === "REJECTED"
                                  ? "rounded-full bg-rose-100 text-rose-900 hover:bg-rose-100"
                                  : "rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100"
                            }
                          >
                            {r.status === "APPROVED" ? "Aprovado" : r.status === "REJECTED" ? "Recusado" : "Pendente"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                      Você ainda não solicitou férias.
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {canUseFinance ? (
              <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Minha remuneração</div>
                    <p className="mt-1 text-sm text-muted-foreground">Valor atual e histórico.</p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                    <Wallet className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  <div className="text-xs text-muted-foreground">Valor mensal atual</div>
                  <div className="text-2xl font-semibold text-[color:var(--sinaxys-ink)]">
                    {typeof user.monthlyCostBRL === "number" ? brl(user.monthlyCostBRL) : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">Referência por hora</div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                    {typeof user.monthlyCostBRL === "number" ? brlPerHourFromMonthly(user.monthlyCostBRL) : "—"}
                  </div>

                  {typeof user.monthlyCostBRL !== "number" ? (
                    <div className="mt-2 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                      Ainda não existe um valor cadastrado para você. Fale com o admin da empresa.
                    </div>
                  ) : null}

                  <Separator className="my-2" />

                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Histórico</div>
                  <div className="grid gap-2">
                    {compensationHistory.length ? (
                      compensationHistory.slice(0, 8).map((e) => (
                        <div key={e.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{brl(e.monthlyCostBRL)}</div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                Vigência: {formatDate(e.effectiveAt)}
                                {e.note ? ` • ${e.note}` : ""}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                        Sem histórico registrado ainda.
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Minha remuneração</div>
                <p className="mt-1 text-sm text-muted-foreground">Disponível para usuários com empresa (não master).</p>
                <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                  Se você precisa acessar essa área, fale com um admin.
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Segurança */}
        <TabsContent value="seguranca" className="mt-6">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Segurança</div>
                <p className="mt-1 text-sm text-muted-foreground">Altere sua senha de acesso.</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                <KeyRound className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              {user.password ? (
                <div className="grid gap-2">
                  <Label>Senha atual</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="rounded-xl"
                    placeholder="Digite sua senha atual"
                  />
                </div>
              ) : (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                  Você ainda não tem uma senha definida. Defina uma agora para usar no próximo login.
                </div>
              )}

              <div className="grid gap-2">
                <Label>Nova senha</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="rounded-xl"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div className="grid gap-2">
                <Label>Confirmar nova senha</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="rounded-xl" />
              </div>

              <Button
                className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                disabled={
                  savingPassword ||
                  (user.password ? !currentPassword.trim() : false) ||
                  newPassword.trim().length < 6 ||
                  newPassword !== confirmPassword
                }
                onClick={() => {
                  try {
                    setSavingPassword(true);

                    if (user.password && currentPassword.trim() !== user.password) {
                      toast({
                        title: "Senha atual incorreta",
                        description: "Verifique a senha digitada e tente novamente.",
                        variant: "destructive",
                      });
                      return;
                    }

                    const p = newPassword.trim();
                    if (p.length < 6) {
                      toast({
                        title: "Senha fraca",
                        description: "Use pelo menos 6 caracteres.",
                        variant: "destructive",
                      });
                      return;
                    }

                    if (p !== confirmPassword) {
                      toast({
                        title: "As senhas não conferem",
                        description: "Digite a mesma senha nos dois campos.",
                        variant: "destructive",
                      });
                      return;
                    }

                    mockDb.setUserPassword(user.id, p, { mustChangePassword: false });
                    refresh?.();
                    setVersion((v) => v + 1);

                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");

                    toast({
                      title: "Senha atualizada",
                      description: "Na próxima vez que você fizer login, use a nova senha.",
                    });
                  } catch (e) {
                    toast({
                      title: "Não foi possível atualizar",
                      description: e instanceof Error ? e.message : "Tente novamente.",
                      variant: "destructive",
                    });
                  } finally {
                    setSavingPassword(false);
                  }
                }}
              >
                {user.password ? "Alterar senha" : "Definir senha"}
              </Button>

              {newPassword && confirmPassword && newPassword !== confirmPassword ? (
                <div className="text-xs text-red-600">As senhas não coincidem.</div>
              ) : null}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}