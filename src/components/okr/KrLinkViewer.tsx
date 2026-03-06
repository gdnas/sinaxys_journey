import { ArrowRight, Link2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import type { DbOkrObjective, DbOkrKeyResult } from "@/lib/okrDb";

interface KrLinkViewerProps {
  parentKr: DbOkrKeyResult;
  parentObjective?: DbOkrObjective | null;
  childObjectives: DbOkrObjective[];
  childKrs: DbOkrKeyResult[];
}

export function KrLinkViewer({
  parentKr,
  parentObjective,
  childObjectives,
  childKrs,
}: KrLinkViewerProps) {
  return (
    <Card className="overflow-hidden rounded-2xl border-[color:var(--sinaxys-border)] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[color:var(--sinaxys-border)] bg-gradient-to-r from-blue-50 to-white px-5 py-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
          <span className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Vínculos de Alinhamento</span>
        </div>
        <Badge variant="outline" className="bg-white">
          {childObjectives.length} objetivo{childObjectives.length !== 1 ? "s" : ""} vinculado{childObjectives.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="p-5">
        {/* Parent KR */}
        <div className="mb-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Resultado-chave Parent
          </div>
          <div className="rounded-xl bg-slate-50 border border-[color:var(--sinaxys-border)] p-4">
            <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">
              {parentKr.title}
            </div>
            {parentObjective && (
              <div className="mt-2 text-xs text-muted-foreground">
                Objetivo: {parentObjective.title}
              </div>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center py-2">
          <ArrowRight className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
        </div>

        {/* Child Objectives */}
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Objetivos Vinculados
          </div>
          <div className="space-y-3">
            {childObjectives.length === 0 ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center text-sm text-amber-900">
                Nenhum objetivo vinculado a este KR
              </div>
            ) : (
              childObjectives.map((objective) => {
                const objectiveKrs = childKrs.filter((kr) => kr.objective_id === objective.id);
                
                return (
                  <div
                    key={objective.id}
                    className="rounded-xl border border-[color:var(--sinaxys-border)] bg-white p-4 transition hover:shadow-md"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                            {objective.title}
                          </div>
                          {objective.tier && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                objective.tier === "TIER1"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-purple-50 text-purple-700 border-purple-200"
                              }`}
                            >
                              {objective.tier}
                            </Badge>
                          )}
                          {objective.level && (
                            <Badge variant="outline" className="text-xs bg-slate-50">
                              {objective.level}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {objectiveKrs.length > 0 && (
                      <>
                        <Separator className="my-3" />
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            KRs do objetivo ({objectiveKrs.length}):
                          </div>
                          <div className="space-y-2">
                            {objectiveKrs.map((kr) => (
                              <div
                                key={kr.id}
                                className="flex items-start gap-2 rounded-lg bg-slate-50 p-2"
                              >
                                <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--sinaxys-primary)]" />
                                <div className="text-sm text-[color:var(--sinaxys-ink)]">
                                  {kr.title}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
