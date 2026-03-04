import { TierBadge } from "@/components/okr";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronDown, ChevronUp, KeyRound, Link2, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

import { krProgressPct, listKeyResults, listOkrObjectivesByIds, type DbOkrKeyResult, type DbOkrObjective, type ObjectiveLevel } from "@/lib/okrDb";
import { listLinkedObjectivesByKrIds } from "@/lib/okrAlignmentDb";
import type { DbDepartment } from "@/lib/departmentsDb";
import { objectiveAccent, objectiveLevelLabel, objectiveTypeBadgeClass, objectiveTypeLabel } from "@/lib/okrUi";
import { KrEditDialog } from "@/components/okr/KrEditDialog";

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
      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
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
  companyId?: string;
  currentUserId?: string;
  isAdminish?: boolean;
  departments?: DbDepartment[];
  byUserId?: Map<string, { name: string; monthlyCostBRL?: number | null; departmentId?: string | null }>;
  onRequestEditObjective?: (objective: DbOkrObjective) => void;
  onRequestDeleteObjective?: (objectiveId: string) => void;
  onRequestAddKr?: (objectiveId: string) => void;
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
    companyId,
    currentUserId,
    isAdminish,
    departments,
    byUserId,
    onRequestEditObjective,
    onRequestDeleteObjective,
    onRequestAddKr,
  } = props;

  const [open, setOpen] = useState(false);
  const [editingKr, setEditingKr] = useState<DbOkrKeyResult | null>(null);
  const [openKrIds, setOpenKrIds] = useState<Set<string>>(() => new Set());

  const accent = objectiveAccent(objective.level);

  const { data: krs = [], isFetching } = useQuery({
    queryKey: ["okr-krs", objective.id],
    enabled: open,
    queryFn: () => listKeyResults(objective.id),
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
                <TierBadge tier={objective.level === "COMPANY" ? "TIER1" : "TIER2"} size="sm" />
                {levelBadge}
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

              {canWriteObjective && onAddKr ? (
                <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl bg-white" onClick={onAddKr} aria-label="Adicionar KR">
                  <Plus className="h-4 w-4" />
                </Button>
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

                {!isFetching && !krs.length ? (
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 text-sm text-muted-foreground">
                    Nenhum KR neste objetivo ainda.
                  </div>
                ) : null}

                {krs.map((kr) => {
                  const pct = krProgressPct(kr);
                  const meta = kr.kind === "METRIC"
                    ? `${kr.current_value ?? "—"} / ${kr.target_value}` : kr.metric_unit;
                  const isDone = kr.achieved;

                  return (
                    <div key={kr.id} className="grid gap-2">
                      <div
                        className="group rounded-2xl border bg-white p-4 transition"
                        style={{ borderColor: accent.border as any }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.borderColor = String(accent.accent);
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.borderColor = String(accent.border);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xs text-muted-foreground">
                            {meta}
                          </span>
                          <span className="font-semibold text-[color:var(--sinaxys-ink)]">
                            {kr.title}
                          </span>
                          {isDone ? (
                            <span className="text-green-600 dark:text-green-400 font-medium text-sm">✓</span>
                          ) : null}
                          <TierBadge tier={objective.level === "COMPANY" ? "TIER1" : "TIER2"} size="sm" />
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">
                            {meta}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[color:var(--sinaxys-ink)]">
                              {kr.title}
                            </span>
                            <TierBadge tier={objective.level === "COMPANY" ? "TIER1" : "TIER2"} size="sm" />
                          </div>
                          <div className="flex items-center gap-2">
                            {pct !== null ? (
                              <span className="font-semibold text-[color:var(--sinaxys-ink)]">
                                {pct}%
                              </span>
                            ) : null}
                            {isDone ? (
                              <span className="text-green-600 dark:text-green-400 font-medium text-sm">✓</span>
                            ) : null}
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
                                  onAddKr={canWrite && onRequestAddKr ? () => onRequestAddKr(o.id) : undefined}
                                  onRequestEditObjective={onRequestEditObjective}
                                  onRequestDeleteObjective={onRequestDeleteObjective}
                                  onRequestAddKr={onRequestAddKr}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
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
    </>
  );
}