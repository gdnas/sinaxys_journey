import { useMemo, useState } from "react";
import { BookOpenText, CalendarClock, Search, Send, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";
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
  // Use end-of-day local time for user expectation.
  const d = new Date(`${dateInput}T23:59:59`);
  return d.toISOString();
}

export default function TrackLibrary() {
  const { toast } = useToast();
  const { user, activeCompanyId } = useAuth();

  const companyId = user?.role === "MASTERADMIN" ? activeCompanyId : user?.companyId;

  const [query, setQuery] = useState("");
  const [openTrackId, setOpenTrackId] = useState<string | null>(null);

  const [delegateUserQuery, setDelegateUserQuery] = useState("");
  const [delegateUserIds, setDelegateUserIds] = useState<string[]>([]);
  const [delegateDueDate, setDelegateDueDate] = useState<string>("");

  const departments = useMemo(() => {
    if (!companyId) return [];
    return mockDb.getDepartments(companyId).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [companyId]);

  const users = useMemo(() => {
    if (!companyId) return [];
    return mockDb
      .getUsers(companyId)
      .filter((u) => u.active && u.role !== "MASTERADMIN")
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [companyId]);

  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u] as const)), [users]);
  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d] as const)), [departments]);

  const tracks = useMemo(() => {
    if (!companyId) return [];

    const all = mockDb.getTracks(companyId);
    const visible =
      user?.role === "COLABORADOR" ? all.filter((t) => t.published) : all;

    const q = query.trim().toLowerCase();
    const filtered = !q
      ? visible
      : visible.filter((t) => {
          const creator = usersById.get(t.createdByUserId)?.name ?? "";
          return (
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            creator.toLowerCase().includes(q)
          );
        });

    return filtered.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [companyId, query, user?.role, usersById]);

  const tracksByDept = useMemo(() => {
    const by = new Map<string, typeof tracks>();
    for (const t of tracks) {
      const arr = by.get(t.departmentId) ?? [];
      arr.push(t);
      by.set(t.departmentId, arr);
    }
    return by;
  }, [tracks]);

  const openTrack = useMemo(() => {
    if (!openTrackId) return null;
    return tracks.find((t) => t.id === openTrackId) ?? null;
  }, [openTrackId, tracks]);

  const assignees = useMemo(() => {
    const onlyCollaborators = users.filter((u) => u.role === "COLABORADOR");
    const q = delegateUserQuery.trim().toLowerCase();
    if (!q) return onlyCollaborators;
    return onlyCollaborators.filter((u) => {
      const dept = u.departmentId ? deptById.get(u.departmentId)?.name ?? "" : "";
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || dept.toLowerCase().includes(q);
    });
  }, [users, delegateUserQuery, deptById]);

  if (!user || !companyId || user.role === "MASTERADMIN") return null;

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Biblioteca de trilhas</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Um catálogo único para a empresa — segmentado por departamento e por criador. Delegue para uma ou várias pessoas com prazo.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar trilhas, descrição ou criador…"
                className="h-11 w-full rounded-xl pl-9 md:w-[340px]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--sinaxys-tint)] px-3 py-1 font-semibold text-[color:var(--sinaxys-ink)]">
                <BookOpenText className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                {tracks.length} trilhas
              </span>
              <span className="hidden md:inline">•</span>
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4" />
                Delegação com prazo obrigatório
              </span>
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <Accordion type="multiple" className="w-full">
          {departments.map((dept) => {
            const deptTracks = tracksByDept.get(dept.id) ?? [];

            const groups = new Map<string, typeof deptTracks>();
            for (const t of deptTracks) {
              const arr = groups.get(t.createdByUserId) ?? [];
              arr.push(t);
              groups.set(t.createdByUserId, arr);
            }

            const creators = Array.from(groups.entries())
              .map(([creatorId, list]) => ({
                creatorId,
                creatorName: usersById.get(creatorId)?.name ?? "(usuário removido)",
                tracks: list,
              }))
              .sort((a, b) => a.creatorName.localeCompare(b.creatorName));

            return (
              <AccordionItem key={dept.id} value={dept.id} className="border-none">
                <AccordionTrigger className="rounded-2xl px-3 text-left hover:no-underline data-[state=open]:bg-[color:var(--sinaxys-tint)]">
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{dept.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {deptTracks.length ? `${deptTracks.length} trilhas` : "Nenhuma trilha neste departamento"}
                      </div>
                    </div>
                    <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                      {creators.length} criadores
                    </Badge>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="pt-4">
                  {deptTracks.length ? (
                    <div className="grid gap-4">
                      {creators.map((c) => (
                        <div key={c.creatorId} className="rounded-3xl border border-[color:var(--sinaxys-border)] p-4">
                          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Criador</div>
                              <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{c.creatorName}</div>
                            </div>
                            <Badge className="w-fit rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                              {c.tracks.length} trilhas
                            </Badge>
                          </div>

                          <Separator className="my-4" />

                          <div className="grid gap-3">
                            {c.tracks
                              .slice()
                              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                              .map((t) => (
                                <div
                                  key={t.id}
                                  className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4"
                                >
                                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="min-w-0 truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                                          {t.title}
                                        </div>
                                        {t.published ? (
                                          <Badge className="rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                                            Publicada
                                          </Badge>
                                        ) : (
                                          <Badge className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100">
                                            Rascunho
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="mt-1 text-sm text-muted-foreground">{t.description}</div>
                                      <div className="mt-2 text-xs text-muted-foreground">
                                        Criada em {formatShortDate(t.createdAt)}
                                      </div>
                                    </div>

                                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end md:w-auto">
                                      <Dialog
                                        open={openTrackId === t.id}
                                        onOpenChange={(v) => {
                                          if (!v) {
                                            setOpenTrackId(null);
                                            setDelegateUserQuery("");
                                            setDelegateUserIds([]);
                                            setDelegateDueDate("");
                                          } else {
                                            setOpenTrackId(t.id);
                                            setDelegateUserQuery("");
                                            setDelegateUserIds([]);
                                            setDelegateDueDate("");
                                          }
                                        }}
                                      >
                                        <DialogTrigger asChild>
                                          <Button
                                            className="w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 sm:w-auto"
                                            disabled={!t.published}
                                            title={!t.published ? "Publique a trilha para delegar" : undefined}
                                          >
                                            <Send className="mr-2 h-4 w-4" />
                                            Delegar
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-2xl">
                                          <DialogHeader>
                                            <DialogTitle>Delegar trilha</DialogTitle>
                                          </DialogHeader>

                                          <div className="grid gap-4">
                                            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                                              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trilha</div>
                                              <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{t.title}</div>
                                              <div className="mt-1 text-xs text-muted-foreground">Departamento: {dept.name}</div>
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
                                                <Button
                                                  variant="outline"
                                                  className="h-9 rounded-full"
                                                  onClick={() => {
                                                    const deptAssignees = assignees.filter((u) => u.departmentId === dept.id).map((u) => u.id);
                                                    setDelegateUserIds(deptAssignees);
                                                  }}
                                                  disabled={!assignees.length}
                                                >
                                                  Só {dept.name}
                                                </Button>
                                                <Button
                                                  variant="outline"
                                                  className="h-9 rounded-full"
                                                  onClick={() => setDelegateUserIds([])}
                                                  disabled={!delegateUserIds.length}
                                                >
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
                                                      const deptName = u.departmentId ? deptById.get(u.departmentId)?.name : undefined;
                                                      return (
                                                        <button
                                                          key={u.id}
                                                          type="button"
                                                          className={
                                                            "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition " +
                                                            (checked
                                                              ? "bg-[color:var(--sinaxys-tint)]"
                                                              : "hover:bg-[color:var(--sinaxys-tint)]/60")
                                                          }
                                                          onClick={() => {
                                                            setDelegateUserIds((prev) =>
                                                              prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id],
                                                            );
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
                                                      <div className="p-6 text-center text-sm text-muted-foreground">
                                                        Nenhuma pessoa encontrada.
                                                      </div>
                                                    ) : null}
                                                  </div>
                                                </ScrollArea>
                                              </div>

                                              <div className="text-xs text-muted-foreground">
                                                A delegação cria uma atribuição na "Minha jornada" do colaborador.
                                              </div>
                                            </div>
                                          </div>

                                          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                            <Button variant="outline" className="w-full rounded-xl sm:w-auto" onClick={() => setOpenTrackId(null)}>
                                              Cancelar
                                            </Button>
                                            <Button
                                              className="w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 sm:w-auto"
                                              disabled={!delegateDueDate || delegateUserIds.length === 0}
                                              onClick={() => {
                                                if (!user) return;
                                                if (!delegateDueDate) return;
                                                if (!delegateUserIds.length) return;

                                                try {
                                                  const dueAt = toDueIso(delegateDueDate);
                                                  delegateUserIds.forEach((userId) => {
                                                    mockDb.assignTrack({ trackId: t.id, userId, assignedByUserId: user.id, dueAt });
                                                  });

                                                  toast({
                                                    title: "Delegação enviada",
                                                    description: `${delegateUserIds.length} pessoa(s) receberam a trilha com prazo em ${delegateDueDate}.`,
                                                  });

                                                  setOpenTrackId(null);
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
                                        </DialogContent>
                                      </Dialog>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                      Nenhuma trilha encontrada para este departamento com os filtros atuais.
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </Card>
    </div>
  );
}