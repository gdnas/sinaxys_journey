import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Pencil, Plus, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { parseDescribedItems, serializeDescribedItems, type DescribedItem } from "@/lib/fundamentalsFormat";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  BlurDialog,
  BlurDialogContent,
  BlurDialogDescription,
  BlurDialogFooter,
  BlurDialogHeader,
  BlurDialogTitle,
} from "@/components/BlurDialog";

type FundamentalKey = "purpose" | "vision" | "mission" | "values" | "culture";

function CountPill({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[color:var(--sinaxys-tint)] px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]">
      {n}
    </span>
  );
}

function meaningOf(k: FundamentalKey) {
  const map: Record<FundamentalKey, string> = {
    purpose: "por que existimos",
    mission: "o que fazemos",
    vision: "para onde vamos",
    values: "como nos comportamos",
    culture: "como trabalhamos e decidimos",
  };
  return map[k];
}

function labelOf(k: FundamentalKey) {
  const map: Record<FundamentalKey, string> = {
    purpose: "Propósito",
    vision: "Visão",
    mission: "Missão",
    values: "Valores",
    culture: "Cultura",
  };
  return map[k];
}

type ActiveEdit =
  | { kind: "text"; field: "purpose" | "vision" | "mission" }
  | { kind: "item"; field: "values" | "culture"; index: number }
  | { kind: "add"; field: "values" | "culture" };

export default function OkrFundamentals() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const [searchParams] = useSearchParams();

  const cid = companyId ?? "";
  const hasCompany = !!companyId;

  if (!user) return null;

  const canEdit = user.role === "ADMIN" || user.role === "HEAD" || user.role === "MASTERADMIN";

  const { data: fundamentals, isLoading } = useQuery({
    queryKey: ["okr-fundamentals", cid],
    enabled: hasCompany,
    queryFn: () => getCompanyFundamentals(cid),
  });

  const valuesItems = useMemo(() => parseDescribedItems(fundamentals?.values), [fundamentals?.values]);
  const cultureItems = useMemo(() => parseDescribedItems(fundamentals?.culture), [fundamentals?.culture]);

  const hasAny =
    !!fundamentals &&
    [fundamentals.mission, fundamentals.vision, fundamentals.purpose, fundamentals.values, fundamentals.culture].some((t) => !!t?.trim());

  const [flashId, setFlashId] = useState<string | null>(null);

  // Deep-link focus/highlight
  useEffect(() => {
    const focus = (searchParams.get("focus") ?? "").trim();
    const allowed = new Set(["purpose", "vision", "mission", "values", "culture"]);
    const want = allowed.has(focus) ? (focus as FundamentalKey) : null;
    if (!want) return;

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
  }, [searchParams]);

  const [active, setActive] = useState<ActiveEdit | null>(null);
  const [saving, setSaving] = useState(false);

  const [draftText, setDraftText] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");

  useEffect(() => {
    if (!active) return;

    if (active.kind === "text") {
      const v = (fundamentals?.[active.field] ?? "") as string;
      setDraftText(String(v ?? ""));
      setDraftTitle("");
      setDraftDesc("");
      return;
    }

    if (active.kind === "item") {
      const src = active.field === "values" ? valuesItems : cultureItems;
      const it = src[active.index];
      setDraftTitle(it?.title ?? "");
      setDraftDesc(it?.description ?? "");
      setDraftText("");
      return;
    }

    if (active.kind === "add") {
      setDraftTitle("");
      setDraftDesc("");
      setDraftText("");
    }
  }, [active, cultureItems, fundamentals, valuesItems]);

  async function saveText(field: "purpose" | "vision" | "mission", value: string) {
    if (!canEdit || saving) return;
    setSaving(true);
    try {
      await upsertCompanyFundamentals(cid, { [field]: value.trim() || null } as Partial<DbCompanyFundamentals>);
      await qc.invalidateQueries({ queryKey: ["okr-fundamentals", cid] });
      toast({ title: "Salvo" });
      setActive(null);
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

  async function saveItems(field: "values" | "culture", next: DescribedItem[]) {
    if (!canEdit || saving) return;
    setSaving(true);
    try {
      await upsertCompanyFundamentals(cid, { [field]: serializeDescribedItems(next) || null } as Partial<DbCompanyFundamentals>);
      await qc.invalidateQueries({ queryKey: ["okr-fundamentals", cid] });
      toast({ title: "Salvo" });
      setActive(null);
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

  async function clearList(field: "values" | "culture") {
    if (!canEdit || saving) return;
    const ok = window.confirm(`Remover todos os itens de ${labelOf(field)}?`);
    if (!ok) return;
    await saveItems(field, []);
  }

  function openText(field: "purpose" | "vision" | "mission") {
    setActive({ kind: "text", field });
  }

  function openAdd(field: "values" | "culture") {
    if (!canEdit) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para editar.", variant: "destructive" });
      return;
    }
    setActive({ kind: "add", field });
  }

  function openItem(field: "values" | "culture", index: number) {
    setActive({ kind: "item", field, index });
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
    <>
      <div className="grid gap-6">
        <OkrPageHeader
          title="Fundamentos"
          subtitle="Propósito, missão, visão, valores e cultura."
          icon={<BookOpenText className="h-5 w-5" />}
        />

        <OkrSubnav />

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Visão geral</div>
              <p className="mt-1 text-sm text-muted-foreground">Clique em um elemento para abrir.</p>
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

          <div className="grid gap-4">
            {/* Text fundamentals */}
            {([
              { key: "purpose" as const, value: (fundamentals?.purpose ?? "").trim() },
              { key: "mission" as const, value: (fundamentals?.mission ?? "").trim() },
              { key: "vision" as const, value: (fundamentals?.vision ?? "").trim() },
            ] as const).map((s) => {
              const sectionId = `fundamentals-section-${s.key}`;
              const isEmpty = !s.value;
              return (
                <div
                  key={s.key}
                  id={sectionId}
                  className={cn(
                    "rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5",
                    flashId === sectionId && "ring-2 ring-[color:var(--sinaxys-primary)]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-baseline gap-3">
                      <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{labelOf(s.key)}</div>
                      <div className="text-xs text-muted-foreground">{meaningOf(s.key)}</div>
                    </div>

                    {canEdit ? (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-2xl bg-white"
                          onClick={() => openText(s.key)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-2xl bg-white text-red-600 hover:text-red-700"
                          onClick={() => {
                            if (isEmpty) return;
                            setActive({ kind: "text", field: s.key });
                          }}
                          title="Excluir"
                          disabled={isEmpty || saving}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className={cn(
                      "mt-3 w-full rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 text-left transition hover:bg-[color:var(--sinaxys-tint)]/30",
                      isEmpty && "text-muted-foreground",
                    )}
                    onClick={() => openText(s.key)}
                  >
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--sinaxys-ink)]">
                      {s.value || "Clique para adicionar."}
                    </div>
                  </button>
                </div>
              );
            })}

            {/* List fundamentals */}
            {([
              { key: "values" as const, items: valuesItems },
              { key: "culture" as const, items: cultureItems },
            ] as const).map((s) => {
              const sectionId = `fundamentals-section-${s.key}`;
              return (
                <div
                  key={s.key}
                  id={sectionId}
                  className={cn(
                    "rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5",
                    flashId === sectionId && "ring-2 ring-[color:var(--sinaxys-primary)]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-baseline gap-3">
                      <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{labelOf(s.key)}</div>
                      <div className="text-xs text-muted-foreground">{meaningOf(s.key)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CountPill n={s.items.length} />
                      {canEdit ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-2xl bg-white"
                            onClick={() => openAdd(s.key)}
                            title="Adicionar"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-2xl bg-white text-red-600 hover:text-red-700"
                            onClick={() => void clearList(s.key)}
                            title="Excluir tudo"
                            disabled={!s.items.length || saving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3">
                    {s.items.length ? (
                      s.items.map((it, idx) => {
                        const itemId = `fundamentals-item-${s.key}-${idx}`;
                        return (
                          <div
                            key={`${it.title}-${idx}`}
                            id={itemId}
                            className={cn(
                              "relative rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 transition hover:bg-[color:var(--sinaxys-tint)]/30",
                              flashId === itemId && "ring-2 ring-[color:var(--sinaxys-primary)]",
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => openItem(s.key, idx)}
                              className="block w-full pr-20 text-left"
                            >
                              <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">{it.title?.trim() || "(sem título)"}</div>
                              {it.description?.trim() ? (
                                <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{it.description}</div>
                              ) : null}
                            </button>

                            {canEdit ? (
                              <div className="absolute right-3 top-3 flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 rounded-2xl bg-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openItem(s.key, idx);
                                  }}
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 rounded-2xl bg-white text-red-600 hover:text-red-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActive({ kind: "item", field: s.key, index: idx });
                                  }}
                                  title="Excluir"
                                  disabled={saving}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    ) : (
                      <button
                        type="button"
                        className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 text-left text-sm text-muted-foreground transition hover:bg-[color:var(--sinaxys-tint)]/30"
                        onClick={() => (canEdit ? openAdd(s.key) : null)}
                      >
                        Clique para adicionar.
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Edit dialog */}
      <BlurDialog open={!!active} onOpenChange={(v) => (!v ? setActive(null) : null)}>
        <BlurDialogContent>
          <BlurDialogHeader>
            <BlurDialogTitle>
              {active?.kind === "text"
                ? `${labelOf(active.field)}`
                : active?.kind === "add"
                  ? `${labelOf(active.field)} — novo item`
                  : active?.kind === "item"
                    ? `${labelOf(active.field)} — item`
                    : "Editar"}
            </BlurDialogTitle>
            <BlurDialogDescription>
              {active?.kind === "text" ? meaningOf(active.field) : active ? meaningOf(active.field as any) : ""}
            </BlurDialogDescription>
          </BlurDialogHeader>

          {active?.kind === "text" ? (
            <div className="grid gap-2">
              <Label className="text-xs">Texto</Label>
              <Textarea
                className="min-h-[180px] rounded-2xl"
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                disabled={!canEdit || saving}
                placeholder={`Escreva ${labelOf(active.field).toLowerCase()}…`}
              />
            </div>
          ) : null}

          {active?.kind === "item" || active?.kind === "add" ? (
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label className="text-xs">Título</Label>
                <Input
                  className="h-11 rounded-2xl"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  disabled={!canEdit || saving}
                  placeholder="Ex.: Transparência"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Descrição</Label>
                <Textarea
                  className="min-h-[140px] rounded-2xl"
                  value={draftDesc}
                  onChange={(e) => setDraftDesc(e.target.value)}
                  disabled={!canEdit || saving}
                  placeholder="O que isso significa na prática?"
                />
              </div>
            </div>
          ) : null}

          <BlurDialogFooter>
            {active?.kind === "text" && canEdit ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl bg-white text-red-600 ring-1 ring-[color:var(--sinaxys-border)] hover:bg-red-50 hover:text-red-700"
                disabled={saving}
                onClick={() => saveText(active.field, "")}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            ) : null}

            {active?.kind === "item" && canEdit ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl bg-white text-red-600 ring-1 ring-[color:var(--sinaxys-border)] hover:bg-red-50 hover:text-red-700"
                disabled={saving}
                onClick={() => {
                  const src = active.field === "values" ? valuesItems : cultureItems;
                  const next = src.filter((_, i) => i !== active.index);
                  void saveItems(active.field, next);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            ) : null}

            <Button type="button" variant="outline" className="h-11 rounded-2xl bg-white" onClick={() => setActive(null)} disabled={saving}>
              {canEdit ? "Cancelar" : "Fechar"}
            </Button>

            {active?.kind === "text" && canEdit ? (
              <Button
                type="button"
                className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                disabled={saving}
                onClick={() => saveText(active.field, draftText)}
              >
                Salvar
              </Button>
            ) : null}

            {active?.kind === "item" && canEdit ? (
              <Button
                type="button"
                className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                disabled={saving || (draftTitle.trim().length < 2 && draftDesc.trim().length < 4)}
                onClick={() => {
                  const src = active.field === "values" ? valuesItems : cultureItems;
                  const next = src.map((it, i) =>
                    i === active.index ? { title: draftTitle.trim(), description: draftDesc.trim() } : it,
                  );
                  void saveItems(active.field, next);
                }}
              >
                Salvar
              </Button>
            ) : null}

            {active?.kind === "add" && canEdit ? (
              <Button
                type="button"
                className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                disabled={saving || (draftTitle.trim().length < 2 && draftDesc.trim().length < 4)}
                onClick={() => {
                  const src = active.field === "values" ? valuesItems : cultureItems;
                  const next = [...src, { title: draftTitle.trim(), description: draftDesc.trim() }];
                  void saveItems(active.field, next);
                }}
              >
                Adicionar
              </Button>
            ) : null}
          </BlurDialogFooter>
        </BlurDialogContent>
      </BlurDialog>
    </>
  );
}