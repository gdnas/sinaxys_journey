import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Pencil, Plus, Rocket } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { createTrack, getTracksByDepartment, setTrackPublished } from "@/lib/journeyDb";
import { formatShortDate } from "@/lib/sinaxys";

export default function HeadTracks() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user || user.role !== "HEAD" || !user.departmentId || !user.companyId) return null;
  const deptId = user.departmentId;

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ["tracks-by-dept", deptId],
    queryFn: () => getTracksByDepartment(deptId),
  });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      createTrack({
        companyId: user.companyId!,
        departmentId: deptId,
        title,
        description,
        createdByUserId: user.id,
      }),
    onSuccess: async (t) => {
      await qc.invalidateQueries({ queryKey: ["tracks-by-dept", deptId] });
      setOpen(false);
      setTitle("");
      setDescription("");
      navigate(`/head/tracks/${t.id}/edit`);
    },
  });

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Trilhas (Head)</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie e publique trilhas do seu departamento.
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <Rocket className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Catálogo do departamento</div>
            <p className="mt-1 text-sm text-muted-foreground">{isLoading ? "Carregando…" : `${tracks.length} trilhas`}</p>
          </div>

          <Button
            className="w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 md:w-auto"
            onClick={() => setOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Criar trilha
          </Button>
        </div>

        <div className="mt-5 grid gap-3">
          {tracks.length ? (
            tracks
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
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Criada em {formatShortDate(t.created_at)}</div>
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end md:w-auto">
                    <Button asChild variant="outline" className="w-full rounded-xl sm:w-auto">
                      <Link to={`/head/tracks/${t.id}/edit`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl sm:w-auto"
                      onClick={async () => {
                        try {
                          await setTrackPublished(t.id, !t.published);
                          await qc.invalidateQueries({ queryKey: ["tracks-by-dept", deptId] });
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
              ))
          ) : (
            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhuma trilha ainda.</div>
          )}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar trilha</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <div className="text-sm font-medium">Título</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" placeholder="Ex.: Onboarding — Comercial" />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">Descrição</div>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-28 rounded-2xl" />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={title.trim().length < 6 || description.trim().length < 10 || createMutation.isPending}
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
