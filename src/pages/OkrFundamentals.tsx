import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Save, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { getCompanyFundamentals, upsertCompanyFundamentals, type DbCompanyFundamentals } from "@/lib/okrDb";
import { OkrPageHeader } from "@/components/OkrPageHeader";
import { OkrSubnav } from "@/components/OkrSubnav";
import {
  describedItemsToLines,
  parseDescribedItems,
  serializeDescribedItems,
  textPreview,
  type DescribedItem,
} from "@/lib/fundamentalsFormat";
import { DescribedItemsEditor } from "@/components/fundamentals/DescribedItemsEditor";

type ItemsState = {
  purpose: string;
  vision: string;
  mission: string;
  values: DescribedItem[];
  culture: DescribedItem[];
};

function CountPill({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[color:var(--sinaxys-tint)] px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]">
      {n}
    </span>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{title}</div>
      {hint ? <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div> : null}
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

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<ItemsState>({
    purpose: "",
    vision: "",
    mission: "",
    values: [],
    culture: [],
  });

  useEffect(() => {
    if (!editMode) return;
    setItems(initial);
    setSaving(false);
  }, [editMode, initial]);

  const valuesLines = useMemo(() => describedItemsToLines(parseDescribedItems(fundamentals?.values)), [fundamentals?.values]);
  const cultureLines = useMemo(() => describedItemsToLines(parseDescribedItems(fundamentals?.culture)), [fundamentals?.culture]);

  const hasAny =
    !!fundamentals &&
    [fundamentals.mission, fundamentals.vision, fundamentals.purpose, fundamentals.values, fundamentals.culture].some((t) => !!t?.trim());

  const purposePreview = useMemo(() => textPreview(fundamentals?.purpose, 140), [fundamentals?.purpose]);
  const visionPreview = useMemo(() => textPreview(fundamentals?.vision, 140), [fundamentals?.vision]);
  const missionPreview = useMemo(() => textPreview(fundamentals?.mission, 140), [fundamentals?.mission]);

  const defaultOpen = useMemo(() => {
    // Open empty sections first (helps admins). Otherwise open Vision.
    const open: string[] = [];
    const empty = (v: unknown) => !String(v ?? "").trim();
    const emptyList = (arr: string[]) => (arr ?? []).length === 0;

    if (empty(fundamentals?.purpose)) open.push("purpose");
    if (empty(fundamentals?.vision)) open.push("vision");
    if (empty(fundamentals?.mission)) open.push("mission");
    if (emptyList(valuesLines)) open.push("values");
    if (emptyList(cultureLines)) open.push("culture");

    if (!open.length) open.push("vision");
    return open;
  }, [cultureLines, fundamentals?.mission, fundamentals?.purpose, fundamentals?.vision, valuesLines]);

  async function saveAll() {
    if (!canEdit || saving) return;
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
      setEditMode(false);
    } catch (e) {
      toast({
        title: "Não foi possível salvar",
        description: e instanceof Error ? e.message : "Erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!hasCompany) {
    return (
      <div className="grid gap-6">
        <OkrPageHeader title="Fundamentos da empresa" subtitle="Carregando contexto da empresa…" icon={<BookOpenText className="h-5 w-5" />} />
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
        title="Fundamentos da empresa"
        subtitle="Propósito, visão e missão em texto. Valores e cultura em itens com descrição."
        icon={<BookOpenText className="h-5 w-5" />}
        actions={
          canEdit ? (
            editMode ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  variant="outline"
                  className="h-11 rounded-xl bg-white"
                  disabled={saving}
                  onClick={() => {
                    setEditMode(false);
                    setSaving(false);
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button
                  className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  disabled={saving}
                  onClick={saveAll}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </Button>
              </div>
            ) : (
              <Button
                className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                onClick={() => setEditMode(true)}
              >
                <Save className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )
          ) : null
        }
      />

      <OkrSubnav />

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Visão inspiradora (rápido)</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Cada bloco ocupa a largura toda e pode ser expandido/retraído. Em modo edição você pode adicionar/remover itens de valores e cultura.
            </p>
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

        <Accordion type="multiple" defaultValue={defaultOpen} className="grid gap-3">
          <AccordionItem value="purpose" className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white px-4">
            <AccordionTrigger className="rounded-2xl py-4 hover:no-underline">
              <div className="flex w-full items-start justify-between gap-3">
                <SectionTitle title="Propósito" hint={editMode ? "Edite ou apague o texto para remover." : (purposePreview ? purposePreview : "Ainda não definido.")} />
                {!editMode ? <Badge className="rounded-full bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-bg)]">Texto</Badge> : null}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              {editMode ? (
                <Textarea
                  className="min-h-[160px] rounded-2xl"
                  value={items.purpose}
                  disabled={!canEdit || saving}
                  placeholder="Por que existimos? (uma frase forte + 1–2 parágrafos se necessário)"
                  onChange={(e) => setItems((p) => ({ ...p, purpose: e.target.value }))}
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--sinaxys-ink)]">
                  {fundamentals?.purpose?.trim() ? fundamentals.purpose : <span className="text-muted-foreground">Ainda não definido.</span>}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="vision" className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white px-4">
            <AccordionTrigger className="rounded-2xl py-4 hover:no-underline">
              <div className="flex w-full items-start justify-between gap-3">
                <SectionTitle title="Visão" hint={editMode ? "Edite ou apague o texto para remover." : (visionPreview ? visionPreview : "Ainda não definido.")} />
                {!editMode ? <Badge className="rounded-full bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-bg)]">Texto</Badge> : null}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              {editMode ? (
                <Textarea
                  className="min-h-[160px] rounded-2xl"
                  value={items.vision}
                  disabled={!canEdit || saving}
                  placeholder="Como o mundo fica melhor quando vencemos? (1–3 parágrafos)"
                  onChange={(e) => setItems((p) => ({ ...p, vision: e.target.value }))}
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--sinaxys-ink)]">
                  {fundamentals?.vision?.trim() ? fundamentals.vision : <span className="text-muted-foreground">Ainda não definido.</span>}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="mission" className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white px-4">
            <AccordionTrigger className="rounded-2xl py-4 hover:no-underline">
              <div className="flex w-full items-start justify-between gap-3">
                <SectionTitle title="Missão" hint={editMode ? "Edite ou apague o texto para remover." : (missionPreview ? missionPreview : "Ainda não definido.")} />
                {!editMode ? <Badge className="rounded-full bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-bg)]">Texto</Badge> : null}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              {editMode ? (
                <Textarea
                  className="min-h-[160px] rounded-2xl"
                  value={items.mission}
                  disabled={!canEdit || saving}
                  placeholder="O que fazemos todos os dias para chegar lá? (1–3 parágrafos)"
                  onChange={(e) => setItems((p) => ({ ...p, mission: e.target.value }))}
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--sinaxys-ink)]">
                  {fundamentals?.mission?.trim() ? fundamentals.mission : <span className="text-muted-foreground">Ainda não definido.</span>}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="values" className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white px-4">
            <AccordionTrigger className="rounded-2xl py-4 hover:no-underline">
              <div className="flex w-full items-start justify-between gap-3">
                <SectionTitle
                  title="Valores"
                  hint={
                    editMode
                      ? "Adicione, edite ou remova itens."
                      : valuesLines.length
                        ? `${valuesLines.length} item(ns) • ${textPreview(valuesLines.join(" \n"), 140)}`
                        : "Ainda não definido."
                  }
                />
                <CountPill n={editMode ? (items.values?.length ?? 0) : valuesLines.length} />
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              {editMode ? (
                <DescribedItemsEditor
                  label="Valores"
                  hint="Cada valor tem um nome e um descritivo (comportamentos, exemplos, do/don't)."
                  items={items.values}
                  onChange={(next) => setItems((p) => ({ ...p, values: next }))}
                  canEdit={canEdit}
                  saving={saving}
                  addLabel="Adicionar valor"
                />
              ) : valuesLines.length ? (
                <ul className="grid gap-2 pl-1">
                  {valuesLines.map((it) => (
                    <li key={it} className="flex items-start gap-2 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--sinaxys-primary)]/70" />
                      <span className="min-w-0">{it}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">Ainda não definido.</div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="culture" className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white px-4">
            <AccordionTrigger className="rounded-2xl py-4 hover:no-underline">
              <div className="flex w-full items-start justify-between gap-3">
                <SectionTitle
                  title="Cultura"
                  hint={
                    editMode
                      ? "Adicione, edite ou remova itens."
                      : cultureLines.length
                        ? `${cultureLines.length} item(ns) • ${textPreview(cultureLines.join(" \n"), 140)}`
                        : "Ainda não definido."
                  }
                />
                <CountPill n={editMode ? (items.culture?.length ?? 0) : cultureLines.length} />
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              {editMode ? (
                <DescribedItemsEditor
                  label="Cultura"
                  hint="Descreva como trabalhamos e decidimos aqui. Use itens com nome + descritivo."
                  items={items.culture}
                  onChange={(next) => setItems((p) => ({ ...p, culture: next }))}
                  canEdit={canEdit}
                  saving={saving}
                  addLabel="Adicionar item"
                />
              ) : cultureLines.length ? (
                <ul className="grid gap-2 pl-1">
                  {cultureLines.map((it) => (
                    <li key={it} className="flex items-start gap-2 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--sinaxys-primary)]/70" />
                      <span className="min-w-0">{it}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">Ainda não definido.</div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {editMode ? (
          <div className="mt-5 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
            Dica: para <span className="font-semibold text-[color:var(--sinaxys-ink)]">remover</span> um bloco de texto, apague o conteúdo. Para valores/cultura, remova os itens.
          </div>
        ) : null}
      </Card>
    </div>
  );
}
