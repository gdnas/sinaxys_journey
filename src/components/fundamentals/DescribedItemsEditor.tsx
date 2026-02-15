import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { DescribedItem } from "@/lib/fundamentalsFormat";

export function DescribedItemsEditor({
  label,
  hint,
  items,
  onChange,
  canEdit,
  saving,
  addLabel = "Adicionar",
}: {
  label: string;
  hint?: string;
  items: DescribedItem[];
  onChange: (items: DescribedItem[]) => void;
  canEdit: boolean;
  saving: boolean;
  addLabel?: string;
}) {
  const safeItems = useMemo(() => items ?? [], [items]);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");

  useEffect(() => {
    setDraftTitle("");
    setDraftDesc("");
  }, [label]);

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{label}</div>
      {hint ? <div className="mt-1 text-sm text-muted-foreground">{hint}</div> : null}

      <Separator className="my-4" />

      <div className="grid gap-3">
        {safeItems.length ? (
          <div className="grid gap-3">
            {safeItems.map((it, idx) => (
              <div key={idx} className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <Label className="text-xs">Título</Label>
                    <Input
                      className="mt-1 h-11 rounded-2xl bg-white"
                      value={it.title}
                      disabled={!canEdit || saving}
                      onChange={(e) => {
                        const v = e.target.value;
                        onChange(safeItems.map((p, i) => (i === idx ? { ...p, title: v } : p)));
                      }}
                      placeholder="Ex.: Transparência"
                    />

                    <Label className="mt-3 text-xs">Descrição</Label>
                    <Textarea
                      className="mt-1 min-h-[96px] rounded-2xl bg-white"
                      value={it.description}
                      disabled={!canEdit || saving}
                      onChange={(e) => {
                        const v = e.target.value;
                        onChange(safeItems.map((p, i) => (i === idx ? { ...p, description: v } : p)));
                      }}
                      placeholder="Explique o que isso significa na prática (comportamentos esperados, exemplos, etc.)"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="mt-6 h-11 w-11 rounded-2xl bg-white"
                    disabled={!canEdit || saving}
                    onClick={() => onChange(safeItems.filter((_, i) => i !== idx))}
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Nenhum item ainda.</div>
        )}

        <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Adicionar novo</div>

          <div className="mt-3 grid gap-3">
            <div className="grid gap-2">
              <Label className="text-xs">Título</Label>
              <Input
                className="h-11 rounded-2xl"
                value={draftTitle}
                disabled={!canEdit || saving}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Ex.: Obsessão pelo cliente"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                className="min-h-[96px] rounded-2xl"
                value={draftDesc}
                disabled={!canEdit || saving}
                onChange={(e) => setDraftDesc(e.target.value)}
                placeholder="Descreva como isso aparece no dia a dia"
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                disabled={!canEdit || saving || (draftTitle.trim().length < 2 && draftDesc.trim().length < 4)}
                onClick={() => {
                  const next: DescribedItem = { title: draftTitle.trim(), description: draftDesc.trim() };
                  onChange([...safeItems, next]);
                  setDraftTitle("");
                  setDraftDesc("");
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                {addLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
