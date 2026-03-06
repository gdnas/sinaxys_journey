import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import type { DbDeliverableDateLog } from "@/lib/okrDb";

interface DeliverableTimelineProps {
  dateLogs: DbDeliverableDateLog[];
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Sem data definida";
  return format(new Date(dateStr), "dd MMM yyyy", { locale: ptBR });
}

function formatDateTime(dateStr: string) {
  return format(new Date(dateStr), "dd MMM yyyy, HH:mm", { locale: ptBR });
}

export function DeliverableTimeline({ dateLogs }: DeliverableTimelineProps) {
  if (!dateLogs || dateLogs.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        Nenhuma alteração de data registrada
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-[color:var(--sinaxys-border)]" />

      <div className="space-y-4">
        {dateLogs.map((log, index) => (
          <div key={log.id} className="relative pl-12">
            {/* Timeline dot */}
            <div className="absolute left-[15px] top-1 h-3 w-3 rounded-full border-2 border-white bg-[color:var(--sinaxys-primary)] shadow-sm" />

            <div className="rounded-xl border border-[color:var(--sinaxys-border)] bg-white p-4">
              {/* Header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Alteração #{dateLogs.length - index}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(log.created_at)}
                  </div>
                </div>
              </div>

              {/* Date Change */}
              <div className="mb-3 flex items-center gap-4 rounded-lg bg-slate-50 p-3">
                <div className="flex-1 min-w-0">
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Data anterior</div>
                  <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">
                    {formatDate(log.previous_date)}
                  </div>
                </div>

                <div className="text-[color:var(--sinaxys-primary)]">→</div>

                <div className="flex-1 min-w-0">
                  <div className="mb-1 text-xs font-medium text-[color:var(--sinaxys-primary)]">Nova data</div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">
                    {formatDate(log.new_date)}
                  </div>
                </div>
              </div>

              {/* Reason */}
              {log.reason && (
                <>
                  <Separator className="my-3" />
                  <div>
                    <div className="mb-1 text-xs font-medium text-muted-foreground">Motivo</div>
                    <p className="text-sm text-[color:var(--sinaxys-ink)]">{log.reason}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}