import { Link } from "react-router-dom";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { MarketingShell } from "@/components/MarketingShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Plan = {
  name: string;
  eyebrow: string;
  tagline: string;
  highlight?: boolean;
  includes: string[];
  idealFor: string;
  cta: { label: string; to: string; variant: "primary" | "outline" };
};

const plans: Plan[] = [
  {
    name: "FREE",
    eyebrow: "Para estruturar metas e cadência",
    tagline: "Clareza de direção e governança — sem esforço extra.",
    includes: [
      "Mapa de metas (Tier 1 e Tier 2)",
      "Ciclos e cadência básica",
      "Visibilidade por papéis",
      "Export e visão executiva",
    ],
    idealFor: "Empresas começando a organizar execução com uma base sólida.",
    cta: { label: "Começar grátis", to: "/login", variant: "primary" },
  },
  {
    name: "GROWTH",
    eyebrow: "Execução e times organizados",
    tagline: "Ownership explícito, pessoas e trabalho conectado ao que importa.",
    highlight: true,
    includes: [
      "Tudo do Free",
      "Organograma & pessoas (contexto e ownership)",
      "Gestão de execução com visibilidade de responsáveis",
      "Governança ampliada para times e áreas",
    ],
    idealFor: "Operações com múltiplos times e iniciativas concorrentes.",
    cta: { label: "Agendar demo", to: "/demo", variant: "primary" },
  },
  {
    name: "EXECUTION OS",
    eyebrow: "Visibilidade completa e ROI",
    tagline: "Controle operacional e financeiro para decidir com segurança.",
    includes: [
      "Tudo do Growth",
      "ROI & custos (business case por iniciativa)",
      "Timing de retorno e visões executivas",
      "Camada completa de execução empresarial",
    ],
    idealFor: "Empresas em crescimento que precisam governar execução com números.",
    cta: { label: "Falar com a KAIROOS", to: "/demo", variant: "outline" },
  },
];

function PlanCard({ plan, delayClass }: { plan: Plan; delayClass?: string }) {
  return (
    <Card
      className={cn(
        "rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur",
        plan.highlight ? "ring-1 ring-[color:var(--sinaxys-primary)]/35" : "ring-1 ring-[color:var(--sinaxys-border)]",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-700",
        delayClass,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold tracking-[0.18em] text-[color:var(--sinaxys-ink)]/80">{plan.name}</div>
          <div className="mt-2 text-sm font-semibold text-[color:var(--sinaxys-primary)]">{plan.eyebrow}</div>
          <div className="mt-3 text-base font-semibold tracking-tight">{plan.tagline}</div>
        </div>
        {plan.highlight ? (
          <span className="rounded-full bg-[color:var(--sinaxys-primary)]/15 px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-primary)]/25">
            Recomendado
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-2">
        {plan.includes.map((x) => (
          <div key={x} className="flex items-start gap-2 text-sm text-[color:var(--sinaxys-ink)]/80">
            <Check className="mt-0.5 h-4 w-4 text-[color:var(--sinaxys-primary)]" />
            <span>{x}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/40 p-4 text-sm text-[color:var(--sinaxys-ink)]/70">
        <span className="font-semibold text-[color:var(--sinaxys-ink)]">Ideal para:</span> {plan.idealFor}
      </div>

      <Button
        asChild
        className={cn(
          "mt-6 h-11 w-full rounded-full",
          plan.cta.variant === "primary"
            ? "bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
            : "bg-white/0 text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)] hover:bg-white/5",
        )}
      >
        <Link to={plan.cta.to}>
          {plan.cta.label}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </Card>
  );
}

export default function Pricing() {
  return (
    <MarketingShell
      active="pricing"
      title="Planos"
      description="Comece com metas e cadência no plano gratuito. Evolua para execução completa com pessoas, ownership e ROI conforme a operação exige."
    >
      <section>
        <div className="grid gap-4 md:grid-cols-3">
          <PlanCard plan={plans[0]} delayClass="motion-safe:delay-100" />
          <PlanCard plan={plans[1]} delayClass="motion-safe:delay-150" />
          <PlanCard plan={plans[2]} delayClass="motion-safe:delay-200" />
        </div>
      </section>

      <section className="mt-10">
        <div className="grid gap-6 rounded-3xl border border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur md:grid-cols-[1.2fr_0.8fr] md:p-10">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">Posicionamento</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Infraestrutura de execução para empresas em crescimento.</h2>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">
              Você não compra "uma ferramenta". Você compra clareza operacional: trabalho conectado, ownership e decisão segura.
            </p>
          </div>
          <div className="grid content-start gap-3">
            <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/40 p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5 ring-1 ring-[color:var(--sinaxys-border)]">
                  <ShieldCheck className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Tech-touch</div>
                  <div className="mt-1 text-sm text-[color:var(--sinaxys-ink)]/70">
                    Fluxo claro, setup rápido e evolução por maturidade operacional.
                  </div>
                </div>
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-[color:var(--sinaxys-ink)] hover:bg-white/5"
            >
              <Link to="/como-funciona">Ver como funciona</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
