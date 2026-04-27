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

  console.log('USER DEBUG', user)

  const companyId = user?.companyId || (user as any)?.company_id;
  const isMasterAdmin = user?.role === "MASTERADMIN";
  const canRender = !!user && !!companyId && !isMasterAdmin;
  const canCreateTrack = user?.role === "HEAD";
  const canDelegate = true;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: () => listDepartments(companyId as string),
    enabled: canRender,
  });

  const { data: tracks = [], isLoading: tracksLoading } = useQuery({
    queryKey: ["tracks", companyId],
    queryFn: () => getTracksByCompany(companyId as string),
    enabled: canRender,
  });

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d] as const)), [departments]);

  const visibleTracks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = user?.role === "COLABORADOR" ? tracks.filter((t) => t.published) : tracks;
    if (!q) return base;
    return base.filter((t) => `${t.title} ${t.description}`.toLowerCase().includes(q));
  }, [tracks, user?.role, query]);

  const tracksByDept = useMemo(() => {
    const by = new Map<string, typeof visibleTracks>();
    for (const t of visibleTracks) {
      const arr = by.get(t.department_id) ?? [];
      arr.push(t);
      by.set(t.department_id, arr);
    }
    return by;
  }, [visibleTracks]);

  const createMutation = useMutation({
    mutationFn: () =>
      createTrack({
        companyId: companyId as string,
        departmentId: user?.role === "HEAD" && user.departmentId ? user.departmentId : departmentId,
        title,
        description,
        createdByUserId: user?.id as string,
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

  const [delegateOpen, setDelegateOpen] = useState(false);
  const [delegateTrackId, setDelegateTrackId] = useState<string | null>(null);
  const [delegateUserQuery, setDelegateUserQuery] = useState("");
  const [delegateUserIds, setDelegateUserIds] = useState<string[]>([]);
  const [delegateDueDate, setDelegateDueDate] = useState<string>("");

  const profilesQuery = useQuery({
    queryKey: ["profiles", companyId],
    queryFn: () => listProfilesByCompany(companyId as string),
    enabled: canRender,
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
                  if (user?.departmentId) {
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
                                <div className="text-base font-semibold text-[color:var(--sinaxys-ink)]">{tItem.title}</div>
                                <Badge variant={tItem.published ? "default" : "secondary"} className="rounded-full">
                                  {tItem.published ? t('tracks.published') : t('tracks.draft')}
                                </Badge>
                              </div>
                              {tItem.description ? <p className="mt-1 text-sm text-muted-foreground">{tItem.description}</p> : null}
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--sinaxys-tint)] px-2.5 py-1 text-[color:var(--sinaxys-ink)]">
                                  <CalendarClock className="h-3.5 w-3.5" />
                                  {formatShortDate(tItem.created_at)}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button asChild variant="outline" className="rounded-xl">
                                <Link to={`/tracks/${tItem.id}`}>
                                  <ArrowLeft className="mr-2 h-4 w-4" />
                                  {t('tracks.open')}
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[color:var(--sinaxys-border)] p-6 text-sm text-muted-foreground">
                      {t('tracks.none')}
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