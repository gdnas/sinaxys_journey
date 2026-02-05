import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Rocket, Pencil, Eye, EyeOff, Library } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";
import { formatShortDate } from "@/lib/sinaxys";
import TrackLibrary from "@/pages/TrackLibrary";

export default function HeadTracks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const deptId = user?.departmentId;
  const [version, force] = useState(0);

  const tracks = useMemo(() => {
    if (!deptId) return [];
    return mockDb.getTracksByDepartment(deptId);
  }, [deptId, version]);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  if (!user || user.role !== "HEAD" || !deptId) return null;

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Trilhas</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie jornadas do seu departamento — e use a biblioteca para delegar conteúdos de toda a empresa.
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <Rocket className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Tabs defaultValue="dept" className="w-full">
        <TabsList className="w-full justify-start rounded-2xl bg-[color:var(--sinaxys-tint)] p-1">
          <TabsTrigger value="dept" className="rounded-xl">Departamento</TabsTrigger>
          <TabsTrigger value="library" className="rounded-xl">Biblioteca</TabsTrigger>
        </TabsList>

        <TabsContent value="dept" className="mt-6">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Catálogo do departamento</div>
                <p className="mt-1 text-sm text-muted-foreground">Rascunhos não aparecem para colaboradores até serem publicados.</p>
              </div>

              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 md:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Criar trilha
                  </Button>
                </DialogTrigger>
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
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-28 rounded-2xl"
                        placeholder="Explique em 2–3 frases o que a trilha entrega."
                      />
                    </div>
                  </div>
                  <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      className="w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 sm:w-auto"
                      disabled={title.trim().length < 6 || description.trim().length < 10}
                      onClick={() => {
                        const t = mockDb.createTrack({ departmentId: deptId, title, description, createdByUserId: user.id });
                        setOpen(false);
                        setTitle("");
                        setDescription("");
                        force((x) => x + 1);
                        navigate(`/head/tracks/${t.id}/edit`);
                      }}
                    >
                      Criar e editar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="mt-5 grid gap-3">
              {tracks.length ? (
                tracks.map((t) => (
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
                      <div className="mt-1 text-xs text-muted-foreground">Criada em {formatShortDate(t.createdAt)}</div>
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
                        onClick={() => {
                          mockDb.setTrackPublished(t.id, !t.published);
                          force((x) => x + 1);
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
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                  Nenhuma trilha criada ainda. Crie a primeira para iniciar a jornada do time.
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="library" className="mt-6">
          <TrackLibrary />
        </TabsContent>
      </Tabs>
    </div>
  );
}