import { useMemo, useState } from "react";
import { Plus, Gift, Trophy, Trash2, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";
import type { RewardTier } from "@/lib/domain";

function tierPalette(i: number) {
  const palette = [
    "bg-violet-100 text-violet-900 hover:bg-violet-100",
    "bg-sky-100 text-sky-900 hover:bg-sky-100",
    "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
    "bg-amber-100 text-amber-900 hover:bg-amber-100",
    "bg-rose-100 text-rose-900 hover:bg-rose-100",
  ];
  return palette[i % palette.length];
}

export default function AdminRewards() {
  const { toast } = useToast();
  const { user, activeCompanyId } = useAuth();
  const companyId = user?.role === "MASTERADMIN" ? activeCompanyId : user?.companyId;

  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const tiers = useMemo(() => {
    if (!companyId) return [];
    return mockDb.getRewardTiers(companyId);
  }, [companyId, version]);

  const leaderboard = useMemo(() => {
    if (!companyId) return [];
    return mockDb.getXpLeaderboard(companyId);
  }, [companyId, version]);

  const editing = useMemo(() => {
    if (!editingId) return null;
    return tiers.find((t) => t.id === editingId) ?? null;
  }, [tiers, editingId]);

  const [name, setName] = useState("");
  const [minXp, setMinXp] = useState("100");
  const [prize, setPrize] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);

  const resetForm = () => {
    setName("");
    setMinXp("100");
    setPrize("");
    setDescription("");
    setActive(true);
    setEditingId(null);
  };

  const canView = !!user && user.role === "ADMIN" && !!companyId;
  if (!canView) return null;

  const sorted = tiers.slice().sort((a, b) => a.minXp - b.minXp);

  const saveTier = () => {
    const n = name.trim();
    const xp = Number(minXp);
    if (n.length < 2) {
      toast({ title: "Nome inválido", description: "Informe um nome para o tier.", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(xp) || xp < 0) {
      toast({ title: "XP inválido", description: "Use um valor inteiro maior ou igual a 0.", variant: "destructive" });
      return;
    }

    try {
      const payload: Omit<RewardTier, "id" | "companyId" | "createdAt"> & { id?: string } = {
        id: editingId ?? undefined,
        name: n,
        minXp: Math.floor(xp),
        prize: prize.trim(),
        description: description.trim() || undefined,
        active,
      };

      mockDb.upsertRewardTier(companyId!, payload);
      setVersion((v) => v + 1);
      setOpen(false);
      resetForm();
      toast({ title: "Tier salvo", description: "As regras de premiação foram atualizadas." });
    } catch (e) {
      toast({
        title: "Não foi possível salvar",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Admin — Tiers & premiações</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Defina metas de XP e os prêmios associados. O ranking usa o XP acumulado em trilhas concluídas.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                {sorted.length} tiers
              </Badge>
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                {leaderboard.length} participantes
              </Badge>
            </div>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <Gift className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Regras</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Um usuário está em um tier quando o XP total é maior ou igual ao mínimo.
            </p>
          </div>

          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                <Plus className="mr-2 h-4 w-4" />
                Novo tier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar tier" : "Novo tier"}</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" placeholder="Ex.: Ouro" />
                </div>
                <div className="grid gap-2">
                  <Label>XP mínimo</Label>
                  <Input
                    value={minXp}
                    onChange={(e) => setMinXp(e.target.value.replace(/[^0-9]/g, ""))}
                    className="rounded-xl"
                    inputMode="numeric"
                    placeholder="Ex.: 1200"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Prêmio</Label>
                  <Input value={prize} onChange={(e) => setPrize(e.target.value)} className="rounded-xl" placeholder="Ex.: Voucher" />
                </div>
                <div className="grid gap-2">
                  <Label>Descrição (opcional)</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24 rounded-2xl" />
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-4">
                  <div>
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Ativo</div>
                    <div className="mt-1 text-xs text-muted-foreground">Tiers inativos não aparecem para o time.</div>
                  </div>
                  <Switch checked={active} onCheckedChange={setActive} />
                </div>
              </div>

              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" className="w-full rounded-xl sm:w-auto" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  className="w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 sm:w-auto"
                  onClick={saveTier}
                >
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-[color:var(--sinaxys-border)]">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead>XP mínimo</TableHead>
                <TableHead>Prêmio</TableHead>
                <TableHead>Pessoas elegíveis</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((t, idx) => {
                const eligible = leaderboard.filter((p) => p.xp >= t.minXp).length;
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={"rounded-full " + tierPalette(idx)}>{t.name}</Badge>
                        {!t.active ? (
                          <Badge className="rounded-full bg-muted text-muted-foreground hover:bg-muted">Inativo</Badge>
                        ) : null}
                      </div>
                      {t.description ? (
                        <div className="mt-1 text-xs text-muted-foreground">{t.description}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-semibold text-[color:var(--sinaxys-ink)]">{t.minXp}</TableCell>
                    <TableCell className="text-muted-foreground">{t.prize || "—"}</TableCell>
                    <TableCell>
                      <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                        {eligible}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-xl"
                          onClick={() => {
                            setEditingId(t.id);
                            setName(t.name);
                            setMinXp(String(t.minXp));
                            setPrize(t.prize);
                            setDescription(t.description ?? "");
                            setActive(t.active);
                            setOpen(true);
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
                              aria-label="Remover"
                              title="Remover"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-3xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover tier?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação remove a regra de premiação. O XP das pessoas não é alterado.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                                onClick={() => {
                                  try {
                                    mockDb.deleteRewardTier(t.id);
                                    setVersion((v) => v + 1);
                                  } catch (e) {
                                    toast({
                                      title: "Não foi possível remover",
                                      description: e instanceof Error ? e.message : "Tente novamente.",
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

              {!sorted.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum tier configurado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <Separator className="my-5" />

        <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white">
              <Trophy className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Recomendação</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Use poucos tiers bem definidos e premie consistência. Um bom padrão é 3 a 5 níveis.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
