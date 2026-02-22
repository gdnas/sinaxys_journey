import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

import { krProgressPct, listKeyResults, type DbOkrKeyResult, type DbOkrObjective } from "@/lib/okrDb";
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
}) {
  const { objective, ownerName, krCount, avgProgressPct, levelBadge, canWriteObjective, openHref, onEdit, onDelete, onAddKr, companyId, currentUserId } = props;

  const [open, setOpen] = useState(false);
  const [editingKr, setEditingKr] = useState<DbOkrKeyResult | null>(null);

  const { data: krs = [], isFetching } = useQuery({
    queryKey: ["okr-krs", objective.id],
    enabled: open,
    queryFn: () => listKeyResults(objective.id),
  });

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="overflow-hidden rounded-2xl border border-[color:var(--sinaxys-border)] bg-white">
          {/* Header */}
          <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {levelBadge}
                <Link
                  to={openHref}
                  className="min-w-0 flex-1 truncate text-sm font-semibold text-[color:var(--sinaxys-ink)] hover:underline"
                >
                  {objective.title}
                </Link>
                {objective.status === "ACHIEVED" ? (
                  <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
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
                      "dark:bg-[hsl(var(--secondary))] dark:ring-border [&>div]:bg-[color:var(--sinaxys-primary)]"
                    }
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
            <Separator />
            <div className="bg-[color:var(--sinaxys-bg)]/60 p-4">
              <div className="grid gap-3">
                {isFetching ? <div className="text-sm text-muted-foreground">Carregando KRs…</div> : null}

                {!isFetching && !krs.length ? (
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 text-sm text-muted-foreground">
                    Nenhum KR neste objetivo ainda.
                  </div>
                ) : null}

                {krs.map((kr) => {
                  const pct = krProgressPct(kr);
                  const meta =
                    kr.kind === "METRIC"
                      ? `${kr.current_value ?? "—"} / ${kr.target_value ?? "—"}${kr.metric_unit ? ` ${kr.metric_unit}` : ""}`
                      : kr.achieved
                        ? "Concluído"
                        : "Em andamento";

                  return (
                    <button
                      key={kr.id}
                      type="button"
                      className="group rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 text-left transition hover:border-[color:var(--sinaxys-primary)]/40 hover:bg-white"
                      onClick={() => {
                        if (!companyId || !currentUserId) return;
                        setEditingKr(kr);
                      }}
                      aria-label={`Editar KR: ${kr.title}`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                              {kindLabel(kr.kind)}
                            </Badge>
                            <span className={"rounded-full px-2.5 py-1 text-[11px] font-semibold " + confidenceClass(kr.confidence)}>
                              {confidenceLabel(kr.confidence)}
                            </span>
                            <span className="text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100">
                              Clique para editar
                            </span>
                          </div>
                          <div className="mt-2 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{kr.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{meta}</div>
                        </div>

                        {typeof pct === "number" ? (
                          <div className="shrink-0 text-sm font-semibold text-[color:var(--sinaxys-ink)] sm:pt-1">{Math.round(pct)}%</div>
                        ) : null}
                      </div>

                      {typeof pct === "number" ? (
                        <Progress
                          value={pct}
                          className={
                            "mt-3 h-2 rounded-full bg-[color:var(--sinaxys-tint)]/70 ring-1 ring-[color:var(--sinaxys-border)]/70 " +
                            "dark:bg-[hsl(var(--secondary))] dark:ring-border [&>div]:bg-[color:var(--sinaxys-primary)]"
                          }
                        />
                      ) : null}
                    </button>
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