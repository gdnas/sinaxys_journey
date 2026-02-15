import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Save } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { getCompanyFundamentals, upsertCompanyFundamentals, type DbCompanyFundamentals } from "@/lib/okrDb";
import { OkrPageHeader } from "@/components/OkrPageHeader";
import {
  describedItemsToLines,
  parseDescribedItems,
  serializeDescribedItems,
  textPreview,
  type DescribedItem,
} from "@/lib/fundamentalsFormat";
import { DescribedItemsEditor } from "@/components/fundamentals/DescribedItemsEditor";

function Block({ label, value }: { label: string; value?: string | null }) {
  const preview = useMemo(() => textPreview(value, 220), [value]);

  return (
    <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {preview ? (
        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--sinaxys-ink)]">{preview}</div>
      ) : (
        <div className="mt-2 text-sm text-muted-foreground">Ainda não definido.</div>
      )}
    </div>
  );
}

type ItemsState = {
  purpose: string;
  vision: string;
  mission: string;
  values: DescribedItem[];
  culture: DescribedItem[];
};

function BigTextEditor({
  label,
  value,
  setValue,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  disabled: boolean;
  placeholder: string;
}) {
  return (
    <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{label}</div>
      <div className="mt-1 text-sm text-muted-foreground">Texto principal (pode ter parágrafos). Use para comunicar com clareza.</div>

      <Separator className="my-4" />

      <Textarea
        className="min-h-[160px] rounded-2xl"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
      />
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

  const initial = useMemo((): ItemsState => {
    const f = fundamentals;
    return {
      purpose: String(f?.purpose ?? ""),
      vision: String(f?.vision ?? ""),
      mission: String(f?.mission ?? ""),
      values: parseDescribedItems(f?.values),
      culture: parseDescribedItems(f?.culture),
    };
  }, [fundamentals]);

  const [items, setItems] = useState<ItemsState>({
    purpose: "",
    vision: "",
    mission: "",
    values: [],
    culture: [],
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setItems(initial);
    setSaving(false);
  }, [open, initial]);

  const valuesLines = useMemo(() => describedItemsToLines(parseDescribedItems(fundamentals?.values)), [fundamentals?.values]);
  const cultureLines = useMemo(() => describedItemsToLines(parseDescribedItems(fundamentals?.culture)), [fundamentals?.culture]);

  const hasAny =
    !!fundamentals &&
    [fundamentals.mission, fundamentals.vision, fundamentals.purpose, fundamentals.values, fundamentals.culture].some((t) => !!t?.trim());

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
        subtitle="Propósito, visão e missão em texto. Valores e cultura em itens com descrição."
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
            <p className="mt-1 text-sm text-muted-foreground">Um norte fácil de entender — sem perder a profundidade (valores/cultura).</p>
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
          <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Valores</div>
            {valuesLines.length ? (
              <ul className="mt-3 grid gap-2">
                {valuesLines.slice(0, 5).map((it) => (
                  <li key={it} className="flex items-start gap-2 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--sinaxys-primary)]/70" />
                    <span className="min-w-0">{it}</span>
                  </li>
                ))}
                {valuesLines.length > 5 ? <li className="text-xs text-muted-foreground">+{valuesLines.length - 5} itens</li> : null}
              </ul>
            ) : (
              <div className="mt-2 text-sm text-muted-foreground">Ainda não definido.</div>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Cultura</div>
            {cultureLines.length ? (
              <ul className="mt-3 grid gap-2">
                {cultureLines.slice(0, 5).map((it) => (
                  <li key={it} className="flex items-start gap-2 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--sinaxys-primary)]/70" />
                    <span className="min-w-0">{it}</span>
                  </li>
                ))}
                {cultureLines.length > 5 ? <li className="text-xs text-muted-foreground">+{cultureLines.length - 5} itens</li> : null}
              </ul>
            ) : (
              <div className="mt-2 text-sm text-muted-foreground">Ainda não definido.</div>
            )}
          </div>

          <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-5">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Dica de preenchimento</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Valores e cultura funcionam melhor quando cada item tem um <span className="font-semibold">nome</span> e um <span className="font-semibold">descritivo</span>.
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-hidden rounded-3xl sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Editar fundamentos</DialogTitle>
          </DialogHeader>

          <ScrollArea className="-mx-1 max-h-[62vh] px-1">
            <div className="grid gap-4 pr-3">
              <BigTextEditor
                label="Propósito"
                value={items.purpose}
                setValue={(v) => setItems((p) => ({ ...p, purpose: v }))}
                disabled={!canEdit || saving}
                placeholder="Por que existimos? (uma frase forte + 1–2 parágrafos se necessário)"
              />

              <BigTextEditor
                label="Visão"
                value={items.vision}
                setValue={(v) => setItems((p) => ({ ...p, vision: v }))}
                disabled={!canEdit || saving}
                placeholder="Como o mundo fica melhor quando vencemos? (1–3 parágrafos)"
              />

              <BigTextEditor
                label="Missão"
                value={items.mission}
                setValue={(v) => setItems((p) => ({ ...p, mission: v }))}
                disabled={!canEdit || saving}
                placeholder="O que fazemos todos os dias para chegar lá? (1–3 parágrafos)"
              />

              <DescribedItemsEditor
                label="Valores"
                hint="Cada valor tem um nome e um descritivo (comportamentos, exemplos, do/don't)."
                items={items.values}
                onChange={(next) => setItems((p) => ({ ...p, values: next }))}
                canEdit={canEdit}
                saving={saving}
                addLabel="Adicionar valor"
              />

              <DescribedItemsEditor
                label="Cultura"
                hint="Descreva como trabalhamos e decidimos aqui. Use itens com nome + descritivo."
                items={items.culture}
                onChange={(next) => setItems((p) => ({ ...p, culture: next }))}
                canEdit={canEdit}
                saving={saving}
                addLabel="Adicionar item"
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
                    purpose: items.purpose.trim() || null,
                    vision: items.vision.trim() || null,
                    mission: items.mission.trim() || null,
                    values: serializeDescribedItems(items.values) || null,
                    culture: serializeDescribedItems(items.culture) || null,
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