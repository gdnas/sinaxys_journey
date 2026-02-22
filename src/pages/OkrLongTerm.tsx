import { useMemo, useState } from "react";
import { Plus, Target, Trash2, Pencil } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { OkrPageHeader } from "@/components/OkrPageHeader";
import { OkrSubnav } from "@/components/OkrSubnav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import {
  createStrategyObjective,
  deleteStrategyObjective,
  listStrategyObjectives,
  updateStrategyObjective,
  type DbStrategyObjective,
} from "@/lib/okrDb";

function horizonLabel(h: DbStrategyObjective["horizon_years"]) {
  if (h === 1) return "1 ano";
  return `${h} anos`;
}

export default function OkrLongTerm() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useCompany();

  if (!user) return null;
  const cid = companyId ?? "";
  const hasCompany = !!companyId;

  const isAdminish = user.role === "ADMIN" || user.role === "HEAD" || user.role === "MASTERADMIN";

  const { data: items = [] } = useQuery({
    queryKey: ["strategy-objectives", cid],
    enabled: hasCompany,
    queryFn: () => listStrategyObjectives(cid),
  });

  const grouped = useMemo(() => {
    const m = new Map<DbStrategyObjective["horizon_years"], DbStrategyObjective[]>();
    for (const it of items) {
      const k = it.horizon_years;
      m.set(k, [...(m.get(k) ?? []), it]);
    }
    const order: DbStrategyObjective["horizon_years"][] = [1, 3, 5, 10];
    return order
      .filter((k) => (m.get(k) ?? []).length)
      .map((k) => ({ horizon: k, list: m.get(k) ?? [] }));
  }, [items]);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [horizon, setHorizon] = useState<DbStrategyObjective["horizon_years"]>(3);
  const [targetYear, setTargetYear] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [desc, setDesc] = useState<string>("");

  const reset = () => {
    setEditingId(null);
    setHorizon(3);
    setTargetYear("");
    setTitle("");
    setDesc("");
  };

  const [delOpen, setDelOpen] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);

  if (!hasCompany) {
    return (
      <div className="grid gap-6">
        <OkrPageHeader
          title="Objetivos de longo prazo"
          subtitle="Defina e revise os objetivos estratégicos (1–10 anos) da empresa."
          icon={<Target className="h-5 w-5" />}
        />
        <OkrSubnav />
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm text-muted-foreground">Aguardando identificação da empresa do seu usuário…</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <OkrPageHeader
        title="Objetivos de longo prazo"
        subtitle="Revisite, edite e mantenha a estratégia da empresa sempre viva."
        icon={<Target className="h-5 w-5" />}
      />

      <OkrSubnav />

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Objetivos estratégicos</div>
            <p className="mt-1 text-sm text-muted-foreground">Crie objetivos de 1, 3, 5 e 10 anos — e revise com frequência.</p>
          </div>

          {isAdminish ? (
            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              onClick={() => {
                reset();
                setOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo objetivo de longo prazo
            </Button>
          ) : null}
        </div>

        <Separator className="my-5" />

        {items.length ? (
          <div className="grid gap-6">
            {grouped.map((g) => (
              <div key={g.horizon} className="grid gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Horizonte: {horizonLabel(g.horizon)}</div>
                  <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                    {g.list.length}
                  </Badge>
                </div>

                <div className="grid gap-2">
                  {g.list.map((it) => (
                    <div
                      key={it.id}
                      className="flex flex-col gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 md:flex-row md:items-start md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[color:var(--sinaxys-tint)] px-3 py-1 text-[11px] font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
                            {horizonLabel(it.horizon_years)}
                          </span>
                          {it.target_year ? (
                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
                              Alvo: {it.target_year}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 line-clamp-2 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{it.title}</div>
                        {it.description ? <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{it.description}</div> : null}
                      </div>

                      {isAdminish ? (
                        <div className="flex items-center justify-end gap-2 md:pt-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-xl"
                            onClick={() => {
                              setEditingId(it.id);
                              setHorizon(it.horizon_years);
                              setTargetYear(it.target_year ? String(it.target_year) : "");
                              setTitle(it.title);
                              setDesc(it.description ?? "");
                              setOpen(true);
                            }}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className={
                              "h-10 w-10 rounded-xl border-destructive/40 bg-destructive/5 text-destructive " +
                              "hover:bg-destructive/10 hover:text-destructive"
                            }
                            onClick={() => {
                              setDelId(it.id);
                              setDelOpen(true);
                            }}
                            aria-label="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
            Nenhum objetivo de longo prazo ainda. Comece com 3–5 objetivos estratégicos bem claros.
          </div>
        )}
      </Card>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar objetivo de longo prazo" : "Novo objetivo de longo prazo"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Horizonte</Label>
              <Select value={String(horizon)} onValueChange={(v) => setHorizon(Number(v) as any)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 ano</SelectItem>
                  <SelectItem value="3">3 anos</SelectItem>
                  <SelectItem value="5">5 anos</SelectItem>
                  <SelectItem value="10">10 anos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Ano alvo (opcional)</Label>
              <Input
                className="h-11 rounded-xl"
                placeholder="Ex.: 2028"
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Título</Label>
              <Input className="h-11 rounded-xl" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Ser o principal..." />
            </div>

            <div className="grid gap-2">
              <Label>Descrição (opcional)</Label>
              <Textarea className="min-h-[96px] rounded-2xl" value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" disabled={saving} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={saving || title.trim().length < 6}
              onClick={async () => {
                if (saving) return;
                setSaving(true);
                try {
                  const ty = targetYear.trim() ? Number(targetYear) : null;
                  if (targetYear.trim() && (!Number.isFinite(ty) || ty < 2020 || ty > 2100)) {
                    throw new Error("Ano alvo inválido.");
                  }

                  if (editingId) {
                    await updateStrategyObjective(editingId, {
                      horizon_years: horizon,
                      target_year: ty,
                      title,
                      description: desc,
                      owner_user_id: user.id,
                    });
                    toast({ title: "Objetivo atualizado" });
                  } else {
                    await createStrategyObjective({
                      company_id: cid,
                      horizon_years: horizon,
                      target_year: ty,
                      title,
                      description: desc,
                      created_by_user_id: user.id,
                      owner_user_id: user.id,
                      order_index: 0,
                    });
                    toast({ title: "Objetivo criado" });
                  }

                  await qc.invalidateQueries({ queryKey: ["strategy-objectives", cid] });
                  setOpen(false);
                } catch (e) {
                  toast({
                    title: "Não foi possível salvar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setSaving(false);
                }
              }}
            >
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={delOpen}
        onOpenChange={(v) => {
          setDelOpen(v);
          if (!v) setDelId(null);
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir objetivo?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!delId) return;
                try {
                  await deleteStrategyObjective(delId);
                  await qc.invalidateQueries({ queryKey: ["strategy-objectives", cid] });
                  toast({ title: "Objetivo excluído" });
                } catch (e) {
                  toast({
                    title: "Não foi possível excluir",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setDelOpen(false);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
