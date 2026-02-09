import { useMemo, useState } from "react";
import { BookOpenText, CalendarClock, Search, Send, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { listDepartments } from "@/lib/departmentsDb";
import { listProfilesByCompany } from "@/lib/profilesDb";
import { assignTrack, getTracksByCompany } from "@/lib/journeyDb";
import { formatShortDate } from "@/lib/sinaxys";

function toDateInputValue(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toDueIso(dateInput: string) {
  const d = new Date(`${dateInput}T23:59:59`);
  return d.toISOString();
}

export default function TrackLibrary() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();

  if (!user) return null;
  if (!user.companyId) return null;
  if (user.role === "MASTERADMIN") return null;

  const companyId = user.companyId;
  const canDelegate = user.role === "ADMIN";

  const [query, setQuery] = useState("");

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: () => listDepartments(companyId),
  });

  const { data: tracks = [], isLoading: tracksLoading } = useQuery({
    queryKey: ["tracks", companyId],
    queryFn: () => getTracksByCompany(companyId),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", companyId],
    queryFn: () => listProfilesByCompany(companyId),
  });

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d] as const)), [departments]);

  const visibleTracks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = user.role === "COLABORADOR" ? tracks.filter((t) => t.published) : tracks;
    if (!q) return base;
    return base.filter((t) => `${t.title} ${t.description}`.toLowerCase().includes(q));
  }, [tracks, user.role, query]);

  const tracksByDept = useMemo(() => {
    const by = new Map<string, typeof visibleTracks>();
    for (const t of visibleTracks) {
      const arr = by.get(t.department_id) ?? [];
      arr.push(t);
      by.set(t.department_id, arr);
    }
    return by;
  }, [visibleTracks]);

  // Delegation state
  const [delegateOpen, setDelegateOpen] = useState(false);
  const [delegateTrackId, setDelegateTrackId] = useState<string | null>(null);
  const [delegateUserQuery, setDelegateUserQuery] = useState("");
  const [delegateUserIds, setDelegateUserIds] = useState<string[]>([]);
  const [delegateDueDate, setDelegateDueDate] = useState<string>("");

  const delegateTrack = useMemo(() => {
    if (!delegateTrackId) return null;
    return visibleTracks.find((t) => t.id === delegateTrackId) ?? null;
  }, [delegateTrackId, visibleTracks]);

  const collaborators = useMemo(() => {
    return profiles
      .filter((p) => p.active)
      .filter((p) => p.role === "COLABORADOR")
      .map((p) => ({
        id: p.id,
        name: p.name ?? p.email,
        email: p.email,
        department_id: p.department_id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [profiles]);

  const assignees = useMemo(() => {
    const q = delegateUserQuery.trim().toLowerCase();
    if (!q) return collaborators;
    return collaborators.filter((u) => {
      const deptName = u.department_id ? deptById.get(u.department_id)?.name ?? "" : "";
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        deptName.toLowerCase().includes(q)
      );
    });
  }, [collaborators, delegateUserQuery, deptById]);

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Biblioteca de trilhas</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Catálogo por departamento. {canDelegate ? "Delegue trilhas para colaboradores com prazo." : "Acesse apenas trilhas publicadas."}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar trilhas…"
                className="h-11 w-full rounded-xl pl-9 md:w-[340px]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--sinaxys-tint)] px-3 py-1 font-semibold text-[color:var(--sinaxys-ink)]">
                <BookOpenText className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                {tracksLoading ? "…" : visibleTracks.length} trilhas
              </span>
              {canDelegate ? (
                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Delegação com prazo
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <Accordion type="multiple" className="w-full">
          {departments.map((dept) => {
            const deptTracks = (tracksByDept.get(dept.id) ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at));

            return (
              <AccordionItem key={dept.id} value={dept.id} className="border-none">
                <AccordionTrigger className="rounded-2xl px-3 text-left hover:no-underline data-[state=open]:bg-[color:var(--sinaxys-tint)]">
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{dept.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {deptTracks.length ? `${deptTracks.length} trilhas` : "Nenhuma trilha"}
                      </div>
                    </div>
                    <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                      {deptTracks.length}
                    </Badge>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="pt-4">
                  {deptTracks.length ? (
                    <div className="grid gap-3">
                      {deptTracks.map((t) => (
                        <div key={t.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="min-w-0 truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{t.title}</div>
                                {t.published ? (
                                  <Badge className="rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                                    Publicada
                                  </Badge>
                                ) : (
                                  <Badge className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100">Rascunho</Badge>
                                )}
                              </div>
                              <div className="mt-1 text-sm text-muted-foreground">{t.description}</div>
                              <div className="mt-2 text-xs text-muted-foreground">Criada em {formatShortDate(t.created_at)}</div>
                            </div>

                            {canDelegate ? (
                              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end md:w-auto">
                                <Button
                                  className="w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 sm:w-auto"
                                  disabled={!t.published}
                                  onClick={() => {
                                    setDelegateTrackId(t.id);
                                    setDelegateUserQuery("");
                                    setDelegateUserIds([]);
                                    setDelegateDueDate("");
                                    setDelegateOpen(true);
                                  }}
                                >
                                  <Send className="mr-2 h-4 w-4" />
                                  Delegar
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                      Nenhuma trilha encontrada para este departamento.
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </Card>

      <Dialog
        open={delegateOpen}
        onOpenChange={(v) => {
          setDelegateOpen(v);
          if (!v) {
            setDelegateTrackId(null);
            setDelegateUserQuery("");
            setDelegateUserIds([]);
            setDelegateDueDate("");
          }
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Delegar trilha</DialogTitle>
          </DialogHeader>

          {delegateTrack ? (
            <div className="grid gap-4">
              <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trilha</div>
                <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{delegateTrack.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Departamento: {deptById.get(delegateTrack.department_id)?.name ?? "—"}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Prazos</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-[220px]">
                    <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="date"
                      value={delegateDueDate}
                      onChange={(e) => setDelegateDueDate(e.target.value)}
                      className="h-11 w-full rounded-xl pl-9"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { label: "+7d", days: 7 },
                      { label: "+14d", days: 14 },
                      { label: "+30d", days: 30 },
                    ].map((p) => (
                      <Button
                        key={p.label}
                        variant="outline"
                        className="h-9 rounded-full"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + p.days);
                          setDelegateDueDate(toDateInputValue(d.toISOString()));
                        }}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">Obrigatório: define até quando a pessoa deve concluir a trilha.</div>
              </div>

              <div className="grid gap-2">
                <Label>Pessoas</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={delegateUserQuery}
                    onChange={(e) => setDelegateUserQuery(e.target.value)}
                    placeholder="Buscar por nome, e-mail ou departamento…"
                    className="h-11 rounded-xl pl-9"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    className="h-9 rounded-full"
                    onClick={() => setDelegateUserIds(assignees.map((u) => u.id))}
                    disabled={!assignees.length}
                  >
                    Selecionar todos (filtrados)
                  </Button>
                  <Button variant="outline" className="h-9 rounded-full" onClick={() => setDelegateUserIds([])} disabled={!delegateUserIds.length}>
                    Limpar
                  </Button>
                  <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                    {delegateUserIds.length} selecionados
                  </Badge>
                </div>

                <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white">
                  <ScrollArea className="h-[280px]">
                    <div className="grid gap-1 p-2">
                      {assignees.map((u) => {
                        const checked = delegateUserIds.includes(u.id);
                        const deptName = u.department_id ? deptById.get(u.department_id)?.name : undefined;
                        return (
                          <button
                            key={u.id}
                            type="button"
                            className={
                              "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition " +
                              (checked ? "bg-[color:var(--sinaxys-tint)]" : "hover:bg-[color:var(--sinaxys-tint)]/60")
                            }
                            onClick={() => {
                              setDelegateUserIds((prev) => (prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id]));
                            }}
                          >
                            <Checkbox checked={checked} onCheckedChange={() => {}} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-[color:var(--sinaxys-ink)]">{u.name}</div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span className="truncate">{u.email}</span>
                                {deptName ? (
                                  <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
                                    {deptName}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        );
                      })}

                      {!assignees.length ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma pessoa encontrada.</div>
                      ) : null}
                    </div>
                  </ScrollArea>
                </div>

                <div className="text-xs text-muted-foreground">A delegação cria uma atribuição na "Minha jornada" do colaborador.</div>
              </div>

              <Separator />

              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" className="w-full rounded-xl sm:w-auto" onClick={() => setDelegateOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  className="w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 sm:w-auto"
                  disabled={!delegateDueDate || delegateUserIds.length === 0}
                  onClick={async () => {
                    try {
                      if (!delegateTrackId) return;
                      const dueAt = toDueIso(delegateDueDate);
                      await Promise.all(
                        delegateUserIds.map((uid) =>
                          assignTrack({
                            companyId,
                            trackId: delegateTrackId,
                            userId: uid,
                            assignedByUserId: user.id,
                            dueAt,
                          }),
                        ),
                      );

                      toast({
                        title: "Delegação enviada",
                        description: `${delegateUserIds.length} pessoa(s) receberam a trilha com prazo em ${delegateDueDate}.`,
                      });

                      setDelegateOpen(false);
                      await qc.invalidateQueries({ queryKey: ["assignments", companyId] });
                    } catch (e) {
                      toast({
                        title: "Não foi possível delegar",
                        description: e instanceof Error ? e.message : "Tente novamente.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Confirmar delegação
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Trilha não encontrada.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
