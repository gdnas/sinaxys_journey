import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Sparkles, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { brl, brlPerHourFromMonthly } from "@/lib/costs";
import { laborCostFromMonthly, parsePtNumber, roiPct } from "@/lib/roi";
import {
  createDeliverable,
  createKeyResult,
  createOkrObjective,
  createTask,
  getCompanyFundamentals,
  listOkrCycles,
  listOkrObjectives,
  type DbOkrCycle,
  type DbOkrObjective,
  type DeliverableTier,
  type ObjectiveLevel,
} from "@/lib/okrDb";
import { OkrPageHeader } from "@/components/OkrPageHeader";

const SELECT_NONE = "__none__";

function looksLikeVerbPt(text: string) {
  const first = text.trim().split(/\s+/)[0]?.toLowerCase();
  if (!first) return false;
  // Heurística simples: infinitivo (aumentar / reduzir / construir / entregar / lançar / gerar / elevar...)
  return /(?:ar|er|ir|or)$/.test(first) || ["lançar", "entregar", "construir", "elevar", "gerar", "reduzir", "aumentar"].includes(first);
}

function cycleLabel(c: DbOkrCycle) {
  const base = c.type === "ANNUAL" ? `${c.year}` : `Q${c.quarter ?? "?"} / ${c.year}`;
  return c.name?.trim() ? `${c.name} · ${base}` : base;
}

type DraftTask = {
  title: string;
  due?: string;
  estimate_minutes: number | null;
  estimated_value_brl: number | null;
  estimated_cost_brl: number | null;
  estimated_roi_pct: number | null;
};

export default function OkrAssistant() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companyId } = useCompany();

  if (!user) return null;

  const cid = companyId ?? "";
  const hasCompany = !!companyId;

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

  const activeQuarterId = cycles.find((c) => c.type === "QUARTERLY" && c.status === "ACTIVE")?.id ?? null;

  const [cycleId, setCycleId] = useState<string>("");
  useEffect(() => {
    if (cycleId) return;
    if (!activeQuarterId) return;
    setCycleId(activeQuarterId);
  }, [activeQuarterId, cycleId]);

  const [level, setLevel] = useState<ObjectiveLevel>("INDIVIDUAL");

  const { data: cycleObjectives = [] } = useQuery({
    queryKey: ["okr-objectives", cid, cycleId],
    enabled: hasCompany && !!cycleId,
    queryFn: () => listOkrObjectives(cid, cycleId),
  });

  const companyObjectives = useMemo(() => cycleObjectives.filter((o) => o.level === "COMPANY"), [cycleObjectives]);

  const [parentId, setParentId] = useState<string>("");
  const [objectiveTitle, setObjectiveTitle] = useState("");
  const [objectiveDesc, setObjectiveDesc] = useState("");
  const [objectiveReason, setObjectiveReason] = useState("");

  const [fund, setFund] = useState<DbOkrObjective["linked_fundamental"]>(null);
  const [fundText, setFundText] = useState("");

  const [objectiveValue, setObjectiveValue] = useState("");
  const [objectiveEffortHours, setObjectiveEffortHours] = useState("");

  const [krTitle, setKrTitle] = useState("");
  const [krUnit, setKrUnit] = useState("");
  const [krStart, setKrStart] = useState("");
  const [krTarget, setKrTarget] = useState("");

  const [tier, setTier] = useState<DeliverableTier>("TIER2");
  const [deliverableTitle, setDeliverableTitle] = useState("");
  const [deliverableDesc, setDeliverableDesc] = useState("");
  const [deliverableDue, setDeliverableDue] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskEstimate, setTaskEstimate] = useState("");
  const [taskValue, setTaskValue] = useState("");
  const [tasks, setTasks] = useState<DraftTask[]>([]);

  const requiresBusinessCase = !!user.departmentId;
  const myMonthly = user.monthlyCostBRL ?? null;

  const objectiveValueBRL = parsePtNumber(objectiveValue);
  const objectiveHours = parsePtNumber(objectiveEffortHours);
  const objectiveCostBRL = laborCostFromMonthly(myMonthly, objectiveHours);
  const objectiveRoi = roiPct(objectiveValueBRL, objectiveCostBRL);

  const businessCaseOk =
    !requiresBusinessCase ||
    (!!objectiveValueBRL &&
      objectiveValueBRL > 0 &&
      !!objectiveHours &&
      objectiveHours > 0 &&
      !!myMonthly &&
      myMonthly > 0 &&
      objectiveCostBRL !== null &&
      objectiveRoi !== null &&
      tasks.length >= 1 &&
      tasks.every((t) => t.estimated_value_brl !== null && t.estimated_cost_brl !== null && t.estimated_roi_pct !== null));

  const objectiveQuality = useMemo(() => {
    const t = objectiveTitle.trim();
    if (!t) return { ok: false, msg: "Dê nome ao objetivo." };
    if (t.length < 10) return { ok: false, msg: "Deixe o objetivo um pouco mais específico (10+ caracteres)." };
    if (!looksLikeVerbPt(t)) return { ok: false, msg: "Comece com um verbo no infinitivo (ex.: Aumentar / Reduzir / Lançar / Construir)." };
    return { ok: true, msg: "Bom objetivo: claro e orientado a resultado." };
  }, [objectiveTitle]);

  const krQuality = useMemo(() => {
    const t = krTitle.trim();
    if (!t) return { ok: false, msg: "Defina um KR mensurável." };
    const start = Number(String(krStart).replace(",", "."));
    const target = Number(String(krTarget).replace(",", "."));
    if (!Number.isFinite(start) || !Number.isFinite(target)) {
      return { ok: false, msg: "Preencha início e meta com números para facilitar acompanhamento." };
    }
    if (start === target) return { ok: false, msg: "Início e meta não podem ser iguais." };
    return { ok: true, msg: "KR pronto para tracking." };
  }, [krTitle, krStart, krTarget]);

  const canSubmit =
    hasCompany &&
    !!cycleId &&
    objectiveQuality.ok &&
    !!fund &&
    fundText.trim().length >= 6 &&
    krQuality.ok &&
    deliverableTitle.trim().length >= 4 &&
    tasks.length >= 1 &&
    businessCaseOk;

  if (!hasCompany) {
    return (
      <div className="grid gap-6">
        <OkrPageHeader
          title="Assistente de criação de OKRs"
          subtitle="Carregando contexto da empresa…"
          icon={<Sparkles className="h-5 w-5" />}
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
        title="Assistente de criação de OKRs"
        subtitle="Um copiloto simples: você cria o objetivo certo, define KRs mensuráveis e já sai com tarefas conectadas."
        icon={<Sparkles className="h-5 w-5" />}
        actions={
          <Button asChild variant="outline" className="h-11 rounded-xl">
            <Link to="/okr">Voltar</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">1) Contexto</div>
                <p className="mt-1 text-sm text-muted-foreground">Escolha o ciclo e o nível do seu OKR.</p>
              </div>
              <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">Passo 1</Badge>
            </div>

            <Separator className="my-5" />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Ciclo</Label>
                <Select value={cycleId} onValueChange={setCycleId}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecione um ciclo" />
                  </SelectTrigger>
                  <SelectContent>
                    {cycles.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {cycleLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Nível</Label>
                <Select value={level} onValueChange={(v) => setLevel(v as ObjectiveLevel)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    <SelectItem value="TEAM">Time</SelectItem>
                    <SelectItem value="DEPARTMENT">Departamento</SelectItem>
                    <SelectItem value="COMPANY">Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <Label>Contribui para qual objetivo estratégico (opcional)?</Label>
              <Select
                value={parentId}
                onValueChange={(v) => {
                  setParentId(v === SELECT_NONE ? "" : v);
                }}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder={companyObjectives.length ? "Escolha um objetivo da empresa" : "Nenhum objetivo da empresa neste ciclo"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>Sem objetivo pai</SelectItem>
                  {companyObjectives.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">Isso gera a cascata (empresa → área/time → você). Se não tiver, pode criar mesmo assim.</div>
            </div>
          </Card>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">2) Objetivo</div>
                <p className="mt-1 text-sm text-muted-foreground">Escreva um objetivo claro e conectado aos fundamentos.</p>
              </div>
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">{objectiveQuality.ok ? <Check className="h-4 w-4" /> : "Passo 2"}</Badge>
            </div>

            <Separator className="my-5" />

            <div className="grid gap-2">
              <Label>Objetivo</Label>
              <Input
                className="h-11 rounded-xl"
                value={objectiveTitle}
                onChange={(e) => setObjectiveTitle(e.target.value)}
                placeholder="Ex.: Aumentar previsibilidade do delivery"
              />
              <div className={`text-xs ${objectiveQuality.ok ? "text-[color:var(--sinaxys-ink)]" : "text-muted-foreground"}`}>{objectiveQuality.msg}</div>
            </div>

            <div className="mt-4 grid gap-2">
              <Label>Descrição (opcional)</Label>
              <Textarea className="min-h-[88px] rounded-2xl" value={objectiveDesc} onChange={(e) => setObjectiveDesc(e.target.value)} />
            </div>

            <div className="mt-4 grid gap-2">
              <Label>Motivo estratégico (opcional)</Label>
              <Textarea className="min-h-[88px] rounded-2xl" value={objectiveReason} onChange={(e) => setObjectiveReason(e.target.value)} />
            </div>

            {requiresBusinessCase ? (
              <div className="mt-4 rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Impacto financeiro + ROI</div>
                <p className="mt-1 text-sm text-muted-foreground">Como esse objetivo retorna dinheiro — e qual o ROI, baseado no seu custo/hora.</p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Impacto estimado (R$)</Label>
                    <Input className="h-11 rounded-xl" value={objectiveValue} onChange={(e) => setObjectiveValue(e.target.value)} placeholder="50000" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Esforço estimado (horas)</Label>
                    <Input
                      className="h-11 rounded-xl"
                      value={objectiveEffortHours}
                      onChange={(e) => setObjectiveEffortHours(e.target.value)}
                      placeholder="40"
                    />
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-[color:var(--sinaxys-border)]">
                  <div className="text-xs text-muted-foreground">Seu custo/h: {brlPerHourFromMonthly(myMonthly ?? 0)}</div>
                  {!myMonthly ? (
                    <div className="mt-1 text-xs text-[color:var(--sinaxys-ink)]">
                      Para calcular ROI, cadastre seu custo mensal em <span className="font-semibold">Custos</span>.
                    </div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Custo estimado:</span>
                    <span className="font-semibold text-[color:var(--sinaxys-ink)]">{objectiveCostBRL !== null ? brl(objectiveCostBRL) : "—"}</span>
                    <span className="text-muted-foreground">• ROI:</span>
                    <span className="font-semibold text-[color:var(--sinaxys-ink)]">
                      {objectiveRoi !== null ? `${objectiveRoi.toFixed(1)}%` : "—"}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-4 grid gap-2">
              <Label>Esse objetivo está conectado a…</Label>
              <Select value={fund ?? ""} onValueChange={(v) => setFund((v || null) as any)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Propósito / Visão / Missão…" />
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
                className="min-h-[72px] rounded-2xl"
                value={fundText}
                onChange={(e) => setFundText(e.target.value)}
                placeholder={
                  fund === "VISION" && fundamentals?.vision?.trim()
                    ? `Ex.: ${fundamentals.vision}`
                    : "Cole aqui a frase do fundamento (ou escreva o trecho que esse objetivo atende)."
                }
              />
            </div>
          </Card>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">3) Key Result</div>
                <p className="mt-1 text-sm text-muted-foreground">Transforme o objetivo em um resultado rastreável.</p>
              </div>
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">{krQuality.ok ? <Check className="h-4 w-4" /> : "Passo 3"}</Badge>
            </div>

            <Separator className="my-5" />

            <div className="grid gap-2">
              <Label>KR</Label>
              <Input
                className="h-11 rounded-xl"
                value={krTitle}
                onChange={(e) => setKrTitle(e.target.value)}
                placeholder="Ex.: Reduzir lead time médio de 12 para 7 dias"
              />
              <div className={`text-xs ${krQuality.ok ? "text-[color:var(--sinaxys-ink)]" : "text-muted-foreground"}`}>{krQuality.msg}</div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Início</Label>
                <Input className="h-11 rounded-xl" value={krStart} onChange={(e) => setKrStart(e.target.value)} placeholder="12" />
              </div>
              <div className="grid gap-2">
                <Label>Meta</Label>
                <Input className="h-11 rounded-xl" value={krTarget} onChange={(e) => setKrTarget(e.target.value)} placeholder="7" />
              </div>
              <div className="grid gap-2">
                <Label>Unidade (opcional)</Label>
                <Input className="h-11 rounded-xl" value={krUnit} onChange={(e) => setKrUnit(e.target.value)} placeholder="dias" />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                "Aumentar ____ de __ para __",
                "Reduzir ____ de __ para __",
                "Elevar ____ de __ para __",
                "Gerar ____ (R$) de __ para __",
              ].map((tpl) => (
                <Button
                  key={tpl}
                  type="button"
                  variant="outline"
                  className="h-9 rounded-full"
                  onClick={() => setKrTitle(tpl)}
                >
                  {tpl}
                </Button>
              ))}
            </div>
          </Card>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">4) Entregável + tarefas</div>
                <p className="mt-1 text-sm text-muted-foreground">O KR vira execução real: entregáveis e tarefas do dia.</p>
              </div>
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">Passo 4</Badge>
            </div>

            <Separator className="my-5" />

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Tier</Label>
                <Select value={tier} onValueChange={(v) => setTier(v as DeliverableTier)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TIER1">Tier I (estratégico)</SelectItem>
                    <SelectItem value="TIER2">Tier II (operacional)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Entregável</Label>
                <Input
                  className="h-11 rounded-xl"
                  value={deliverableTitle}
                  onChange={(e) => setDeliverableTitle(e.target.value)}
                  placeholder="Ex.: Checklist de QA do onboarding"
                />
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Prazo do entregável (opcional)</Label>
                  <Input
                    className="h-11 rounded-xl"
                    type="date"
                    value={deliverableDue}
                    onChange={(e) => setDeliverableDue(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">&nbsp;</Label>
                  <div className="flex h-11 items-center rounded-xl border border-dashed border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] px-4 text-sm text-muted-foreground">
                    Dica: use prazo no entregável; as tarefas ficam no dia a dia.
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Descrição do entregável (opcional)</Label>
                <Textarea className="min-h-[88px] rounded-2xl" value={deliverableDesc} onChange={(e) => setDeliverableDesc(e.target.value)} />
              </div>

              <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Tarefas</div>
                <p className="mt-1 text-sm text-muted-foreground">Inclua pelo menos 1 tarefa para sair com execução pronta.</p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Input
                    className="h-11 rounded-xl"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Ex.: Mapear etapas do fluxo"
                  />
                  <Input className="h-11 rounded-xl" type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Tempo estimado (min{requiresBusinessCase ? ", obrigatório" : ", opcional"})</Label>
                    <Input className="h-11 rounded-xl" value={taskEstimate} onChange={(e) => setTaskEstimate(e.target.value)} placeholder="60" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Impacto estimado (R$){requiresBusinessCase ? " (obrigatório)" : " (opcional)"}</Label>
                    <Input className="h-11 rounded-xl" value={taskValue} onChange={(e) => setTaskValue(e.target.value)} placeholder="5000" />
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="text-xs text-muted-foreground">Custo/h base: {brlPerHourFromMonthly(myMonthly ?? 0)}</div>
                  <Button
                    type="button"
                    className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                    onClick={() => {
                      if (taskTitle.trim().length < 3) return;

                      const minutes = parsePtNumber(taskEstimate);
                      const value = parsePtNumber(taskValue);
                      const hours = minutes !== null ? minutes / 60 : null;
                      const cost = laborCostFromMonthly(myMonthly, hours);
                      const r = roiPct(value, cost);

                      if (requiresBusinessCase) {
                        if (!myMonthly || myMonthly <= 0) return;
                        if (!minutes || minutes <= 0) return;
                        if (!value || value <= 0) return;
                        if (cost === null || r === null) return;
                      }

                      setTasks((prev) => [
                        ...prev,
                        {
                          title: taskTitle.trim(),
                          due: taskDue.trim() || undefined,
                          estimate_minutes: minutes && minutes > 0 ? minutes : null,
                          estimated_value_brl: value && value > 0 ? value : null,
                          estimated_cost_brl: cost !== null ? Number(cost.toFixed(2)) : null,
                          estimated_roi_pct: r !== null ? Number(r.toFixed(2)) : null,
                        },
                      ]);
                      setTaskTitle("");
                      setTaskDue("");
                      setTaskEstimate("");
                      setTaskValue("");
                    }}
                  >
                    + adicionar
                  </Button>
                </div>

                <div className="mt-3 grid gap-2">
                  {tasks.length ? (
                    tasks.map((t, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 ring-1 ring-[color:var(--sinaxys-border)]">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{t.title}</div>
                          <div className="text-xs text-muted-foreground">{t.due ? `Vence: ${t.due}` : "Sem data"}</div>
                          {t.estimated_cost_brl !== null && t.estimated_value_brl !== null ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Custo: {brl(t.estimated_cost_brl)} • ROI: {t.estimated_roi_pct !== null ? `${t.estimated_roi_pct.toFixed(1)}%` : "—"}
                            </div>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 rounded-xl"
                          onClick={() => setTasks((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          Remover
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-white p-3 text-sm text-muted-foreground ring-1 ring-[color:var(--sinaxys-border)]">Sem tarefas ainda.</div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Publicar</div>
                <p className="mt-1 text-sm text-muted-foreground">Cria objetivo, KR, entregável e tarefas já conectados.</p>
              </div>
              <Button
                className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                disabled={!canSubmit}
                onClick={async () => {
                  try {
                    const start = Number(String(krStart).replace(",", "."));
                    const target = Number(String(krTarget).replace(",", "."));

                    const obj = await createOkrObjective({
                      company_id: cid,
                      cycle_id: cycleId,
                      parent_objective_id: parentId || null,
                      level,
                      department_id: user.departmentId ?? null,
                      owner_user_id: user.id,
                      title: objectiveTitle,
                      description: objectiveDesc,
                      strategic_reason: objectiveReason,
                      linked_fundamental: fund,
                      linked_fundamental_text: fundText,
                      due_at: null,
                      estimated_value_brl: objectiveValueBRL,
                      estimated_effort_hours: objectiveHours,
                      estimated_cost_brl: objectiveCostBRL !== null ? Number(objectiveCostBRL.toFixed(2)) : null,
                      estimated_roi_pct: objectiveRoi !== null ? Number(objectiveRoi.toFixed(2)) : null,
                    });

                    const kr = await createKeyResult({
                      objective_id: obj.id,
                      title: krTitle,
                      metric_unit: krUnit.trim() || null,
                      start_value: Number.isFinite(start) ? start : null,
                      current_value: Number.isFinite(start) ? start : null,
                      target_value: Number.isFinite(target) ? target : null,
                      owner_user_id: user.id,
                      confidence: "ON_TRACK",
                    });

                    const del = await createDeliverable({
                      key_result_id: kr.id,
                      tier,
                      title: deliverableTitle,
                      description: deliverableDesc,
                      owner_user_id: user.id,
                      status: "TODO",
                      due_at: deliverableDue.trim() || null,
                    });

                    for (const t of tasks) {
                      await createTask({
                        deliverable_id: del.id,
                        title: t.title,
                        description: null,
                        owner_user_id: user.id,
                        status: "TODO",
                        due_date: t.due ?? null,
                        estimate_minutes: t.estimate_minutes,
                        checklist: null,
                        estimated_value_brl: t.estimated_value_brl,
                        estimated_cost_brl: t.estimated_cost_brl,
                        estimated_roi_pct: t.estimated_roi_pct,
                      });
                    }

                    toast({ title: "OKR criado", description: "Tudo conectado: objetivo → KR → entregável → tarefas." });
                    navigate(`/okr/objetivos/${obj.id}`);
                  } catch (e) {
                    toast({
                      title: "Não foi possível criar",
                      description: e instanceof Error ? e.message : "Erro inesperado.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Criar OKR
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <Separator className="my-5" />

            <div className="text-sm text-muted-foreground">
              Se faltar algum campo, o botão fica desabilitado. A ideia é garantir clareza e alinhamento sem virar burocracia.
            </div>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Como o assistente pensa</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Você não preenche um formulário. Você define um objetivo conectado à estratégia e sai com execução real.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <Hint ok={objectiveQuality.ok} title="Objetivo" text={objectiveQuality.msg} />
              <Hint ok={!!fund && fundText.trim().length >= 6} title="Alinhamento" text="Conecte explicitamente ao propósito/visão." />
              <Hint ok={krQuality.ok} title="KR" text={krQuality.msg} />
              <Hint ok={tasks.length >= 1} title="Execução" text="Tenha pelo menos 1 tarefa conectada." />
              {requiresBusinessCase ? (
                <Hint
                  ok={businessCaseOk}
                  title="ROI"
                  text={myMonthly ? "Inclua impacto + esforço para calcular ROI (objetivo e tarefas)." : "Cadastre seu custo mensal para liberar o cálculo de ROI."}
                />
              ) : null}
            </div>
          </Card>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Depois</div>
            <p className="mt-1 text-sm text-muted-foreground">Sua rotina diária puxa as tarefas que você criar aqui.</p>
            <Button asChild variant="outline" className="mt-4 h-11 w-full rounded-xl">
              <Link to="/okr/hoje">Ver minha rotina</Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Hint({ ok, title, text }: { ok: boolean; title: string; text: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-white p-3 ring-1 ring-[color:var(--sinaxys-border)]">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
        <div className="mt-1 text-sm font-medium text-[color:var(--sinaxys-ink)]">{text}</div>
      </div>
      <div
        className={
          ok
            ? "grid h-9 w-9 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]"
            : "grid h-9 w-9 place-items-center rounded-2xl bg-white text-muted-foreground ring-1 ring-[color:var(--sinaxys-border)]"
        }
      >
        {ok ? <Check className="h-4 w-4" /> : <span className="text-xs font-semibold">!</span>}
      </div>
    </div>
  );
}