import { useMemo, useState } from "react";
import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { createDepartment, deleteDepartment, listDepartments, updateDepartment } from "@/lib/departmentsDb";
import { listProfilesByCompany } from "@/lib/profilesDb";
import { supabase } from "@/integrations/supabase/client";

type TrackRow = { id: string; department_id: string; company_id: string };

export default function AdminDepartments() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();

  if (!user || user.role !== "ADMIN" || !user.companyId) return null;
  const companyId = user.companyId;

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: () => listDepartments(companyId),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", companyId],
    queryFn: () => listProfilesByCompany(companyId),
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ["tracks-min", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_tracks")
        .select("id,department_id,company_id")
        .eq("company_id", companyId);
      if (error) throw error;
      return (data ?? []) as TrackRow[];
    },
  });

  const usageByDepartmentId = useMemo(() => {
    const map = new Map<string, { users: number; tracks: number }>();
    for (const d of departments) map.set(d.id, { users: 0, tracks: 0 });

    for (const p of profiles) {
      const deptId = p.department_id;
      if (!deptId) continue;
      const cur = map.get(deptId) ?? { users: 0, tracks: 0 };
      cur.users += 1;
      map.set(deptId, cur);
    }

    for (const t of tracks) {
      const cur = map.get(t.department_id) ?? { users: 0, tracks: 0 };
      cur.tracks += 1;
      map.set(t.department_id, cur);
    }

    return map;
  }, [departments, profiles, tracks]);

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => d.name.toLowerCase().includes(q));
  }, [departments, query]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const editing = editId ? departments.find((d) => d.id === editId) ?? null : null;

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Admin — Departamentos</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Estrutura de departamentos da empresa (Supabase). Departamentos em uso não podem ser removidos.
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
            <p className="mt-1 text-sm text-muted-foreground">{isLoading ? "Carregando…" : `${departments.length} departamentos.`}</p>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="relative w-full md:w-[320px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar departamento…"
                className="h-11 rounded-xl pl-9"
              />
            </div>

            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              onClick={() => {
                setCreateOpen(true);
                setCreateName("");
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo
            </Button>
          </div>
        </div>

        <Separator className="my-5" />

        <div className="max-w-full overflow-x-auto rounded-2xl border border-[color:var(--sinaxys-border)]">
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
                            setEditOpen(true);
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
                                Só é possível remover se não houver usuários nem trilhas vinculadas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                                onClick={async () => {
                                  try {
                                    await deleteDepartment(d.id);
                                    await qc.invalidateQueries({ queryKey: ["departments", companyId] });
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

              {!isLoading && !filtered.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum departamento encontrado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
            {profiles.length} usuários
          </Badge>
          <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
            {tracks.length} trilhas
          </Badge>
        </div>
      </Card>

      <Dialog
        open={createOpen}
        onOpenChange={(v) => {
          setCreateOpen(v);
          if (!v) setCreateName("");
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo departamento</DialogTitle>
          </DialogHeader>

          <div className="grid gap-2">
            <Label>Nome</Label>
            <Input className="h-11 rounded-xl" value={createName} onChange={(e) => setCreateName(e.target.value)} />
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={createName.trim().length < 2}
              onClick={async () => {
                try {
                  await createDepartment(companyId, createName);
                  await qc.invalidateQueries({ queryKey: ["departments", companyId] });
                  toast({ title: "Departamento criado" });
                  setCreateOpen(false);
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

      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditId(null);
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar departamento</DialogTitle>
          </DialogHeader>

          {editing ? (
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input className="h-11 rounded-xl" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Departamento não encontrado.</div>
          )}

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!editing || editName.trim().length < 2}
              onClick={async () => {
                if (!editing) return;
                try {
                  await updateDepartment(editing.id, editName);
                  await qc.invalidateQueries({ queryKey: ["departments", companyId] });
                  toast({ title: "Departamento atualizado" });
                  setEditOpen(false);
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
