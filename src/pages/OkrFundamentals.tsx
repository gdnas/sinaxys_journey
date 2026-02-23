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
import {
  getCompanyFundamentals,
  upsertCompanyFundamentals,
  type DbCompanyFundamentals,
} from "@/lib/okrDb";
import { OkrPageHeader } from "@/components/OkrPageHeader";
import { OkrSubnav } from "@/components/OkrSubnav";
import {
  parseDescribedItems,
  serializeDescribedItems,
  textPreview,
  type DescribedItem,
} from "@/lib/fundamentalsFormat";
import { DescribedItemsEditor } from "@/components/fundamentals/DescribedItemsEditor";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

type ItemsState = {
  purpose: string;
  vision: string;
  mission: string;
  values: DescribedItem[];
  culture: DescribedItem[];
};

const TEXT_KEYS = ["purpose", "vision", "mission"] as const;
const LIST_KEYS = ["values", "culture"] as const;

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
      <div className="text-sm font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">{title}</div>
      {hint ? <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function CompactItemList({ items, listId, flashId }: { items: DescribedItem[]; listId: "values" | "culture"; flashId: string | null }) {
  if (!items.length) {
    return <div className="text-sm text-muted-foreground">Ainda não definido.</div>;
  }

  return (
    <div className="grid gap-3">
      {items.map((it, idx) => {
        const id = `fundamentals-item-${listId}-${idx}`;
        const hasDesc = !!it.description?.trim();
        return (
          <div
            key={`${it.title}-${idx}`}
            id={id}
            className={cn(
              "rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4",
              flashId === id && "ring-2 ring-[color:var(--sinaxys-primary)]",
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[color:var(--sinaxys-primary)]/70" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{it.title?.trim() || "(sem título)"}</div>
                {hasDesc ? (
                  <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{it.description}</div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function OkrFundamentals() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const [searchParams] = useSearchParams();

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

  const valuesItems = useMemo(() => parseDescribedItems(fundamentals?.values), [fundamentals?.values]);
  const cultureItems = useMemo(() => parseDescribedItems(fundamentals?.culture), [fundamentals?.culture]);

  const hasAny =
    !!fundamentals &&
    [fundamentals.mission, fundamentals.vision, fundamentals.purpose, fundamentals.values, fundamentals.culture].some((t) => !!t?.trim());

  const purposePreview = useMemo(() => textPreview(fundamentals?.purpose, 120), [fundamentals?.purpose]);
  const visionPreview = useMemo(() => textPreview(fundamentals?.vision, 120), [fundamentals?.vision]);
  const missionPreview = useMemo(() => textPreview(fundamentals?.mission, 120), [fundamentals?.mission]);

  const defaultOpen = useMemo(() => {
    // Open empty sections first (helps admins). Otherwise open Vision.
    const open: string[] = [];
    const empty = (v: unknown) => !String(v ?? "").trim();
    const emptyList = (arr: DescribedItem[]) => (arr ?? []).length === 0;

    if (empty(fundamentals?.purpose)) open.push("purpose");
    if (empty(fundamentals?.vision)) open.push("vision");
    if (empty(fundamentals?.mission)) open.push("mission");
    if (emptyList(valuesItems)) open.push("values");
    if (emptyList(cultureItems)) open.push("culture");

    if (!open.length) open.push("vision");
    return open;
  }, [cultureItems, fundamentals?.mission, fundamentals?.purpose, fundamentals?.vision, valuesItems]);

  const [openSections, setOpenSections] = useState<string[]>([]);
  const [flashId, setFlashId] = useState<string | null>(null);

  const isOpen = (k: (typeof TEXT_KEYS)[number] | (typeof LIST_KEYS)[number]) => openSections.includes(k);

  const setTextOpen = (next: string[]) => {
    setOpenSections((prev) => {
      const keep = prev.filter((k) => !TEXT_KEYS.includes(k as any));
      const merged = Array.from(new Set([...keep, ...next]));
      return merged;
    });
  };

  const setListOpen = (next: string[]) => {
    setOpenSections((prev) => {
      const keep = prev.filter((k) => !LIST_KEYS.includes(k as any));
      const merged = Array.from(new Set([...keep, ...next]));
      return merged;
    });
  };

  // Initialize accordion open state and support deep-link focus
  useEffect(() => {
    const focus = (searchParams.get("focus") ?? "").trim();
    const allowed = new Set(["purpose", "vision", "mission", "values", "culture"]);
    const want = allowed.has(focus) ? focus : "";

    const base = defaultOpen;
    const next = want && !base.includes(want) ? [...base, want] : base;
    setOpenSections(next);

    // Delay scrolling until after render
    if (want) {
      const iRaw = searchParams.get("i");
      const idx = iRaw && /^[0-9]+$/.test(iRaw) ? Number(iRaw) : null;
      const targetId =
        idx !== null && (want === "values" || want === "culture")
          ? `fundamentals-item-${want}-${idx}`
          : `fundamentals-section-${want}`;

      window.setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          setFlashId(targetId);
          window.setTimeout(() => setFlashId(null), 1200);
        }
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultOpen, searchParams.toString()]);

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
        <OkrPageHeader title="Fundamentos" subtitle="Carregando contexto da empresa…" icon={<BookOpenText className="h-5 w-5" />} />
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
        title="Fundamentos"
        subtitle="Texto (propósito, visão, missão) + listas (valores, cultura)."
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Visão geral</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Abra um bloco para ler/editar. Quando aberto, o resumo some para evitar repetição.
            </p>
          </div>

          <div
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-xs font-semibold",
              hasAny
                ? "bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)]"
                : "bg-white text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]",
            )}
          >
            {hasAny ? "Pronto para conectar OKRs" : "Precisa de setup"}
          </div>
        </div>

        {isLoading ? (
          <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Carregando…</div>
        ) : null}

        <Separator className="my-5" />

        <div className="grid gap-4 lg:grid-cols-12">
          {/* Textos */}
          <div className="lg:col-span-7">
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Textos</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">Propósito, visão e missão.</div>
                </div>
                <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)] hover:bg-white">
                  Texto
                </Badge>
              </div>

              <Separator className="my-4" />

              <Accordion
                type="multiple"
                value={openSections.filter((k) => TEXT_KEYS.includes(k as any))}
                onValueChange={setTextOpen}
                className="grid gap-3"
              >
                <AccordionItem
                  value="purpose"
                  id="fundamentals-section-purpose"
                  className={cn(
                    "rounded-3xl border border-[color:var(--sinaxys-border)] bg-white px-4",
                    flashId === "fundamentals-section-purpose" && "ring-2 ring-[color:var(--sinaxys-primary)]",
                  )}
                >
                  <AccordionTrigger className="rounded-2xl py-4 hover:no-underline">
                    <div className="flex w-full items-start justify-between gap-3">
                      <SectionTitle
                        title="Propósito"
                        hint={
                          editMode
                            ? "Edite ou apague o texto para remover."
                            : !isOpen("purpose")
                              ? purposePreview || "Ainda não definido."
                              : undefined
                        }
                      />
                      {!editMode ? (
                        <span className="mt-0.5 text-xs font-semibold text-muted-foreground">{isOpen("purpose") ? "Aberto" : "Resumo"}</span>
                      ) : null}
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
                      <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--sinaxys-ink)]">
                          {fundamentals?.purpose?.trim() ? fundamentals.purpose : <span className="text-muted-foreground">Ainda não definido.</span>}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="vision"
                  id="fundamentals-section-vision"
                  className={cn(
                    "rounded-3xl border border-[color:var(--sinaxys-border)] bg-white px-4",
                    flashId === "fundamentals-section-vision" && "ring-2 ring-[color:var(--sinaxys-primary)]",
                  )}
                >
                  <AccordionTrigger className="rounded-2xl py-4 hover:no-underline">
                    <div className="flex w-full items-start justify-between gap-3">
                      <SectionTitle
                        title="Visão"
                        hint={
                          editMode
                            ? "Edite ou apague o texto para remover."
                            : !isOpen("vision")
                              ? visionPreview || "Ainda não definido."
                              : undefined
                        }
                      />
                      {!editMode ? (
                        <span className="mt-0.5 text-xs font-semibold text-muted-foreground">{isOpen("vision") ? "Aberto" : "Resumo"}</span>
                      ) : null}
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
                      <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--sinaxys-ink)]">
                          {fundamentals?.vision?.trim() ? fundamentals.vision : <span className="text-muted-foreground">Ainda não definido.</span>}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="mission"
                  id="fundamentals-section-mission"
                  className={cn(
                    "rounded-3xl border border-[color:var(--sinaxys-border)] bg-white px-4",
                    flashId === "fundamentals-section-mission" && "ring-2 ring-[color:var(--sinaxys-primary)]",
                  )}
                >
                  <AccordionTrigger className="rounded-2xl py-4 hover:no-underline">
                    <div className="flex w-full items-start justify-between gap-3">
                      <SectionTitle
                        title="Missão"
                        hint={
                          editMode
                            ? "Edite ou apague o texto para remover."
                            : !isOpen("mission")
                              ? missionPreview || "Ainda não definido."
                              : undefined
                        }
                      />
                      {!editMode ? (
                        <span className="mt-0.5 text-xs font-semibold text-muted-foreground">{isOpen("mission") ? "Aberto" : "Resumo"}</span>
                      ) : null}
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
                      <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--sinaxys-ink)]">
                          {fundamentals?.mission?.trim() ? fundamentals.mission : <span className="text-muted-foreground">Ainda não definido.</span>}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          </div>

          {/* Listas */}
          <div className="lg:col-span-5">
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Listas</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">Itens com título + descrição.</div>
                </div>
                <div className="flex items-center gap-2">
                  <CountPill n={(editMode ? (items.values?.length ?? 0) : valuesItems.length) + (editMode ? (items.culture?.length ?? 0) : cultureItems.length)} />
                </div>
              </div>

              <Separator className="my-4" />

              <Accordion
                type="multiple"
                value={openSections.filter((k) => LIST_KEYS.includes(k as any))}
                onValueChange={setListOpen}
                className="grid gap-3"
              >
                <AccordionItem
                  value="values"
                  id="fundamentals-section-values"
                  className={cn(
                    "rounded-3xl border border-[color:var(--sinaxys-border)] bg-white px-4",
                    flashId === "fundamentals-section-values" && "ring-2 ring-[color:var(--sinaxys-primary)]",
                  )}
                >
                  <AccordionTrigger className="rounded-2xl py-4 hover:no-underline">
                    <div className="flex w-full items-start justify-between gap-3">
                      <SectionTitle
                        title="Valores"
                        hint={
                          editMode
                            ? "Adicione, edite ou remova itens."
                            : valuesItems.length
                              ? `${valuesItems.length} item(ns)`
                              : "Ainda não definido."
                        }
                      />
                      <CountPill n={editMode ? (items.values?.length ?? 0) : valuesItems.length} />
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
                    ) : (
                      <CompactItemList items={valuesItems} listId="values" flashId={flashId} />
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="culture"
                  id="fundamentals-section-culture"
                  className={cn(
                    "rounded-3xl border border-[color:var(--sinaxys-border)] bg-white px-4",
                    flashId === "fundamentals-section-culture" && "ring-2 ring-[color:var(--sinaxys-primary)]",
                  )}
                >
                  <AccordionTrigger className="rounded-2xl py-4 hover:no-underline">
                    <div className="flex w-full items-start justify-between gap-3">
                      <SectionTitle
                        title="Cultura"
                        hint={
                          editMode
                            ? "Adicione, edite ou remova itens."
                            : cultureItems.length
                              ? `${cultureItems.length} item(ns)`
                              : "Ainda não definido."
                        }
                      />
                      <CountPill n={editMode ? (items.culture?.length ?? 0) : cultureItems.length} />
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
                    ) : (
                      <CompactItemList items={cultureItems} listId="culture" flashId={flashId} />
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          </div>
        </div>

        {editMode ? (
          <div className="mt-5 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
            Para <span className="font-semibold text-[color:var(--sinaxys-ink)]">remover</span> um bloco de texto, apague o conteúdo. Para valores/cultura, remova os itens.
          </div>
        ) : null}
      </Card>
    </div>
  );
}
