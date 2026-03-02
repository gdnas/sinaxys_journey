import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  ChartLine,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Handshake,
  LineChart,
  MessageSquare,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { isCompanyModuleEnabled } from "@/lib/modulesDb";
import {
  createPdi,
  fetchPdiByUser,
  listCheckins,
  listFeedback,
  listOneOnOnes,
  listPublicProfilesForCompany,
  upsertCheckin,
  upsertFeedback,
  upsertOneOnOne,
  type DbCheckin,
  type DbFeedback,
  type DbOneOnOne,
} from "@/lib/pdiPerformanceDb";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MODULE_KEY = "PDI_PERFORMANCE" as const;

function shortDateLabel(isoOrDate: string | null | undefined) {
  if (!isoOrDate) return "—";
  const d = new Date(isoOrDate);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function longDateLabel(isoOrDate: string | null | undefined) {
  if (!isoOrDate) return "—";
  const d = new Date(isoOrDate);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function toneFromEnergy(energy: number) {
  if (energy <= 3) return "destructive";
  if (energy <= 6) return "warn";
  return "good";
}

function Pill({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">{value}</div>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function SkillRow({
  skill,
  canEdit,
  onSave,
  onDelete,
}: {
  skill: DbPdiSkill;
  canEdit: boolean;
  onSave: (next: DbPdiSkill) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [name, setName] = useState(skill.name);
  const [current, setCurrent] = useState(skill.current_level);
  const [target, setTarget] = useState(skill.target_level);
  const [due, setDue] = useState(skill.due_date ?? "");
  const [notes, setNotes] = useState(skill.notes ?? "");

  const dirty =
    name.trim() !== skill.name ||
    current !== skill.current_level ||
    target !== skill.target_level ||
    (due || null) !== (skill.due_date ?? null) ||
    (notes || null) !== (skill.notes ?? null);

  return (
    <div className="grid gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_130px_130px]">
        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">Habilidade</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            className="h-10 rounded-xl bg-white"
            placeholder="Ex.: comunicação com o time"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">Nível atual</Label>
          <Input
            type="number"
            value={current}
            onChange={(e) => setCurrent(clampInt(Number(e.target.value), 0, 10))}
            disabled={!canEdit}
            className="h-10 rounded-xl bg-white"
            min={0}
            max={10}
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">Nível desejado</Label>
          <Input
            type="number"
            value={target}
            onChange={(e) => setTarget(clampInt(Number(e.target.value), 0, 10))}
            disabled={!canEdit}
            className="h-10 rounded-xl bg-white"
            min={0}
            max={10}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[170px_1fr]">
        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">Prazo</Label>
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} disabled={!canEdit} className="h-10 rounded-xl bg-white" />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">Observações</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!canEdit}
            className="h-10 rounded-xl bg-white"
            placeholder="Como vamos desenvolver isso?"
          />
        </div>
      </div>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-xl bg-white"
            disabled={!dirty || !name.trim()}
            onClick={() =>
              onSave({
                ...skill,
                name: name.trim(),
                current_level: clampInt(current, 0, 10),
                target_level: clampInt(target, 0, 10),
                due_date: due || null,
                notes: notes.trim() || null,
              } as any)
            }
          >
            Salvar
          </Button>
          <Button variant="outline" className="h-10 rounded-xl bg-white text-destructive hover:text-destructive" onClick={onDelete}>
            Remover
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function PdiEditorDialog({
  tenantId,
  userId,
  canEdit,
  label,
  seedCurrentPosition,
}: {
  tenantId: string;
  userId: string;
  canEdit: boolean;
  label: string;
  seedCurrentPosition?: string | null;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: plan } = useQuery({
    queryKey: ["pdi", "plan", tenantId, userId],
    queryFn: () => ensurePdiPlan(tenantId, userId, { currentPosition: seedCurrentPosition ?? null }),
    enabled: !!tenantId && !!userId,
  });

  const { data: skills = [] } = useQuery({
    queryKey: ["pdi", "skills", plan?.id],
    queryFn: () => listPdiSkills(String(plan?.id)),
    enabled: !!plan?.id,
  });

  const [draft, setDraft] = useState<Partial<DbPdiPlan>>({});

  const dirty = useMemo(() => {
    if (!plan) return false;
    const next = { ...plan, ...draft } as DbPdiPlan;
    const keys: Array<keyof DbPdiPlan> = [
      "career_goal",
      "current_position",
      "next_level",
      "where_i_am",
      "where_i_want",
      "strengths",
      "improvement_points",
      "evolution_plan",
      "target_date",
    ];
    return keys.some((k) => (next[k] ?? null) !== (plan[k] ?? null));
  }, [plan, draft]);

  async function savePlan() {
    if (!plan) return;
    await updatePdiPlan(plan.id, {
      career_goal: draft.career_goal ?? plan.career_goal,
      current_position: draft.current_position ?? plan.current_position,
      next_level: draft.next_level ?? plan.next_level,
      where_i_am: draft.where_i_am ?? plan.where_i_am,
      where_i_want: draft.where_i_want ?? plan.where_i_want,
      strengths: draft.strengths ?? plan.strengths,
      improvement_points: draft.improvement_points ?? plan.improvement_points,
      evolution_plan: draft.evolution_plan ?? plan.evolution_plan,
      target_date: draft.target_date ?? plan.target_date,
    });

    setDraft({});
    await qc.invalidateQueries({ queryKey: ["pdi", "plan", tenantId, userId] });
    toast({ title: "PDI atualizado", description: "Seu plano foi salvo." });
  }

  async function addSkill() {
    if (!plan) return;
    await upsertPdiSkill({
      tenantId,
      planId: plan.id,
      userId,
      name: "Nova habilidade",
      currentLevel: 2,
      targetLevel: 4,
    });
    await qc.invalidateQueries({ queryKey: ["pdi", "skills", plan.id] });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11 rounded-xl bg-white">
          <Pencil className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[86vh] overflow-auto rounded-3xl border-[color:var(--sinaxys-border)] p-0">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="text-[color:var(--sinaxys-ink)]">PDI individual</DialogTitle>
          </DialogHeader>

          <p className="mt-2 text-sm text-muted-foreground">Objetivo claro, poucas palavras, revisado sempre. Sem burocracia.</p>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-2">
              <Label>Objetivo de carreira</Label>
              <Textarea
                value={draft.career_goal ?? plan?.career_goal ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, career_goal: e.target.value }))}
                disabled={!canEdit}
                className="min-h-20 rounded-2xl"
                placeholder="Ex.: liderar um time de CS em 12 meses"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Cargo atual</Label>
                <Input
                  value={draft.current_position ?? plan?.current_position ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, current_position: e.target.value }))}
                  disabled={!canEdit}
                  className="h-11 rounded-xl"
                  placeholder="Ex.: Analista de Marketing"
                />
              </div>
              <div className="grid gap-2">
                <Label>Próximo nível desejado</Label>
                <Input
                  value={draft.next_level ?? plan?.next_level ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, next_level: e.target.value }))}
                  disabled={!canEdit}
                  className="h-11 rounded-xl"
                  placeholder="Ex.: Pleno → Sênior"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Onde estou hoje</Label>
                <Textarea
                  value={draft.where_i_am ?? plan?.where_i_am ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, where_i_am: e.target.value }))}
                  disabled={!canEdit}
                  className="min-h-24 rounded-2xl"
                />
              </div>
              <div className="grid gap-2">
                <Label>Onde quero chegar</Label>
                <Textarea
                  value={draft.where_i_want ?? plan?.where_i_want ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, where_i_want: e.target.value }))}
                  disabled={!canEdit}
                  className="min-h-24 rounded-2xl"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Forças principais</Label>
                <Textarea
                  value={draft.strengths ?? plan?.strengths ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, strengths: e.target.value }))}
                  disabled={!canEdit}
                  className="min-h-20 rounded-2xl"
                />
              </div>
              <div className="grid gap-2">
                <Label>Pontos de melhoria</Label>
                <Textarea
                  value={draft.improvement_points ?? plan?.improvement_points ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, improvement_points: e.target.value }))}
                  disabled={!canEdit}
                  className="min-h-20 rounded-2xl"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Plano de evolução</Label>
              <Textarea
                value={draft.evolution_plan ?? plan?.evolution_plan ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, evolution_plan: e.target.value }))}
                disabled={!canEdit}
                className="min-h-28 rounded-2xl"
                placeholder="Ações pequenas e contínuas. Ex.: 1h/semana de prática + projeto interno."
              />
            </div>

            <div className="grid gap-2 md:max-w-xs">
              <Label>Prazos (data-alvo)</Label>
              <Input
                type="date"
                value={String(draft.target_date ?? plan?.target_date ?? "")}
                onChange={(e) => setDraft((d) => ({ ...d, target_date: e.target.value }))}
                disabled={!canEdit}
                className="h-11 rounded-xl"
              />
            </div>

            <Separator className="my-1" />

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Habilidades a desenvolver</div>
                <div className="text-xs text-muted-foreground">Nível 0–10. Poucas e essenciais.</div>
              </div>
              {canEdit ? (
                <Button className="h-10 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90" onClick={addSkill}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar
                </Button>
              ) : null}
            </div>

            <div className="grid gap-3">
              {skills.length ? (
                skills.map((s) => (
                  <SkillRow
                    key={s.id}
                    skill={s}
                    canEdit={canEdit}
                    onSave={async (next) => {
                      if (!plan) return;
                      await upsertPdiSkill({
                        id: next.id,
                        tenantId,
                        planId: plan.id,
                        userId,
                        name: next.name,
                        currentLevel: next.current_level,
                        targetLevel: next.target_level,
                        dueDate: next.due_date,
                        notes: next.notes,
                        responsibleUserId: next.responsible_user_id,
                      });
                      await qc.invalidateQueries({ queryKey: ["pdi", "skills", plan.id] });
                      toast({ title: "Habilidade salva" });
                    }}
                    onDelete={async () => {
                      if (!plan) return;
                      await deletePdiSkill(s.id);
                      await qc.invalidateQueries({ queryKey: ["pdi", "skills", plan.id] });
                      toast({ title: "Habilidade removida" });
                    }}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
                  Nenhuma habilidade ainda. Adicione 2–4 para começar.
                </div>
              )}
            </div>

            {canEdit ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  disabled={!dirty}
                  onClick={savePlan}
                >
                  Salvar PDI
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                Você está visualizando em modo leitura.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QuickCheckinCard({ tenantId, userId }: { tenantId: string; userId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [how, setHow] = useState("");
  const [adv, setAdv] = useState("");
  const [diff, setDiff] = useState("");
  const [needsHelp, setNeedsHelp] = useState<"no" | "yes">("no");
  const [suggest, setSuggest] = useState("");
  const [energy, setEnergy] = useState(7);
  const [motivation, setMotivation] = useState(7);

  const periodStart = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return format(start, "yyyy-MM-dd");
  }, []);

  async function submit() {
    await createCheckin({
      tenantId,
      userId,
      cadence: "WEEKLY",
      periodStart,
      howWasWeek: how,
      advances: adv,
      difficulties: diff,
      energy,
      motivation,
      needsHelp: needsHelp === "yes",
      suggestions: suggest,
    });

    setHow("");
    setAdv("");
    setDiff("");
    setNeedsHelp("no");
    setSuggest("");
    setEnergy(7);
    setMotivation(7);

    await qc.invalidateQueries({ queryKey: ["pdi", "checkins", tenantId, userId] });
    toast({ title: "Check-in enviado", description: "Salvo no seu histórico." });
  }

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Check-in da semana</div>
          <p className="mt-1 text-sm text-muted-foreground">2 minutos. O que importa agora.</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
          <ClipboardList className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="grid gap-2">
          <Label>Como foi sua semana?</Label>
          <Textarea value={how} onChange={(e) => setHow(e.target.value)} className="min-h-20 rounded-2xl" placeholder="1 frase já resolve." />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Principais avanços</Label>
            <Textarea value={adv} onChange={(e) => setAdv(e.target.value)} className="min-h-20 rounded-2xl" placeholder="O que andou?" />
          </div>
          <div className="grid gap-2">
            <Label>Principais dificuldades</Label>
            <Textarea value={diff} onChange={(e) => setDiff(e.target.value)} className="min-h-20 rounded-2xl" placeholder="O que travou?" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Energia</div>
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">{energy}/10</Badge>
            </div>
            <div className="mt-3">
              <Slider value={[energy]} onValueChange={(v) => setEnergy(v[0] ?? 7)} min={0} max={10} step={1} />
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Motivação</div>
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">{motivation}/10</Badge>
            </div>
            <div className="mt-3">
              <Slider value={[motivation]} onValueChange={(v) => setMotivation(v[0] ?? 7)} min={0} max={10} step={1} />
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Precisa de ajuda?</Label>
          <Select value={needsHelp} onValueChange={(v) => setNeedsHelp(v as any)}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">Não</SelectItem>
              <SelectItem value="yes">Sim</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Sugestões (opcional)</Label>
          <Textarea
            value={suggest}
            onChange={(e) => setSuggest(e.target.value)}
            className="min-h-16 rounded-2xl"
            placeholder="Uma ideia simples já vale."
          />
        </div>

        <Button
          className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
          onClick={submit}
        >
          Enviar check-in
          <CheckCircle2 className="ml-2 h-4 w-4" />
        </Button>

        <div className="text-xs text-muted-foreground">Período: semana iniciando em {format(new Date(periodStart), "d 'de' MMM", { locale: ptBR })}.</div>
      </div>
    </Card>
  );
}

function FeedbackComposer({
  tenantId,
  fromUserId,
  toUserOptions,
  defaultToUserId,
}: {
  tenantId: string;
  fromUserId: string;
  toUserOptions: Array<{ id: string; label: string }>;
  defaultToUserId: string;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [toUserId, setToUserId] = useState(defaultToUserId);
  const [kind, setKind] = useState<FeedbackKind>("RECONHECIMENTO");
  const [message, setMessage] = useState("");

  const kindBadge = useMemo(() => {
    switch (kind) {
      case "ELOGIO":
        return "elogio";
      case "RECONHECIMENTO":
        return "reconhecimento";
      case "CONSTRUTIVO":
        return "construtivo";
      case "ATENCAO":
        return "atenção";
    }
  }, [kind]);

  async function submit() {
    if (!message.trim()) return;

    await createFeedback({
      tenantId,
      fromUserId,
      toUserId,
      kind,
      message,
    });

    setMessage("");
    await qc.invalidateQueries({ queryKey: ["pdi", "feedbacks", tenantId, toUserId] });
    await qc.invalidateQueries({ queryKey: ["pdi", "feedbacks", tenantId, fromUserId] });

    toast({ title: "Feedback registrado", description: "Fica no histórico profissional." });
  }

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Feedback contínuo</div>
            <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
              {kindBadge}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Registre agora. Curto e objetivo.</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
          <MessageSquare className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <div className="grid gap-2">
          <Label>Para</Label>
          <Select value={toUserId} onValueChange={setToUserId}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {toUserOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Tipo</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as FeedbackKind)}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ELOGIO">Elogio</SelectItem>
              <SelectItem value="RECONHECIMENTO">Reconhecimento</SelectItem>
              <SelectItem value="CONSTRUTIVO">Feedback construtivo</SelectItem>
              <SelectItem value="ATENCAO">Ponto de atenção</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Mensagem</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-24 rounded-2xl" placeholder="Ex.: gostei de como você conduziu X…" />
        </div>

        <Button
          className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
          disabled={!message.trim()}
          onClick={submit}
        >
          Registrar feedback
          <Sparkles className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function OneOnOneDialog({
  tenantId,
  employeeId,
  managerId,
  triggerLabel,
  createdByUserId,
}: {
  tenantId: string;
  employeeId: string;
  managerId: string;
  triggerLabel: string;
  createdByUserId: string;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [topics, setTopics] = useState("");
  const [feedbacks, setFeedbacks] = useState("");
  const [decisions, setDecisions] = useState("");
  const [actions, setActions] = useState("");
  const [attention, setAttention] = useState("");
  const [next, setNext] = useState("");

  async function submit() {
    await createOneOnOne({
      tenantId,
      employeeId,
      managerId,
      occurredAt: date,
      topics,
      feedbacks,
      decisions,
      actions,
      attentionPoints: attention,
      nextSteps: next,
      createdByUserId,
    });

    setTopics("");
    setFeedbacks("");
    setDecisions("");
    setActions("");
    setAttention("");
    setNext("");

    await qc.invalidateQueries({ queryKey: ["pdi", "1on1", tenantId, employeeId] });
    await qc.invalidateQueries({ queryKey: ["pdi", "1on1", tenantId, managerId] });

    toast({ title: "1:1 registrado", description: "Salvo no histórico." });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
          <Handshake className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[86vh] overflow-auto rounded-3xl border-[color:var(--sinaxys-border)] p-0">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="text-[color:var(--sinaxys-ink)]">Registrar 1:1</DialogTitle>
          </DialogHeader>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-2 md:max-w-xs">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-xl" />
            </div>

            <div className="grid gap-2">
              <Label>Pontos discutidos</Label>
              <Textarea value={topics} onChange={(e) => setTopics(e.target.value)} className="min-h-24 rounded-2xl" />
            </div>
            <div className="grid gap-2">
              <Label>Feedbacks</Label>
              <Textarea value={feedbacks} onChange={(e) => setFeedbacks(e.target.value)} className="min-h-20 rounded-2xl" />
            </div>
            <div className="grid gap-2">
              <Label>Decisões</Label>
              <Textarea value={decisions} onChange={(e) => setDecisions(e.target.value)} className="min-h-20 rounded-2xl" />
            </div>
            <div className="grid gap-2">
              <Label>Ações combinadas</Label>
              <Textarea value={actions} onChange={(e) => setActions(e.target.value)} className="min-h-20 rounded-2xl" />
            </div>
            <div className="grid gap-2">
              <Label>Pontos de atenção</Label>
              <Textarea value={attention} onChange={(e) => setAttention(e.target.value)} className="min-h-16 rounded-2xl" />
            </div>
            <div className="grid gap-2">
              <Label>Próximos passos</Label>
              <Textarea value={next} onChange={(e) => setNext(e.target.value)} className="min-h-16 rounded-2xl" />
            </div>

            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              onClick={submit}
            >
              Salvar 1:1
              <CheckCircle2 className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type TimelineItem = {
  id: string;
  at: string; // ISO
  title: string;
  subtitle?: string;
  kind: "CHECKIN" | "ONEONONE" | "FEEDBACK" | "PDI" | "OKR" | "TRILHA" | "MARCO";
};

function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Evolução & histórico</div>
          <p className="mt-1 text-sm text-muted-foreground">Uma linha do tempo viva — decisões, ritmo e crescimento.</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
          <LineChart className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {items.length ? (
          items.slice(0, 18).map((it) => (
            <div key={it.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{it.title}</div>
                <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">{shortDateLabel(it.at)}</Badge>
              </div>
              {it.subtitle ? <div className="mt-1 text-sm text-muted-foreground">{it.subtitle}</div> : null}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
            Ainda sem histórico suficiente. Faça 1 check-in e registre 1 feedback para começar.
          </div>
        )}
      </div>
    </Card>
  );
}

export default function PdiPerformance() {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();

  if (!user) return null;
  if (!companyId) {
    return (
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">PDI & Performance</div>
        <p className="mt-1 text-sm text-muted-foreground">Você precisa estar vinculado a uma empresa para usar este módulo.</p>
      </Card>
    );
  }

  const { data: enabled = false, isLoading: loadingEnabled } = useQuery({
    queryKey: ["company-module", companyId, MODULE_KEY],
    queryFn: () => isCompanyModuleEnabled(companyId, MODULE_KEY),
    enabled: user.role !== "MASTERADMIN",
  });

  const moduleEnabled = user.role === "MASTERADMIN" ? true : enabled;

  const canManage = user.role === "HEAD" || user.role === "ADMIN" || user.role === "MASTERADMIN";

  const selectedUserId = params.get("user") || user.id;

  const canEditSelected = useMemo(() => {
    if (user.role === "MASTERADMIN") return true;
    if (selectedUserId === user.id) return true;
    if (user.role === "ADMIN") return true;
    // HEAD: RLS will enforce, but we keep UI intent.
    if (user.role === "HEAD") return true;
    return false;
  }, [user.role, selectedUserId, user.id]);

  const { data: selectedProfile } = useQuery({
    queryKey: ["pdi", "profile", companyId, selectedUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,name,email,job_title,manager_id")
        .eq("id", selectedUserId)
        .maybeSingle();
      if (error) throw error;
      return data as any as { id: string; name: string | null; email: string; job_title: string | null; manager_id: string | null } | null;
    },
    enabled: !!selectedUserId,
  });

  const { data: myCheckins = [] } = useQuery({
    queryKey: ["pdi", "checkins", companyId, selectedUserId],
    queryFn: () => listCheckins(companyId, selectedUserId, { limit: 40 }),
    enabled: moduleEnabled,
  });

  const { data: myFeedbacks = [] } = useQuery({
    queryKey: ["pdi", "feedbacks", companyId, selectedUserId],
    queryFn: () => listFeedback(companyId, selectedUserId, { limit: 40 }),
    enabled: moduleEnabled,
  });

  const { data: myOneOnOnes = [] } = useQuery({
    queryKey: ["pdi", "1on1", companyId, selectedUserId],
    queryFn: () => listOneOnOnes(companyId, selectedUserId, { limit: 40 }),
    enabled: moduleEnabled,
  });

  const { data: manualEvents = [] } = useQuery({
    queryKey: ["pdi", "career", companyId, selectedUserId],
    queryFn: () => listCareerEvents(companyId, selectedUserId, { limit: 50 }),
    enabled: moduleEnabled,
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ["pdi", "certificates", selectedUserId],
    queryFn: () => getCertificatesForUser(selectedUserId),
    enabled: moduleEnabled,
  });

  const { data: achievedObjectives = [] } = useQuery({
    queryKey: ["pdi", "okr-achieved", companyId, selectedUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("okr_objectives")
        .select("id,title,status,achieved_at")
        .eq("owner_user_id", selectedUserId)
        .eq("status", "ACHIEVED")
        .order("achieved_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string; status: string; achieved_at: string | null }>;
    },
    enabled: moduleEnabled,
  });

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    for (const c of myCheckins) {
      items.push({
        id: `checkin:${c.id}`,
        at: c.created_at,
        kind: "CHECKIN",
        title: `Check-in — energia ${c.energy}/10 • motivação ${c.motivation}/10`,
        subtitle: c.needs_help ? "Sinalizou que precisa de ajuda." : undefined,
      });
    }

    for (const o of myOneOnOnes) {
      items.push({
        id: `1on1:${o.id}`,
        at: `${o.occurred_at}T12:00:00.000Z`,
        kind: "ONEONONE",
        title: `1:1 registrado`,
        subtitle: o.next_steps ? `Próximos passos: ${o.next_steps}` : o.actions ? `Ações: ${o.actions}` : undefined,
      });
    }

    for (const f of myFeedbacks) {
      items.push({
        id: `fb:${f.id}`,
        at: f.created_at,
        kind: "FEEDBACK",
        title: `Feedback — ${String(f.kind).toLowerCase()}`,
        subtitle: f.message,
      });
    }

    for (const e of manualEvents) {
      items.push({
        id: `career:${e.id}`,
        at: e.occurred_at ? `${e.occurred_at}T12:00:00.000Z` : e.created_at,
        kind: "MARCO",
        title: e.title,
        subtitle: e.description ?? undefined,
      });
    }

    for (const cert of certificates) {
      items.push({
        id: `cert:${cert.id}`,
        at: cert.issued_at,
        kind: "TRILHA",
        title: `Trilha concluída — ${cert.snapshot_track_title}`,
        subtitle: `Certificado ${cert.certificate_code}`,
      });
    }

    for (const okr of achievedObjectives) {
      const at = okr.achieved_at ? okr.achieved_at : null;
      items.push({
        id: `okr:${okr.id}`,
        at: at ? at : new Date().toISOString(),
        kind: "OKR",
        title: `Meta atingida — ${okr.title}`,
      });
    }

    return items
      .filter((i) => !!i.at)
      .sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }, [myCheckins, myOneOnOnes, myFeedbacks, manualEvents, certificates, achievedObjectives]);

  // Manager view data
  const { data: team = [] } = useQuery({
    queryKey: ["pdi", "team", companyId, user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,name,email,job_title,manager_id")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string | null; email: string; job_title: string | null; manager_id: string | null }>;
    },
    enabled: moduleEnabled && canManage,
  });

  const teamIds = useMemo(() => team.map((p) => p.id).filter((id) => id !== user.id), [team, user.id]);

  const { data: recentTeamCheckins = [] } = useQuery({
    queryKey: ["pdi", "team", "checkins", companyId, teamIds.join(",")],
    queryFn: () => {
      const sinceIso = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
      return listRecentCheckinsForUsers(companyId, teamIds, { sinceIso });
    },
    enabled: moduleEnabled && canManage && teamIds.length > 0,
  });

  const { data: recentTeamOneOnOnes = [] } = useQuery({
    queryKey: ["pdi", "team", "1on1", companyId, teamIds.join(",")],
    queryFn: () => {
      const sinceIso = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
      return listOneOnOnesForEmployees(companyId, teamIds, { sinceIso });
    },
    enabled: moduleEnabled && canManage && teamIds.length > 0,
  });

  const { data: teamPdis = [] } = useQuery({
    queryKey: ["pdi", "team", "pdis", companyId, teamIds.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pdi_plans")
        .select("id,user_id,updated_at")
        .eq("tenant_id", companyId)
        .in("user_id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"]);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; user_id: string; updated_at: string }>;
    },
    enabled: moduleEnabled && canManage && teamIds.length > 0,
  });

  const byUserCheckins = useMemo(() => {
    const m = new Map<string, DbCheckin[]>();
    for (const c of recentTeamCheckins) {
      const arr = m.get(c.user_id) ?? [];
      arr.push(c);
      m.set(c.user_id, arr);
    }
    for (const [k, arr] of m.entries()) arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return m;
  }, [recentTeamCheckins]);

  const byEmployee1on1 = useMemo(() => {
    const m = new Map<string, DbOneOnOne[]>();
    for (const o of recentTeamOneOnOnes) {
      const arr = m.get(o.employee_id) ?? [];
      arr.push(o);
      m.set(o.employee_id, arr);
    }
    for (const [k, arr] of m.entries()) arr.sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at)));
    return m;
  }, [recentTeamOneOnOnes]);

  const pdiByUser = useMemo(() => new Map(teamPdis.map((p) => [p.user_id, p] as const)), [teamPdis]);

  const teamRows = useMemo(() => {
    const now = Date.now();
    const ONEONONE_LIMIT_DAYS = 21;
    const CHECKIN_LIMIT_DAYS = 14;
    const PDI_LIMIT_DAYS = 45;

    return team
      .filter((p) => p.id !== user.id)
      .map((p) => {
        const lastCheckin = byUserCheckins.get(p.id)?.[0] ?? null;
        const last1on1 = byEmployee1on1.get(p.id)?.[0] ?? null;
        const pdi = pdiByUser.get(p.id) ?? null;

        const last1on1At = last1on1?.occurred_at ? new Date(`${last1on1.occurred_at}T12:00:00.000Z`).getTime() : null;
        const lastCheckinAt = lastCheckin?.created_at ? new Date(lastCheckin.created_at).getTime() : null;
        const pdiAt = pdi?.updated_at ? new Date(pdi.updated_at).getTime() : null;

        const needs1on1 = !last1on1At || now - last1on1At > ONEONONE_LIMIT_DAYS * 86400000;
        const needsCheckin = !lastCheckinAt || now - lastCheckinAt > CHECKIN_LIMIT_DAYS * 86400000;
        const pdiStale = !!pdiAt && now - pdiAt > PDI_LIMIT_DAYS * 86400000;
        const lowEnergy = !!lastCheckin && lastCheckin.energy <= 4;

        return {
          person: p,
          lastCheckin,
          last1on1,
          pdi,
          flags: {
            needs1on1,
            needsCheckin,
            pdiStale,
            lowEnergy,
          },
        };
      });
  }, [team, user.id, byUserCheckins, byEmployee1on1, pdiByUser]);

  const teamStats = useMemo(() => {
    const rows = teamRows;
    const pdiActive = rows.filter((r) => !!r.pdi).length;
    const checkinsRecent = rows.filter((r) => !!r.lastCheckin).length;
    const pending1on1 = rows.filter((r) => r.flags.needs1on1).length;
    const avgEnergy = (() => {
      const energies = rows.map((r) => r.lastCheckin?.energy).filter((n): n is number => typeof n === "number");
      if (!energies.length) return null;
      return Math.round((energies.reduce((a, b) => a + b, 0) / energies.length) * 10) / 10;
    })();

    return { pdiActive, checkinsRecent, pending1on1, avgEnergy };
  }, [teamRows]);

  if (!moduleEnabled) {
    return (
      <div className="grid gap-6">
        <Card className="relative overflow-hidden rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white ring-1 ring-[color:var(--sinaxys-border)]">
                <Handshake className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" />
              </span>
              PDI & Performance
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">Módulo desativado</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Este módulo é ativável por empresa. Peça ao admin para habilitar em <span className="font-medium">Admin → Empresa & Marca</span>.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {user.role === "ADMIN" ? (
                <Button asChild className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                  <Link to="/admin/brand">Abrir configurações</Link>
                </Button>
              ) : null}
              {loadingEnabled ? (
                <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">carregando…</Badge>
              ) : null}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const selectedName = selectedProfile?.name?.trim() || selectedProfile?.email || "Colaborador";

  const defaultFeedbackTo = selectedUserId === user.id ? user.managerId ?? user.id : selectedUserId;
  const feedbackTargets = useMemo(() => {
    const opts: Array<{ id: string; label: string }> = [];
    if (user.managerId) opts.push({ id: user.managerId, label: "Meu gestor" });
    opts.push({ id: user.id, label: "Eu" });
    if (canManage) {
      for (const r of teamRows.slice(0, 50)) {
        opts.push({ id: r.person.id, label: r.person.name?.trim() || r.person.email });
      }
    }
    // unique
    return Array.from(new Map(opts.map((o) => [o.id, o])).values());
  }, [user.managerId, user.id, canManage, teamRows]);

  const lastCheckin = myCheckins[0] ?? null;

  const headerSubtitle = selectedUserId === user.id
    ? "Seu painel vivo: check-ins, PDI, 1:1 e feedback contínuo."
    : `Jornada de ${selectedName}: sinais de energia, PDI e histórico.`;

  const mainManagerId = selectedProfile?.manager_id ?? user.id;

  return (
    <div className="grid gap-6">
      <Card className="relative overflow-hidden rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white ring-1 ring-[color:var(--sinaxys-border)]">
                <Handshake className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" />
              </span>
              PDI & Performance
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)] sm:text-3xl">{selectedName}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{headerSubtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PdiEditorDialog
              tenantId={companyId}
              userId={selectedUserId}
              canEdit={canEditSelected}
              label={selectedUserId === user.id ? "Editar meu PDI" : "Abrir PDI"}
              seedCurrentPosition={selectedProfile?.job_title ?? null}
            />

            {selectedUserId !== user.id && canManage ? (
              <Button
                variant="outline"
                className="h-11 rounded-xl bg-white"
                onClick={() => {
                  params.delete("user");
                  setParams(params, { replace: true });
                }}
              >
                Voltar para mim
              </Button>
            ) : null}
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-4 md:grid-cols-3">
          <Pill
            label="Último check-in"
            value={lastCheckin ? shortDateLabel(lastCheckin.created_at) : "—"}
            icon={<CalendarDays className="h-5 w-5" />}
          />
          <Pill
            label="Energia"
            value={lastCheckin ? `${lastCheckin.energy}/10` : "—"}
            icon={<LineChart className="h-5 w-5" />}
          />
          <Pill
            label="Motivação"
            value={lastCheckin ? `${lastCheckin.motivation}/10` : "—"}
            icon={<Sparkles className="h-5 w-5" />}
          />
        </div>
      </Card>

      <Tabs defaultValue="me" className="grid gap-4">
        <TabsList className="w-full justify-start rounded-2xl bg-white p-1 ring-1 ring-[color:var(--sinaxys-border)]">
          <TabsTrigger value="me" className="rounded-xl">
            Minha visão
          </TabsTrigger>
          {canManage ? (
            <TabsTrigger value="team" className="rounded-xl">
              Gestão
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="me" className="m-0 grid gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {selectedUserId === user.id ? <QuickCheckinCard tenantId={companyId} userId={user.id} /> : null}

            <div className="grid gap-6">
              <FeedbackComposer
                tenantId={companyId}
                fromUserId={user.id}
                toUserOptions={feedbackTargets}
                defaultToUserId={defaultFeedbackTo}
              />

              {selectedUserId === user.id && user.managerId ? (
                <OneOnOneDialog
                  tenantId={companyId}
                  employeeId={user.id}
                  managerId={user.managerId}
                  createdByUserId={user.id}
                  triggerLabel="Registrar 1:1 com meu gestor"
                />
              ) : selectedUserId !== user.id && canManage ? (
                <OneOnOneDialog
                  tenantId={companyId}
                  employeeId={selectedUserId}
                  managerId={user.id}
                  createdByUserId={user.id}
                  triggerLabel="Registrar 1:1 com este colaborador"
                />
              ) : null}

              <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Histórico rápido</div>
                    <p className="mt-1 text-sm text-muted-foreground">Últimos check-ins, feedbacks e 1:1.</p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                    <Users className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                  </div>
                </div>

                <Separator className="my-5" />

                <div className="grid gap-3">
                  <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check-ins</div>
                    <div className="mt-2 grid gap-2">
                      {myCheckins.slice(0, 3).map((c) => (
                        <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-[color:var(--sinaxys-border)]">
                          <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">
                            {shortDateLabel(c.created_at)}
                            <span className="ml-2 text-xs text-muted-foreground">energia {c.energy}/10</span>
                          </div>
                          <Badge
                            className={
                              "rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white " +
                              (toneFromEnergy(c.energy) === "destructive" ? "ring-1 ring-red-200" : toneFromEnergy(c.energy) === "warn" ? "ring-1 ring-amber-200" : "ring-1 ring-emerald-200")
                            }
                          >
                            motivação {c.motivation}/10
                          </Badge>
                        </div>
                      ))}
                      {!myCheckins.length ? (
                        <div className="text-sm text-muted-foreground">Sem check-ins ainda.</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Feedbacks</div>
                    <div className="mt-2 grid gap-2">
                      {myFeedbacks.slice(0, 3).map((f) => (
                        <div key={f.id} className="rounded-xl bg-white px-3 py-2 ring-1 ring-[color:var(--sinaxys-border)]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">{String(f.kind).toLowerCase()}</div>
                            <div className="text-xs text-muted-foreground">{shortDateLabel(f.created_at)}</div>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">{f.message}</div>
                        </div>
                      ))}
                      {!myFeedbacks.length ? (
                        <div className="text-sm text-muted-foreground">Sem feedbacks ainda.</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">1:1</div>
                    <div className="mt-2 grid gap-2">
                      {myOneOnOnes.slice(0, 3).map((m) => (
                        <div key={m.id} className="rounded-xl bg-white px-3 py-2 ring-1 ring-[color:var(--sinaxys-border)]">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">{longDateLabel(m.occurred_at)}</div>
                            <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">1:1</Badge>
                          </div>
                          {m.next_steps ? <div className="mt-1 text-sm text-muted-foreground">Próximos: {m.next_steps}</div> : null}
                        </div>
                      ))}
                      {!myOneOnOnes.length ? (
                        <div className="text-sm text-muted-foreground">Sem 1:1 registrados ainda.</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <Timeline items={timeline} />
        </TabsContent>

        {canManage ? (
          <TabsContent value="team" className="m-0 grid gap-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Pill label="PDIs ativos" value={`${teamStats.pdiActive}`} icon={<Pencil className="h-5 w-5" />} />
              <Pill label="Check-ins recentes" value={`${teamStats.checkinsRecent}`} icon={<ClipboardList className="h-5 w-5" />} />
              <Pill label="Energia média" value={teamStats.avgEnergy !== null ? String(teamStats.avgEnergy) : "—"} icon={<LineChart className="h-5 w-5" />} />
              <Pill label="1:1 pendentes" value={`${teamStats.pending1on1}`} icon={<Handshake className="h-5 w-5" />} />
            </div>

            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Seu time</div>
                  <p className="mt-1 text-sm text-muted-foreground">Alertas leves para manter o ritmo.</p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                  <Users className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                </div>
              </div>

              <Separator className="my-5" />

              <div className="grid gap-3">
                {teamRows.length ? (
                  teamRows.map((r) => {
                    const open = selectedUserId === r.person.id;
                    const alerts = [
                      r.flags.needs1on1 ? "1:1" : null,
                      r.flags.needsCheckin ? "check-in" : null,
                      r.flags.lowEnergy ? "energia baixa" : null,
                      r.flags.pdiStale ? "PDI parado" : null,
                    ].filter(Boolean) as string[];

                    return (
                      <button
                        key={r.person.id}
                        type="button"
                        onClick={() => {
                          params.set("user", r.person.id);
                          setParams(params, { replace: true });
                          toast({ title: "Abrindo jornada", description: r.person.name?.trim() || r.person.email });
                        }}
                        className={
                          "w-full rounded-2xl border p-4 text-left transition " +
                          (open
                            ? "border-[color:var(--sinaxys-primary)] bg-[color:var(--sinaxys-tint)]/40"
                            : "border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] hover:bg-[color:var(--sinaxys-tint)]/35")
                        }
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                              {r.person.name?.trim() || r.person.email}
                            </div>
                            <div className="mt-1 truncate text-xs text-muted-foreground">{r.person.job_title ?? "sem cargo"}</div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                              energia {r.lastCheckin ? `${r.lastCheckin.energy}/10` : "—"}
                            </Badge>
                            <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                              1:1 {r.last1on1 ? shortDateLabel(r.last1on1.occurred_at) : "—"}
                            </Badge>
                            {alerts.length ? (
                              <Badge className="rounded-full bg-amber-50 text-amber-900 hover:bg-amber-50">{alerts.join(" • ")}</Badge>
                            ) : (
                              <Badge className="rounded-full bg-emerald-50 text-emerald-900 hover:bg-emerald-50">ok</Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Sem time visível para você.</div>
                )}
              </div>
            </Card>

            {selectedUserId !== user.id ? <Timeline items={timeline} /> : null}
          </TabsContent>
        ) : null}
      </Tabs>

      <div className="text-xs text-muted-foreground">
        Dica: o módulo é independente de OKRs e Trilhas — mas quando existirem, marcos como "meta atingida" e "trilha concluída" entram automaticamente no histórico.
      </div>
    </div>
  );
}