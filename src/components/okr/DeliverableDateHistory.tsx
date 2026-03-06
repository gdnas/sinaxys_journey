import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, Calendar, Clock, User } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

import type { DbDeliverableDateLog } from "@/lib/okrDb";
import type { DbProfile } from "@/lib/profilesDb";

interface DeliverableDateHistoryProps {
  dateLogs: DbDeliverableDateLog[];
  profiles?: Map<string, DbProfile>;
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Sem data definida";
  return format(new Date(dateStr), "dd MMM yyyy", { locale: ptBR });
}

function formatDateTime(dateStr: string) {
  return format(new Date(dateStr), "dd MMM yyyy, HH:mm", { locale: ptBR });
}

export function DeliverableDateHistory({ dateLogs, profiles }: DeliverableDateHistoryProps) {
  if (!dateLogs || dateLogs.length === 0) {
    return (
      <Card className="rounded-2xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="text-center text-sm text-muted-foreground">
          <Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          Nenhuma alteração de data registrada
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {dateLogs.map((log, index) => {
        const profile = profiles?.get(log.changed_by_user_id);
        
        return (
          <div key={log.id} className="relative">
            {/* Timeline line */}
            {index < dateLogs.length - 1 && (
              <div className="absolute left-[19px] top-10 h-full w-0.5 bg-[color:var(--sinaxys-border)]" />
            )}

            <Card className="ml-0 rounded-2xl border-[color:var(--sinaxys-border)] bg-white p-4 transition hover:shadow-md">
              <div className="flex gap-4">
                {/* Avatar */}
                <div className="shrink-0">
                  <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] text-sm font-semibold">
                      {getInitials(profile?.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                        {profile?.name || profile?.email || "Usuário"}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        Alteração de data
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(log.created_at)}
                    </div>
                  </div>

                  {/* Date Change */}
                  <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        Data anterior
                      </div>
                      <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">
                        {formatDate(log.previous_date)}
                      </div>
                    </div>

                    <ArrowRight className="shrink-0 h-4 w-4 text-[color:var(--sinaxys-primary)]" />

                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex items-center gap-2 text-xs font-medium text-[color:var(--sinaxys-primary)]">
                        <Calendar className="h-3.5 w-3.5" />
                        Nova data
                      </div>
                      <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">
                        {formatDate(log.new_date)}
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  {log.reason && (
                    <div className="rounded-xl bg-[color:var(--sinaxys-bg)] p-3">
                      <div className="text-xs text-muted-foreground">Motivo da alteração:</div>
                      <p className="mt-1 text-sm text-[color:var(--sinaxys-ink)]">{log.reason}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
