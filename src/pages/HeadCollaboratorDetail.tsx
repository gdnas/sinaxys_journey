import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Save, Wallet } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";
import { brl, brlPerHourFromMonthly, HOURS_PER_MONTH } from "@/lib/costs";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

function statusLabel(s: string) {
  switch (s) {
    case "NOT_STARTED":
      return "Não iniciado";
    case "IN_PROGRESS":
      return "Em andamento";
    case "COMPLETED":
      return "Concluído";
    case "LOCKED":
      return "Travado";
    default:
      return s;
  }
}

export default function HeadCollaboratorDetail() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { userId } = useParams();

  const [version, force] = useState(0);
  const collaborator = useMemo(() => {
    if (!userId) return null;
    return mockDb.getUsers().find((u) => u.id === userId) ?? null;
  }, [userId, version]);

  const departmentName = useMemo(() => {
    if (!collaborator?.departmentId) return "—";
    const dept = mockDb.getDepartments().find((d) => d.id === collaborator.departmentId);
    return dept?.name ?? "—";
  }, [collaborator?.departmentId, version]);

  const canView =
    !!user &&
    user.role === "HEAD" &&
    !!collaborator &&
    collaborator.role === "COLABORADOR" &&
    collaborator.departmentId &&
    collaborator.departmentId === user.departmentId;

  const assignments = useMemo(() => {
    if (!collaborator) return [];
    return mockDb.getAssignmentsForUser(collaborator.id);
  }, [collaborator?.id, version]);

  const totalXp = useMemo(() => {
    if (!collaborator) return 0;
    const db = mockDb.get();
    const assignmentsForUser = db.assignments.filter((a) => a.userId === collaborator.id);
    let xp = 0;
    for (const a of assignmentsForUser) {
      const detail = mockDb.getAssignmentDetail(a.id);
      if (!detail) continue;
      xp += detail.modules
        .filter((m) => detail.progressByModuleId[m.id]?.status === "COMPLETED")
        .reduce((acc, m) => acc + m.xpReward, 0);
    }
    return xp;
  }, [collaborator?.id, version]);

  const [contractUrl, setContractUrl] = useState("");
  const [monthlyCost, setMonthlyCost] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!collaborator) return;
    setContractUrl(collaborator.contractUrl ?? "");
    setMonthlyCost(typeof collaborator.monthlyCostBRL === "number" ? String(collaborator.monthlyCostBRL) : "");
  }, [collaborator?.id]);

  const dirty =
    !!collaborator &&
    ((contractUrl.trim() || "") !== (collaborator.contractUrl ?? "") ||
      (monthlyCost.trim() || "") !==
        (typeof collaborator.monthlyCostBRL === "number" ? String(collaborator.monthlyCostBRL) : ""));

  if (!user || user.role !== "HEAD") return null;

  if (!collaborator) {
    return (
      <div className="grid gap-4">
        <div className="rounded-3xl border bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Colaborador não encontrado</div>
              <div className="mt-1 text-sm text-muted-foreground">Talvez ele tenha sido desativado ou removido.</div>
            </div>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/head">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="grid gap-4">
        <div className="rounded-3xl border bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Acesso restrito</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Você só pode ver colaboradores ativos do seu próprio departamento.
              </div>
            </div>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/head">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const monthly = collaborator.monthlyCostBRL ?? 0;

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 ring-2 ring-[color:var(--sinaxys-border)]">
              <AvatarImage src={collaborator.avatarUrl} alt={collaborator.name} />
              <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                {initials(collaborator.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate text-xl font-semibold text-[color:var(--sinaxys-ink)]">{collaborator.name}</div>
                <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                  {departmentName}
                </Badge>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{collaborator.email}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  XP acumulado: <span className="font-semibold text-[color:var(--sinaxys-ink)]">{totalXp}</span>
                </span>
                <span className="text-muted-foreground/60">•</span>
                <span>
                  Custo hora: <span className="font-semibold text-[color:var(--sinaxys-ink)]">{monthly ? brlPerHourFromMonthly(monthly) : "—"}</span>
                </span>
                <span className="text-muted-foreground/60">(base {HOURS_PER_MONTH}h/mês)</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/head">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Trilhas e evolução</div>
            <p className="mt-1 text-sm text-muted-foreground">Acompanhe progresso, módulo atual e sinais de atenção.</p>

            <div className="mt-4">
              <Tabs defaultValue="tracks" className="w-full">
                <TabsList className="w-full justify-start rounded-2xl bg-[color:var(--sinaxys-tint)] p-1">
                  <TabsTrigger value="tracks" className="rounded-xl">Trilhas</TabsTrigger>
                  <TabsTrigger value="stats" className="rounded-xl">Resumo</TabsTrigger>
                </TabsList>

                <TabsContent value="tracks" className="mt-4">
                  <div className="grid gap-3">
                    {assignments.length ? (
                      assignments.map((a) => {
                        const detail = mockDb.getAssignmentDetail(a.assignment.id);
                        const currentModule = detail?.modules.find((m) => detail.progressByModuleId[m.id]?.status === "AVAILABLE");
                        const currentProgress = currentModule ? detail?.progressByModuleId[currentModule.id] : undefined;
                        const needsAttention =
                          currentModule?.type === "QUIZ" &&
                          (currentProgress?.attemptsCount ?? 0) > 0 &&
                          currentProgress?.passed === false;

                        return (
                          <div
                            key={a.assignment.id}
                            className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{a.track.title}</div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {a.completedModules} de {a.totalModules} módulos • {a.progressPct}%
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  className={
                                    "rounded-full " +
                                    (a.assignment.status === "COMPLETED"
                                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                                      : a.assignment.status === "IN_PROGRESS"
                                        ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                                        : "bg-amber-100 text-amber-800 hover:bg-amber-100")
                                  }
                                >
                                  {statusLabel(a.assignment.status)}
                                </Badge>
                                {needsAttention ? (
                                  <Badge className="rounded-full bg-rose-100 text-rose-800 hover:bg-rose-100">
                                    Precisa de atenção
                                  </Badge>
                                ) : null}
                              </div>
                            </div>

                            <div className="mt-3">
                              <Progress value={a.progressPct} className="h-2 rounded-full bg-[color:var(--sinaxys-tint)]" />
                            </div>

                            {currentModule ? (
                              <div className="mt-3 text-xs text-muted-foreground">
                                Módulo atual: <span className="font-medium text-[color:var(--sinaxys-ink)]">{currentModule.title}</span>
                              </div>
                            ) : (
                              <div className="mt-3 text-xs text-muted-foreground">Nenhum módulo disponível no momento.</div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                        Nenhuma trilha atribuída para este colaborador.
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="stats" className="mt-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">XP</div>
                      <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{totalXp}</div>
                    </div>
                    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trilhas</div>
                      <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{assignments.length}</div>
                    </div>
                    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Concluídas</div>
                      <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">
                        {assignments.filter((x) => x.assignment.status === "COMPLETED").length}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Contrato</div>
                <p className="mt-1 text-sm text-muted-foreground">Link do documento assinado (ex.: Clicksign).</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                <FileText className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <Label>Link do contrato</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={contractUrl}
                  onChange={(e) => setContractUrl(e.target.value)}
                  className="rounded-xl"
                  placeholder="https://app.clicksign.com/..."
                />
                <Button asChild variant="outline" className="rounded-xl" disabled={!contractUrl.trim()}>
                  <a href={contractUrl || "#"} target="_blank" rel="noreferrer">
                    Abrir
                  </a>
                </Button>
              </div>
            </div>

            <Separator className="my-5" />

            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Custo mensal</div>
                <p className="mt-1 text-sm text-muted-foreground">Salário + encargos (base {HOURS_PER_MONTH}h/mês para custo/hora).</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                <Wallet className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <Label>Valor (BRL)</Label>
              <Input
                inputMode="numeric"
                value={monthlyCost}
                onChange={(e) => setMonthlyCost(e.target.value.replace(/[^0-9]/g, ""))}
                className="rounded-xl"
                placeholder="Ex.: 6500"
              />
              <div className="text-xs text-muted-foreground">
                {monthlyCost.trim()
                  ? `Prévia: ${brl(Number(monthlyCost))} • Hora: ${brlPerHourFromMonthly(Number(monthlyCost))}`
                  : "Sem custo definido"}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">As mudanças afetam o painel do departamento imediatamente.</div>
              <Button
                className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                disabled={saving || !dirty}
                onClick={() => {
                  try {
                    setSaving(true);

                    const updatedProfile = mockDb.updateUserProfile(collaborator.id, {
                      contractUrl,
                    });
                    const updatedComp = mockDb.updateUserCompensation(collaborator.id, {
                      monthlyCostBRL: monthlyCost.trim() ? Number(monthlyCost) : 0,
                    });

                    if (!updatedProfile || !updatedComp) {
                      toast({
                        title: "Não foi possível salvar",
                        description: "Tente novamente.",
                        variant: "destructive",
                      });
                      return;
                    }

                    toast({
                      title: "Dados atualizados",
                      description: "Contrato e custo mensal foram salvos.",
                    });
                    force((x) => x + 1);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}