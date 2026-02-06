import { useMemo, useState } from "react";
import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";

export default function AdminDepartments() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [version, setVersion] = useState(0);

  if (!user || user.role !== "ADMIN" || !user.companyId) return null;
  const companyId = user.companyId;

  const departments = useMemo(() => mockDb.getDepartments(companyId).slice().sort((a, b) => a.name.localeCompare(b.name)), [companyId, version]);
  const users = useMemo(() => mockDb.getUsers(companyId), [companyId, version]);
  const tracks = useMemo(() => mockDb.getTracks(companyId), [companyId, version]);

  const usageByDepartmentId = useMemo(() => {
    const map = new Map<string, { users: number; tracks: number }>();
    for (const d of departments) map.set(d.id, { users: 0, tracks: 0 });

    for (const u of users) {
      if (!u.departmentId) continue;
      const cur = map.get(u.departmentId) ?? { users: 0, tracks: 0 };
      cur.users += 1;
      map.set(u.departmentId, cur);
    }

    for (const t of tracks) {
      const cur = map.get(t.departmentId) ?? { users: 0, tracks: 0 };
      cur.tracks += 1;
      map.set(t.departmentId, cur);
    }

    return map;
  }, [departments, users, tracks]);

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => d.name.toLowerCase().includes(q));
  }, [departments, query]);

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");

  // Edit
  const [editId, setEditId] = useState<string | null>(null);
  const editing = editId ? departments.find((d) => d.id === editId) ?? null : null;
  const [editName, setEditName] = useState("");

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Admin — Departamentos</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie, renomeie e mantenha a estrutura de departamentos da empresa. Departamentos em uso não podem ser removidos.
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <Building2 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Lista</div>
            <p className="mt-1 text-sm text-muted-foreground">{departments.length} departamentos cadastrados.</p>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="relative w-full md:w-[320px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar departamento..."
                className="h-11 rounded-xl pl-9"
              />
            </div>

            <Dialog
              open={createOpen}
              onOpenChange={(v) => {
                setCreateOpen(v);
                if (!v) setCreateName("");
              }}
            >
              <DialogTrigger asChild>
                <Button className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Novo departamento</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label>Nome</Label>
                    <Input
                      className="h-11 rounded-xl"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="Ex.: Produto, Comercial..."
                    />
                  </div>
                  <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                    Dica: use nomes curtos e consistentes. Você pode renomear depois.
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                    disabled={createName.trim().length < 2}
                    onClick={() => {
                      try {
                        mockDb.createDepartment(companyId, createName);
                        setCreateOpen(false);
                        setVersion((v) => v + 1);
                        toast({ title: "Departamento criado" });
                      } catch (e) {
                        toast({
                          title: "Não foi possível criar",
                          description: e instanceof Error ? e.message : "Erro inesperado.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Criar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Separator className="my-5" />

        <div className="hidden max-w-full overflow-x-auto rounded-2xl border border-[color:var(--sinaxys-border)] md:block">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow>
                <TableHead>Departamento</TableHead>
                <TableHead className="text-right">Pessoas</TableHead>
                <TableHead className="text-right">Trilhas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => {
                const usage = usageByDepartmentId.get(d.id) ?? { users: 0, tracks: 0 };
                const busy = usage.users > 0 || usage.tracks > 0;
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">{d.name}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{usage.users}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{usage.tracks}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-xl"
                          onClick={() => {
                            setEditId(d.id);
                            setEditName(d.name);
                          }}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 rounded-xl"
                              disabled={busy}
                              aria-label="Remover"
                              title={busy ? "Não é possível remover: departamento em uso" : "Remover"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-3xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover departamento?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação apaga o departamento. Só é possível remover se não houver usuários nem trilhas vinculadas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                                onClick={() => {
                                  try {
                                    mockDb.deleteDepartment(d.id);
                                    setVersion((v) => v + 1);
                                    toast({ title: "Departamento removido" });
                                  } catch (e) {
                                    toast({
                                      title: "Não foi possível remover",
                                      description: e instanceof Error ? e.message : "Erro inesperado.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!filtered.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum departamento encontrado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="grid gap-3 md:hidden">
          {filtered.map((d) => {
            const usage = usageByDepartmentId.get(d.id) ?? { users: 0, tracks: 0 };
            const busy = usage.users > 0 || usage.tracks > 0;

            return (
              <div key={d.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{d.name}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                        {usage.users} pessoas
                      </Badge>
                      <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                        {usage.tracks} trilhas
                      </Badge>
                      {busy ? (
                        <Badge className="rounded-full bg-muted text-muted-foreground hover:bg-muted">Em uso</Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-xl"
                      onClick={() => {
                        setEditId(d.id);
                        setEditName(d.name);
                      }}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-xl"
                          disabled={busy}
                          aria-label="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-3xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover departamento?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Só é possível remover se não houver usuários nem trilhas vinculadas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                            onClick={() => {
                              try {
                                mockDb.deleteDepartment(d.id);
                                setVersion((v) => v + 1);
                                toast({ title: "Departamento removido" });
                              } catch (e) {
                                toast({
                                  title: "Não foi possível remover",
                                  description: e instanceof Error ? e.message : "Erro inesperado.",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            );
          })}

          {!filtered.length ? (
            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
              Nenhum departamento encontrado.
            </div>
          ) : null}
        </div>
      </Card>

      <Dialog
        open={!!editId}
        onOpenChange={(v) => {
          if (!v) setEditId(null);
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar departamento</DialogTitle>
          </DialogHeader>

          {editing ? (
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input className="h-11 rounded-xl" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                Renomear não altera histórico, mas afeta onde o nome aparece (usuários, trilhas, rankings, etc.).
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Departamento não encontrado.</div>
          )}

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditId(null)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!editing || editName.trim().length < 2}
              onClick={() => {
                if (!editing) return;
                try {
                  mockDb.updateDepartment(editing.id, editName);
                  toast({ title: "Departamento atualizado" });
                  setEditId(null);
                  setVersion((v) => v + 1);
                } catch (e) {
                  toast({
                    title: "Não foi possível salvar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
