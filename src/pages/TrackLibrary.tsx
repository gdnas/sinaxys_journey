import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpenText, CalendarClock, GraduationCap, Plus, Rocket, Search, Send, Shield, Users, ArrowLeft } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { listDepartments } from "@/lib/departmentsDb";
import { listProfilePublicByCompany, listProfilesByCompany } from "@/lib/profilesDb";
import { assignTrack, createTrack, getTracksByCompany, setTrackPublished } from "@/lib/journeyDb";
import { formatShortDate } from "@/lib/sinaxys";
import { useTranslation } from 'react-i18next';

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

function roleLabel(role?: string | null) {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "HEAD":
      return "Head";
    case "COLABORADOR":
      return "Colaborador";
    case "MASTERADMIN":
      return "Master";
    default:
      return role || "—";
  }
}

export default function TrackLibrary() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;
  if (!user.companyId) return null;
  if (user.role === "MASTERADMIN") return null;

  const companyId = user.companyId;
  const canDelegate = true;
  const isHead = user.role === "HEAD";
  const canCreateTrack = isHead; // Apenas HEADs podem criar trilhas

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: () => listDepartments(companyId),
  });

  const { data: tracks = [], isLoading: tracksLoading } = useQuery({
    queryKey: ["tracks", companyId],
    queryFn: () => getTracksByCompany(companyId),
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

  // Create mutation for HEADs
  const createMutation = useMutation({
    mutationFn: () =>
      createTrack({
        companyId,
        departmentId: isHead && user.departmentId ? user.departmentId : departmentId,
        title,
        description,
        createdByUserId: user.id,
      }),
    onSuccess: async (t) => {
      await qc.invalidateQueries({ queryKey: ["tracks", companyId] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setDepartmentId("");
      navigate(`/tracks/${t.id}/edit`);
    },
    onError: (e) => {
      toast({
        title: t('tracks.create_failed_title'),
        description: e instanceof Error ? e.message : t('tracks.create_failed_desc'),
        variant: "destructive",
      });
    },
  });

  // Delegation state
  const [delegateOpen, setDelegateOpen] = useState(false);
  const [delegateTrackId, setDelegateTrackId] = useState<string | null>(null);
  const [delegateUserQuery, setDelegateUserQuery] = useState("");
  const [delegateUserIds, setDelegateUserIds] = useState<string[]>([]);
  const [delegateDueDate, setDelegateDueDate] = useState<string>("");

  const profilesQuery = useQuery({
    queryKey: ["profiles", companyId],
    queryFn: () => listProfilesByCompany(companyId),
    enabled: !!companyId,
  });

  const profiles = useMemo(() => {
    const data = (profilesQuery.data ?? []) as any[];
    return data
      .filter((p) => p.active)
      .filter((p) => p.role !== "MASTERADMIN")
      .map((p) => ({
        id: p.id,
        name: p.name ?? ("email" in p ? p.email : ""),
        email: "email" in p ? (p.email as string) : null,
        role: p.role as string,
        department_id: p.department_id as string | null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [profilesQuery.data]);

  const assignees = useMemo(() => {
    const q = delegateUserQuery.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((u) => {
      const deptName = u.department_id ? deptById.get(u.department_id)?.name ?? "" : "";
      return (
        u.name.toLowerCase().includes(q) ||
        (u.email ? u.email.toLowerCase().includes(q) : false) ||
        deptName.toLowerCase().includes(q) ||
        roleLabel(u.role).toLowerCase().includes(q)
      );
    });
  }, [profiles, delegateUserQuery, deptById]);

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{t('tracks.library.title')}</div>
            <p className="mt-1 text-sm text-muted-foreground">{t(canCreateTrack ? 'tracks.library.desc_head' : 'tracks.library.desc_collab')}</p>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('tracks.search.placeholder') as string}
                className="h-11 w-full rounded-xl pl-9 md:w-[340px]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--sinaxys-tint)] px-3 py-1 font-semibold text-[color:var(--sinaxys-ink)]">
                <BookOpenText className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                {tracksLoading ? "…" : `${visibleTracks.length} ${t('tracks.label')}`}
              </span>
              {canDelegate ? (
                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('tracks.delegate_with_due')}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{t('tracks.catalog.title')}</div>
            <p className="mt-1 text-sm text-muted-foreground">{tracksLoading ? t('loading') : `${visibleTracks.length} ${t('tracks.label')}`}</p>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            {canCreateTrack && (
              <Button
                className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                onClick={() => {
                  if (isHead && user.departmentId) {
                    setDepartmentId(user.departmentId);
                  }
                  setOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('tracks.create')}
              </Button>
            )}
          </div>
        </div>

        <Separator className="my-5" />

        <Accordion type="multiple" className="w-full">
          {departments.map((dept) => {
            const deptTracks = (tracksByDept.get(dept.id) ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at));

            return (
              <AccordionItem key={dept.id} value={dept.id} className="border-none">
                <AccordionTrigger className="rounded-2xl px-3 text-left hover:no-underline data-[state=open]:bg-[color:var(--sinaxys-tint)]">
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{dept.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{deptTracks.length ? `${deptTracks.length} ${t('tracks.label')}` : t('tracks.none')}</div>
                    </div>
                    <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">{deptTracks.length}</Badge>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="pt-4">
                  {deptTracks.length ? (
                    <div className="grid gap-3">
                      {deptTracks.map((tItem) => (
                        <div key={tItem.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  to={`/tracks/${tItem.id}`}
                                  className="min-w-0 truncate text-sm font-semibold text-[color:var(--sinaxys-ink)] underline-offset-4 hover:underline"
                                >
                                  {tItem.title}
                                </Link>
                                {tItem.published ? (
                                  <Badge className="rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100">{t('tracks.published')}</Badge>
                                ) : (
                                  <Badge className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100">{t('tracks.draft')}</Badge>
                                )}
                              </div>
                              <div className="mt-1 text-sm text-muted-foreground">{tItem.description}</div>
                              <div className="mt-2 text-xs text-muted-foreground">{t('tracks.created_at')} {formatShortDate(tItem.created_at)}</div>
                            </div>

                            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end md:w-auto">
                              <Button asChild variant="outline" className="w-full rounded-xl sm:w-auto">
                                <Link to={`/tracks/${tItem.id}`}>{t('tracks.view')}</Link>
                              </Button>

                              {canDelegate ? (
                                <Button
                                  className="w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 sm:w-auto"
                                  disabled={!tItem.published}
                                  onClick={() => {
                                    setDelegateTrackId(tItem.id);
                                    setDelegateUserQuery("");
                                    setDelegateUserIds([]);
                                    setDelegateDueDate("");
                                    setDelegateOpen(true);
                                  }}
                                >
                                  <Send className="mr-2 h-4 w-4" />
                                  {t('tracks.delegate')}
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">{t('tracks.none_dept')}</div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </Card>

      {/* Create track dialog for HEADs */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setTitle("");
            setDescription("");
            setDepartmentId("");
          }
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('tracks.create_dialog.title')}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>{t('tracks.create_dialog.department')}</Label>
              <Select value={departmentId} onValueChange={setDepartmentId} disabled={!isHead}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder={isHead ? t('tracks.create_dialog.your_department') : t('tracks.create_dialog.select')} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isHead && (
                <div className="text-xs text-muted-foreground">{t('tracks.create_dialog.head_note')}</div>
              )}
            </div>

            <div className="grid gap-2">
              <Label>{t('tracks.create_dialog.title')}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-xl" placeholder={t('tracks.create_dialog.title_placeholder') as string} />
            </div>
            <div className="grid gap-2">
              <Label>{t('tracks.create_dialog.description')}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-28 rounded-2xl" placeholder={t('tracks.create_dialog.description_placeholder') as string} />
            </div>

            <div className="text-xs text-muted-foreground">{t('tracks.create_dialog.after_create')}</div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!departmentId || !title.trim() || createMutation.isPending}
              onClick={async () => {
                try {
                  await createMutation.mutateAsync();
                } catch (e) {
                  toast({
                    title: t('tracks.create_failed_title'),
                    description: e instanceof Error ? e.message : t('tracks.create_failed_desc'),
                    variant: "destructive",
                  });
                }
              }}
            >
              {t('tracks.create_and_edit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delegation dialog */}
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
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('tracks.delegate_dialog.title')}</DialogTitle>
          </DialogHeader>

          {delegateTrackId ? (
            <div className="grid gap-4">
              <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('tracks.delegate_dialog.track_label')}</div>
                <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{tracks.find(t => t.id === delegateTrackId)?.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t('tracks.delegate_dialog.department')} {deptById.get(tracks.find(t => t.id === delegateTrackId)?.department_id)?.name ?? "—"}</div>
              </div>

              <div className="grid gap-2">
                <Label>{t('tracks.delegate_dialog.due_label')}</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-[220px]">
                    <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="date" value={delegateDueDate} onChange={(e) => setDelegateDueDate(e.target.value)} className="h-11 w-full rounded-xl pl-9" />
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
                <div className="text-xs text-muted-foreground">{t('tracks.delegate_dialog.due_note')}</div>
              </div>

              <div className="grid gap-2">
                <Label>{t('tracks.delegate_dialog.people')}</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={delegateUserQuery}
                    onChange={(e) => setDelegateUserQuery(e.target.value)}
                    placeholder={t('tracks.delegate_dialog.people_placeholder') as string}
                    className="h-11 rounded-xl pl-9"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" className="h-9 rounded-full" onClick={() => setDelegateUserIds(assignees.map((u) => u.id))} disabled={!assignees.length}>
                    {t('tracks.delegate_select_filtered')}
                  </Button>
                  <Button variant="outline" className="h-9 rounded-full" onClick={() => setDelegateUserIds([])} disabled={!delegateUserIds.length}>
                    {t('tracks.delegate_clear')}
                  </Button>
                  <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">{delegateUserIds.length} {t('tracks.delegate.selected')}</Badge>
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
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <div className="min-w-0 truncate text-sm font-medium text-[color:var(--sinaxys-ink)]">{u.name}</div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
                                  <Shield className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" />
                                  {roleLabel(u.role)}
                                </span>
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {u.email ? <span className="truncate">{u.email}</span> : null}
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

                      {!assignees.length ? <div className="p-6 text-center text-sm text-muted-foreground">{t('tracks.delegate.no_people')}</div> : null}
                    </div>
                  </ScrollArea>
                </div>

                <div className="text-xs text-muted-foreground">{t('tracks.delegate.note')}</div>
              </div>

              <Separator />

              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" className="w-full rounded-xl sm:w-auto" onClick={() => setDelegateOpen(false)}>
                  {t('cancel')}
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
                        title: t('tracks.delegate.sent_title'),
                        description: t('tracks.delegate.sent_desc', { count: delegateUserIds.length, date: delegateDueDate }),
                      });

                      setDelegateOpen(false);
                      await qc.invalidateQueries({ queryKey: ["assignments", companyId] });
                    } catch (e) {
                      toast({
                        title: t('tracks.delegate.failed_title'),
                        description: e instanceof Error ? e.message : t('tracks.delegate.failed_desc'),
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  {t('tracks.delegate.confirm')}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{t('tracks.delegate.not_found')}</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}