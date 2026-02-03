import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";

function statusLabel(s: string) {
  switch (s) {
    case "NOT_STARTED":
      return "Não iniciado";
    case "IN_PROGRESS":
      return "Em andamento";
    case "COMPLETED":
      return "Concluído";
    case "LOCKED":
      return "Travado";
    default:
      return s;
  }
}

export default function HeadDashboard() {
  const { user } = useAuth();
  const deptId = user?.departmentId;
  const [assignDialogForUserId, setAssignDialogForUserId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const [, force] = useState(0);

  const overview = useMemo(() => {
    if (!deptId) return [];
    return mockDb.getCollaboratorsOverview(deptId);
  }, [deptId]);

  const deptTracks = useMemo(() => {
    if (!deptId) return [];
    return mockDb.getTracksByDepartment(deptId).filter((t) => t.published);
  }, [deptId, assignDialogForUserId]);

  if (!user || user.role !== "HEAD" || !deptId) return null;

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Painel do departamento</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhe progresso com clareza. Se algo estiver travado, você identifica rápido.
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <TrendingUp className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Colaboradores</div>
        <p className="mt-1 text-sm text-muted-foreground">Trilhas atribuídas e evolução por colaborador.</p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--sinaxys-border)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Trilha</TableHead>
                <TableHead className="w-[220px]">Progresso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.length ? (
                overview.flatMap((row) => {
                  const base = row.assignments.length ? row.assignments : [null];
                  return base.map((a, idx) => (
                    <TableRow key={`${row.user.id}_${a?.assignment.id ?? idx}`}>
                      <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">
                        <Link
                          to={`/head/collaborators/${row.user.id}`}
                          className="rounded-md underline-offset-4 hover:underline"
                        >
                          {row.user.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {a ? (
                          <div>
                            <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">{a.track.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {a.completedModules} de {a.totalModules} módulos
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Sem trilha atribuída</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {a ? (
                          <div className="grid gap-2">
                            <Progress value={a.progressPct} className="h-2 rounded-full bg-[color:var(--sinaxys-tint)]" />
                            <div className="text-xs text-muted-foreground">{a.progressPct}%</div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">—</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {a ? (
                          <Badge
                            className={
                              "rounded-full " +
                              (a.assignment.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                                : a.assignment.status === "IN_PROGRESS"
                                  ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                                  : "bg-amber-100 text-amber-800 hover:bg-amber-100")
                            }
                          >
                            {statusLabel(a.assignment.status)}
                          </Badge>
                        ) : (
                          <Badge className="rounded-full bg-muted text-muted-foreground hover:bg-muted">—</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild variant="outline" className="rounded-xl">
                            <Link to={`/head/collaborators/${row.user.id}`}>Ver detalhe</Link>
                          </Button>

                          <Dialog
                            open={assignDialogForUserId === row.user.id}
                            onOpenChange={(open) => {
                              setSelectedTrackId("");
                              setAssignDialogForUserId(open ? row.user.id : null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="outline" className="rounded-xl">
                                <UserPlus className="mr-2 h-4 w-4" />
                                Atribuir trilha
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-3xl">
                              <DialogHeader>
                                <DialogTitle>Atribuir trilha</DialogTitle>
                              </DialogHeader>
                              <div className="grid gap-2">
                                <div className="text-sm text-muted-foreground">Colaborador: <span className="font-medium text-[color:var(--sinaxys-ink)]">{row.user.name}</span></div>
                                <Select value={selectedTrackId} onValueChange={setSelectedTrackId}>
                                  <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Selecione uma trilha publicada…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {deptTracks.map((t) => (
                                      <SelectItem key={t.id} value={t.id}>
                                        {t.title}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <DialogFooter>
                                <Button
                                  className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                                  disabled={!selectedTrackId}
                                  onClick={() => {
                                    mockDb.assignTrack({
                                      trackId: selectedTrackId,
                                      userId: row.user.id,
                                      assignedByUserId: user.id,
                                    });
                                    setAssignDialogForUserId(null);
                                    force((x) => x + 1);
                                  }}
                                >
                                  Confirmar atribuição
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ));
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum colaborador ativo no departamento.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}