import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Target, Wand2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { listDepartments } from "@/lib/departmentsDb";
import { listProfilesByCompany } from "@/lib/profilesDb";
import {
  createKeyResult,
  createOkrCycle,
  createOkrObjective,
  getCompanyFundamentals,
  listKeyResults,
  listOkrCycles,
  listOkrObjectives,
  type CycleStatus,
  type CycleType,
  type DbOkrObjective,
  type KrConfidence,
  type ObjectiveLevel,
} from "@/lib/okrDb";
import { OkrPageHeader } from "@/components/OkrPageHeader";

const SELECT_NONE = "__none__";

function cycleLabel(c: { type: CycleType; year: number; quarter: number | null; name: string | null }) {
  const base = c.type === "ANNUAL" ? `${c.year}` : `Q${c.quarter ?? "?"} / ${c.year}`;
  return c.name?.trim() ? `${c.name} · ${base}` : base;
}

function levelBadge(level: ObjectiveLevel) {
  const map: Record<ObjectiveLevel, { label: string; cls: string }> = {
    COMPANY: { label: "Empresa", cls: "bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)]" },
    DEPARTMENT: { label: "Departamento", cls: "bg-white text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]" },
    TEAM: { label: "Time", cls: "bg-white text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]" },
    INDIVIDUAL: { label: "Individual", cls: "bg-white text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]" },
  };
  const s = map[level];
  return <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>;
}

export default function OkrCycles() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useCompany();

  if (!user) return null;

  const cid = companyId ?? "";
  const hasCompany = !!companyId;

  const canEdit = user.role === "ADMIN" || user.role === "HEAD" || user.role === "MASTERADMIN";

  const { data: fundamentals } = useQuery({
    queryKey: ["okr-fundamentals", cid],
    enabled: hasCompany,
    queryFn: () => getCompanyFundamentals(cid),
  });

  const { data: cycles = [] } = useQuery({
    queryKey: ["okr-cycles", cid],
    enabled: hasCompany,
    queryFn: () => listOkrCycles(cid),
  });

  const defaultCycleId = cycles.find((c) => c.status === "ACTIVE" && c.type === "QUARTERLY")?.id ?? cycles[0]?.id ?? null;
  const [cycleId, setCycleId] = useState<string | null>(defaultCycleId);

  // When cycles load, fill the selection once.
  useEffect(() => {
    if (cycleId) return;
    if (!defaultCycleId) return;
    setCycleId(defaultCycleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCycleId]);

  const selected = cycles.find((c) => c.id === cycleId) ?? null;

  const { data: objectives = [] } = useQuery({
    queryKey: ["okr-objectives", cid, cycleId],
    enabled: hasCompany && !!cycleId,
    queryFn: () => listOkrObjectives(cid, String(cycleId)),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", cid],
    enabled: hasCompany,
    queryFn: () => listDepartments(cid),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", cid],
    enabled: hasCompany,
    queryFn: () => listProfilesByCompany(cid),
  });

  const byUserId = useMemo(() => {
    const m = new Map<string, { name: string; role: string }>();
    for (const p of profiles) m.set(p.id, { name: p.name ?? p.email, role: p.role });
    return m;
  }, [profiles]);

  const [cycleOpen, setCycleOpen] = useState(false);
  const [cycleType, setCycleType] = useState<CycleType>("QUARTERLY");
  const [cycleYear, setCycleYear] = useState(() => new Date().getFullYear());
  const [cycleQuarter, setCycleQuarter] = useState<1 | 2 | 3 | 4>(1);
  const [cycleStatus, setCycleStatus] = useState<CycleStatus>("ACTIVE");
  const [cycleName, setCycleName] = useState("");

  const resetCycle = () => {
    setCycleType("QUARTERLY");
    setCycleYear(new Date().getFullYear());
    setCycleQuarter(1);
    setCycleStatus("ACTIVE");
    setCycleName("");
  };

  const [objOpen, setObjOpen] = useState(false);
  const [objLevel, setObjLevel] = useState<ObjectiveLevel>("COMPANY");
  const [objTitle, setObjTitle] = useState("");
  const [objDesc, setObjDesc] = useState("");
  const [objReason, setObjReason] = useState("");
  const [objOwner, setObjOwner] = useState<string>(user.id);
  const [objDept, setObjDept] = useState<string | null>(user.departmentId ?? null);
  const [objParent, setObjParent] = useState<string | null>(null);
  const [objFund, setObjFund] = useState<DbOkrObjective["linked_fundamental"]>(null);
  const [objFundText, setObjFundText] = useState("");

  const resetObjective = () => {
    setObjLevel("COMPANY");
    setObjTitle("");
    setObjDesc("");
    setObjReason("");
    setObjOwner(user.id);
    setObjDept(user.departmentId ?? null);
    setObjParent(null);
    setObjFund(null);
    setObjFundText("");
  };

  const [krOpen, setKrOpen] = useState(false);
  const [krObjectiveId, setKrObjectiveId] = useState<string | null>(null);
  const [krTitle, setKrTitle] = useState("");
  const [krUnit, setKrUnit] = useState("");
  const [krStart, setKrStart] = useState<string>("");
  const [krTarget, setKrTarget] = useState<string>("");
  const [krCurrent, setKrCurrent] = useState<string>("");
  const [krConfidence, setKrConfidence] = useState<KrConfidence>("ON_TRACK");
  const [krOwner, setKrOwner] = useState<string | null>(null);

  const resetKr = () => {
    setKrObjectiveId(null);
    setKrTitle("");
    setKrUnit("");
    setKrStart("");
    setKrTarget("");
    setKrCurrent("");
    setKrConfidence("ON_TRACK");
    setKrOwner(null);
  };

  const { data: krCounts = new Map<string, number>() } = useQuery({
    queryKey: ["okr-kr-counts", cid, cycleId, objectives.map((o) => o.id).join(",")],
    enabled: hasCompany && !!cycleId && objectives.length > 0,
    queryFn: async () => {
      const m = new Map<string, number>();
      await Promise.all(
        objectives.map(async (o) => {
          const krs = await listKeyResults(o.id);
          m.set(o.id, krs.length);
        }),
      );
      return m;
    },
  });

  if (!hasCompany) {
    return (
      <div className="grid gap-6">
        <OkrPageHeader
          title="Ciclos & OKRs"
          subtitle="Carregando contexto da empresa…"
          icon={<Target className="h-5 w-5" />}
        />
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm text-muted-foreground">Aguardando identificação da empresa do seu usuário…</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <OkrPageHeader
        title="Ciclos & OKRs"
        subtitle="Crie o trimestre, registre objetivos estratégicos e desdobre até o dia a dia."
        icon={<Target className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="h-11 rounded-xl">
              <Link to="/okr/assistente">
                Assistente
                <Wand2 className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {canEdit ? (
              <Button
                className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                onClick={() => {
                  resetCycle();
                  setCycleOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo ciclo
              </Button>
            ) : null}
          </div>
        }
      />

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Selecionar ciclo</div>
            <p className="mt-1 text-sm text-muted-foreground">Você pode manter histórico de trimestres e anos.</p>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <Select value={cycleId ?? ""} onValueChange={(v) => setCycleId(v)}>
              <SelectTrigger className="h-11 w-full rounded-xl md:w-[340px]">
                <SelectValue placeholder="Escolha um ciclo" />
              </SelectTrigger>
              <SelectContent>
                {cycles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {cycleLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selected ? (
              <Badge className="h-11 justify-center rounded-xl bg-[color:var(--sinaxys-tint)] px-4 text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                {selected.status}
              </Badge>
            ) : null}
          </div>
        </div>

        {!selected ? (
          <div className="mt-5 rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Nenhum ciclo disponível.</div>
        ) : null}
      </Card>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Objetivos do ciclo</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Ao criar um objetivo, conecte explicitamente a qual parte do propósito/visão ele serve.
            </p>
          </div>

          {canEdit ? (
            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!selected}
              onClick={() => {
                resetObjective();
                setObjOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo objetivo
            </Button>
          ) : null}
        </div>

        <Separator className="my-5" />

        <div className="grid gap-3">
          {objectives.length ? (
            objectives.map((o) => {
              const owner = byUserId.get(o.owner_user_id)?.name ?? "—";
              const count = krCounts.get(o.id) ?? 0;
              return (
                <div
                  key={o.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {levelBadge(o.level)}
                      <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{o.title}</div>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Dono: {owner}</span>
                      <span>•</span>
                      <span>{count} KRs</span>
                      {o.linked_fundamental ? (
                        <>
                          <span>•</span>
                          <span>
                            Conectado a: <span className="font-medium text-[color:var(--sinaxys-ink)]">{o.linked_fundamental}</span>
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl"
                      onClick={() => {
                        resetKr();
                        setKrObjectiveId(o.id);
                        setKrOpen(true);
                      }}
                    >
                      + KR
                    </Button>
                    <Button
                      asChild
                      className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                    >
                      <Link to={`/okr/objetivos/${o.id}`}>
                        Abrir
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
              Nenhum objetivo criado neste ciclo.
            </div>
          )}
        </div>
      </Card>

      <Dialog
        open={cycleOpen}
        onOpenChange={(v) => {
          setCycleOpen(v);
          if (!v) resetCycle();
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo ciclo</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={cycleType} onValueChange={(v) => setCycleType(v as CycleType)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                  <SelectItem value="ANNUAL">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Ano</Label>
              <Input className="h-11 rounded-xl" type="number" value={cycleYear} onChange={(e) => setCycleYear(Number(e.target.value))} />
            </div>

            {cycleType === "QUARTERLY" ? (
              <div className="grid gap-2">
                <Label>Trimestre</Label>
                <Select value={String(cycleQuarter)} onValueChange={(v) => setCycleQuarter(Number(v) as any)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Q1</SelectItem>
                    <SelectItem value="2">Q2</SelectItem>
                    <SelectItem value="3">Q3</SelectItem>
                    <SelectItem value="4">Q4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={cycleStatus} onValueChange={(v) => setCycleStatus(v as CycleStatus)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNING">PLANNING</SelectItem>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="CLOSED">CLOSED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Nome (opcional)</Label>
              <Input className="h-11 rounded-xl" value={cycleName} onChange={(e) => setCycleName(e.target.value)} placeholder="Ex.: Sprint Estratégico" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setCycleOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              onClick={async () => {
                try {
                  const c = await createOkrCycle(cid, {
                    type: cycleType,
                    year: cycleYear,
                    quarter: cycleType === "QUARTERLY" ? cycleQuarter : null,
                    start_date: null,
                    end_date: null,
                    status: cycleStatus,
                    name: cycleName.trim() || null,
                  });
                  await qc.invalidateQueries({ queryKey: ["okr-cycles", cid] });
                  setCycleId(c.id);
                  toast({ title: "Ciclo criado" });
                  setCycleOpen(false);
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

      <Dialog
        open={objOpen}
        onOpenChange={(v) => {
          setObjOpen(v);
          if (!v) resetObjective();
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo objetivo do ciclo</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nível</Label>
              <Select value={objLevel} onValueChange={(v) => setObjLevel(v as ObjectiveLevel)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPANY">Empresa</SelectItem>
                  <SelectItem value="DEPARTMENT">Departamento</SelectItem>
                  <SelectItem value="TEAM">Time</SelectItem>
                  <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Título do objetivo</Label>
              <Input
                className="h-11 rounded-xl"
                value={objTitle}
                onChange={(e) => setObjTitle(e.target.value)}
                placeholder="Ex.: Aumentar retenção com onboarding impecável"
              />
              <div className="text-xs text-muted-foreground">
                Dica: um bom objetivo é claro e aspiracional (evite "melhorar" sem contexto).
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Descrição (opcional)</Label>
              <Textarea className="min-h-[92px] rounded-2xl" value={objDesc} onChange={(e) => setObjDesc(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Motivo estratégico (opcional)</Label>
              <Textarea className="min-h-[92px] rounded-2xl" value={objReason} onChange={(e) => setObjReason(e.target.value)} />
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Dono responsável</Label>
                <Select value={objOwner} onValueChange={(v) => setObjOwner(v)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {(p.name ?? p.email) + (p.role ? ` (${p.role})` : "")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Departamento (opcional)</Label>
                <Select
                  value={objDept ?? ""}
                  onValueChange={(v) => {
                    setObjDept(v === SELECT_NONE ? null : v);
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Sem departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>Sem departamento</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Conexão com estratégia (obrigatório)</Label>
              <Select value={objFund ?? ""} onValueChange={(v) => setObjFund((v || null) as any)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Esse objetivo está conectado a…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PURPOSE">Propósito</SelectItem>
                  <SelectItem value="VISION">Visão</SelectItem>
                  <SelectItem value="MISSION">Missão</SelectItem>
                  <SelectItem value="NORTH">Norte estratégico</SelectItem>
                  <SelectItem value="VALUES">Valores</SelectItem>
                  <SelectItem value="CULTURE">Cultura</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                className="min-h-[70px] rounded-2xl"
                value={objFundText}
                onChange={(e) => setObjFundText(e.target.value)}
                placeholder={
                  fundamentals?.purpose?.trim() && objFund === "PURPOSE"
                    ? `Ex.: ${fundamentals.purpose}`
                    : "Escreva a frase / trecho do fundamento que esse objetivo atende."
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Objetivo pai (cascata opcional)</Label>
              <Select
                value={objParent ?? ""}
                onValueChange={(v) => {
                  setObjParent(v === SELECT_NONE ? null : v);
                }}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Sem objetivo pai" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>Sem objetivo pai</SelectItem>
                  {objectives
                    .filter((o) => o.id !== objParent)
                    .map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setObjOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!selected || objTitle.trim().length < 6 || !objFund || objFundText.trim().length < 6}
              onClick={async () => {
                if (!selected) return;
                try {
                  await createOkrObjective({
                    company_id: cid,
                    cycle_id: selected.id,
                    parent_objective_id: objParent,
                    level: objLevel,
                    department_id: objDept,
                    owner_user_id: objOwner,
                    title: objTitle,
                    description: objDesc,
                    strategic_reason: objReason,
                    linked_fundamental: objFund,
                    linked_fundamental_text: objFundText,
                    due_at: null,
                  });

                  await qc.invalidateQueries({ queryKey: ["okr-objectives", cid, cycleId] });
                  toast({ title: "Objetivo criado" });
                  setObjOpen(false);
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

      <Dialog
        open={krOpen}
        onOpenChange={(v) => {
          setKrOpen(v);
          if (!v) resetKr();
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo Key Result</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>KR (mensurável)</Label>
              <Input
                className="h-11 rounded-xl"
                value={krTitle}
                onChange={(e) => setKrTitle(e.target.value)}
                placeholder="Ex.: Aumentar NPS de 52 para 65"
              />
              <div className="text-xs text-muted-foreground">Evite KR qualitativo: sempre que possível, coloque número, prazo e unidade.</div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Unidade (opcional)</Label>
                <Input className="h-11 rounded-xl" value={krUnit} onChange={(e) => setKrUnit(e.target.value)} placeholder="%, pts, R$…" />
              </div>
              <div className="grid gap-2">
                <Label>Confiança</Label>
                <Select value={krConfidence} onValueChange={(v) => setKrConfidence(v as KrConfidence)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ON_TRACK">ON_TRACK</SelectItem>
                    <SelectItem value="AT_RISK">AT_RISK</SelectItem>
                    <SelectItem value="OFF_TRACK">OFF_TRACK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Responsável (opcional)</Label>
              <Select
                value={krOwner ?? ""}
                onValueChange={(v) => {
                  setKrOwner(v === SELECT_NONE ? null : v);
                }}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Sem responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>Sem responsável</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name ?? p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Início (número)</Label>
                <Input className="h-11 rounded-xl" value={krStart} onChange={(e) => setKrStart(e.target.value)} placeholder="52" />
              </div>
              <div className="grid gap-2">
                <Label>Atual (número)</Label>
                <Input className="h-11 rounded-xl" value={krCurrent} onChange={(e) => setKrCurrent(e.target.value)} placeholder="56" />
              </div>
              <div className="grid gap-2">
                <Label>Meta (número)</Label>
                <Input className="h-11 rounded-xl" value={krTarget} onChange={(e) => setKrTarget(e.target.value)} placeholder="65" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setKrOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!krObjectiveId || krTitle.trim().length < 6}
              onClick={async () => {
                if (!krObjectiveId) return;
                try {
                  const parseOrNull = (v: string) => {
                    const n = Number(String(v).replace(",", "."));
                    return Number.isFinite(n) ? n : null;
                  };

                  await createKeyResult({
                    objective_id: krObjectiveId,
                    title: krTitle,
                    metric_unit: krUnit.trim() || null,
                    start_value: parseOrNull(krStart),
                    current_value: parseOrNull(krCurrent),
                    target_value: parseOrNull(krTarget),
                    owner_user_id: krOwner,
                    confidence: krConfidence,
                  });

                  await qc.invalidateQueries({ queryKey: ["okr-kr-counts", cid, cycleId] });
                  toast({ title: "KR criado" });
                  setKrOpen(false);
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
  );
}