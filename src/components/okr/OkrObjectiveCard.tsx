import { TierBadge } from "@/components/okr";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ChevronDown, ChevronUp, KeyRound, Link2, Pencil, Plus, Trash2, Check, User as UserIcon, Building2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { krProgressPct, listKeyResults, listOkrObjectivesByIds, type DbOkrKeyResult, type DbOkrObjective, type ObjectiveLevel,
  listPerformanceIndicators, createPerformanceIndicator, updatePerformanceIndicator, deletePerformanceIndicator, piProgressPct, type DbPerformanceIndicator,
} from "@/lib/okrDb";
import { listLinkedObjectivesByKrIds } from "@/lib/okrAlignmentDb";
import type { DbDepartment } from "@/lib/departmentsDb";
import { objectiveAccent, objectiveLevelLabel, objectiveTypeBadgeClass, objectiveTypeLabel } from "@/lib/okrUi";
import { KrEditDialog } from "@/components/okr/KrEditDialog";
import { useToast } from "@/hooks/use-toast";

function kindLabel(kind: DbOkrKeyResult["kind"]) {
  return kind === "METRIC" ? "Métrica" : "Entregável";
}

function confidenceLabel(confidence: DbOkrKeyResult["confidence"]) {
  if (confidence === "ON_TRACK") return "No ritmo";
  if (confidence === "AT_RISK") return "Atenção";
  return "Fora do ritmo";
}

function confidenceClass(confidence: DbOkrKeyResult["confidence"]) {
  if (confidence === "ON_TRACK") return "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-200";
  if (confidence === "AT_RISK") return "bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/20 dark:text-amber-200";
  return "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20 dark:text-rose-200";
}

function defaultLevelBadge(level: ObjectiveLevel) {
  return (
    <div className="flex items-center gap-2">
      <span className={"rounded-full px-3 py-1 text-[11px] font-semibold " + objectiveTypeBadgeClass(level)}>{objectiveTypeLabel(level)}</span>
      <span className={"rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]"}>
        {objectiveLevelLabel(level)}
      </span>
    </div>
  );
}

export function OkrObjectiveCard(props: {
  objective: DbOkrObjective;
  ownerName: string;
  krCount: number;
  avgProgressPct: number | null;
  levelBadge: React.ReactNode;
  canWriteObjective: boolean;
  openHref: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddKr?: () => void;
  onRequestAddKr?: (objectiveId: string) => void;
  onRequestAddPi?: (objectiveId: string) => void;
  companyId?: string;
  currentUserId?: string;
  isAdminish?: boolean;
  departments?: DbDepartment[];
  byUserId?: Map<string, { name: string; monthlyCostBRL?: number | null; departmentId?: string | null }>;
  onRequestEditObjective?: (objective: DbOkrObjective) => void;
  onRequestDeleteObjective?: (objectiveId: string) => void;
}) {
  const {
    objective,
    ownerName,
    krCount,
    avgProgressPct,
    levelBadge,
    canWriteObjective,
    openHref,
    onEdit,
    onDelete,
    onAddKr,
    onRequestAddKr,
    onRequestAddPi,
    companyId,
    currentUserId,
    isAdminish,
    departments,
    byUserId,
    onRequestEditObjective,
    onRequestDeleteObjective,
    onRequestAddKr: onRequestAddKrProp,
  } = props;

  const [open, setOpen] = useState(false);
  const [editingKr, setEditingKr] = useState<DbOkrKeyResult | null>(null);
  const [openKrIds, setOpenKrIds] = useState<Set<string>>(() => new Set());

  const qc = useQueryClient();
  const { toast } = useToast();

  const accent = objectiveAccent(objective.level);

  const { data: krs = [], isFetching } = useQuery({
    queryKey: ["okr-krs", objective.id],
    enabled: open,
    queryFn: () => listKeyResults(objective.id),
  });

  const { data: pis = [] } = useQuery({
    queryKey: ["okr-pis", objective.id],
    enabled: open,
    queryFn: () => listPerformanceIndicators(objective.id),
  });

  const krIds = useMemo(() => krs.map((k) => k.id), [krs]);

  const { data: linkedObjectiveData } = useQuery({
    queryKey: ["okr-kr-linked-objectives", krIds.join(",")],
    enabled: open && objective.level === "COMPANY" && krIds.length > 0,
    queryFn: async () => {
      const links = await listLinkedObjectivesByKrIds(krIds);
      const uniqueObjectiveIds = Array.from(new Set(links.map((l) => l.objective_id)));
      const objectives = await listOkrObjectivesByIds(uniqueObjectiveIds);

      const objectivesById = new Map(objectives.map((o) => [o.id, o] as const));

      const linksByKrId = new Map<string, DbOkrObjective[]>();
      for (const l of links) {
        const o = objectivesById.get(l.objective_id);
        if (!o) continue;
        if (o.cycle_id !== objective.cycle_id) continue;
        if (o.level === "COMPANY") continue;
        const arr = linksByKrId.get(l.key_result_id) ?? [];
        arr.push(o);
        linksByKrId.set(l.key_result_id, arr);
      }

      for (const [krId, arr] of linksByKrId) {
        arr.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
        linksByKrId.set(krId, arr);
      }

      return { linksByKrId };
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: tier2StatsByObjectiveId = new Map<string, { count: number; pct: number | null }>() } = useQuery({
    queryKey: ["okr-tier2-stats", objective.id, krIds.join(",")],
    enabled: open && objective.level === "COMPANY" && krIds.length > 0,
    queryFn: async () => {
      const links = await listLinkedObjectivesByKrIds(krIds);
      const uniqueObjectiveIds = Array.from(new Set(links.map((l) => l.objective_id)));

      const m = new Map<string, { count: number; pct: number | null }>();
      await Promise.all(
        uniqueObjectiveIds.map(async (objectiveId) => {
          const krs = await listKeyResults(objectiveId);
          const pcts = krs
            .map((k) => krProgressPct(k))
            .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
          const pct = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
          m.set(objectiveId, { count: krs.length, pct });
        }),
      );

      return m;
    },
  });

  const deptNameById = useMemo(() => {
    return new Map((departments ?? []).map((d) => [d.id, d.name] as const));
  }, [departments]);

  const linksByKrId = linkedObjectiveData?.linksByKrId ?? new Map<string, DbOkrObjective[]>();

  async function handleDeleteKr(krId: string) {
    if (!companyId) return;
    if (!confirm("Excluir KR? Essa ação não pode ser desfeita.")) return;
    try {
      await (await import("@/lib/okrDb")).deleteKeyResultCascade(krId);
      await qc.invalidateQueries({ queryKey: ["okr-krs", objective.id] });
      await qc.invalidateQueries({ queryKey: ["okr-kr-stats", companyId] });
      toast({ title: "KR excluído" });
    } catch (e) {
      toast({ title: "Falha ao excluir", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  }

  async function handleDeletePi(piId: string) {
    if (!companyId) return;
    if (!confirm("Excluir KPI?")) return;
    try {
      await deletePerformanceIndicator(piId);
      await qc.invalidateQueries({ queryKey: ["okr-pis", objective.id] });
      toast({ title: "KPI excluído" });
    } catch (e) {
      toast({ title: "Falha ao excluir", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  }

  const [editingPi, setEditingPi] = useState<DbPerformanceIndicator | null>(null);
  const [piOpen, setPiOpen] = useState(false);
  const [piSaving, setPiSaving] = useState(false);
  const [piTitle, setPiTitle] = useState("");
  const [piKind, setPiKind] = useState<DbPerformanceIndicator["kind"]>("METRIC");
  const [piUnit, setPiUnit] = useState("");
  const [piStart, setPiStart] = useState<string>("");
  const [piCurrent, setPiCurrent] = useState<string>("");
  const [piTarget, setPiTarget] = useState<string>("");
  const [piDue, setPiDue] = useState<string>("");
  const [piConfidence, setPiConfidence] = useState<DbPerformanceIndicator["confidence"]>("ON_TRACK");

  function openNewPi(objectiveId?: string) {
    setEditingPi(null);
    setPiTitle("");
    setPiKind("METRIC");
    setPiUnit("");
    setPiStart("");
    setPiCurrent("");
    setPiTarget("");
    setPiDue("");
    setPiConfidence("ON_TRACK");
    setPiOpen(true);
  }

  function openEditPi(pi: DbPerformanceIndicator) {
    setEditingPi(pi);
    setPiTitle(pi.title);
    setPiKind(pi.kind);
    setPiUnit(pi.metric_unit ?? "");
    setPiStart(pi.start_value !== null ? String(pi.start_value) : "");
    setPiCurrent(pi.current_value !== null ? String(pi.current_value) : "");
    setPiTarget(pi.target_value !== null ? String(pi.target_value) : "");
    setPiDue(pi.due_at ?? "");
    setPiConfidence(pi.confidence);
    setPiOpen(true);
  }

  return (
    <>
      <Collapsible
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setOpenKrIds(new Set());
        }}
      >
        <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: accent.border as any }}>
          {/* Header */}
          <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <TierBadge tier={objective.level === "COMPANY" ? "TIER1" : "TIER2"} size="sm" />
                  {levelBadge}
                </div>
                <Link to={openHref} className="min-w-0 flex-1 truncate text-sm font-semibold text-[color:var(--sinaxys-ink)] hover:underline">
                  {objective.title}
                </Link>
                {objective.status === "ACHIEVED" ? (
                  <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)] hover:bg-white">
                    Atingido
                  </Badge>
                ) : null}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Dono: {ownerName}</span>
                <span>•</span>
                <span>{krCount} KRs</span>
              </div>

              {typeof avgProgressPct === "number" ? (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Evolução</span>
                    <span className="font-medium text-[color:var(--sinaxys-ink)]">{avgProgressPct}%</span>
                  </div>
                  <Progress
                    value={avgProgressPct}
                    className={
                      "mt-2 h-2 rounded-full bg-[color:var(--sinaxys-tint)]/70 ring-1 ring-[color:var(--sinaxys-border)]/70 " +
                      "dark:bg-[hsl(var(--secondary))] dark:ring-border"
                    }
                    style={{ ["--progress-accent" as any]: accent.accent }}
                  />
                </div>
              ) : null}
            </div>

            <div className="flex w-full items-center justify-end gap-2 md:w-auto">
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-xl bg-white"
                  aria-label={open ? "Recolher KRs" : "Expandir KRs"}
                  title={open ? "Recolher KRs" : "Ver KRs"}
                >
                  {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>

              {canWriteObjective && onEdit ? (
                <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl bg-white" onClick={onEdit} aria-label="Editar objetivo">
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : null}

              {canWriteObjective && onDelete ? (
                <Button
                  variant="outline"
                  size="icon"
                  className={
                    "h-11 w-11 rounded-xl border-destructive/40 bg-destructive/5 text-destructive " +
                    "hover:bg-destructive/10 hover:text-destructive " +
                    "dark:border-destructive/50 dark:bg-destructive/20 dark:hover:bg-destructive/25"
                  }
                  onClick={onDelete}
                  aria-label="Excluir objetivo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}

              {canWriteObjective ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl bg-white" aria-label="Adicionar">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-2">
                    <div className="grid gap-2">
                      <button
                        type="button"
                        className="rounded-md px-3 py-2 text-sm text-left hover:bg-accent/5"
                        onClick={() => {
                          setOpen(true);
                          setTimeout(() => onRequestAddKr && onRequestAddKr(objective.id), 50);
                        }}
                      >
                        Adicionar KR
                      </button>
                      <button
                        type="button"
                        className="rounded-md px-3 py-2 text-sm text-left hover:bg-accent/5"
                        onClick={() => {
                          // prefer parent handler, otherwise open our internal KPI dialog
                          if (onRequestAddPi) {
                            setOpen(true);
                            setTimeout(() => onRequestAddPi(objective.id), 50);
                          } else {
                            // open internal PI dialog
                            openNewPi(objective.id);
                          }
                        }}
                      >
                        Adicionar KPI
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : null}

              <Button asChild size="icon" className="h-11 w-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                <Link to={openHref} aria-label="Abrir objetivo">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <CollapsibleContent>
            <Separator style={{ backgroundColor: accent.border as any }} />
            <div className="p-4" style={{ backgroundColor: accent.soft as any }}>
              <div className="grid gap-3">
                {isFetching ? <div className="text-sm text-muted-foreground">Carregando KRs…</div> : null}

                {!isFetching && !krs.length && !pis.length ? (
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 text-sm text-muted-foreground">
                    Nenhum KR ou KPI neste objetivo ainda.
                  </div>
                ) : null}

                {krs.map((kr) => {
                  const pct = krProgressPct(kr);
                  const meta = kr.kind === "METRIC"
                    ? `${kr.current_value ?? "—"} / ${kr.target_value ?? "—"}` : kr.metric_unit;
                  const isDone = kr.achieved;
                  const aligned = linksByKrId.get(kr.id) ?? [];
                  const isKrOpen = openKrIds.has(kr.id);

                  const ownerName = kr.owner_user_id ? (byUserId?.get(kr.owner_user_id)?.name ?? "—") : "—";
                  const ownerDeptId = kr.owner_user_id ? byUserId?.get(kr.owner_user_id)?.departmentId ?? null : null;
                  const ownerDeptName = ownerDeptId ? deptNameById.get(ownerDeptId) ?? null : null;

                  return (
                    <div key={kr.id} className="grid gap-2">
                      <div
                        className="group rounded-2xl border bg-white p-4 transition cursor-pointer"
                        style={{ borderColor: accent.border as any }}
                        onClick={() => {
                          // If this is a strategic KR with linked team objectives, toggle the linked objectives view;
                          // otherwise open the KR editor.
                          if (objective.level === "COMPANY" && aligned.length > 0) {
                            const next = new Set(openKrIds);
                            if (next.has(kr.id)) next.delete(kr.id); else next.add(kr.id);
                            setOpenKrIds(next);
                          } else {
                            setEditingKr(kr);
                          }
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.borderColor = String(accent.accent);
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.borderColor = String(accent.border);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{meta}</span>
                              <span className="font-semibold text-[color:var(--sinaxys-ink)] line-clamp-2">{kr.title}</span>
                            </div>

                            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <UserIcon className="h-3.5 w-3.5" />
                                <span>{ownerName}</span>
                                {ownerDeptName ? (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">• <Building2 className="h-3 w-3" /> {ownerDeptName}</span>
                                ) : null}
                              </div>
                              <div>•</div>
                              {pct !== null ? <div>{pct}%</div> : <div>—</div>}
                            </div>

                            {pct !== null ? (
                              <div className="mt-2">
                                <Progress value={pct} className="h-2 rounded-full" style={{ ["--progress-accent" as any]: accent.accent }} />
                              </div>
                            ) : null}
                          </div>

                          <div className="ml-auto flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 rounded-xl bg-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingKr(kr);
                              }}
                              title="Editar KR"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 rounded-xl bg-destructive/5 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDeleteKr(kr.id);
                              }}
                              title="Excluir KR"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {objective.level === "COMPANY" && aligned.length && isKrOpen ? (
                        <div className="ml-4 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/70 p-3">
                          <div className="flex items-center gap-2 text-xs font-semibold text-[color:var(--sinaxys-ink)]">
                            <Link2 className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" />
                            OKRs de time alinhados a este KR
                          </div>
                          <div className="mt-3 grid gap-3">
                            {aligned.map((o) => {
                              const headName = byUserId?.get(o.owner_user_id)?.name ?? "—";
                              const st = tier2StatsByObjectiveId.get(o.id) ?? { count: 0, pct: null };
                              const canWrite = !!currentUserId && (o.owner_user_id === currentUserId || !!isAdminish);

                              return (
                                <OkrObjectiveCard
                                  key={o.id}
                                  objective={o}
                                  ownerName={headName}
                                  krCount={st.count}
                                  avgProgressPct={st.pct}
                                  levelBadge={defaultLevelBadge(o.level)}
                                  canWriteObjective={canWrite}
                                  openHref={`/okr/objetivos/${o.id}`}
                                  companyId={companyId}
                                  currentUserId={currentUserId}
                                  isAdminish={isAdminish}
                                  departments={departments}
                                  byUserId={byUserId}
                                  onEdit={canWrite && onRequestEditObjective ? () => onRequestEditObjective(o) : undefined}
                                  onDelete={canWrite && onRequestDeleteObjective ? () => onRequestDeleteObjective(o.id) : undefined}
                                  onAddKr={canWrite && onRequestAddKrProp ? () => onRequestAddKrProp(o.id) : undefined}
                                  onRequestEditObjective={onRequestEditObjective}
                                  onRequestDeleteObjective={onRequestDeleteObjective}
                                  onRequestAddKr={onRequestAddKrProp}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                {pis.map((pi) => {
                  const pct = piProgressPct(pi);
                  const ownerName = pi ? "—" : "—"; // can extend if owner present on PI

                  return (
                    <div key={pi.id} className="grid gap-2">
                      <div
                        className="group rounded-2xl border bg-white p-4 transition cursor-pointer"
                        style={{ borderColor: accent.border as any }}
                        onClick={() => openEditPi(pi)}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.borderColor = String(accent.accent);
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.borderColor = String(accent.border);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <KeyRound className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                              <span className="font-semibold text-[color:var(--sinaxys-ink)] line-clamp-2">{pi.title}</span>
                            </div>

                            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <UserIcon className="h-3.5 w-3.5" />
                                <span>{ownerName}</span>
                              </div>
                              <div>•</div>
                              {pct !== null ? <div>{pct}%</div> : <div>—</div>}
                            </div>

                            {pct !== null ? (
                              <div className="mt-2">
                                <Progress value={pct} className="h-2 rounded-full" style={{ ["--progress-accent" as any]: accent.accent }} />
                              </div>
                            ) : null}
                          </div>

                          <div className="ml-auto flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 rounded-xl bg-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditPi(pi);
                              }}
                              title="Editar KPI"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 rounded-xl bg-destructive/5 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDeletePi(pi.id);
                              }}
                              title="Excluir KPI"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {editingKr && companyId && currentUserId ? (
        <KrEditDialog
          open={!!editingKr}
          onOpenChange={(v) => {
            if (!v) setEditingKr(null);
          }}
          companyId={companyId}
          userId={currentUserId}
          kr={editingKr}
        />
      ) : null}

      <Dialog open={piOpen} onOpenChange={(v) => { setPiOpen(v); if (!v) setEditingPi(null); }}>
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingPi ? "Editar KPI" : "Novo KPI"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Input value={piTitle} onChange={(e) => setPiTitle(e.target.value)} placeholder="Título do KPI" />
            </div>

            <div className="grid gap-2">
              <Input value={piUnit} onChange={(e) => setPiUnit(e.target.value)} placeholder="Unidade (%, pts, R$)" />
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <Input value={piStart} onChange={(e) => setPiStart(e.target.value)} placeholder="Início" />
              <Input value={piCurrent} onChange={(e) => setPiCurrent(e.target.value)} placeholder="Atual" />
              <Input value={piTarget} onChange={(e) => setPiTarget(e.target.value)} placeholder="Meta" />
            </div>

            <div className="grid gap-2">
              <Input type="date" value={piDue} onChange={(e) => setPiDue(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setPiOpen(false)} disabled={piSaving}>Cancelar</Button>
            <Button className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white" disabled={piSaving || piTitle.trim().length < 6} onClick={async () => {
              if (piSaving) return;
              setPiSaving(true);
              try {
                const parseOrNull = (v: string) => {
                  const n = Number(String(v).replace(",", "."));
                  return Number.isFinite(n) ? n : null;
                };

                if (editingPi) {
                  await updatePerformanceIndicator(editingPi.id, {
                    title: piTitle,
                    kind: piKind,
                    metric_unit: piUnit || null,
                    start_value: parseOrNull(piStart),
                    current_value: parseOrNull(piCurrent),
                    target_value: parseOrNull(piTarget),
                    due_at: piDue || null,
                    confidence: piConfidence,
                  });

                  toast({ title: "KPI atualizado" });
                } else {
                  if (!companyId) throw new Error("CompanyId ausente");
                  await createPerformanceIndicator({
                    objective_id: objective.id,
                    title: piTitle,
                    kind: piKind,
                    metric_unit: piUnit || null,
                    start_value: parseOrNull(piStart),
                    current_value: parseOrNull(piCurrent),
                    target_value: parseOrNull(piTarget),
                    due_at: piDue || null,
                    confidence: piConfidence,
                    achieved: false,
                  });
                  toast({ title: "KPI criado" });
                }

                await qc.invalidateQueries({ queryKey: ["okr-pis", objective.id] });
                await qc.invalidateQueries({ queryKey: ["okr-kr-stats", companyId] });
                setPiOpen(false);
              } catch (e) {
                toast({ title: "Falha ao salvar KPI", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
              } finally {
                setPiSaving(false);
              }
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}