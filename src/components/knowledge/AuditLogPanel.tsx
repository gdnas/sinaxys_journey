import { useState } from "react";
import { Minus, Plus, ScrollArea, ChevronDown, ChevronRight, Check, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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

  const timeLogs = useMemo(() => {
    return visibleLogs.filter(log => {
      const d = new Date(log.created_at);
      return d.getDate() === new Date().getDate() && d.getMonth() === new Date().getMonth() && d.getHours() === new Date().getHours());
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
          </Button>
        </div>
      </Card>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="h-[500px] overflow-y-auto">
          {visibleLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <span className="ml-4">Nenhuma alteração registrada.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {dateLogs.map((log, index) => (
                <div key={log.id} className="flex flex-col gap-4">
                  <div className="text-sm text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      year: "numeric",
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="border-l border-[color:var(--sinaxys-border)] rounded-2xl bg-[color:var(--sinaxys-bg)] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded-xl bg-[color:var(--sinaxys-tint)] px-3 py-2 text-sm font-medium text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]/70"
                        onClick={() => setExpandedLogId(log.id)}
                      >
                        <div className="flex items-center gap-1.5">
                          {expandedLogId === log.id ? (
                            <ChevronUp className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                          )}
                          <span className="text-xs text-muted-foreground font-medium">
                            {new Date(log.created_at).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </button>
                      <Badge variant="secondary" className="text-xs">
                        {log.action}
                      </Badge>
                    </div>

                    {expandedLogId === log.id ? (
                      <div className="p-4 space-y-4 bg-[color:var(--sinaxys-bg)] rounded-2xl border-[color:var(--sinaxys-border)]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Histórico</div>
                          <div className="text-xs text-muted-foreground">
                            Registrada em {new Date(log.created_at).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {log.user_id}
                          </Badge>
                        </div>

                        <div className="flex flex-col gap-3">
                          <div>
                            <div className="text-xs text-muted-foreground">
                              Ação:
                            <div className="text-sm font-medium text-[color:var(--inset)]">{log.action}</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              Por {log.user_id}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">
                              Alterações:
                            <div className="mt-1 space-y-3 border-t border-[color:var(--sinaxys-border)] rounded-lg bg-[color:var(--sinaxys-bg)] p-3">
                              <div className="grid gap-3">
                                {log.old_snapshot && (
                                  <div key={log.id} className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <Badge variant="secondary" className="text-xs">Antes</Badge>
                                      <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>
                                  <div>
                                    <div className="grid gap-3">
                                      {Object.entries(log.old_snapshot).map(([key, value], idx) => (
                                        <div key={key} className="grid gap-2">
                                          <Label className="text-xs font-medium text-[color:var(--sinaxys-ink)]">{key}</Label(key)}</Label>
                                          <div className="text-sm text-muted-foreground whitespace-pre-wrap break-all">
                                            {value}
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                  <ScrollArea className="h-[200px]">
                                    <div className="p-2">
                                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Campos alterados:</div>
                                      {Object.entries(log.old_snapshot).map(([key, value], idx) => (
                                        <div key={key} className="mt-4">
                                          <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">{key}</Label(key)}</div>
                                          <div className="text-sm text-muted-foreground whitespace-pre-wrap break-all">
                                            {value}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                )}
                              )}
                                {log.new_snapshot && (
                                  <div key={log.id} className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <Badge variant="secondary" className="text-xs">Novos</Badge>
                                      <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>
                                    <div>
                                      <div className="grid gap-3">
                                        {Object.entries(log.new_snapshot).map(([key, value], idx) => (
                                          <div key={key} className="grid gap-2">
                                            <Label className="text-xs font-medium text-[color:var(--sinaxys-ink)]">{key}</Label(key)}</Label>
                                            <div className="text-sm text-muted-foreground whitespace-pre-wrap break-all">
                                              {value}
                                            </div>
                                        </div>
                                      ))}
                                    </div>
                                  <ScrollArea className="h-[200px]">
                                    <div className="p-2">
                                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Campos alterados:</div>
                                      {Object.entries(log.new_snapshot).map(([key, value], idx) => (
                                        <div key={key} className="mt-4">
                                          <div className="text-sm font-medium text-[color:var(--inset)]">{key}</Label(key)}</div>
                                          <div className="text-sm text-muted-foreground whitespace-pre-wrap break-all">
                                            {value}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                )}
                              )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
          <DialogContent className="max-h-[80vh] max-w-[600px] rounded-3xl">
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
              </div>

              <div className="mt-4 border-t pt-4">
                <div className="grid gap-3">
                  <div>
                    <Label>Detalhes (Snapshot Antigo)</Label>
                    <div className="grid grid-cols-[1fr_2fr] gap-2">
                      <Label>Snapshot Antigo</Label>
                        <div>
                          {Object.entries(selectedEntry.old_snapshot || {}).map(([key, value], idx) => (
                            <Label key={keyLabel(key)}</Label>
                            <div>
                              {Object.entries(value as any as [k: v]) => (
                                <div key={k}>
                                  <Label className="text-xs font-medium text-[color:var(--sinaxys-ink)]">{k}</Label}</Label>
                                  <div className="text-sm text-muted-foreground whitespace-pre-wrap break-all">
                                    {v}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Label>Snapshot Novo (Mudanças)</Label>
                        <div>
                          {Object.entries(selectedEntry.new_snapshot || {}).map(([key, value], idx) as [k: v]) => (
                            <Label key={keyLabel(key)}</Label>
                            <div>
                              <div className="mt-4 space-y-3 border-t pt-4">
                                {Object.entries(value as any as [k: v]) => (
                                  <div key={k}>
                                    <Label className="text-xs font-medium text-[color:var(--sinaxys-ink)]">{k}</Label(key)}</Label>
                                    <div className="text-sm text-muted-foreground whitespace-pre-wrap break-all">
                                      {v}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                        </div>
                        </div>
                      </div>
                  </div>
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