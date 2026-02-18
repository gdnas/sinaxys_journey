// Deterministic hue (0..359)
/* Keep these paths for Tree mode direct clicks */
// Lazy load objectives only for expanded cycles.
/* Fundamentos */
/* Placeholder when nothing is filled yet */
/* Longo prazo */
/* Ciclos */
/* Shortcut for power users: keep ability to jump to objective editor from a cycle picker on the right */
// If the open objective was removed, close it.
/* Desktop dialog details (tree mode) */
/* Mobile details sheet */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
    ChevronDown,
    ChevronRight,
    CircleDot,
    Edit3,
    Layers,
    ListTree,
    Save,
    Target,
    X,
    Flag,
    Route,
    CalendarClock,
    Network,
    Link2,
    UserRound,
    Plus,
    Compass,
    Eye,
    Gem,
    Sparkles,
    Goal,
    BadgeCheck,
    ChevronUp,
    Building2,
} from "lucide-react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { OrgChartTreeCanvas, type OrgNode } from "@/components/OrgChartTreeCanvas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

import {
    createStrategyObjective,
    getCompanyFundamentals,
    getOkrObjective,
    listOkrCycles,
    listOkrObjectives,
    listStrategyObjectives,
    listKeyResults,
    krProgressPct,
    updateKeyResult,
    updateOkrObjective,
    upsertCompanyFundamentals,
    updateStrategyObjective,
    type DbCompanyFundamentals,
    type DbOkrCycle,
    type DbOkrKeyResult,
    type DbOkrObjective,
    type DbStrategyObjective,
} from "@/lib/okrDb";

import { listPublicProfilesByCompany, type DbProfilePublic } from "@/lib/profilePublicDb";
import { objectiveLevelLabel, objectiveTypeBadgeClass, objectiveTypeLabel } from "@/lib/okrUi";
import { cn } from "@/lib/utils";
import { listDepartments, type DbDepartment } from "@/lib/departmentsDb";

import {
    describedItemsToLines,
    parseDescribedItems,
    serializeDescribedItems,
    type DescribedItem,
} from "@/lib/fundamentalsFormat";

import { DescribedItemsEditor } from "@/components/fundamentals/DescribedItemsEditor";
import { getErrorMessage } from "@/lib/errorMessage";
import { brl } from "@/lib/costs";

type NodeId = string;

type Node = {
    kind: "root";
    id: "root";
} | {
    kind: "fundamentals";
    id: "fundamentals";
} | {
    kind: "fundamental";
    id: `fund:${keyof DbCompanyFundamentals}`;
    field: keyof DbCompanyFundamentals;
} | {
    kind: "strategy";
    id: "strategy";
} | {
    kind: "strategyObjective";
    id: `so:${string}`;
    soId: string;
} | {
    kind: "cycles";
    id: "cycles";
} | {
    kind: "cycle";
    id: `c:${string}`;
    cycleId: string;
} | {
    kind: "objective";
    id: `o:${string}`;
    objectiveId: string;
} | {
    kind: "kr";
    id: `kr:${string}`;
    krId: string;
};

function parseListValue(v: string | null | undefined) {
    if (!v?.trim())
        return [];

    return v.split("\n").map(s => s.trim()).map(s => s.replace(/^[-•]\s+/, "")).filter(Boolean);
}

function serializeListValue(items: string[]) {
    return items.map(s => s.trim()).filter(Boolean).join("\n");
}

function initials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
    return (a + b).toUpperCase();
}

function hueFromId(id: string) {
    let h = 0;

    for (let i = 0; i < id.length; i++)
        h = (h * 31 + id.charCodeAt(i)) % 360;

    return h;
}

function yearForStrategyObjective(so: DbStrategyObjective) {
    if (typeof so.target_year === "number" && Number.isFinite(so.target_year)) return so.target_year;
    const base = new Date().getFullYear();
    return base + (so.horizon_years ?? 3);
}

function StrategyYearIcon({ so }: { so: DbStrategyObjective }) {
    const yy = yearForStrategyObjective(so);
    return <span className="font-mono text-[10px] font-bold tracking-tight">{yy}</span>;
}

function nodeTitle(n: Node) {
    if (n.kind === "root")
        return "Mapa";

    if (n.kind === "fundamentals")
        return "Fundamentos";

    if (n.kind === "fundamental") {
        const map: Record<keyof DbCompanyFundamentals, string> = {
            company_id: "Empresa",
            mission: "Missão",
            vision: "Visão",
            purpose: "Propósito",
            values: "Valores",
            culture: "Cultura",
            strategic_north: "(removido)",
            annual_drivers: "Direcionadores do ano",
            created_at: "Criado em",
            updated_at: "Atualizado em"
        };

        return map[n.field] ?? String(n.field);
    }

    if (n.kind === "strategy")
        return "Objetivos de longo prazo";

    if (n.kind === "cycles")
        return "OKRs (ciclos)";

    if (n.kind === "cycle")
        return "Ciclo";

    if (n.kind === "objective")
        return "Objetivo";

    if (n.kind === "kr")
        return "KR";

    if (n.kind === "strategyObjective")
        return "Objetivo longo prazo";

    return "";
}

function cycleLabel(c: DbOkrCycle) {
    const base = c.type === "ANNUAL" ? `${c.year}` : `Q${c.quarter ?? "?"} / ${c.year}`;
    return c.name?.trim() ? `${c.name} · ${base}` : base;
}

function rowIndentStyle(depth: number) {
    return {
        paddingLeft: depth <= 0 ? 0 : Math.min(32, depth * 12)
    } as const;
}

type RowTone = {
    bg: string;
    border: string;
    ink: string;
};

function toneFromKind(kind: Node["kind"]): RowTone {
    if (kind === "fundamentals" || kind === "fundamental") {
        return {
            bg: "var(--map-fundamentals-bg)",
            border: "var(--map-fundamentals-border)",
            ink: "var(--map-fundamentals-ink)",
        };
    }

    if (kind === "strategy" || kind === "strategyObjective") {
        return {
            bg: "var(--map-strategy-bg)",
            border: "var(--map-strategy-border)",
            ink: "var(--map-strategy-ink)",
        };
    }

    if (kind === "cycles" || kind === "cycle") {
        return {
            bg: "var(--map-cycles-bg)",
            border: "var(--map-cycles-border)",
            ink: "var(--map-cycles-ink)",
        };
    }

    if (kind === "objective" || kind === "kr") {
        return {
            bg: "var(--map-objectives-bg)",
            border: "var(--map-objectives-border)",
            ink: "var(--map-objectives-ink)",
        };
    }

    return {
        bg: "var(--map-neutral-bg)",
        border: "var(--map-neutral-border)",
        ink: "var(--map-neutral-ink)",
    };
}

function Row(
    {
        depth,
        active,
        expanded,
        canExpand,
        icon,
        title,
        subtitle,
        right,
        onToggle,
        onEdit,
        onClick,
        toneKind,
    }: {
        depth: number;
        active: boolean;
        expanded: boolean;
        canExpand: boolean;
        icon: React.ReactNode;
        title: string;
        subtitle?: React.ReactNode;
        right?: React.ReactNode;
        onToggle?: () => void;
        onEdit?: () => void;
        onClick: () => void;
        toneKind: Node["kind"];
    }
) {
    const tone = toneFromKind(toneKind);

    return (
        <button
            type="button"
            style={{
                ...rowIndentStyle(depth),
                borderColor: active ? tone.ink : tone.border,
                backgroundColor: active ? "color-mix(in srgb, " + tone.bg + " 70%, white 30%)" : "white",
            }}
            className={cn(
                "group flex w-full items-start gap-2 rounded-2xl border px-3 py-2 text-left transition",
                "hover:[background-color:color-mix(in_srgb,var(--sinaxys-tint)_35%,white)]"
            )}
            onClick={onClick}>
            <span
                style={{
                    backgroundColor: tone.bg,
                    color: tone.ink,
                    borderColor: tone.border,
                }}
                className="mt-0.5 grid h-8 min-w-8 shrink-0 place-items-center rounded-xl border px-2">
                {icon}
            </span>

            <span className="min-w-0 flex-1">
                <span className="block min-w-0">
                    <span className="block min-w-0 text-sm font-semibold leading-tight text-[color:var(--sinaxys-ink)] line-clamp-2">
                        {title}
                    </span>
                    {subtitle ? (
                        <span className="mt-1 block min-w-0 text-xs leading-snug text-muted-foreground line-clamp-2">
                            {subtitle}
                        </span>
                    ) : null}
                </span>
            </span>

            <span className="ml-1 flex shrink-0 items-start gap-2">
                {right}

                {onEdit ? (
                    <span
                        className={cn(
                            "grid h-8 w-8 place-items-center rounded-xl transition",
                            "bg-white ring-1 ring-[color:var(--sinaxys-border)]",
                            active ? "text-[color:var(--sinaxys-primary)]" : "text-muted-foreground"
                        )}
                        title="Editar"
                        onClick={e => {
                            e.stopPropagation();
                            onEdit();
                        }}>
                        <Edit3 className="h-4 w-4" />
                    </span>
                ) : null}

                {canExpand ? (
                    <span
                        className={cn(
                            "grid h-8 w-8 place-items-center rounded-xl transition",
                            "bg-white ring-1 ring-[color:var(--sinaxys-border)]",
                            active ? "text-[color:var(--sinaxys-primary)]" : "text-[color:var(--sinaxys-ink)]"
                        )}
                        title={expanded ? "Recolher" : "Expandir"}
                        onClick={e => {
                            e.stopPropagation();
                            onToggle?.();
                        }}>
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                ) : null}
            </span>
        </button>
    );
}

function ObjectiveMeta(
    {
        o
    }: {
        o: DbOkrObjective;
    }
) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <Badge className={"rounded-full " + objectiveTypeBadgeClass(o.level)}>{objectiveTypeLabel(o.level)}</Badge>
            <Badge
                className="rounded-full bg-white text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)] hover:bg-white">
                {objectiveLevelLabel(o.level)}
            </Badge>
            {o.status === "ACHIEVED" ? (<Badge
                className="rounded-full bg-white text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)] hover:bg-white">Atingido</Badge>) : null}
        </div>
    );
}

function averageObjectivePct(krs: DbOkrKeyResult[]) {
    const pcts = krs.map(k => krProgressPct(k)).filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    if (!pcts.length)
        return null;

    return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
}

function sumDescendantCosts(objectiveId: string, objectives: DbOkrObjective[]) {
    const childrenByParent = new Map<string, string[]>();

    for (const o of objectives) {
        if (!o.parent_objective_id)
            continue;

        const arr = childrenByParent.get(o.parent_objective_id) ?? [];
        arr.push(o.id);
        childrenByParent.set(o.parent_objective_id, arr);
    }

    const costById = new Map<string, number>();
    for (const o of objectives) {
        if (typeof o.estimated_cost_brl === "number" && Number.isFinite(o.estimated_cost_brl))
            costById.set(o.id, o.estimated_cost_brl);
    }

    const visited = new Set<string>();
    const stack = [...(childrenByParent.get(objectiveId) ?? [])];
    let sum = 0;

    while (stack.length) {
        const id = stack.pop()!;
        if (visited.has(id))
            continue;
        visited.add(id);
        sum += costById.get(id) ?? 0;
        const children = childrenByParent.get(id) ?? [];
        for (const c of children)
            stack.push(c);
    }

    return sum;
}

function StrategyLinker(
    {
        cid,
        canEdit,
        objective,
        fundamentals,
        strategy,
        objectivesInCycle,
        onSaved
    }: {
        cid: string;
        canEdit: boolean;
        objective: DbOkrObjective;
        fundamentals: DbCompanyFundamentals | null;
        strategy: DbStrategyObjective[];
        objectivesInCycle: DbOkrObjective[];
        onSaved: () => Promise<void>;
    }
) {
    const {
        toast
    } = useToast();

    const [saving, setSaving] = useState(false);

    const otherObjectives = useMemo(
        () => objectivesInCycle.filter(o => o.id !== objective.id).sort((a, b) => a.title.localeCompare(b.title)),
        [objectivesInCycle, objective.id]
    );

    const fundamentalOptions = useMemo(() => [{
        key: "PURPOSE",
        label: "Propósito",
        field: "purpose" as const
    }, {
        key: "VISION",
        label: "Visão",
        field: "vision" as const
    }, {
        key: "MISSION",
        label: "Missão",
        field: "mission" as const
    }, {
        key: "VALUES",
        label: "Valores",
        field: "values" as const
    }, {
        key: "CULTURE",
        label: "Cultura",
        field: "culture" as const
    }] as const, []);

    const selectedFundamental = fundamentalOptions.find(o => o.key === objective.linked_fundamental) ?? null;

    const selectedFundamentalItems = useMemo(() => {
        if (!selectedFundamental)
            return [];

        if (selectedFundamental.field === "values" || selectedFundamental.field === "culture") {
            return describedItemsToLines(parseDescribedItems((fundamentals as any)?.[selectedFundamental.field]));
        }

        return String((fundamentals as any)?.[selectedFundamental.field] ?? "").split("\n").map(s => s.trim()).filter(Boolean);
    }, [fundamentals, selectedFundamental]);

    return (
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Conexões</div>
                    <div className="mt-1 text-sm text-muted-foreground">Vincule este objetivo a um pai e/ou a uma estratégia da empresa (e também a um fundamento específico).
                                  </div>
                </div>
                <div
                    className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                    <Link2 className="h-5 w-5" />
                </div>
            </div>
            <Separator className="my-4" />
            <div className="grid gap-4">
                <div className="grid gap-2">
                    <Label>Estratégia (objetivo de longo prazo)</Label>
                    <Select
                        disabled={!canEdit || saving}
                        value={objective.strategy_objective_id ?? "__none__"}
                        onValueChange={async v => {
                            setSaving(true);

                            try {
                                await updateOkrObjective(objective.id, {
                                    strategy_objective_id: v === "__none__" ? null : v
                                });

                                toast({
                                    title: "Vínculo com estratégia atualizado"
                                });

                                await onSaved();
                            } catch (e) {
                                toast({
                                    title: "Não foi possível salvar",
                                    description: e instanceof Error ? e.message : "Erro inesperado.",
                                    variant: "destructive"
                                });
                            } finally {
                                setSaving(false);
                            }
                        }}>
                        <SelectTrigger className="h-11 rounded-2xl bg-white">
                            <SelectValue placeholder="Selecione…" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                            <SelectItem value="__none__">Sem vínculo</SelectItem>
                            {strategy.map(so => (<SelectItem key={so.id} value={so.id}>
                                {so.title}
                            </SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label>OKR pai (objetivo pai)</Label>
                    <Select
                        disabled={!canEdit || saving}
                        value={objective.parent_objective_id ?? "__none__"}
                        onValueChange={async v => {
                            setSaving(true);

                            try {
                                await updateOkrObjective(objective.id, {
                                    parent_objective_id: v === "__none__" ? null : v
                                });

                                toast({
                                    title: "OKR pai atualizado"
                                });

                                await onSaved();
                            } catch (e) {
                                toast({
                                    title: "Não foi possível salvar",
                                    description: e instanceof Error ? e.message : "Erro inesperado.",
                                    variant: "destructive"
                                });
                            } finally {
                                setSaving(false);
                            }
                        }}>
                        <SelectTrigger className="h-11 rounded-2xl bg-white">
                            <SelectValue placeholder="Selecione…" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                            <SelectItem value="__none__">Sem pai</SelectItem>
                            {otherObjectives.map(o => (<SelectItem key={o.id} value={o.id}>
                                {o.title}
                            </SelectItem>))}
                        </SelectContent>
                    </Select>
                    <div className="text-[11px] text-muted-foreground">Mostra objetivos do mesmo ciclo (trimestre/ano).</div>
                </div>
                <div className="grid gap-2">
                    <Label>Fundamento (missão/visão/valores etc.)</Label>
                    <Select
                        disabled={!canEdit || saving}
                        value={objective.linked_fundamental ?? "__none__"}
                        onValueChange={async v => {
                            setSaving(true);

                            try {
                                const next = v === "__none__" ? null : (v as DbOkrObjective["linked_fundamental"]);

                                await updateOkrObjective(objective.id, {
                                    linked_fundamental: next,
                                    linked_fundamental_text: null
                                });

                                toast({
                                    title: "Fundamento atualizado"
                                });

                                await onSaved();
                            } catch (e) {
                                toast({
                                    title: "Não foi possível salvar",
                                    description: e instanceof Error ? e.message : "Erro inesperado.",
                                    variant: "destructive"
                                });
                            } finally {
                                setSaving(false);
                            }
                        }}>
                        <SelectTrigger className="h-11 rounded-2xl bg-white">
                            <SelectValue placeholder="Selecione…" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                            <SelectItem value="__none__">Sem fundamento</SelectItem>
                            {fundamentalOptions.map(o => (<SelectItem key={o.key} value={o.key}>
                                {o.label}
                            </SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
                {objective.linked_fundamental ? (<div className="grid gap-2">
                    <Label>Item do fundamento</Label>
                    <Select
                        disabled={!canEdit || saving}
                        value={objective.linked_fundamental_text ?? "__none__"}
                        onValueChange={async v => {
                            setSaving(true);

                            try {
                                await updateOkrObjective(objective.id, {
                                    linked_fundamental_text: v === "__none__" ? null : v
                                });

                                toast({
                                    title: "Item do fundamento atualizado"
                                });

                                await onSaved();
                            } catch (e) {
                                toast({
                                    title: "Não foi possível salvar",
                                    description: e instanceof Error ? e.message : "Erro inesperado.",
                                    variant: "destructive"
                                });
                            } finally {
                                setSaving(false);
                            }
                        }}>
                        <SelectTrigger className="h-11 rounded-2xl bg-white">
                            <SelectValue
                                placeholder={selectedFundamentalItems.length ? "Selecione…" : "Sem itens cadastrados"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                            <SelectItem value="__none__">Sem item</SelectItem>
                            {selectedFundamentalItems.map(it => (<SelectItem key={it} value={it}>
                                {it}
                            </SelectItem>))}
                        </SelectContent>
                    </Select>
                    {!selectedFundamentalItems.length ? (<div className="text-[11px] text-muted-foreground">Cadastre itens nesse fundamento para poder vincular.</div>) : null}
                </div>) : null}
            </div>
        </Card>
    );
}

function KrInlineEditor(
    {
        kr,
        canEdit,
        onSaved
    }: {
        kr: DbOkrKeyResult;
        canEdit: boolean;
        onSaved: () => void;
    }
) {
    const {
        toast
    } = useToast();

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState(kr.title);
    const [cur, setCur] = useState(typeof kr.current_value === "number" ? String(kr.current_value) : "");
    const pct = krProgressPct(kr);

    return (
        <div
            className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div
                        className="text-sm font-semibold text-[color:var(--sinaxys-ink)] line-clamp-2">{kr.title}</div>
                    <div
                        className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge
                            className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                            {kr.kind === "DELIVERABLE" ? "Entregável" : "Métrico"}
                        </Badge>
                        {typeof pct === "number" ? <span>{pct}%</span> : <span>—</span>}
                    </div>
                </div>
                {canEdit ? (<Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-[color:var(--sinaxys-tint)]/40 hover:text-[color:var(--sinaxys-ink)]"
                    onClick={() => setEditing(v => !v)}
                    title={editing ? "Fechar" : "Editar"}>
                    {editing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                </Button>) : null}
            </div>
            {typeof pct === "number" ? <Progress
                value={pct}
                className="mt-2 h-2 rounded-full bg-[color:var(--sinaxys-tint)]" /> : null}
            {editing ? (<div className="mt-3 grid gap-3">
                <div className="grid gap-2">
                    <Label className="text-xs">Título</Label>
                    <Input
                        className="h-10 rounded-xl"
                        value={title}
                        onChange={e => setTitle(e.target.value)} />
                </div>
                {kr.kind === "METRIC" ? (<div className="grid gap-2">
                    <Label className="text-xs">Valor atual</Label>
                    <Input
                        className="h-10 rounded-xl"
                        value={cur}
                        onChange={e => setCur(e.target.value)}
                        placeholder="Ex.: 42" />
                    <div className="text-[11px] text-muted-foreground">Início: {kr.start_value ?? "—"}• Meta: {kr.target_value ?? "—"} {kr.metric_unit ? `(${kr.metric_unit})` : ""}
                    </div>
                </div>) : (<div
                    className="flex items-center justify-between gap-3 rounded-xl bg-[color:var(--sinaxys-bg)] px-3 py-2">
                    <div className="text-xs font-semibold text-[color:var(--sinaxys-ink)]">Concluído</div>
                    <Button
                        type="button"
                        variant={kr.achieved ? "default" : "outline"}
                        className={kr.achieved ? "h-9 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90" : "h-9 rounded-xl bg-white"}
                        disabled={saving}
                        onClick={async () => {
                            setSaving(true);

                            try {
                                const next = !kr.achieved;

                                await updateKeyResult(kr.id, {
                                    achieved: next,
                                    achieved_at: next ? new Date().toISOString() : null
                                });

                                toast({
                                    title: "KR atualizado"
                                });

                                onSaved();
                            } catch (e) {
                                toast({
                                    title: "Não foi possível atualizar",
                                    description: e instanceof Error ? e.message : "Erro inesperado.",
                                    variant: "destructive"
                                });
                            } finally {
                                setSaving(false);
                            }
                        }}>
                        {kr.achieved ? "Sim" : "Não"}
                    </Button>
                </div>)}
                <div className="flex justify-end">
                    <Button
                        type="button"
                        className="h-10 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                        disabled={saving || title.trim().length < 4}
                        onClick={async () => {
                            setSaving(true);

                            try {
                                const patch: Parameters<typeof updateKeyResult>[1] = {
                                    title: title.trim()
                                };

                                if (kr.kind === "METRIC") {
                                    const n = Number(cur.trim());
                                    patch.current_value = Number.isFinite(n) ? n : null;
                                }

                                await updateKeyResult(kr.id, patch);

                                toast({
                                    title: "KR atualizado"
                                });

                                onSaved();
                                setEditing(false);
                            } catch (e) {
                                toast({
                                    title: "Não foi possível salvar",
                                    description: e instanceof Error ? e.message : "Erro inesperado.",
                                    variant: "destructive"
                                });
                            } finally {
                                setSaving(false);
                            }
                        }}>
                        <Save className="mr-2 h-4 w-4" />Salvar
                                    </Button>
                </div>
            </div>) : null}
        </div>
    );
}

function FundamentalsPicker(
    {
        cid,
        canEdit,
        fundamentals,
        onSaved
    }: {
        cid: string;
        canEdit: boolean;
        fundamentals: DbCompanyFundamentals | null;
        onSaved: () => Promise<void>;
    }
) {
    const fields: Array<keyof DbCompanyFundamentals> = ["purpose", "vision", "mission", "values", "culture"];

    return (
        <div className="grid gap-4">
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Fundamentos</div>
                        <div className="mt-1 text-sm text-muted-foreground">Edite aqui rapidamente (ou abra a página completa).</div>
                    </div>
                    <div
                        className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                        <Route className="h-5 w-5" />
                    </div>
                </div>
                <div className="mt-4">
                    <Button asChild variant="outline" className="h-11 rounded-2xl bg-white">
                        <Link to="/okr/fundamentos">Abrir fundamentos</Link>
                    </Button>
                </div>
            </Card>
            {fields.map(field => (<FundamentalEditor
                key={field}
                cid={cid}
                canEdit={canEdit}
                field={field}
                fundamentals={fundamentals}
                onSaved={onSaved} />))}
        </div>
    );
}

function ObjectiveEditor(
    {
        canEdit,
        objective,
        pct,
        krs,
        loadingKrs,
        onSaved,
        companyId,
        strategy,
        fundamentals,
        people
    }: {
        canEdit: boolean;
        objective: DbOkrObjective;
        pct: number | null;
        krs: DbOkrKeyResult[];
        loadingKrs: boolean;
        onSaved: () => Promise<void>;
        companyId: string;
        strategy: DbStrategyObjective[];
        fundamentals: DbCompanyFundamentals | null;
        people: DbProfilePublic[];
    }
) {
    const {
        toast
    } = useToast();

    const qc = useQueryClient();
    const [title, setTitle] = useState(objective.title);
    const [desc, setDesc] = useState(objective.description ?? "");
    const [reason, setReason] = useState(objective.strategic_reason ?? "");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setTitle(objective.title);
        setDesc(objective.description ?? "");
        setReason(objective.strategic_reason ?? "");
        setSaving(false);
    }, [objective.id, objective.updated_at]);

    const peopleOptions = useMemo(
        () => people.filter(p => p.active).sort((a, b) => a.name.localeCompare(b.name)),
        [people]
    );

    const [ownerId, setOwnerId] = useState<string>(objective.owner_user_id);

    useEffect(() => {
        setOwnerId(objective.owner_user_id);
    }, [objective.owner_user_id, objective.updated_at, objective.id]);

    const qObjectivesInCycle = useQuery({
        queryKey: ["okr-cycle-objectives", companyId, objective.cycle_id],
        queryFn: () => listOkrObjectives(companyId, objective.cycle_id),
        staleTime: 20_000
    });

    const objectivesInCycle = qObjectivesInCycle.data ?? [];

    const childrenCostBRL = useMemo(() => {
        if (objective.level !== "COMPANY")
            return null;
        const sum = sumDescendantCosts(objective.id, objectivesInCycle);
        return Number.isFinite(sum) && sum > 0 ? sum : 0;
    }, [objective.id, objective.level, objectivesInCycle]);

    return (
        <div className="grid gap-4">
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{objective.title}</div>
                        <div
                            className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <ObjectiveMeta o={objective} />
                            {typeof pct === "number" ? (<Badge
                                className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                                {pct}%
                            </Badge>) : null}
                        </div>

                        {objective.level === "COMPANY" && typeof childrenCostBRL === "number" ? (
                            <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] px-3 py-2 text-xs">
                                <span className="font-semibold text-[color:var(--sinaxys-ink)]">Custo (filhos):</span>
                                <span className="font-semibold text-[color:var(--sinaxys-ink)]">{brl(childrenCostBRL)}</span>
                                <span className="text-muted-foreground">(soma de objetivos descendentes)</span>
                            </div>
                        ) : null}
                    </div>
                    <Button asChild variant="outline" className="h-11 rounded-2xl bg-white">
                        <Link to={`/okr/objetivos/${objective.id}`}>Abrir</Link>
                    </Button>
                </div>
                <Separator className="my-4" />
                <div className="grid gap-3">
                    <div className="grid gap-2">
                        <Label>Título</Label>
                        <Input
                            className="h-11 rounded-2xl"
                            value={title}
                            disabled={!canEdit || saving}
                            onChange={e => setTitle(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Dono</Label>
                        <Select value={ownerId} onValueChange={setOwnerId} disabled={!canEdit || saving}>
                            <SelectTrigger className="h-11 rounded-2xl bg-white">
                                <SelectValue placeholder="Selecione…" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                                {peopleOptions.map(p => (<SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                </SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Descrição</Label>
                        <Textarea
                            className="min-h-[120px] rounded-2xl"
                            value={desc}
                            disabled={!canEdit || saving}
                            onChange={e => setDesc(e.target.value)}
                            placeholder="Contexto do objetivo…" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Razão estratégica</Label>
                        <Textarea
                            className="min-h-[100px] rounded-2xl"
                            value={reason}
                            disabled={!canEdit || saving}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Por que isso importa agora?" />
                    </div>
                    {canEdit ? (<div className="flex justify-end">
                        <Button
                            className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                            disabled={saving || title.trim().length < 6}
                            onClick={async () => {
                                setSaving(true);

                                try {
                                    await updateOkrObjective(objective.id, {
                                        title: title.trim(),
                                        owner_user_id: ownerId,
                                        description: desc.trim() || null,
                                        strategic_reason: reason.trim() || null
                                    });

                                    toast({
                                        title: "Objetivo atualizado"
                                    });

                                    await Promise.all([qc.invalidateQueries({
                                        queryKey: ["okr-objective", objective.id]
                                    }), qc.invalidateQueries({
                                        queryKey: ["okr-objectives", companyId]
                                    }), qc.invalidateQueries({
                                        queryKey: ["okr-map-cycle-objectives", companyId]
                                    }), qc.invalidateQueries({
                                        queryKey: ["okr-cycle-objectives", companyId, objective.cycle_id]
                                    })]);

                                    await onSaved();
                                } catch (e) {
                                    toast({
                                        title: "Não foi possível salvar",
                                        description: e instanceof Error ? e.message : "Erro inesperado.",
                                        variant: "destructive"
                                    });
                                } finally {
                                    setSaving(false);
                                }
                            }}>
                            <Save className="mr-2 h-4 w-4" />Salvar
                        </Button>
                    </div>) : null}
                </div>
            </Card>
            <StrategyLinker
                cid={companyId}
                canEdit={canEdit}
                objective={objective}
                fundamentals={fundamentals}
                strategy={strategy}
                objectivesInCycle={objectivesInCycle}
                onSaved={onSaved} />
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Resultados-chave (KRs)</div>
                        <div className="mt-1 text-sm text-muted-foreground">Acompanhe o progresso do objetivo.</div>
                    </div>
                    <div
                        className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                        <Target className="h-5 w-5" />
                    </div>
                </div>
                <Separator className="my-4" />
                {loadingKrs ? (<div
                    className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Carregando KRs…</div>) : krs.length ? (<div className="grid gap-3">
                    {krs.map(kr => (<KrInlineEditor
                        key={kr.id}
                        kr={kr}
                        canEdit={canEdit}
                        onSaved={() => {
                            qc.invalidateQueries({
                                queryKey: ["okr-krs", objective.id]
                            });

                            onSaved();
                        }} />))}
                </div>) : (<div
                    className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Sem KRs ainda.</div>)}
                <div className="mt-4">
                    <Button asChild variant="outline" className="h-11 rounded-2xl bg-white">
                        <Link to={`/okr/objetivos/${objective.id}`}>Gerenciar KRs e entregáveis</Link>
                    </Button>
                </div>
            </Card>
        </div>
    );
}

function DetailsBody(
    {
        node,
        cid,
        canEdit,
        fundamentals,
        strategy,
        cycles,
        objectiveById,
        cycleById,
        onInvalidate,
        onSelect,
        people
    }: {
        node: Node;
        cid: string;
        canEdit: boolean;
        fundamentals: DbCompanyFundamentals | null;
        strategy: DbStrategyObjective[];
        cycles: DbOkrCycle[];
        objectiveById: Map<string, DbOkrObjective>;
        cycleById: Map<string, DbOkrCycle>;
        onInvalidate: () => Promise<void>;
        onSelect?: (n: Node) => void;
        people: DbProfilePublic[];
    }
) {
    const {
        toast
    } = useToast();

    const qc = useQueryClient();
    const objectiveId = node.kind === "objective" ? node.objectiveId : null;

    const qObjective = useQuery({
        queryKey: ["okr-objective", objectiveId],
        enabled: !!objectiveId && !objectiveById.has(objectiveId),
        queryFn: () => getOkrObjective(objectiveId as string),
        staleTime: 20_000
    });

    useEffect(() => {
        if (!objectiveId)
            return;

        if (!qObjective.data)
            return;

        objectiveById.set(objectiveId, qObjective.data);
    }, [objectiveById, objectiveId, qObjective.data]);

    const objective = objectiveId ? (objectiveById.get(objectiveId) ?? qObjective.data ?? null) : null;

    const qKrs = useQuery({
        queryKey: ["okr-krs", objectiveId],
        enabled: !!objectiveId,
        queryFn: () => listKeyResults(objectiveId as string)
    });

    const pct = useMemo(() => {
        if (!objectiveId)
            return null;

        return averageObjectivePct(qKrs.data ?? []);
    }, [objectiveId, qKrs.data]);

    return (
        <div className="grid gap-4">
            {node.kind === "fundamentals" ? (<FundamentalsPicker
                cid={cid}
                canEdit={canEdit}
                fundamentals={fundamentals}
                onSaved={async () => {
                    await qc.invalidateQueries({
                        queryKey: ["okr-fundamentals", cid]
                    });

                    toast({
                        title: "Fundamentos atualizados"
                    });

                    await onInvalidate();
                }} />) : null}
            {node.kind === "strategy" ? (<StrategyPicker
                cid={cid}
                canEdit={canEdit}
                strategy={strategy}
                people={people}
                onSaved={async () => {
                    await qc.invalidateQueries({
                        queryKey: ["okr-strategy", cid]
                    });

                    toast({
                        title: "Objetivo atualizado"
                    });

                    await onInvalidate();
                }} />) : null}
            {node.kind === "cycles" ? (<CyclesPicker
                cid={cid}
                cycles={cycles}
                onPickObjective={objectiveId => {
                    onSelect?.({
                        kind: "objective",
                        id: `o:${objectiveId}`,
                        objectiveId
                    });
                }} />) : null}
            {node.kind === "objective" ? (objective ? (<ObjectiveEditor
                canEdit={canEdit}
                objective={objective}
                pct={pct}
                krs={qKrs.data ?? []}
                loadingKrs={qKrs.isLoading}
                onSaved={async () => {
                    await Promise.all([qc.invalidateQueries({
                        queryKey: ["okr-quarter-objectives", cid]
                    }), qc.invalidateQueries({
                        queryKey: ["okr-objectives", cid]
                    }), qc.invalidateQueries({
                        queryKey: ["okr-krs", objectiveId]
                    }), qc.invalidateQueries({
                        queryKey: ["okr-cycle-objectives", cid]
                    }), qc.invalidateQueries({
                        queryKey: ["okr-map-cycle-objectives", cid]
                    }), qc.invalidateQueries({
                        queryKey: ["okr-objective", objectiveId]
                    })]);

                    await onInvalidate();
                }}
                companyId={cid}
                strategy={strategy}
                fundamentals={fundamentals}
                people={people} />) : (<Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
                <div className="text-sm text-muted-foreground">Carregando objetivo…</div>
            </Card>)) : null}
            {}
            {node.kind === "fundamental" ? (<FundamentalEditor
                cid={cid}
                canEdit={canEdit}
                field={node.field}
                fundamentals={fundamentals}
                onSaved={async () => {
                    await qc.invalidateQueries({
                        queryKey: ["okr-fundamentals", cid]
                    });

                    toast({
                        title: "Fundamentos atualizados"
                    });
                }} />) : null}
            {node.kind === "strategyObjective" ? (strategy.find(s => s.id === node.soId) ? (<StrategyObjectiveInlineCard
                so={strategy.find(s => s.id === node.soId)!}
                people={people}
                canEdit={canEdit}
                open={true}
                onToggle={() => {}}
                onSaved={async () => {
                    await qc.invalidateQueries({
                        queryKey: ["okr-strategy", cid]
                    });

                    toast({
                        title: "Objetivo atualizado"
                    });
                }} />) : (<Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
                <div className="text-sm text-muted-foreground">Objetivo de longo prazo não encontrado.</div>
            </Card>)) : null}
            {node.kind === "cycle" ? (<Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{cycleLabel(cycleById.get(node.cycleId)!)}</div>
                        <div className="mt-1 text-sm text-muted-foreground">Abra o ciclo para gerenciar objetivos e KRs.</div>
                    </div>
                    <div
                        className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                        <CalendarClock className="h-5 w-5" />
                    </div>
                </div>
                <div className="mt-4">
                    <Button asChild variant="outline" className="h-11 rounded-2xl bg-white">
                        <Link to="/okr/ciclos">Abrir ciclos</Link>
                    </Button>
                </div>
            </Card>) : null}
            {node.kind === "root" ? (<Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
                <div className="text-sm text-muted-foreground">Selecione um item para ver detalhes, editar e vincular.</div>
            </Card>) : null}
        </div>
    );
}

function DetailsShell(
    {
        node,
        cid,
        canEdit,
        fundamentals,
        strategy,
        cycles,
        objectiveById,
        cycleById,
        onInvalidate,
        onSelect,
        people
    }: {
        node: Node;
        cid: string;
        canEdit: boolean;
        fundamentals: DbCompanyFundamentals | null;
        strategy: DbStrategyObjective[];
        cycles: DbOkrCycle[];
        objectiveById: Map<string, DbOkrObjective>;
        cycleById: Map<string, DbOkrCycle>;
        onInvalidate: () => Promise<void>;
        onSelect?: (n: Node) => void;
        people: DbProfilePublic[];
    }
) {
    const title = useMemo(() => {
        if (node.kind === "fundamental")
            return nodeTitle(node);

        if (node.kind === "cycle")
            return cycleLabel(cycleById.get(node.cycleId)!);

        if (node.kind === "objective")
            return objectiveById.get(node.objectiveId)?.title ?? "Objetivo";

        if (node.kind === "strategyObjective")
            return strategy.find(s => s.id === node.soId)?.title ?? "Objetivo longo prazo";

        if (node.kind === "fundamentals")
            return "Fundamentos";

        if (node.kind === "strategy")
            return "Objetivos de longo prazo";

        if (node.kind === "cycles")
            return "Ciclos";

        return nodeTitle(node);
    }, [node, cycleById, objectiveById, strategy]);

    return (
        <div
            className="overflow-hidden rounded-3xl border border-[color:var(--sinaxys-border)] bg-white">
            <div className="border-b border-[color:var(--sinaxys-border)] p-5">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{title}</div>
            </div>
            <ScrollArea className="h-[calc(100vh-220px)] p-5">
                <DetailsBody
                    node={node}
                    cid={cid}
                    canEdit={canEdit}
                    fundamentals={fundamentals}
                    strategy={strategy}
                    cycles={cycles}
                    objectiveById={objectiveById}
                    cycleById={cycleById}
                    onInvalidate={onInvalidate}
                    onSelect={onSelect}
                    people={people} />
            </ScrollArea>
        </div>
    );
}

type TreeCtx = {
    cid: string;
    activeId: NodeId;
    expanded: Record<string, boolean>;
    toggle: (id: string) => void;
    select: (n: Node) => void;
    canEdit: boolean;
};

function PersonPill({
    name,
}: {
    name: string;
}) {
    return (
        <span className="inline-flex max-w-[14rem] items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
            <span className="truncate">{name}</span>
        </span>
    );
}

function TeamPill({
    name,
}: {
    name: string;
}) {
    return (
        <span className="inline-flex max-w-[14rem] items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
            <span className="truncate">{name}</span>
        </span>
    );
}

function KrQuickEditor(
    {
        kr,
        canEdit,
        onSaved
    }: {
        kr: DbOkrKeyResult;
        canEdit: boolean;
        onSaved: () => Promise<void>;
    }
) {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);

    const [cur, setCur] = useState(typeof kr.current_value === "number" ? String(kr.current_value) : "");

    useEffect(() => {
        setCur(typeof kr.current_value === "number" ? String(kr.current_value) : "");
        setSaving(false);
    }, [kr.id, kr.updated_at]);

    if (!canEdit) {
        return (
            <div className="rounded-2xl bg-white/70 p-3 text-sm text-muted-foreground">
                Sem permissão para editar.
            </div>
        );
    }

    if (kr.kind !== "METRIC") {
        return (
            <div className="rounded-2xl bg-white/70 p-3 text-sm text-muted-foreground">
                Edite este KR nos detalhes do objetivo.
            </div>
        );
    }

    return (
        <div className="grid gap-2 rounded-2xl bg-white/70 p-3">
            <div className="grid gap-2 sm:grid-cols-3">
                <div className="sm:col-span-2">
                    <Label className="text-xs">Valor atual</Label>
                    <Input
                        className="mt-1 h-10 rounded-xl bg-white"
                        value={cur}
                        onChange={e => setCur(e.target.value)}
                        placeholder="Ex.: 42"
                        disabled={saving}
                    />
                </div>
                <div>
                    <Label className="text-xs">Unidade</Label>
                    <div className="mt-2 text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                        {kr.metric_unit ?? "—"}
                    </div>
                </div>
            </div>
            <div className="flex justify-end">
                <Button
                    className="h-10 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                    disabled={saving}
                    onClick={async () => {
                        setSaving(true);
                        try {
                            const parsed = cur.trim() ? Number(cur.replace(",", ".")) : null;
                            await updateKeyResult(kr.id, {
                                current_value: parsed,
                            });
                            toast({ title: "KR atualizado" });
                            await onSaved();
                        } catch (e) {
                            toast({
                                title: "Não foi possível salvar",
                                description: e instanceof Error ? e.message : "Erro inesperado.",
                                variant: "destructive",
                            });
                        } finally {
                            setSaving(false);
                        }
                    }}>
                    Salvar
                </Button>
            </div>
        </div>
    );
}

function Tree(
    {
        ctx,
        fundamentals,
        strategy,
        cycles,
        peopleById,
        departmentsById,
    }: {
        ctx: TreeCtx;
        fundamentals: DbCompanyFundamentals | null;
        strategy: DbStrategyObjective[];
        cycles: DbOkrCycle[];
        peopleById: Map<string, DbProfilePublic>;
        departmentsById: Map<string, DbDepartment>;
    }
) {
    const qc = useQueryClient();

    const cycleCode = (c: DbOkrCycle) => {
        const yy = String(c.year).slice(-2);
        if (c.type === "QUARTERLY")
            return `y${yy}Q${c.quarter ?? "?"}`;
        return `y${yy}`;
    };

    const objectiveCode = (c: DbOkrCycle, idx: number) => `${cycleCode(c)}O${idx + 1}`;

    const objectiveTeamName = (o: DbOkrObjective) => {
        if (o.department_id) return departmentsById.get(o.department_id)?.name ?? null;
        if (o.level === "COMPANY") return "Empresa";
        return null;
    };

    const objectiveOwnerName = (o: DbOkrObjective) => {
        return peopleById.get(o.owner_user_id)?.name ?? "Responsável";
    };

    const cycleGroups = useMemo(() => {
        const annual = cycles.filter(c => c.type === "ANNUAL").sort((a, b) => b.year - a.year);
        const quarterly = cycles.filter(c => c.type === "QUARTERLY").sort((a, b) => (b.year - a.year) || ((b.quarter ?? 0) - (a.quarter ?? 0)));

        return {
            annual,
            quarterly
        };
    }, [cycles]);

    const q = useQuery({
        queryKey: [
            "okr-map-objectives",
            ctx.cid,
            "expanded-cycles",
            Object.keys(ctx.expanded).filter(k => k.startsWith("c:") && ctx.expanded[k]).join(",")
        ],

        enabled: true,

        queryFn: async () => {
            const expandedCycleIds = Object.keys(ctx.expanded).filter(k => k.startsWith("c:") && ctx.expanded[k]).map(k => k.slice(2));
            const byCycle = new Map<string, DbOkrObjective[]>();

            await Promise.all(expandedCycleIds.map(async cycleId => {
                const objs = await listOkrObjectives(ctx.cid, cycleId);
                byCycle.set(cycleId, objs);
            }));

            return byCycle;
        },

        staleTime: 20_000
    });

    const objectivesByCycle = q.data ?? new Map<string, DbOkrObjective[]>();

    const qKrsByObjective = useQuery({
        queryKey: [
            "okr-map-krs",
            ctx.cid,
            "expanded-objectives",
            Object.keys(ctx.expanded).filter(k => k.startsWith("o:") && ctx.expanded[k]).join(",")
        ],
        enabled: true,
        queryFn: async () => {
            const expandedObjectiveIds = Object.keys(ctx.expanded)
                .filter(k => k.startsWith("o:") && ctx.expanded[k])
                .map(k => k.slice(2));

            const byObjective = new Map<string, DbOkrKeyResult[]>();

            await Promise.all(expandedObjectiveIds.map(async objectiveId => {
                const krs = await listKeyResults(objectiveId);
                byObjective.set(objectiveId, krs);
            }));

            return byObjective;
        },
        staleTime: 20_000
    });

    const krsByObjective = qKrsByObjective.data ?? new Map<string, DbOkrKeyResult[]>();

    const fundamentalsFields: Array<{
        field: keyof DbCompanyFundamentals;
        icon: React.ReactNode;
    }> = [{
        field: "purpose",
        icon: <Compass className="h-4 w-4" />
    }, {
        field: "vision",
        icon: <Eye className="h-4 w-4" />
    }, {
        field: "mission",
        icon: <Flag className="h-4 w-4" />
    }, {
        field: "values",
        icon: <Gem className="h-4 w-4" />
    }, {
        field: "culture",
        icon: <Sparkles className="h-4 w-4" />
    }];

    const fundamentalsPreview = (field: keyof DbCompanyFundamentals, raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) return "Sem conteúdo";

        if (field === "values" || field === "culture") {
            const items = parseDescribedItems(trimmed);
            if (!items.length) return "Sem itens";
            return `${items.length} itens`;
        }

        const flat = trimmed.replace(/\s+/g, " ");
        return flat.length > 72 ? flat.slice(0, 72) + "…" : flat;
    };

    const renderFundamentalsExpanded = (field: keyof DbCompanyFundamentals, raw: string) => {
        const trimmed = raw.trim();

        if (!trimmed) {
            return <div className="text-muted-foreground">Sem conteúdo.</div>;
        }

        if (field !== "values" && field !== "culture") {
            return <div className="whitespace-pre-line leading-relaxed">{trimmed}</div>;
        }

        const items = parseDescribedItems(trimmed);

        if (!items.length) {
            return <div className="text-muted-foreground">Sem itens.</div>;
        }

        return (
            <div className="grid gap-2 sm:grid-cols-2">
                {items.map((it, idx) => (
                    <div
                        key={idx}
                        className="rounded-2xl border border-[color:var(--map-fundamentals-border)] bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-sm font-semibold text-[color:var(--map-fundamentals-ink)]">
                                    {it.title?.trim() ? it.title.trim() : (field === "values" ? "Valor" : "Item")}
                                </div>
                                {it.description?.trim() ? (
                                    <div className="mt-1 text-xs leading-relaxed text-[color:var(--sinaxys-ink)]/80">
                                        {it.description.trim()}
                                    </div>
                                ) : null}
                            </div>
                            <div
                                className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-[color:var(--map-fundamentals-border)] bg-[color:var(--map-fundamentals-bg)] text-[color:var(--map-fundamentals-ink)]">
                                {field === "values" ? <Gem className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="grid gap-3">
            <Row
                depth={0}
                active={ctx.activeId === "fundamentals"}
                expanded={!!ctx.expanded["fundamentals"]}
                canExpand
                icon={<Compass className="h-4 w-4" />}
                title="Fundamentos"
                subtitle={"Propósito, visão, missão, valores e cultura"}
                onToggle={() => ctx.toggle("fundamentals")}
                onEdit={() => ctx.select({ kind: "fundamentals", id: "fundamentals" })}
                onClick={() => ctx.toggle("fundamentals")}
                toneKind="fundamentals" />
            {ctx.expanded["fundamentals"] ? (
                <div className="grid gap-2">
                    {fundamentalsFields.map(({ field, icon }) => {
                        const id = `fund:${field}` as const;
                        const open = !!ctx.expanded[id];
                        const raw = typeof (fundamentals as any)?.[field] === "string" ? String((fundamentals as any)[field]) : "";
                        const preview = fundamentalsPreview(field, raw);

                        return (
                            <div key={field} className="grid gap-2">
                                <Row
                                    depth={1}
                                    active={ctx.activeId === id}
                                    expanded={open}
                                    canExpand
                                    icon={icon}
                                    title={nodeTitle({ kind: "fundamental", id: id as any, field })}
                                    subtitle={preview}
                                    onToggle={() => ctx.toggle(id)}
                                    onEdit={() => ctx.select({ kind: "fundamental", id: id as any, field })}
                                    onClick={() => ctx.toggle(id)}
                                    toneKind="fundamental" />

                                {open ? (
                                    <div className="ml-6 rounded-2xl border border-[color:var(--map-fundamentals-border)] bg-[color:var(--map-fundamentals-bg)] p-4 text-sm text-[color:var(--sinaxys-ink)]">
                                        {renderFundamentalsExpanded(field, raw)}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            ) : null}

            <Row
                depth={0}
                active={ctx.activeId === "strategy"}
                expanded={!!ctx.expanded["strategy"]}
                canExpand
                icon={<Flag className="h-4 w-4" />}
                title="Objetivos de longo prazo"
                subtitle={"1–10 anos"}
                right={
                    <Badge className="rounded-full bg-[color:var(--map-strategy-bg)] text-[color:var(--map-strategy-ink)] ring-1 ring-[color:var(--map-strategy-border)] hover:bg-[color:var(--map-strategy-bg)]">
                        {strategy.length}
                    </Badge>
                }
                onToggle={() => ctx.toggle("strategy")}
                onEdit={() => ctx.select({ kind: "strategy", id: "strategy" })}
                onClick={() => ctx.toggle("strategy")}
                toneKind="strategy" />
            {ctx.expanded["strategy"] ? (
                <div className="grid gap-2">
                    {strategy.map(so => {
                        const id = `so:${so.id}` as const;
                        const open = !!ctx.expanded[id];
                        const desc = (so.description ?? "").trim();
                        const preview = desc ? (desc.length > 72 ? desc.slice(0, 72) + "…" : desc) : undefined;

                        return (
                            <div key={so.id} className="grid gap-2">
                                <Row
                                    depth={1}
                                    active={ctx.activeId === id}
                                    expanded={open}
                                    canExpand={!!desc}
                                    icon={<StrategyYearIcon so={so} />}
                                    title={so.title}
                                    subtitle={preview}
                                    onToggle={() => ctx.toggle(id)}
                                    onEdit={() =>
                                        ctx.select({
                                            kind: "strategyObjective",
                                            id: id as any,
                                            soId: so.id,
                                        })
                                    }
                                    onClick={() => (desc ? ctx.toggle(id) : ctx.select({ kind: "strategyObjective", id: id as any, soId: so.id }))}
                                    toneKind="strategyObjective" />

                                {open && desc ? (
                                    <div className="ml-6 rounded-2xl border border-[color:var(--map-strategy-border)] bg-[color:var(--map-strategy-bg)] p-4 text-sm text-[color:var(--sinaxys-ink)]">
                                        <div className="whitespace-pre-line leading-relaxed">{desc}</div>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}

                    {!strategy.length ? (
                        <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
                            Nenhum objetivo de longo prazo ainda. Crie um para orientar as decisões do ano.
                            <div className="mt-3">
                                <Button asChild variant="outline" className="h-10 rounded-xl bg-white">
                                    <Link to="/okr/mapa">Criar objetivo (use o botão no topo)</Link>
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : null}

            <Row
                depth={0}
                active={ctx.activeId === "cycles"}
                expanded={!!ctx.expanded["cycles"]}
                canExpand
                icon={<Layers className="h-4 w-4" />}
                title="OKRs (ciclos)"
                subtitle={"Ano e trimestre"}
                right={
                    <Badge className="rounded-full bg-[color:var(--map-cycles-bg)] text-[color:var(--map-cycles-ink)] ring-1 ring-[color:var(--map-cycles-border)] hover:bg-[color:var(--map-cycles-bg)]">
                        {cycles.length}
                    </Badge>
                }
                onToggle={() => ctx.toggle("cycles")}
                onEdit={() => ctx.select({ kind: "cycles", id: "cycles" })}
                onClick={() => ctx.toggle("cycles")}
                toneKind="cycles" />

            {ctx.expanded["cycles"] ? (
                <div className="grid gap-3">
                    <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Anual</div>
                        <div className="mt-2 grid gap-2">
                            {cycleGroups.annual.length ? (
                                cycleGroups.annual.map(c => {
                                    const open = !!ctx.expanded[`c:${c.id}`];
                                    const objs = objectivesByCycle.get(c.id) ?? [];

                                    return (
                                        <div key={c.id} className="grid gap-2">
                                            <Row
                                                depth={1}
                                                active={ctx.activeId === `c:${c.id}`}
                                                expanded={open}
                                                canExpand
                                                icon={<span className="text-[11px] font-bold tracking-tight">{cycleCode(c)}</span>}
                                                title={cycleLabel(c)}
                                                subtitle={c.status}
                                                onToggle={() => ctx.toggle(`c:${c.id}`)}
                                                onEdit={() => ctx.select({ kind: "cycle", id: `c:${c.id}` as any, cycleId: c.id })}
                                                onClick={() => ctx.toggle(`c:${c.id}`)}
                                                toneKind="cycle" />

                                            {open ? (
                                                <div className="grid gap-2 pl-3">
                                                    {objs.length ? (
                                                        objs.map((o, idx) => {
                                                            const openObjective = !!ctx.expanded[`o:${o.id}`];
                                                            const krs = krsByObjective.get(o.id) ?? [];

                                                            return (
                                                                <div key={o.id} className="grid gap-2">
                                                                    <Row
                                                                        depth={2}
                                                                        active={ctx.activeId === `o:${o.id}`}
                                                                        expanded={openObjective}
                                                                        canExpand
                                                                        icon={<span className="font-mono text-[10px] font-semibold tracking-tight">{objectiveCode(c, idx)}</span>}
                                                                        title={o.title}
                                                                        subtitle={
                                                                            <span className="inline-flex flex-wrap items-center gap-2">
                                                                                {objectiveTeamName(o) ? <TeamPill name={objectiveTeamName(o)!} /> : null}
                                                                                <PersonPill name={objectiveOwnerName(o)} />
                                                                                <Target className="h-3.5 w-3.5" />
                                                                                <span className="font-medium text-[color:var(--sinaxys-ink)]">{objectiveTypeLabel(o.level)}</span>
                                                                                <span>•</span>
                                                                                <span>{objectiveLevelLabel(o.level)}</span>
                                                                            </span>
                                                                        }
                                                                        onToggle={() => ctx.toggle(`o:${o.id}`)}
                                                                        onEdit={() => ctx.select({ kind: "objective", id: `o:${o.id}` as any, objectiveId: o.id })}
                                                                        onClick={() =>
                                                                            ctx.select({
                                                                                kind: "objective",
                                                                                id: `o:${o.id}`,
                                                                                objectiveId: o.id,
                                                                            })
                                                                        }
                                                                        toneKind="objective"
                                                                    />

                                                                    {openObjective ? (
                                                                        <div className="rounded-2xl border border-[color:var(--map-objectives-border)] bg-[color:var(--map-objectives-bg)]/30 p-3">
                                                                            <div className="grid gap-2">
                                                                                {qKrsByObjective.isLoading ? (
                                                                                    <div className="rounded-2xl bg-white/70 p-3 text-sm text-muted-foreground">
                                                                                        Carregando resultados-chave…
                                                                                    </div>
                                                                                ) : krs.length ? (
                                                                                    krs.map(kr => {
                                                                                        const pct = krProgressPct(kr);
                                                                                        const kindLabel = kr.kind === "DELIVERABLE" ? "Entregável" : "Métrico";
                                                                                        const pctLabel = typeof pct === "number" ? `${pct}%` : "—";
                                                                                        const teamName = objectiveTeamName(o);
                                                                                        const ownerName = (kr.owner_user_id ? peopleById.get(kr.owner_user_id)?.name : null) ?? objectiveOwnerName(o);
                                                                                        const openKr = !!ctx.expanded[`kr:${kr.id}`];

                                                                                        return (
                                                                                            <div key={kr.id} className="grid gap-2">
                                                                                                <Row
                                                                                                    depth={3}
                                                                                                    active={false}
                                                                                                    expanded={false}
                                                                                                    canExpand={false}
                                                                                                    icon={<span className="font-mono text-[10px] font-semibold">KR</span>}
                                                                                                    title={kr.title}
                                                                                                    subtitle={
                                                                                                        <span className="inline-flex flex-wrap items-center gap-2">
                                                                                                            {teamName ? <TeamPill name={teamName} /> : null}
                                                                                                            <PersonPill name={ownerName} />
                                                                                                            <span>{kindLabel}</span>
                                                                                                            <span>•</span>
                                                                                                            <span>{pctLabel}</span>
                                                                                                        </span>
                                                                                                    }
                                                                                                    onClick={() => ctx.toggle(`kr:${kr.id}`)}
                                                                                                    toneKind="kr"
                                                                                                />

                                                                                                {kr.kind === "METRIC" && typeof pct === "number" ? (
                                                                                                    <div className="pl-3">
                                                                                                        <Progress
                                                                                                            value={pct}
                                                                                                            className="h-2 rounded-full bg-white/60"
                                                                                                        />
                                                                                                    </div>
                                                                                                ) : null}

                                                                                                {openKr ? (
                                                                                                    <div className="pl-3">
                                                                                                        <KrQuickEditor
                                                                                                            kr={kr}
                                                                                                            canEdit={ctx.canEdit}
                                                                                                            onSaved={async () => {
                                                                                                                await qc.invalidateQueries({ queryKey: ["okr-map-krs", ctx.cid] });
                                                                                                                await qc.invalidateQueries({ queryKey: ["okr-krs", o.id] });
                                                                                                            }}
                                                                                                        />
                                                                                                    </div>
                                                                                                ) : null}
                                                                                            </div>
                                                                                        );
                                                                                    })
                                                                                ) : (
                                                                                    <div className="rounded-2xl bg-white/70 p-3 text-sm text-muted-foreground">
                                                                                        Sem resultados-chave.
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-3 text-sm text-muted-foreground">Sem objetivos ainda.</div>
                                                    )}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-3 text-sm text-muted-foreground">
                                    Nenhum ciclo anual cadastrado.
                                    <div className="mt-3">
                                        <Button asChild variant="outline" className="h-10 rounded-xl bg-white">
                                            <Link to="/okr/ciclos">Criar ciclo anual</Link>
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trimestral</div>
                        <div className="mt-2 grid gap-2">
                            {cycleGroups.quarterly.length ? (
                                cycleGroups.quarterly.slice(0, 8).map(c => {
                                    const open = !!ctx.expanded[`c:${c.id}`];
                                    const objs = objectivesByCycle.get(c.id) ?? [];

                                    return (
                                        <div key={c.id} className="grid gap-2">
                                            <Row
                                                depth={1}
                                                active={ctx.activeId === `c:${c.id}`}
                                                expanded={open}
                                                canExpand
                                                icon={<span className="text-[11px] font-bold tracking-tight">{cycleCode(c)}</span>}
                                                title={cycleLabel(c)}
                                                subtitle={c.status}
                                                onToggle={() => ctx.toggle(`c:${c.id}`)}
                                                onEdit={() => ctx.select({ kind: "cycle", id: `c:${c.id}` as any, cycleId: c.id })}
                                                onClick={() => ctx.toggle(`c:${c.id}`)}
                                                toneKind="cycle" />

                                            {open ? (
                                                <div className="grid gap-2 pl-3">
                                                    {objs.length ? (
                                                        objs.map((o, idx) => {
                                                            const openObjective = !!ctx.expanded[`o:${o.id}`];
                                                            const krs = krsByObjective.get(o.id) ?? [];

                                                            return (
                                                                <div key={o.id} className="grid gap-2">
                                                                    <Row
                                                                        depth={2}
                                                                        active={ctx.activeId === `o:${o.id}`}
                                                                        expanded={openObjective}
                                                                        canExpand
                                                                        icon={<span className="font-mono text-[10px] font-semibold tracking-tight">{objectiveCode(c, idx)}</span>}
                                                                        title={o.title}
                                                                        subtitle={
                                                                            <span className="inline-flex flex-wrap items-center gap-2">
                                                                                {objectiveTeamName(o) ? <TeamPill name={objectiveTeamName(o)!} /> : null}
                                                                                <PersonPill name={objectiveOwnerName(o)} />
                                                                                <CircleDot className="h-3.5 w-3.5" />
                                                                                <span className="font-medium text-[color:var(--sinaxys-ink)]">{objectiveTypeLabel(o.level)}</span>
                                                                                <span>•</span>
                                                                                <span>{objectiveLevelLabel(o.level)}</span>
                                                                            </span>
                                                                        }
                                                                        onToggle={() => ctx.toggle(`o:${o.id}`)}
                                                                        onEdit={() => ctx.select({ kind: "objective", id: `o:${o.id}` as any, objectiveId: o.id })}
                                                                        onClick={() =>
                                                                            ctx.select({
                                                                                kind: "objective",
                                                                                id: `o:${o.id}`,
                                                                                objectiveId: o.id,
                                                                            })
                                                                        }
                                                                        toneKind="objective"
                                                                    />

                                                                    {openObjective ? (
                                                                        <div className="rounded-2xl border border-[color:var(--map-objectives-border)] bg-[color:var(--map-objectives-bg)]/30 p-3">
                                                                            <div className="grid gap-2">
                                                                                {qKrsByObjective.isLoading ? (
                                                                                    <div className="rounded-2xl bg-white/70 p-3 text-sm text-muted-foreground">
                                                                                        Carregando resultados-chave…
                                                                                    </div>
                                                                                ) : krs.length ? (
                                                                                    krs.map(kr => {
                                                                                        const pct = krProgressPct(kr);
                                                                                        const kindLabel = kr.kind === "DELIVERABLE" ? "Entregável" : "Métrico";
                                                                                        const pctLabel = typeof pct === "number" ? `${pct}%` : "—";
                                                                                        const teamName = objectiveTeamName(o);
                                                                                        const ownerName = (kr.owner_user_id ? peopleById.get(kr.owner_user_id)?.name : null) ?? objectiveOwnerName(o);
                                                                                        const openKr = !!ctx.expanded[`kr:${kr.id}`];

                                                                                        return (
                                                                                            <div key={kr.id} className="grid gap-2">
                                                                                                <Row
                                                                                                    depth={3}
                                                                                                    active={false}
                                                                                                    expanded={false}
                                                                                                    canExpand={false}
                                                                                                    icon={<span className="font-mono text-[10px] font-semibold">KR</span>}
                                                                                                    title={kr.title}
                                                                                                    subtitle={
                                                                                                        <span className="inline-flex flex-wrap items-center gap-2">
                                                                                                            {teamName ? <TeamPill name={teamName} /> : null}
                                                                                                            <PersonPill name={ownerName} />
                                                                                                            <span>{kindLabel}</span>
                                                                                                            <span>•</span>
                                                                                                            <span>{pctLabel}</span>
                                                                                                        </span>
                                                                                                    }
                                                                                                    onClick={() => ctx.toggle(`kr:${kr.id}`)}
                                                                                                    toneKind="kr"
                                                                                                />

                                                                                                {kr.kind === "METRIC" && typeof pct === "number" ? (
                                                                                                    <div className="pl-3">
                                                                                                        <Progress
                                                                                                            value={pct}
                                                                                                            className="h-2 rounded-full bg-white/60"
                                                                                                        />
                                                                                                    </div>
                                                                                                ) : null}

                                                                                                {openKr ? (
                                                                                                    <div className="pl-3">
                                                                                                        <KrQuickEditor
                                                                                                            kr={kr}
                                                                                                            canEdit={ctx.canEdit}
                                                                                                            onSaved={async () => {
                                                                                                                await qc.invalidateQueries({ queryKey: ["okr-map-krs", ctx.cid] });
                                                                                                                await qc.invalidateQueries({ queryKey: ["okr-krs", o.id] });
                                                                                                            }}
                                                                                                        />
                                                                                                    </div>
                                                                                                ) : null}
                                                                                            </div>
                                                                                        );
                                                                                    })
                                                                                ) : (
                                                                                    <div className="rounded-2xl bg-white/70 p-3 text-sm text-muted-foreground">
                                                                                        Sem resultados-chave.
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-3 text-sm text-muted-foreground">Sem objetivos ainda.</div>
                                                    )}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-3 text-sm text-muted-foreground">
                                    Nenhum ciclo trimestral cadastrado.
                                    <div className="mt-3">
                                        <Button asChild variant="outline" className="h-10 rounded-xl bg-white">
                                            <Link to="/okr/ciclos">Criar ciclo trimestral</Link>
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {cycleGroups.quarterly.length > 8 ? (
                                <div className="text-xs text-muted-foreground">Mostrando os 8 ciclos trimestrais mais recentes.</div>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

// REMOVIDO: ListView (lista) — o Mapa agora é apenas a árvore interativa.

// (bloco antigo de lista removido)

function FundamentalEditor(
    {
        cid,
        canEdit,
        field,
        fundamentals,
        onSaved
    }: {
        cid: string;
        canEdit: boolean;
        field: keyof DbCompanyFundamentals;
        fundamentals: DbCompanyFundamentals | null;
        onSaved: () => Promise<void>;
    }
) {
    const {
        toast
    } = useToast();

    const [items, setItems] = useState<string[]>([]);
    const [draft, setDraft] = useState("");
    const [saving, setSaving] = useState(false);
    const describedFields = field === "values" || field === "culture";
    const [described, setDescribed] = useState<DescribedItem[]>([]);
    const [text, setText] = useState("");

    useEffect(() => {
        const raw = String((fundamentals as any)?.[field] ?? "");
        setItems(raw.split("\n").map(s => s.trim()).filter(Boolean));
        setDescribed(parseDescribedItems(raw));
        setText(raw);
        setDraft("");
        setSaving(false);
    }, [field, fundamentals?.updated_at]);

    const label = nodeTitle({
        kind: "fundamental",
        id: `fund:${field}` as any,
        field
    });

    return (
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{label}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                        {describedFields ? "Cadastre itens com nome + descritivo." : "Use um texto claro (pode ter parágrafos)."}
                    </div>
                </div>
                <div
                    className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                    <Route className="h-5 w-5" />
                </div>
            </div>
            <Separator className="my-4" />
            {describedFields ? (<DescribedItemsEditor
                label={label}
                hint={field === "values" ? "Valores com nome + descritivo." : "Cultura com nome + descritivo."}
                items={described}
                onChange={setDescribed}
                canEdit={canEdit}
                saving={saving}
                addLabel={field === "values" ? "Adicionar valor" : "Adicionar item"} />) : (<div className="grid gap-3">
                <Label className="text-sm">Texto</Label>
                <Textarea
                    className="min-h-[180px] rounded-2xl"
                    value={text}
                    disabled={!canEdit || saving}
                    onChange={e => setText(e.target.value)}
                    placeholder={`Escreva ${label.toLowerCase()}…`} />
            </div>)}
            <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" className="h-10 rounded-xl bg-white">
                    <Link to="/okr/fundamentos">Editar tudo</Link>
                </Button>
                {canEdit ? (<Button
                    className="h-10 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                    disabled={saving}
                    onClick={async () => {
                        setSaving(true);

                        try {
                            const patch: Partial<DbCompanyFundamentals> = describedFields ? ({
                                [field]: serializeDescribedItems(described) || null
                            } as any) : ({
                                [field]: text.trim() || null
                            } as any);

                            await upsertCompanyFundamentals(cid, patch);
                            await onSaved();
                        } catch (e) {
                            toast({
                                title: "Não foi possível salvar",
                                description: e instanceof Error ? e.message : "Erro inesperado.",
                                variant: "destructive"
                            });
                        } finally {
                            setSaving(false);
                        }
                    }}>
                    <Save className="mr-2 h-4 w-4" />Salvar
                              </Button>) : null}
            </div>
        </Card>
    );
}

function StrategyObjectiveInlineCard(
    {
        so,
        people,
        canEdit,
        open,
        onToggle,
        onSaved
    }: {
        so: DbStrategyObjective;
        people: DbProfilePublic[];
        canEdit: boolean;
        open: boolean;
        onToggle: () => void;
        onSaved: () => Promise<void>;
    }
) {
    const {
        toast
    } = useToast();

    const peopleById = useMemo(() => new Map(people.map(p => [p.id, p] as const)), [people]);
    const owner = so.owner_user_id ? peopleById.get(so.owner_user_id) ?? null : null;
    const [title, setTitle] = useState(so.title);
    const [description, setDescription] = useState(so.description ?? "");
    const [ownerId, setOwnerId] = useState<string | null>(so.owner_user_id ?? null);
    const [targetYear, setTargetYear] = useState<string>(so.target_year ? String(so.target_year) : "");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setTitle(so.title);
        setDescription(so.description ?? "");
        setOwnerId(so.owner_user_id ?? null);
        setTargetYear(so.target_year ? String(so.target_year) : "");
        setSaving(false);
    }, [so.id, so.updated_at]);

    const peopleOptions = useMemo(
        () => people.filter(p => p.active).sort((a, b) => a.name.localeCompare(b.name)),
        [people]
    );

    return (
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white">
            <button
                type="button"
                onClick={onToggle}
                className={cn(
                    "flex w-full items-start justify-between gap-4 rounded-3xl px-5 py-4 text-left transition",
                    open ? "bg-[color:var(--sinaxys-tint)]/30" : "hover:bg-[color:var(--sinaxys-tint)]/20"
                )}>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <div
                            className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{so.title}</div>
                        <Badge
                            className="rounded-full bg-white text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)] hover:bg-white">
                            {so.target_year ?? yearForStrategyObjective(so)}
                        </Badge>
                    </div>
                    {so.description?.trim() ? (<div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{so.description.trim()}</div>) : (<div className="mt-1 text-xs text-muted-foreground">Sem descrição.</div>)}
                </div>
                <div className="flex items-center gap-2">
                    {owner ? (<div
                        className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[color:var(--sinaxys-border)] bg-white">
                        {owner.avatar_url ? (<img
                            src={owner.avatar_url}
                            alt={owner.name}
                            className="h-full w-full object-cover" />) : (<span className="text-xs font-bold text-[color:var(--sinaxys-ink)]">{initials(owner.name)}</span>)}
                    </div>) : (<div
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[color:var(--sinaxys-border)] bg-white text-[color:var(--sinaxys-primary)]"
                        title="Responsável: toda a empresa">
                        <Building2 className="h-4 w-4" />
                    </div>)}
                    <div
                        className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-muted-foreground ring-1 ring-[color:var(--sinaxys-border)]">
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                </div>
            </button>
            {open ? (<div className="border-t border-[color:var(--sinaxys-border)] px-5 py-5">
                <div className="grid gap-3">
                    <div className="grid gap-2">
                        <Label>Título</Label>
                        <Input
                            className="h-11 rounded-2xl"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            disabled={!canEdit || saving} />
                    </div>

                    <div className="grid gap-2">
                        <Label>Para quando (ano)</Label>
                        <Input
                            type="number"
                            inputMode="numeric"
                            className="h-11 rounded-2xl"
                            value={targetYear}
                            onChange={e => setTargetYear(e.target.value)}
                            disabled={!canEdit || saving}
                            placeholder={String(yearForStrategyObjective(so))}
                        />
                        <div className="text-[11px] text-muted-foreground">Use um ano (ex.: 2028). Se vazio, usamos o horizonte como referência.</div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Responsável</Label>
                        <Select
                            value={ownerId ?? "__company__"}
                            onValueChange={v => setOwnerId(v === "__company__" ? null : v)}
                            disabled={!canEdit || saving}>
                            <SelectTrigger className="h-11 rounded-2xl bg-white">
                                <SelectValue placeholder="Selecione…" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                                <SelectItem value="__company__">Toda a empresa</SelectItem>
                                {peopleOptions.map(p => (<SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                </SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Descrição</Label>
                        <Textarea
                            className="min-h-[120px] rounded-2xl"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            disabled={!canEdit || saving}
                            placeholder="Contexto, hipóteses, como saberemos que vencemos, etc." />
                    </div>
                    {canEdit ? (<div className="flex justify-end">
                        <Button
                            className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                            disabled={saving || title.trim().length < 6}
                            onClick={async () => {
                                setSaving(true);

                                try {
                                    const nYear = targetYear.trim() ? Number(targetYear.trim()) : null;

                                    await updateStrategyObjective(so.id, {
                                        title,
                                        target_year: Number.isFinite(nYear as any) ? (nYear as any) : null,
                                        description: description.trim() || null,
                                        owner_user_id: ownerId
                                    });

                                    toast({
                                        title: "Objetivo atualizado"
                                    });

                                    await onSaved();
                                } catch (e) {
                                    toast({
                                        title: "Não foi possível salvar",
                                        description: e instanceof Error ? e.message : "Erro inesperado.",
                                        variant: "destructive"
                                    });
                                } finally {
                                    setSaving(false);
                                }
                            }}>
                            <Save className="mr-2 h-4 w-4" />Salvar
                                            </Button>
                    </div>) : null}
                </div>

                {/* Removido: KRs de objetivos de longo prazo */}
            </div>) : null}
        </Card>
    );
}

function StrategyPicker(
    {
        cid,
        canEdit,
        strategy,
        onSaved,
        people
    }: {
        cid: string;
        canEdit: boolean;
        strategy: DbStrategyObjective[];
        onSaved: () => Promise<void>;
        people: DbProfilePublic[];
    }
) {
    const {
        user
    } = useAuth();

    const {
        toast
    } = useToast();

    const [openSoId, setOpenSoId] = useState<string | null>(null);

    useEffect(() => {
        if (openSoId && !strategy.some(s => s.id === openSoId))
            setOpenSoId(null);
    }, [strategy, openSoId]);

    const [createOpen, setCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newYears, setNewYears] = useState<DbStrategyObjective["horizon_years"]>(3);
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newOwner, setNewOwner] = useState<string | null>(null);
    const [newTargetYear, setNewTargetYear] = useState<string>("");
    const [newTargetTouched, setNewTargetTouched] = useState(false);

    useEffect(() => {
        if (!createOpen)
            return;

        setCreating(false);
        setNewYears(3);
        setNewTitle("");
        setNewDesc("");
        setNewOwner(null);
        setNewTargetYear(String(new Date().getFullYear() + 3));
        setNewTargetTouched(false);
    }, [createOpen]);

    useEffect(() => {
        if (!createOpen) return;
        if (newTargetTouched) return;
        setNewTargetYear(String(new Date().getFullYear() + Number(newYears)));
    }, [createOpen, newYears, newTargetTouched]);

    const canCreate = canEdit && !!user;

    const peopleOptions = useMemo(
        () => people.filter(p => p.active).sort((a, b) => a.name.localeCompare(b.name)),
        [people]
    );

    const ordered = useMemo(() => strategy.slice().sort(
        (a, b) => (a.horizon_years - b.horizon_years) || (a.order_index - b.order_index) || a.title.localeCompare(b.title)
    ), [strategy]);

    return (
        <>
            <div className="grid gap-4">
                <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Objetivos de longo prazo</div>
                            <div className="mt-1 text-sm text-muted-foreground">Veja todos juntos. Clique em um objetivo para editar.
                                              </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {canCreate ? (<Button
                                type="button"
                                className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                                onClick={() => setCreateOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />Novo objetivo
                                                </Button>) : null}
                        </div>
                    </div>
                </Card>
                {ordered.length ? (<div className="grid gap-3">
                    {ordered.map(so => (<StrategyObjectiveInlineCard
                        key={so.id}
                        so={so}
                        people={people}
                        canEdit={canEdit}
                        open={openSoId === so.id}
                        onToggle={() => setOpenSoId(prev => (prev === so.id ? null : so.id))}
                        onSaved={async () => {
                            await onSaved();
                        }} />))}
                </div>) : (<Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
                    <div className="text-sm text-muted-foreground">Nenhum objetivo de longo prazo ainda.</div>
                    {canCreate ? (<div className="mt-3">
                        <Button
                            type="button"
                            className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                            onClick={() => setCreateOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />Criar primeiro objetivo
                                            </Button>
                    </div>) : null}
                </Card>)}
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent
                    className="max-h-[88vh] max-w-[92vw] overflow-hidden rounded-3xl sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Novo objetivo de longo prazo</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label>Horizonte</Label>
                                <Select
                                    value={String(newYears)}
                                    onValueChange={v => setNewYears(Number(v) as any)}>
                                    <SelectTrigger className="h-11 rounded-2xl bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl">
                                        <SelectItem value="1">1 ano</SelectItem>
                                        <SelectItem value="3">3 anos</SelectItem>
                                        <SelectItem value="5">5 anos</SelectItem>
                                        <SelectItem value="10">10 anos</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label>Para quando (ano)</Label>
                                <Input
                                    type="number"
                                    inputMode="numeric"
                                    className="h-11 rounded-2xl"
                                    value={newTargetYear}
                                    onChange={e => {
                                        setNewTargetYear(e.target.value);
                                        setNewTargetTouched(true);
                                    }}
                                    placeholder={String(new Date().getFullYear() + Number(newYears))}
                                    disabled={creating}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Título</Label>
                            <Input
                                className="h-11 rounded-2xl"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                placeholder="Ex.: Ser a referência em experiência do paciente no Brasil"
                                disabled={creating} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Responsável</Label>
                            <Select
                                value={newOwner ?? "__company__"}
                                onValueChange={v => setNewOwner(v === "__company__" ? null : v)}
                                disabled={creating}>
                                <SelectTrigger className="h-11 rounded-2xl bg-white">
                                    <SelectValue placeholder="Selecione…" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                    <SelectItem value="__company__">Toda a empresa</SelectItem>
                                    {peopleOptions.map(p => (<SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                    </SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Descrição (opcional)</Label>
                            <Textarea
                                className="min-h-[110px] rounded-2xl"
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
                                placeholder="Contexto, hipóteses, como saberemos que vencemos, etc."
                                disabled={creating} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                className="h-11 rounded-2xl bg-white"
                                onClick={() => setCreateOpen(false)}
                                disabled={creating}>Cancelar
                                              </Button>
                            <Button
                                className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                                disabled={creating || !canCreate || newTitle.trim().length < 6}
                                onClick={async () => {
                                    if (!user)
                                        return;

                                    setCreating(true);

                                    try {
                                        const nYear = newTargetYear.trim() ? Number(newTargetYear.trim()) : null;

                                        const created = await createStrategyObjective({
                                            company_id: cid,
                                            horizon_years: newYears,
                                            target_year: Number.isFinite(nYear as any) ? (nYear as any) : null,
                                            title: newTitle,
                                            description: newDesc.trim() || null,
                                            created_by_user_id: user.id,
                                            owner_user_id: newOwner
                                        });

                                        toast({
                                            title: "Objetivo criado"
                                        });

                                        await onSaved();
                                        setOpenSoId(created.id);
                                        setCreateOpen(false);
                                    } catch (e) {
                                        console.error("[okr] create strategy objective failed", e);

                                        toast({
                                            title: "Não foi possível criar",
                                            description: getErrorMessage(e),
                                            variant: "destructive"
                                        });
                                    } finally {
                                        setCreating(false);
                                    }
                                }}>
                                <Save className="mr-2 h-4 w-4" />Criar
                                              </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

function CyclesPicker(
    {
        cid,
        cycles,
        onPickObjective
    }: {
        cid: string;
        cycles: DbOkrCycle[];
        onPickObjective: (id: string) => void;
    }
) {
    const cycleOptions = useMemo(() => {
        const quarterly = cycles.filter(c => c.type === "QUARTERLY").sort((a, b) => (b.year - a.year) || ((b.quarter ?? 0) - (a.quarter ?? 0)));
        const annual = cycles.filter(c => c.type === "ANNUAL").sort((a, b) => b.year - a.year);
        return [...quarterly, ...annual];
    }, [cycles]);

    const [cycleId, setCycleId] = useState<string>(cycleOptions[0]?.id ?? "");

    useEffect(() => {
        setCycleId(
            prev => (cycleOptions.some(c => c.id === prev) ? prev : cycleOptions[0]?.id ?? "")
        );
    }, [cycleOptions]);

    const selected = cycleOptions.find(c => c.id === cycleId) ?? null;

    const qObjectives = useQuery({
        queryKey: ["okr-map-cycle-objectives", cid, cycleId],
        enabled: !!cycleId,
        queryFn: () => listOkrObjectives(cid, cycleId),
        staleTime: 20_000
    });

    return (
        <div className="grid gap-4">
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Ciclos</div>
                        <div className="mt-1 text-sm text-muted-foreground">Selecione um ciclo e clique em um objetivo para abrir detalhes.</div>
                    </div>
                    <div
                        className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                        <Layers className="h-5 w-5" />
                    </div>
                </div>
                <Separator className="my-4" />
                {cycleOptions.length ? (<div className="grid gap-2">
                    <Label>Ciclo</Label>
                    <Select value={cycleId} onValueChange={setCycleId}>
                        <SelectTrigger className="h-11 rounded-2xl bg-white">
                            <SelectValue placeholder="Selecione…" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                            {cycleOptions.map(c => (<SelectItem key={c.id} value={c.id}>
                                {cycleLabel(c)}
                            </SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>) : (<div
                    className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Nenhum ciclo ainda.</div>)}
                {selected ? (<div className="mt-3 text-xs text-muted-foreground">
                    {selected.type === "QUARTERLY" ? "Trimestral" : "Anual"}• {selected.status}
                </div>) : null}
            </Card>
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Objetivos do ciclo</div>
                <div className="mt-1 text-sm text-muted-foreground">Selecione para editar e vincular.</div>
                <Separator className="my-4" />
                {qObjectives.isLoading ? (<div
                    className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Carregando objetivos…</div>) : (qObjectives.data ?? []).length ? (<div className="grid gap-2">
                    {(qObjectives.data ?? []).map(o => (<button
                        key={o.id}
                        type="button"
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] px-4 py-3 text-left hover:bg-[color:var(--sinaxys-tint)]/35"
                        onClick={() => onPickObjective(o.id)}>
                        <div className="min-w-0">
                            <div
                                className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{o.title}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{objectiveTypeLabel(o.level)}• {objectiveLevelLabel(o.level)}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>))}
                </div>) : (<div
                    className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Sem objetivos nesse ciclo.</div>)}
                <div className="mt-4">
                    <Button asChild variant="outline" className="h-11 rounded-2xl bg-white">
                        <Link to="/okr/ciclos">Gerenciar ciclos</Link>
                    </Button>
                </div>
            </Card>
        </div>
    );
}

function OkrMapTreeCanvas(
    {
        cid,
        fundamentals,
        strategy,
        cycles,
        activeId,
        onPick,
        canEdit,
        peopleById,
        departmentsById,
    }: {
        cid: string;
        fundamentals: DbCompanyFundamentals | null;
        strategy: DbStrategyObjective[];
        cycles: DbOkrCycle[];
        activeId: string;
        onPick: (n: Node) => void;
        objectiveById: Map<string, DbOkrObjective>;
        peopleById: Map<string, DbProfilePublic>;
        departmentsById: Map<string, DbDepartment>;
        canEdit?: boolean;
    }
) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({
        fundamentals: true,
        strategy: true,
        cycles: true
    });

    const toggle = (id: string) => setExpanded(p => ({
        ...p,
        [id]: !p[id]
    }));

    const ctx: TreeCtx = {
        cid,
        activeId,
        expanded,
        toggle,
        select: onPick,
        canEdit: !!canEdit
    };

    return (
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Mapa</div>
                    <div className="mt-1 text-sm text-muted-foreground">Expanda para navegar. Clique para abrir detalhes.</div>
                </div>
                <div
                    className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                    <Network className="h-5 w-5" />
                </div>
            </div>
            <Separator className="my-4" />
            <div className="max-h-[70vh] overflow-auto pr-2">
                <Tree
                    ctx={ctx}
                    fundamentals={fundamentals}
                    strategy={strategy}
                    cycles={cycles}
                    peopleById={peopleById}
                    departmentsById={departmentsById}
                />
            </div>
        </Card>
    );
}

export function OkrMapExplorer(
    {
        companyId
    }: {
        companyId: string;
    }
) {
    const {
        user
    } = useAuth();

    const {
        toast
    } = useToast();

    const qc = useQueryClient();
    const canEdit = user?.role === "ADMIN" || user?.role === "HEAD" || user?.role === "MASTERADMIN";

    const qFundamentals = useQuery({
        queryKey: ["okr-fundamentals", companyId],
        queryFn: () => getCompanyFundamentals(companyId)
    });

    const qStrategy = useQuery({
        queryKey: ["okr-strategy", companyId],
        queryFn: () => listStrategyObjectives(companyId)
    });

    const qCycles = useQuery({
        queryKey: ["okr-cycles", companyId],
        queryFn: () => listOkrCycles(companyId)
    });

    const qPeople = useQuery({
        queryKey: ["profile_public", companyId],
        queryFn: () => listPublicProfilesByCompany(companyId),
        staleTime: 60_000
    });

    const qDepartments = useQuery({
        queryKey: ["departments", companyId],
        queryFn: () => listDepartments(companyId),
        staleTime: 60_000
    });

    const fundamentals = qFundamentals.data ?? null;
    const strategy = qStrategy.data ?? [];
    const cycles = qCycles.data ?? [];

    const peopleById = useMemo(() => {
        const m = new Map<string, DbProfilePublic>();

        for (const p of qPeople.data ?? [])
            m.set(p.id, p);

        return m;
    }, [qPeople.data]);

    const departmentsById = useMemo(() => {
        const m = new Map<string, DbDepartment>();
        for (const d of qDepartments.data ?? [])
            m.set(d.id, d);
        return m;
    }, [qDepartments.data]);

    const [selected, setSelected] = useState<Node>({
        kind: "fundamentals",
        id: "fundamentals"
    });

    const objectiveById = useMemo(() => new Map<string, DbOkrObjective>(), []);

    const cycleById = useMemo(() => {
        const m = new Map<string, DbOkrCycle>();

        for (const c of cycles)
            m.set(c.id, c);

        return m;
    }, [cycles]);

    const isMobile = typeof window !== "undefined" ? window.matchMedia("(max-width: 1024px)").matches : false;
    const [sheetOpen, setSheetOpen] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const pick = (n: Node) => {
        setSelected(n);

        if (isMobile) {
            setSheetOpen(true);
        } else {
            setDialogOpen(true);
        }
    };

    const onInvalidate = async () => {
        await Promise.all([qc.invalidateQueries({
            queryKey: ["okr-fundamentals", companyId]
        }), qc.invalidateQueries({
            queryKey: ["okr-strategy", companyId]
        }), qc.invalidateQueries({
            queryKey: ["okr-cycles", companyId]
        })]);
    };

    return (
        <>
            <OkrMapTreeCanvas
                cid={companyId}
                fundamentals={fundamentals}
                strategy={strategy}
                cycles={cycles}
                activeId={selected.id}
                onPick={n => pick(n)}
                objectiveById={objectiveById}
                peopleById={peopleById}
                departmentsById={departmentsById}
                canEdit={canEdit} />
            {}
            <div className="hidden lg:block">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent
                        className="max-h-[88vh] max-w-[92vw] overflow-hidden rounded-3xl p-0 sm:max-w-2xl">
                        <DialogHeader className="border-b border-[color:var(--sinaxys-border)] p-5">
                            <DialogTitle className="text-[color:var(--sinaxys-ink)]">Detalhes</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="h-[calc(88vh-76px)] p-5">
                            <DetailsBody
                                node={selected}
                                cid={companyId}
                                canEdit={!!canEdit}
                                fundamentals={fundamentals}
                                strategy={strategy}
                                cycles={cycles}
                                objectiveById={objectiveById}
                                cycleById={cycleById}
                                onInvalidate={onInvalidate}
                                onSelect={pick}
                                people={qPeople.data ?? []} />
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            </div>
            {}
            <div className="lg:hidden">
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                    <SheetContent side="bottom" className="h-[88vh] w-full rounded-t-3xl p-0">
                        <SheetHeader className="border-b border-[color:var(--sinaxys-border)] p-5">
                            <SheetTitle className="text-[color:var(--sinaxys-ink)]">Detalhes</SheetTitle>
                        </SheetHeader>
                        <ScrollArea className="h-[calc(88vh-76px)] p-5">
                            <DetailsBody
                                node={selected}
                                cid={companyId}
                                canEdit={!!canEdit}
                                fundamentals={fundamentals}
                                strategy={strategy}
                                cycles={cycles}
                                objectiveById={objectiveById}
                                cycleById={cycleById}
                                onInvalidate={onInvalidate}
                                onSelect={pick}
                                people={qPeople.data ?? []} />
                        </ScrollArea>
                    </SheetContent>
                </Sheet>
                <div
                    className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-5 text-sm text-muted-foreground">
                    <div className="font-semibold text-[color:var(--sinaxys-ink)]">Dica</div>
                    <div className="mt-1">Toque em um item para abrir os detalhes (e editar quando disponível).</div>
                </div>
            </div>
        </>
    );
}