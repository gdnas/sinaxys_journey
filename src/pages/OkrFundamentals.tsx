import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Save, Plus, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { getCompanyFundamentals, upsertCompanyFundamentals, type DbCompanyFundamentals } from "@/lib/okrDb";
import { OkrPageHeader } from "@/components/OkrPageHeader";

function parseListValue(v: string | null | undefined) {
  if (!v?.trim()) return [];
  return v
    .split("\n")
    .map((s) => s.trim())
    .map((s) => s.replace(/^[-•]\s+/, ""))
    .filter(Boolean);
}

function serializeListValue(items: string[]) {
  return items
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
}

function Block({ label, value }: { label: string; value?: string | null }) {
  const items = useMemo(() => parseListValue(value), [value]);

  return (
    <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {items.length ? (
        <ul className="mt-3 grid gap-2">
          {items.slice(0, 6).map((it) => (
            <li key={it} className="flex items-start gap-2 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--sinaxys-primary)]/70" />
              <span className="min-w-0">{it}</span>
            </li>
          ))}
          {items.length > 6 ? <li className="text-xs text-muted-foreground">+{items.length - 6} itens</li> : null}
        </ul>
      ) : (
        <div className="mt-2 text-sm text-muted-foreground">Ainda não definido.</div>
      )}
    </div>
  );
}

type FieldKey = "purpose" | "vision" | "mission" | "strategic_north" | "values" | "culture";

function FieldEditor({
  label,
  items,
  draft,
  setDraft,
  setItems,
  disabled,
}: {
  label: string;
  items: string[];
  draft: string;
  setDraft: (v: string) => void;
  setItems: (fn: (prev: string[]) => string[]) => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{label}</div>
      <div className="mt-1 text-sm text-muted-foreground">Adicione itens (um por vez). Você pode reordenar apagando e inserindo de novo.</div>

      <Separator className="my-4" />

      <div className="grid gap-3">
        {items.length ? (
          <div className="grid gap-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  className="h-11 rounded-2xl"
                  value={it}
                  disabled={disabled}
                  onChange={(e) => {
                    const v = e.target.value;
                    setItems((prev) => prev.map((p, i) => (i === idx ? v : p)));
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-2xl bg-white"
                  disabled={disabled}
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Nenhum item ainda.</div>
        )}

        <div className="grid gap-2">
          <Label>Adicionar</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              className="h-11 rounded-2xl"
              value={draft}
              disabled={disabled}
              placeholder="Escreva um item…"
              onChange={(e) => setDraft(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl bg-white"
              disabled={disabled || draft.trim().length < 2}
              onClick={() => {
                const v = draft.trim();
                setItems((prev) => [...prev, v]);
                setDraft("");
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OkrFundamentals() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useCompany();

  if (!user) return null;

  const cid = companyId ?? "";
  const hasCompany = !!companyId;

  const canEdit = user.role === "ADMIN" || user.role === "HEAD" || user.role === "MASTERADMIN";

  const { data: fundamentals, isLoading } = useQuery({
    queryKey: ["okr-fundamentals", cid],
    enabled: hasCompany,
    queryFn: () => getCompanyFundamentals(cid),
  });

  const [open, setOpen] = useState(false);

  const initial = useMemo(() => {
    const f = fundamentals;
    return {
      purpose: parseListValue(f?.purpose),
      vision: parseListValue(f?.vision),
      mission: parseListValue(f?.mission),
      strategic_north: parseListValue(f?.strategic_north),
      values: parseListValue(f?.values),
      culture: parseListValue(f?.culture),
    } satisfies Record<FieldKey, string[]>;
  }, [fundamentals]);

  const [items, setItems] = useState<Record<FieldKey, string[]>>({
    purpose: [],
    vision: [],
    mission: [],
    strategic_north: [],
    values: [],
    culture: [],
  });

  const [drafts, setDrafts] = useState<Record<FieldKey, string>>({
    purpose: "",
    vision: "",
    mission: "",
    strategic_north: "",
    values: "",
    culture: "",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setItems(initial);
    setDrafts({
      purpose: "",
      vision: "",
      mission: "",
      strategic_north: "",
      values: "",
      culture: "",
    });
    setSaving(false);
  }, [open, initial]);

  const hasAny =
    !!fundamentals &&
    [fundamentals.mission, fundamentals.vision, fundamentals.purpose, fundamentals.values, fundamentals.culture, fundamentals.strategic_north].some(
      (t) => !!t?.trim(),
    );

  if (!hasCompany) {
    return (
      <div className="grid gap-6">
        <OkrPageHeader
          title="Fundamentos da empresa"
          subtitle="Carregando contexto da empresa…"
          icon={<BookOpenText className="h-5 w-5" />}
        />
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm text-muted-foreground">Aguardando identificação da empresa do seu usuário…</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <OkrPageHeader
        title="Fundamentos da empresa"
        subtitle="Agora os fundamentos são compostos por itens — fica mais fácil conectar OKRs a uma frase específica."
        icon={<BookOpenText className="h-5 w-5" />}
        actions={
          canEdit ? (
            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              onClick={() => setOpen(true)}
            >
              <Save className="mr-2 h-4 w-4" />
              Editar
            </Button>
          ) : null
        }
      />

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Visão inspiradora (rápido)</div>
            <p className="mt-1 text-sm text-muted-foreground">Para qualquer pessoa entender para onde a empresa está indo.</p>
          </div>

          {hasAny ? (
            <div className="rounded-full bg-[color:var(--sinaxys-tint)] px-4 py-2 text-xs font-semibold text-[color:var(--sinaxys-ink)]">
              Pronto para conectar OKRs
            </div>
          ) : (
            <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
              Precisa de setup
            </div>
          )}
        </div>

        <Separator className="my-5" />

        {isLoading ? <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Carregando…</div> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Block label="Propósito" value={fundamentals?.purpose} />
          <Block label="Visão" value={fundamentals?.vision} />
          <Block label="Missão" value={fundamentals?.mission} />
          <Block label="Norte estratégico" value={fundamentals?.strategic_north} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Block label="Valores" value={fundamentals?.values} />
          <Block label="Cultura" value={fundamentals?.culture} />
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-hidden rounded-3xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar fundamentos (por itens)</DialogTitle>
          </DialogHeader>

          <ScrollArea className="-mx-1 max-h-[62vh] px-1">
            <div className="grid gap-4 pr-3">
              <FieldEditor
                label="Propósito"
                items={items.purpose}
                draft={drafts.purpose}
                setDraft={(v) => setDrafts((p) => ({ ...p, purpose: v }))}
                setItems={(fn) => setItems((p) => ({ ...p, purpose: fn(p.purpose) }))}
                disabled={!canEdit || saving}
              />
              <FieldEditor
                label="Visão"
                items={items.vision}
                draft={drafts.vision}
                setDraft={(v) => setDrafts((p) => ({ ...p, vision: v }))}
                setItems={(fn) => setItems((p) => ({ ...p, vision: fn(p.vision) }))}
                disabled={!canEdit || saving}
              />
              <FieldEditor
                label="Missão"
                items={items.mission}
                draft={drafts.mission}
                setDraft={(v) => setDrafts((p) => ({ ...p, mission: v }))}
                setItems={(fn) => setItems((p) => ({ ...p, mission: fn(p.mission) }))}
                disabled={!canEdit || saving}
              />
              <FieldEditor
                label="Norte estratégico"
                items={items.strategic_north}
                draft={drafts.strategic_north}
                setDraft={(v) => setDrafts((p) => ({ ...p, strategic_north: v }))}
                setItems={(fn) => setItems((p) => ({ ...p, strategic_north: fn(p.strategic_north) }))}
                disabled={!canEdit || saving}
              />
              <FieldEditor
                label="Valores"
                items={items.values}
                draft={drafts.values}
                setDraft={(v) => setDrafts((p) => ({ ...p, values: v }))}
                setItems={(fn) => setItems((p) => ({ ...p, values: fn(p.values) }))}
                disabled={!canEdit || saving}
              />
              <FieldEditor
                label="Cultura"
                items={items.culture}
                draft={drafts.culture}
                setDraft={(v) => setDrafts((p) => ({ ...p, culture: v }))}
                setItems={(fn) => setItems((p) => ({ ...p, culture: fn(p.culture) }))}
                disabled={!canEdit || saving}
              />
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!canEdit || saving}
              onClick={async () => {
                setSaving(true);
                try {
                  const payload: Partial<DbCompanyFundamentals> = {
                    purpose: serializeListValue(items.purpose),
                    vision: serializeListValue(items.vision),
                    mission: serializeListValue(items.mission),
                    strategic_north: serializeListValue(items.strategic_north),
                    values: serializeListValue(items.values),
                    culture: serializeListValue(items.culture),
                  };

                  await upsertCompanyFundamentals(cid, payload);
                  await qc.invalidateQueries({ queryKey: ["okr-fundamentals", cid] });
                  toast({ title: "Fundamentos salvos" });
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
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
