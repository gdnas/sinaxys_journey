import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  cancelVacationRequest,
  createVacationRequest,
  listMyVacationRequests,
  type DbVacationRequest,
} from "@/lib/vacationDb";

function statusBadge(status: DbVacationRequest["status"]) {
  if (status === "APPROVED") return <Badge className="rounded-full bg-emerald-600 text-white hover:bg-emerald-600">Aprovado</Badge>;
  if (status === "REJECTED") return <Badge className="rounded-full bg-rose-600 text-white hover:bg-rose-600">Recusado</Badge>;
  return <Badge className="rounded-full bg-amber-500 text-white hover:bg-amber-500">Pendente</Badge>;
}

function prettyDate(iso: string) {
  return format(new Date(iso + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR });
}

function prettyDateRange(startDate: string, days: number) {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + days - 1);
  const startStr = format(start, "dd/MM/yyyy", { locale: ptBR });
  const endStr = format(end, "dd/MM/yyyy", { locale: ptBR });
  return startStr === endStr ? startStr : `${startStr} → ${endStr}`;
}

export default function VacationRequests() {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const canUse = !!user && user.role !== "MASTERADMIN" && !!companyId;

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["vacation", "mine", companyId, user?.id],
    enabled: canUse,
    queryFn: () => listMyVacationRequests(String(companyId), String(user!.id)),
  });

  const pendingCount = useMemo(() => rows.filter((r) => r.status === "PENDING").length, [rows]);

  if (!user || !companyId) return null;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Indisponibilidade</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">Minhas solicitações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registre períodos em que você estará indisponível e acompanhe aprovações. Você pode cancelar enquanto estiver <span className="font-medium">pendente</span>.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
              <Plus className="mr-2 h-4 w-4" /> Nova solicitação
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl border-[color:var(--sinaxys-border)] p-0">
            <div className="rounded-3xl bg-white p-6">
              <DialogHeader>
                <DialogTitle className="text-[color:var(--sinaxys-ink)]">Registrar indisponibilidade</DialogTitle>
              </DialogHeader>

              <div className="mt-5 grid gap-4">
                <div className="grid gap-2">
                  <Label>Data de início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between rounded-2xl border border-[color:var(--sinaxys-border)] bg-white px-4 py-3 text-left text-sm text-[color:var(--sinaxys-ink)] transition hover:bg-[color:var(--sinaxys-tint)]/30",
                          !startDate && "text-muted-foreground",
                        )}
                      >
                        <span>
                          {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                        </span>
                        <CalendarDays className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto rounded-3xl border-[color:var(--sinaxys-border)] p-2" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        disabled={(d) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return d < today;
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid gap-2">
                  <Label>Data de fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between rounded-2xl border border-[color:var(--sinaxys-border)] bg-white px-4 py-3 text-left text-sm text-[color:var(--sinaxys-ink)] transition hover:bg-[color:var(--sinaxys-tint)]/30",
                          !endDate && "text-muted-foreground",
                        )}
                      >
                        <span>
                          {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                        </span>
                        <CalendarDays className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto rounded-3xl border-[color:var(--sinaxys-border)] p-2" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        disabled={(d) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return d < today || (startDate ? d < startDate : false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {startDate && endDate && (
                    <div className="text-xs text-muted-foreground">
                      Duração: {differenceInDays(endDate, startDate) + 1} dia(s)
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label>Observação (opcional)</Label>
                  <Textarea className="min-h-[90px] rounded-2xl" value={note} onChange={(e) => setNote(e.target.value)} />
                </div>

                <Separator />

                <Button
                  disabled={busy}
                  className="rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  onClick={async () => {
                    if (!startDate) {
                      toast({ title: "Selecione a data de início" });
                      return;
                    }
                    if (!endDate) {
                      toast({ title: "Selecione a data de fim" });
                      return;
                    }
                    if (endDate < startDate) {
                      toast({ title: "A data de fim deve ser igual ou posterior à data de início" });
                      return;
                    }

                    const startIso = format(startDate, "yyyy-MM-dd");
                    const days = differenceInDays(endDate, startDate) + 1;

                    setBusy(true);
                    try {
                      await createVacationRequest({
                        companyId: String(companyId),
                        userId: user.id,
                        startDate: startIso,
                        days,
                        requestNote: note,
                      });
                      toast({ title: "Solicitação enviada", description: "Sua solicitação entrou como pendente." });
                      setOpen(false);
                      setStartDate(undefined);
                      setEndDate(undefined);
                      setNote("");
                      await qc.invalidateQueries({ queryKey: ["vacation", "mine", companyId, user.id] });
                      await qc.invalidateQueries({ queryKey: ["vacation", "approver", companyId] });
                    } catch (e: any) {
                      toast({ title: "Não foi possível enviar", description: e?.message ?? "Tente novamente." });
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Enviar solicitação
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 grid gap-4">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</div>
              <div className="mt-2 text-sm text-[color:var(--sinaxys-ink)]">
                Você tem <span className="font-semibold">{pendingCount}</span> solicitação(ões) pendente(s).
              </div>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-0">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Histórico de indisponibilidade</div>
              <div className="text-xs text-muted-foreground">Solicitações mais recentes primeiro.</div>
            </div>
          </div>
          <Separator />

          <div className="divide-y">
            {isLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
            ) : rows.length ? (
              rows.map((r) => (
                <div key={r.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                        {prettyDateRange(r.start_date, r.days)}
                      </div>
                      {statusBadge(r.status)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Solicitação em {format(new Date(r.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      {r.decided_at
                        ? ` • Decisão em ${format(new Date(r.decided_at), "dd/MM 'às' HH:mm", { locale: ptBR })}`
                        : ""}
                    </div>
                    {r.request_note ? <div className="mt-2 text-xs text-muted-foreground">Obs.: {r.request_note}</div> : null}
                    {r.decision_note ? <div className="mt-2 text-xs text-muted-foreground">Decisão: {r.decision_note}</div> : null}
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    {r.status === "PENDING" ? (
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={async () => {
                          try {
                            await cancelVacationRequest(r.id);
                            toast({ title: "Solicitação cancelada" });
                            await qc.invalidateQueries({ queryKey: ["vacation", "mine", companyId, user.id] });
                            await qc.invalidateQueries({ queryKey: ["vacation", "approver", companyId] });
                          } catch (e: any) {
                            toast({ title: "Não foi possível cancelar", description: e?.message ?? "Tente novamente." });
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-sm text-muted-foreground">Você ainda não enviou nenhuma solicitação.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
