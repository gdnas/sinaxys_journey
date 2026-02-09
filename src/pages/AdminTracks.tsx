import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, GraduationCap, Plus, Send } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { listDepartments } from "@/lib/departmentsDb";
import { createTrack, getTracksByCompany, setTrackPublished } from "@/lib/journeyDb";
import { formatShortDate } from "@/lib/sinaxys";

export default function AdminTracks() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user || user.role !== "ADMIN" || !user.companyId) return null;
  const companyId = user.companyId;

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: () => listDepartments(companyId),
  });

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ["tracks", companyId],
    queryFn: () => getTracksByCompany(companyId),
  });

  const [deptFilter, setDeptFilter] = useState<string>("__all__");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = tracks;
    if (deptFilter !== "__all__") base = base.filter((t) => t.department_id === deptFilter);
    if (!q) return base;
    return base.filter((t) => `${t.title} ${t.description}`.toLowerCase().includes(q));
  }, [tracks, deptFilter, query]);

  const deptNameById = useMemo(() => new Map(departments.map((d) => [d.id, d.name] as const)), [departments]);

  // Create
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");

  const createMutation = useMutation({
    mutationFn: () =>
      createTrack({
        companyId,
        departmentId,
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
      navigate(`/admin/tracks/${t.id}/edit`);
    },
  });

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Admin — Trilhas</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Monte trilhas para qualquer departamento e publique quando estiver pronto. Para delegar trilhas para pessoas, use a biblioteca.
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <GraduationCap className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button asChild className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
            <Link to="/tracks">
              <Send className="mr-2 h-4 w-4" />
              Delegar trilhas (biblioteca)
            </Link>
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Catálogo da empresa</div>
            <p className="mt-1 text-sm text-muted-foreground">{isLoading ? "Carregando…" : `${visible.length} trilhas (filtro aplicado)`}</p>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="h-11 w-full rounded-xl md:w-[240px]">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os departamentos</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar trilhas…"
              className="h-11 w-full rounded-xl md:w-[320px]"
            />

            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              onClick={() => setOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar
            </Button>
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-3">
          {visible
            .slice()
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .map((t) => (
              <div
                key={t.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] p-4 md:flex-row md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{t.title}</div>
                    {t.published ? (
                      <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Publicada</Badge>
                    ) : (
                      <Badge className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100">Rascunho</Badge>
                    )}
                    <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                      {deptNameById.get(t.department_id) ?? "Departamento"}
                    </Badge>
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.description}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Criada em {formatShortDate(t.created_at)}</div>
                </div>

                <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end md:w-auto">
                  <Button asChild variant="outline" className="w-full rounded-xl sm:w-auto">
                    <Link to={`/admin/tracks/${t.id}/edit`}>Editar</Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl sm:w-auto"
                    onClick={async () => {
                      try {
                        await setTrackPublished(t.id, !t.published);
                        await qc.invalidateQueries({ queryKey: ["tracks", companyId] });
                      } catch (e) {
                        toast({
                          title: "Não foi possível atualizar",
                          description: e instanceof Error ? e.message : "Erro inesperado.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    {t.published ? (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" />
                        Despublicar
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Publicar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}

          {!isLoading && visible.length === 0 ? (
            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhuma trilha ainda.</div>
          ) : null}
        </div>
      </Card>

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
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar trilha</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Departamento</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-xl" placeholder="Ex.: Onboarding — Comercial" />
            </div>

            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-28 rounded-2xl" />
            </div>

            <div className="text-xs text-muted-foreground">Depois de criar, você poderá adicionar módulos (vídeo, material, checkpoint e quiz).</div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={
                !departmentId || title.trim().length < 6 || description.trim().length < 10 || createMutation.isPending
              }
              onClick={async () => {
                try {
                  await createMutation.mutateAsync();
                } catch (e) {
                  toast({
                    title: "Não foi possível criar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Criar e editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
