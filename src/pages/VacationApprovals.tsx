import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, CircleX, Filter, Inbox, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { listPublicProfilesByCompany } from "@/lib/profilePublicDb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  decideVacationRequest,
  listVacationRequestsForApprover,
  type DbVacationRequest,
  type VacationStatus,
} from "@/lib/vacationDb";

function statusBadge(status: VacationStatus) {
  if (status === "APPROVED") return <Badge className="rounded-full bg-emerald-600 text-white hover:bg-emerald-600">Aprovado</Badge>;
  if (status === "REJECTED") return <Badge className="rounded-full bg-rose-600 text-white hover:bg-rose-600">Recusado</Badge>;
  return <Badge className="rounded-full bg-amber-500 text-white hover:bg-amber-500">Pendente</Badge>;
}

function prettyDate(iso: string) {
  return format(new Date(iso + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR });
}

export default function VacationApprovals() {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<VacationStatus | "ALL">("PENDING");
  const [personFilter, setPersonFilter] = useState<string | "ALL">("ALL");

  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionTarget, setDecisionTarget] = useState<DbVacationRequest | null>(null);
  const [decisionKind, setDecisionKind] = useState<Exclude<VacationStatus, "PENDING">>("APPROVED");
  const [decisionNote, setDecisionNote] = useState("");
  const [busy, setBusy] = useState(false);

  // IMPORTANT: do not early-return before hooks below.
  // companyId can be null briefly on first render, which would otherwise change hook order.
  const allowedRole = user?.role === "ADMIN" || user?.role === "HEAD";
  const enabled = !!user && !!companyId && allowedRole;

  const { data: people = [] } = useQuery({
    queryKey: ["profiles-public", companyId],
    enabled,
    queryFn: () => listPublicProfilesByCompany(String(companyId)),
  });

  const peopleById = useMemo(() => {
    const m = new Map<string, { name: string; job?: string | null; departmentId?: string | null }>();
    for (const p of people) m.set(p.id, { name: p.name, job: p.job_title, departmentId: p.department_id });
    return m;
  }, [people]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["vacation", "approver", companyId],
    enabled,
    queryFn: () => listVacationRequestsForApprover(String(companyId)),
  });

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (personFilter !== "ALL" && r.user_id !== personFilter) return false;
      return true;
    });
  }, [rows, statusFilter, personFilter]);

  const pendingCount = useMemo(() => rows.filter((r) => r.status === "PENDING").length, [rows]);

  if (!allowedRole) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Acesso restrito</div>
          <p className="mt-1 text-sm text-muted-foreground">Apenas Admin e Head podem acessar aprovações de férias.</p>
        </Card>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Férias • Aprovações</div>
          <p className="mt-1 text-sm text-muted-foreground">Carregando contexto da empresa…</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Férias</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">Aprovações</h1>
          <p className="mt-1 text-sm text-muted-foreground">Admin e Head podem aprovar/recusar pedidos do time/empresa (conforme permissões).</p>
        </div>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pendentes</div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{pendingCount}</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-ink)]">
              <Filter className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
              Filtros
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="APPROVED">Aprovado</SelectItem>
                    <SelectItem value="REJECTED">Recusado</SelectItem>
                    <SelectItem value="ALL">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs">Pessoa</Label>
                <Select value={personFilter} onValueChange={(v) => setPersonFilter(v as any)}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Pessoa" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="ALL">Todas</SelectItem>
                    {people.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-0">
          <div className="px-5 py-4">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Pedidos</div>
            <div className="text-xs text-muted-foreground">Clique em aprovar/recusar para registrar a decisão.</div>
          </div>
          <Separator />

          <div className="divide-y">
            {isLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
            ) : filtered.length ? (
              filtered.map((r) => {
                const person = peopleById.get(r.user_id);
                return (
                  <div key={r.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                          <span className="grid h-7 w-7 place-items-center rounded-xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                            <UserRound className="h-4 w-4" />
                          </span>
                          <span className="truncate">{person?.name ?? "Pessoa"}</span>
                        </div>
                        {statusBadge(r.status)}
                      </div>

                      <div className="mt-1 text-sm text-[color:var(--sinaxys-ink)]">
                        Início {prettyDate(r.start_date)} • {r.days} dia(s)
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        Pedido em {format(new Date(r.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        {person?.job ? ` • ${person.job}` : ""}
                        {r.decided_at
                          ? ` • Decisão em ${format(new Date(r.decided_at), "dd/MM 'às' HH:mm", { locale: ptBR })}`
                          : ""}
                      </div>

                      {r.request_note ? <div className="mt-2 text-xs text-muted-foreground">Obs.: {r.request_note}</div> : null}
                      {r.decision_note ? <div className="mt-2 text-xs text-muted-foreground">Decisão: {r.decision_note}</div> : null}
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        disabled={r.status !== "PENDING"}
                        variant="outline"
                        className={cn("rounded-2xl", r.status === "PENDING" ? "hover:border-emerald-300 hover:bg-emerald-50" : "")}
                        onClick={() => {
                          setDecisionTarget(r);
                          setDecisionKind("APPROVED");
                          setDecisionNote("");
                          setDecisionOpen(true);
                        }}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                        Aprovar
                      </Button>
                      <Button
                        disabled={r.status !== "PENDING"}
                        variant="outline"
                        className={cn("rounded-2xl", r.status === "PENDING" ? "hover:border-rose-300 hover:bg-rose-50" : "")}
                        onClick={() => {
                          setDecisionTarget(r);
                          setDecisionKind("REJECTED");
                          setDecisionNote("");
                          setDecisionOpen(true);
                        }}
                      >
                        <CircleX className="mr-2 h-4 w-4 text-rose-600" />
                        Recusar
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-sm text-muted-foreground">Nenhum pedido encontrado para os filtros atuais.</div>
            )}
          </div>
        </Card>
      </div>

      <Dialog
        open={decisionOpen}
        onOpenChange={(v) => {
          setDecisionOpen(v);
          if (!v) setDecisionTarget(null);
        }}
      >
        <DialogContent className="rounded-3xl border-[color:var(--sinaxys-border)] p-0">
          <div className="rounded-3xl bg-white p-6">
            <DialogHeader>
              <DialogTitle className="text-[color:var(--sinaxys-ink)]">
                {decisionKind === "APPROVED" ? "Aprovar pedido" : "Recusar pedido"}
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4 grid gap-3">
              <div className="text-sm text-muted-foreground">
                {decisionTarget ? (
                  <>
                    {peopleById.get(decisionTarget.user_id)?.name ?? "Pessoa"} — início {prettyDate(decisionTarget.start_date)} • {decisionTarget.days} dia(s)
                  </>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label>Observação (opcional)</Label>
                <Textarea className="min-h-[90px] rounded-2xl" value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} />
              </div>

              <Separator />

              <Button
                disabled={busy || !decisionTarget}
                className={cn(
                  "rounded-2xl text-white",
                  decisionKind === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-600/90" : "bg-rose-600 hover:bg-rose-600/90",
                )}
                onClick={async () => {
                  const userId = user?.id;
                  if (!decisionTarget || !userId) return;
                  setBusy(true);
                  try {
                    await decideVacationRequest({
                      id: decisionTarget.id,
                      status: decisionKind,
                      decidedByUserId: userId,
                      decisionNote,
                    });
                    toast({
                      title: decisionKind === "APPROVED" ? "Pedido aprovado" : "Pedido recusado",
                    });
                    setDecisionOpen(false);
                    await qc.invalidateQueries({ queryKey: ["vacation", "approver", companyId] });
                    await qc.invalidateQueries({ queryKey: ["vacation", "mine", companyId] });
                  } catch (e: any) {
                    toast({ title: "Não foi possível registrar a decisão", description: e?.message ?? "Tente novamente." });
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}