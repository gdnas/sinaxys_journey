import { useState } from "react";
import { Minus, Plus, ChevronUp, ChevronDown, ChevronRight, Check, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { listAuditLogs } from "@/lib/knowledgeDb";

type AuditLogEntry = {
  id: string;
  created_at: string;
  action: string;
  user_id: string;
  details: any;
  old_snapshot: any;
  new_snapshot: any;
};

export default function AuditLogPanel() {
  const { toast } = useToast();

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => listAuditLogs(),
  });

  const visibleLogs = logs.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const dateLogs = useMemo(() => {
    return visibleLogs.filter(log => {
      const d = new Date(log.created_at);
      return d.getDate() === new Date().getDate() && d.getMonth() === new Date().getMonth();
    });
  }, [visibleLogs]);

  return (
    <div className="grid gap-6">
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Histórico de Alterações</div>
            <p className="mt-1 text-sm text-muted-foreground">Todas as mudanças registradas no sistema.</p>
          </div>

          <Button
            className="h-9 rounded-xl"
            onClick={() => setExpandedLogId(null)}
          >
            <span className="sr-only">Fechar</span>
            {expandedLogId ? "Recolher" : "Expandir"}
          </Button>
        </div>
      </Card>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="h-[500px] overflow-y-auto">
          {visibleLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <span className="ml-4">Nenhuma alteração registrada ainda.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {dateLogs.map((log) => {
                const date = new Date(log.created_at).toLocaleString("pt-BR", { 
                  day: "2-digit", 
                  month: "long", 
                  year: "numeric" 
                  hour: "2-digit",
                  minute: "2-digit"
                });
                
                const entry = selectedEntry === log.id ? log : null;

                return (
                  <div key={log.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                    <button
                      type="button"
                      onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left hover:bg-[color:var(--sinaxys-tint)] transition"
                    >
                      <div className="flex-1 flex-col">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="rounded-full text-xs">
                            {date}
                          </Badge>
                          <span className="text-sm font-medium text-[color:var(--sinaxys-ink)]">{log.action}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Por {log.user_id}</span>
                        </div>
                      </div>

                      {expandedLogId === log.id ? (
                        <ChevronDown className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>

                  {expandedLogId === log.id && (
                    <div className="mt-3 space-y-3 border-t border-[color:var(--sinaxys-border)] rounded-2xl bg-[color:var(--sinaxys-bg)] p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Histórico</div>
                        <div className="text-xs text-muted-foreground">
                          Registrada em {new Date(log.created_at).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {log.user_id}
                        </Badge>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2">
                          <div className="text-xs text-muted-foreground">
                            Ação:
                            <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">{log.action}</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              Por {log.user_id}
                            </div>
                          </div>
                          <div className="flex flex-col gap-3">
                            <div>
                              <div className="text-xs text-muted-foreground">
                                Alterações:
                                <div className="mt-1 space-y-3 border-t border-[color:var(--sinaxys-border)] rounded-lg bg-[color:var(--sinaxys-bg)] p-3">
                                  {log.old_snapshot ? (
                                    <div key={log.id} className="space-y-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <Badge variant="secondary" className="text-xs">Antes</Badge>
                                        <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                                      </div>
                                      <div>
                                        <div className="text-sm text-muted-foreground">
                                          {Object.entries(log.old_snapshot).map(([key, value], idx) => (
                                            <div key={key} className="grid gap-2">
                                              <Label className="text-xs font-medium text-[color:var(--sinaxys-ink)]">{key}</Label>
                                              <div className="text-sm text-muted-foreground whitespace-pre-wrap break-all">
                                                {value}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-muted-foreground">Nenhum snapshot antigo.</div>
                                  )}
                                )}
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {selectedEntry && (
        <Dialog open={!!selectedEntry} onOpenChange={(open) => {
          if (!open) {
            setSelectedEntry(null);
          }
        }}>
          <DialogContent className="max-h-[80vh] max-w-[600px] overflow-y-auto rounded-3xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Alteração</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>ID</Label>
                <Input value={selectedEntry.id} readOnly className="h-11 rounded-xl" />
              </div>
              <div className="grid gap-2">
                <Label>Data e Hora</Label>
                <Input
                  value={new Date(selectedEntry.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  readOnly
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label>Usuário</Label>
                <Input value={selectedEntry.user_id} readOnly className="h-11 rounded-xl" />
              </div>
              <div className="grid gap-2">
                <Label>Ação</Label>
                <Input value={selectedEntry.action} readOnly className="h-11 rounded-xl" />
              </div>
              <div className="grid gap-3">
                <div>
                  <Label>Detalhes (Snapshot Antigo)</Label>
                  <Textarea
                    value={JSON.stringify(selectedEntry.old_snapshot, null, 2)}
                    readOnly
                    className="h-32 rounded-xl"
                  />
                </div>
                <div>
                  <Label>Detalhes (Snapshot Novo - Mudanças)</Label>
                  <Textarea
                    value={JSON.stringify(selectedEntry.new_snapshot, null, 2)}
                    readOnly
                    className="h-32 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedEntry(null)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}