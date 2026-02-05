import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, UserPlus, TrendingUp, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";
import { brl, brlPerHourFromMonthly, HOURS_PER_MONTH } from "@/lib/costs";

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
  const [version, force] = useState(0);

  const overview = useMemo(() => {
    if (!deptId) return [];
    return mockDb.getCollaboratorsOverview(deptId);
  }, [deptId, version]);

  const deptTracks = useMemo(() => {
    if (!deptId) return [];
    return mockDb.getTracksByDepartment(deptId).filter((t) => t.published);
  }, [deptId, assignDialogForUserId, version]);

  const deptUsers = useMemo(() => {
    if (!deptId) return [];
    return mockDb
      .getUsers()
      .filter((u) => u.active && u.departmentId === deptId && (u.role === "COLABORADOR" || u.role === "HEAD"));
  }, [deptId, version]);

  const deptMonthlyCost = useMemo(() => {
    return deptUsers.reduce((acc, u) => acc + (u.monthlyCostBRL ?? 0), 0);
  }, [deptUsers]);

  const collaboratorsMonthlyCost = useMemo(() => {
    return deptUsers
      .filter((u) => u.role === "COLABORADOR")
      .reduce((acc, u) => acc + (u.monthlyCostBRL ?? 0), 0);
  }, [deptUsers]);

  if (!user || user.role !== "HEAD" || !deptId) return null;

  return (
    <div className="grid max-w-full gap-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Custo do departamento</div>
              <p className="mt-1 text-sm text-muted-foreground">Mensal e custo/hora (base {HOURS_PER_MONTH}h/mês).</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Wallet className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <div className="text-xs text-muted-foreground">Total mensal</div>
            <div className="text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{brl(deptMonthlyCost)}</div>

            <div className="text-xs text-muted-foreground">Custo por hora (departamento)</div>
            <div className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">{brlPerHourFromMonthly(deptMonthlyCost)}</div>

            <div className="text-xs text-muted-foreground">
              Colaboradores: {brl(collaboratorsMonthlyCost)} • Pessoas consideradas: {deptUsers.length}
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Colaboradores</div>
        <p className="mt-1 text-sm text-muted-foreground">Trilhas atribuídas, evolução e custo por colaborador.</p>

        {/* Mobile: cards */}
        <div className="mt-4 grid gap-3 md:hidden">
          {overview.length ? (
            overview.map((row) => {
              const hasAssignments = row.assignments.length > 0;
              const cost = row.user.monthlyCostBRL;
              return (
                <div
                  key={row.user.id}
                  className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/head/collaborators/${row.user.id}`}
                        className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]"
                      >
                        {row.user.name}
                      </Link>
                      <div className="mt-1 text-xs text-muted-foreground">{row.user.email}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Custo: <span className="font-medium text-[color:var(--sinaxys-ink)]">{cost ? brl(cost) : "—"}</span>
                        <span className="ml-2">
                          • Hora: <span className="font-medium text-[color:var(--sinaxys-ink)]">{cost ? brlPerHourFromMonthly(cost) : "—"}</span>
                        </span>
                      </div>
                    </div>

                    <Dialog
                      open={assignDialogForUserId === row.user.id}
                      onOpenChange={(open) => {
                        setSelectedTrackId("");
                        setAssignDialogForUserId(open ? row.user.id : null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-xl"
                          aria-label="Atribuir trilha"
                          title="Atribuir trilha"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-3xl">
                        <DialogHeader>
                          <DialogTitle>Atribuir trilha</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-2">
                          <div className="text-sm text-muted-foreground">
                            Colaborador: <span className="font-medium text-[color:var(--sinaxys-ink)]">{row.user.name}</span>
                          </div>
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
                            Confirmar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <Separator className="my-4" />

                  {hasAssignments ? (
                    <div className="grid gap-3">
                      {row.assignments.map((a) => {
                        const detail = mockDb.getAssignmentDetail(a.assignment.id);
                        const currentModule = detail?.modules.find(
                          (m) => detail.progressByModuleId[m.id]?.status === "AVAILABLE",
                        );
                        const currentProgress = currentModule
                          ? detail?.progressByModuleId[currentModule.id]
                          : undefined;
                        const needsAttention =
                          currentModule?.type === "QUIZ" &&
                          (currentProgress?.attemptsCount ?? 0) > 0 &&
                          currentProgress?.passed === false;

                        return (
                          <div key={a.assignment.id} className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{a.track.title}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {a.completedModules} de {a.totalModules} módulos • {a.progressPct}%
                            </div>
                            <div className="mt-2">
                              <Progress value={a.progressPct} className="h-2 rounded-full bg-white" />
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
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
                              {needsAttention ? (
                                <Badge className="rounded-full bg-rose-100 text-rose-800 hover:bg-rose-100">
                                  Precisa de atenção
                                </Badge>
                              ) : null}
                            </div>

                            {currentModule ? (
                              <div className="mt-3 text-xs text-muted-foreground">
                                Próxima etapa: <span className="font-medium text-[color:var(--sinaxys-ink)]">{currentModule.title}</span>
                              </div>
                            ) : null}

                            <div className="mt-4 flex items-center justify-end">
                              <Button
                                asChild
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-xl bg-white"
                                aria-label="Ver detalhe"
                                title="Ver detalhe"
                              >
                                <Link to={`/head/collaborators/${row.user.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                      Sem trilha atribuída.
                      <div className="mt-2 flex items-center justify-end">
                        <Button
                          asChild
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-xl bg-white"
                          aria-label="Ver detalhe"
                          title="Ver detalhe"
                        >
                          <Link to={`/head/collaborators/${row.user.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
              Nenhum colaborador ativo no departamento.
            </div>
          )}
        </div>

        {/* Desktop: table */}
        <div className="mt-4 hidden max-w-full overflow-x-auto rounded-2xl border border-[color:var(--sinaxys-border)] md:block">
          <Table className="min-w-[1020px]">
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Trilha</TableHead>
                <TableHead className="w-[220px]">Progresso</TableHead>
                <TableHead>Próxima etapa</TableHead>
                <TableHead>Custo/mês</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.length ? (
                overview.flatMap((row) => {
                  const base = row.assignments.length ? row.assignments : [null];
                  return base.map((a, idx) => {
                    const detail = a ? mockDb.getAssignmentDetail(a.assignment.id) : null;
                    const currentModule = detail?.modules.find(
                      (m) => detail.progressByModuleId[m.id]?.status === "AVAILABLE",
                    );
                    const currentProgress = currentModule
                      ? detail?.progressByModuleId[currentModule.id]
                      : undefined;
                    const needsAttention =
                      !!a &&
                      !!currentModule &&
                      currentModule.type === "QUIZ" &&
                      (currentProgress?.attemptsCount ?? 0) > 0 &&
                      currentProgress?.passed === false;

                    const cost = row.user.monthlyCostBRL;

                    return (
                      <TableRow key={`${row.user.id}_${a?.assignment.id ?? idx}`}>
                        <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">
                          <Link
                            to={`/head/collaborators/${row.user.id}`}
                            className="rounded-md underline-offset-4 hover:underline"
                          >
                            {row.user.name}
                          </Link>
                          <div className="text-xs text-muted-foreground">{row.user.email}</div>
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
                            currentModule ? (
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-[color:var(--sinaxys-ink)]">
                                  {currentModule.title}
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                  <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                                    {currentModule.type === "VIDEO"
                                      ? "Vídeo"
                                      : currentModule.type === "QUIZ"
                                        ? "Quiz"
                                        : currentModule.type === "CHECKPOINT"
                                          ? "Checkpoint"
                                          : "Material"}
                                  </Badge>

                                  {needsAttention ? (
                                    <Badge className="rounded-full bg-rose-100 text-rose-800 hover:bg-rose-100">
                                      Precisa de atenção
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">—</div>
                            )
                          ) : (
                            <div className="text-sm text-muted-foreground">—</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">{cost ? brl(cost) : "—"}</div>
                          {!cost ? (
                            <div className="text-xs text-muted-foreground">Defina no perfil</div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">
                            {cost ? brlPerHourFromMonthly(cost) : "—"}
                          </div>
                          {!cost ? (
                            <div className="text-xs text-muted-foreground">Base: {HOURS_PER_MONTH}h/mês</div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {a ? (
                            <div className="flex flex-wrap items-center gap-2">
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
                            </div>
                          ) : (
                            <Badge className="rounded-full bg-muted text-muted-foreground hover:bg-muted">—</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              asChild
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 rounded-xl"
                              aria-label="Ver detalhe"
                              title="Ver detalhe"
                            >
                              <Link to={`/head/collaborators/${row.user.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>

                            <Dialog
                              open={assignDialogForUserId === row.user.id}
                              onOpenChange={(open) => {
                                setSelectedTrackId("");
                                setAssignDialogForUserId(open ? row.user.id : null);
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 rounded-xl"
                                  aria-label="Atribuir trilha"
                                  title="Atribuir trilha"
                                >
                                  <UserPlus className="h-4 w-4" />
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
                    );
                  });
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
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