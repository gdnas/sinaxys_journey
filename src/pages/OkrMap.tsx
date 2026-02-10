import { useMemo, useState } from "react";
import { ArrowRight, MapPinned, Plus, Route } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import {
  createStrategyObjective,
  getCompanyFundamentals,
  listOkrCycles,
  listOkrObjectives,
  listStrategyObjectives,
} from "@/lib/okrDb";
import { OkrPageHeader } from "@/components/OkrPageHeader";

function MiniCard({ title, text }: { title: string; text?: string | null }) {
  const t = text?.trim();
  return (
    <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-2 text-sm font-semibold leading-snug text-[color:var(--sinaxys-ink)]">{t || "—"}</div>
    </div>
  );
}

export default function OkrMap() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useCompany();

  if (!user) return null;

  const cid = companyId ?? "";
  const hasCompany = !!companyId;

  const canEdit = user.role === "ADMIN" || user.role === "HEAD" || user.role === "MASTERADMIN";

  const { data: fundamentals } = useQuery({
    queryKey: ["okr-fundamentals", cid],
    enabled: hasCompany,
    queryFn: () => getCompanyFundamentals(cid),
  });

  const { data: strategy = [] } = useQuery({
    queryKey: ["okr-strategy", cid],
    enabled: hasCompany,
    queryFn: () => listStrategyObjectives(cid),
  });

  const { data: cycles = [] } = useQuery({
    queryKey: ["okr-cycles", cid],
    enabled: hasCompany,
    queryFn: () => listOkrCycles(cid),
  });

  const activeQuarter = cycles.find((c) => c.type === "QUARTERLY" && c.status === "ACTIVE") ?? null;

  const { data: quarterObjectives = [] } = useQuery({
    queryKey: ["okr-quarter-objectives", cid, activeQuarter?.id],
    enabled: hasCompany && !!activeQuarter?.id,
    queryFn: () => listOkrObjectives(cid, String(activeQuarter?.id)),
  });

  const groupedStrategy = useMemo(() => {
    return {
      y1: strategy.filter((s) => s.horizon_years === 1),
      y3: strategy.filter((s) => s.horizon_years === 3),
      y5: strategy.filter((s) => s.horizon_years === 5),
      y10: strategy.filter((s) => s.horizon_years === 10),
    };
  }, [strategy]);

  const [showTenYears, setShowTenYears] = useState(() => groupedStrategy.y10.length > 0);

  const columns = useMemo(() => {
    const base = [
      { label: "1 ano", key: "y1" as const, items: groupedStrategy.y1 },
      { label: "3 anos", key: "y3" as const, items: groupedStrategy.y3 },
      { label: "5 anos", key: "y5" as const, items: groupedStrategy.y5 },
    ];

    const includeTen = showTenYears || groupedStrategy.y10.length > 0;
    return includeTen
      ? ([...base, { label: "10 anos", key: "y10" as const, items: groupedStrategy.y10 }] as const)
      : (base as const);
  }, [groupedStrategy.y1, groupedStrategy.y3, groupedStrategy.y5, groupedStrategy.y10, showTenYears]);

  const [open, setOpen] = useState(false);
  const [horizon, setHorizon] = useState<1 | 3 | 5 | 10>(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const reset = () => {
    setHorizon(1);
    setTitle("");
    setDescription("");
  };

  if (!hasCompany) {
    return (
      <div className="grid gap-6">
        <OkrPageHeader
          title="Mapa Estratégico Sinaxys"
          subtitle="Carregando contexto da empresa…"
          icon={<MapPinned className="h-5 w-5" />}
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
        title="Mapa Estratégico Sinaxys"
        subtitle="Uma leitura rápida da direção da empresa: visão → objetivos de longo prazo → OKRs do trimestre."
        icon={<MapPinned className="h-5 w-5" />}
        actions={
          canEdit ? (
            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              onClick={() => {
                reset();
                setOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Objetivo longo prazo
            </Button>
          ) : null
        }
      />

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Fundamentos</div>
            <p className="mt-1 text-sm text-muted-foreground">O ponto de partida de toda decisão estratégica.</p>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
            <Route className="h-5 w-5" />
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-4 md:grid-cols-2">
          <MiniCard title="Propósito" text={fundamentals?.purpose} />
          <MiniCard title="Visão" text={fundamentals?.vision} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <MiniCard title="Norte estratégico" text={fundamentals?.strategic_north} />
          <MiniCard title="Missão" text={fundamentals?.mission} />
        </div>

        <div className="mt-4">
          <Button asChild variant="outline" className="h-11 rounded-xl">
            <Link to="/okr/fundamentos">
              Ver fundamentos completos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Objetivos de longo prazo</div>
          <p className="mt-1 text-sm text-muted-foreground">1 ano é o mais comum. 10 anos fica opcional.</p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl bg-white"
          onClick={() => setShowTenYears((v) => !v)}
        >
          {showTenYears ? "Ocultar 10 anos" : "Mostrar 10 anos"}
        </Button>
      </div>

      <div
        className={
          columns.length === 4
            ? "grid gap-6 lg:grid-cols-4"
            : "grid gap-6 lg:grid-cols-3"
        }
      >
        {columns.map((col) => (
          <Card key={col.key} className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Objetivos — {col.label}</div>
              <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                {col.items.length}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Grandes apostas, alavancas e projetos estruturantes.</p>

            <Separator className="my-5" />

            <div className="grid gap-3">
              {col.items.length ? (
                col.items.map((o) => (
                  <div key={o.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{o.title}</div>
                    {o.description?.trim() ? <div className="mt-1 text-sm text-muted-foreground line-clamp-3">{o.description}</div> : null}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Nenhum objetivo cadastrado.</div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">OKRs do trimestre</div>
            <p className="mt-1 text-sm text-muted-foreground">O que está valendo agora (empresa, áreas, times e individuais).</p>
          </div>
          <Button asChild className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
            <Link to="/okr/ciclos">Abrir ciclo</Link>
          </Button>
        </div>

        <Separator className="my-5" />

        {activeQuarter ? (
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                  {activeQuarter.name?.trim() || `Q${activeQuarter.quarter} / ${activeQuarter.year}`}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{quarterObjectives.length} objetivos cadastrados</div>
              </div>
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">{activeQuarter.status}</Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {quarterObjectives.slice(0, 6).map((o) => (
                <Link
                  key={o.id}
                  to={`/okr/objetivos/${o.id}`}
                  className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 transition hover:bg-[color:var(--sinaxys-tint)]/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{o.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Nível: {o.level}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                  </div>
                </Link>
              ))}
            </div>

            {quarterObjectives.length > 6 ? (
              <div className="text-sm text-muted-foreground">+ {quarterObjectives.length - 6} objetivos (veja no ciclo)</div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
            Nenhum ciclo trimestral ativo. Crie um em "Ciclos & OKRs".
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
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo objetivo de longo prazo</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Horizonte</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {([1, 3, 5] as const).map((y) => (
                  <Button
                    key={y}
                    type="button"
                    variant={horizon === y ? "default" : "outline"}
                    className={
                      horizon === y
                        ? "h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                        : "h-11 rounded-xl"
                    }
                    onClick={() => setHorizon(y)}
                  >
                    {y === 1 ? "1 ano" : `${y} anos`}
                  </Button>
                ))}
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-3">
                <div className="text-sm text-muted-foreground">10 anos é opcional (pode esconder no mapa).</div>
                <Button
                  type="button"
                  variant={horizon === 10 ? "default" : "outline"}
                  className={
                    horizon === 10
                      ? "h-10 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                      : "h-10 rounded-xl bg-white"
                  }
                  onClick={() => {
                    setShowTenYears(true);
                    setHorizon(10);
                  }}
                >
                  10 anos
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Título</Label>
              <Input className="h-11 rounded-xl" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Dobrar NPS e retenção" />
            </div>

            <div className="grid gap-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                className="min-h-[96px] rounded-2xl"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contexto, por que isso importa, e como se conecta à visão."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={title.trim().length < 6}
              onClick={async () => {
                try {
                  await createStrategyObjective({
                    company_id: cid,
                    horizon_years: horizon,
                    title,
                    description,
                    created_by_user_id: user.id,
                  });
                  await qc.invalidateQueries({ queryKey: ["okr-strategy", cid] });
                  toast({ title: "Objetivo criado" });
                  setOpen(false);
                } catch (e) {
                  toast({
                    title: "Não foi possível criar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}