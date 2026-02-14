import { useMemo, useState } from "react";
import { Plus, Trash2, Wallet } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { brl } from "@/lib/costs";
import { parsePtNumber } from "@/lib/roi";
import { createObjectiveCostItem, deleteObjectiveCostItem, listObjectiveCostItems } from "@/lib/okrCostsDb";

export function OkrObjectiveCostItems({
  objectiveId,
  canWrite,
}: {
  objectiveId: string;
  canWrite: boolean;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["okr-objective-cost-items", objectiveId],
    queryFn: () => listObjectiveCostItems(objectiveId),
  });

  const total = useMemo(() => items.reduce((acc, it) => acc + (Number(it.amount_brl) || 0), 0), [items]);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle("");
    setAmount("");
    setNotes("");
  };

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Custos extras (não-humanos)</div>
          <p className="mt-1 text-sm text-muted-foreground">Ferramentas, fornecedores, mídia, deslocamento, infraestrutura etc.</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
          <Wallet className="h-5 w-5" />
        </div>
      </div>

      <Separator className="my-5" />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <span className="text-muted-foreground">Total:</span>{" "}
          <span className="font-semibold text-[color:var(--sinaxys-ink)]">{brl(total)}</span>
        </div>
        {canWrite ? (
          <Button
            className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
            onClick={() => {
              reset();
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar custo
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3">
        {isLoading ? (
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Carregando…</div>
        ) : items.length ? (
          items.map((it) => (
            <div key={it.id} className="flex items-start justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{it.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{brl(Number(it.amount_brl) || 0)}</div>
                {it.notes?.trim() ? <div className="mt-2 text-sm text-muted-foreground">{it.notes}</div> : null}
              </div>
              {canWrite ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                  title="Excluir"
                  onClick={async () => {
                    try {
                      await deleteObjectiveCostItem(it.id);
                      await qc.invalidateQueries({ queryKey: ["okr-objective-cost-items", objectiveId] });
                    } catch (e) {
                      toast({
                        title: "Não foi possível excluir",
                        description: e instanceof Error ? e.message : "Erro inesperado.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Nenhum custo extra cadastrado.</div>
        )}
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo custo extra</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input className="h-11 rounded-xl" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Licença do CRM" />
            </div>
            <div className="grid gap-2">
              <Label>Valor estimado (R$)</Label>
              <Input className="h-11 rounded-xl" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1200" />
            </div>
            <div className="grid gap-2">
              <Label>Notas (opcional)</Label>
              <Textarea className="min-h-[88px] rounded-2xl" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={saving || title.trim().length < 3 || parsePtNumber(amount) === null}
              onClick={async () => {
                const value = parsePtNumber(amount);
                if (value === null) return;
                try {
                  setSaving(true);
                  await createObjectiveCostItem({ objective_id: objectiveId, title, amount_brl: value, notes });
                  await qc.invalidateQueries({ queryKey: ["okr-objective-cost-items", objectiveId] });
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
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
