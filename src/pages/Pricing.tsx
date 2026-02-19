import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Check,
  Handshake,
  Network,
  ShieldCheck,
  Target,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const modules = [
  {
    title: "OKRs (gestão completa)",
    desc: "Tier 1/Tier 2, KRs, mapa, ciclos e governança — pronto para operar.",
    icon: <Target className="h-5 w-5" />,
    badge: { label: "Grátis", className: "bg-[color:var(--sinaxys-primary)] text-white" },
  },
  {
    title: "ROI & custos (add-on)",
    desc: "Custos humanos e não-humanos, agregação e business case por iniciativa.",
    icon: <Wallet className="h-5 w-5" />,
    badge: { label: "Pago", className: "bg-white/5 text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]" },
  },
  {
    title: "Organograma & pessoas",
    desc: "Estrutura, relações e contexto organizacional para execução com ownership.",
    icon: <Network className="h-5 w-5" />,
    badge: { label: "Pago", className: "bg-white/5 text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]" },
  },
  {
    title: "PDI & Performance",
    desc: "Planos individuais, acompanhamento e evolução contínua com clareza.",
    icon: <Handshake className="h-5 w-5" />,
    badge: { label: "Pago", className: "bg-white/5 text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]" },
  },
  {
    title: "Trilhas & onboarding",
    desc: "Conteúdos, trilhas, tarefas e certificações para acelerar ramp-up.",
    icon: <CalendarClock className="h-5 w-5" />,
    badge: { label: "Pago", className: "bg-white/5 text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]" },
  },
  {
    title: "Points & reconhecimento",
    desc: "Gamificação, ranking e incentivos para manter ritmo e engajamento.",
    icon: <Trophy className="h-5 w-5" />,
    badge: { label: "Pago", className: "bg-white/5 text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]" },
  },
];

type Plan = {
  name: string;
  priceLabel: string;
  tagline: string;
  highlight?: boolean;
  includes: string[];
  cta: { label: string; to: string };
};

const plans: Plan[] = [
  {
    name: "Free",
    priceLabel: "R$ 0",
    tagline: "Para começar com OKRs e governança.",
    includes: [
      "OKRs (Tier 1/Tier 2)",
      "Mapa, ciclos e fundamentos",
      "Acesso por papéis",
      "Export e relatórios básicos",
    ],
    cta: { label: "Começar grátis", to: "/login" },
  },
  {
    name: "Pro",
    priceLabel: "Assinatura",
    tagline: "Para times que precisam executar com cadência e contexto.",
    highlight: true,
    includes: [
      "Tudo do Free",
      "ROI & custos (add-on)",
      "Organograma & pessoas",
      "Rituais e evidências de execução",
    ],
    cta: { label: "Ver planos", to: "/login" },
  },
  {
    name: "Business",
    priceLabel: "Assinatura",
    tagline: "Para operação completa (gente + performance + onboarding).",
    includes: [
      "Tudo do Pro",
      "PDI & Performance",
      "Trilhas & onboarding",
      "Points & reconhecimento",
    ],
    cta: { label: "Assinar", to: "/login" },
  },
];

function PricingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{
          backgroundImage: "url(/kairoos-grid.svg)",
          backgroundSize: "560px 560px",
          backgroundPosition: "center",
          mixBlendMode: "soft-light",
        }}
      />

      <header className="sticky top-0 z-30 border-b border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-white/5 ring-1 ring-[color:var(--sinaxys-border)]">
              <img src="/kairoos-mark.svg" alt="KAIROOS" className="h-7 w-7" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-[0.18em]">KAIROOS</div>
              <div className="text-[11px] font-medium text-[color:var(--sinaxys-ink)]/70">Pricing</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="h-9 rounded-full border border-transparent text-[color:var(--sinaxys-ink)]/80 hover:bg-white/5 hover:text-[color:var(--sinaxys-ink)]"
            >
              <Link to="/">Home</Link>
            </Button>
            <Button
              asChild
              className="h-9 rounded-full bg-[color:var(--sinaxys-primary)] px-4 text-white hover:bg-[color:var(--sinaxys-primary)]/90"
            >
              <Link to="/login">
                Entrar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:px-6 md:pt-14">{children}</main>

      <footer className="border-t border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-[color:var(--sinaxys-ink)]/70 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-2">
            <img src="/kairoos-mark.svg" alt="" className="h-5 w-5" />
            <span className="font-semibold tracking-[0.18em] text-[color:var(--sinaxys-ink)]">KAIROOS</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link className="hover:text-[color:var(--sinaxys-ink)]" to="/">
              Home
            </Link>
            <Link className="hover:text-[color:var(--sinaxys-ink)]" to="/login">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PlanCard({ plan, delayClass }: { plan: Plan; delayClass?: string }) {
  return (
    <Card
      className={cn(
        "rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur",
        plan.highlight ? "ring-1 ring-[color:var(--sinaxys-primary)]/40" : "ring-1 ring-[color:var(--sinaxys-border)]",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-700",
        delayClass,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">{plan.name}</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">{plan.priceLabel}</div>
          <div className="mt-2 text-sm text-[color:var(--sinaxys-ink)]/70">{plan.tagline}</div>
        </div>
        {plan.highlight ? (
          <Badge className="rounded-full bg-[color:var(--sinaxys-primary)] text-white">Mais popular</Badge>
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

      <Button
        asChild
        className={cn(
          "mt-6 h-11 w-full rounded-full",
          plan.highlight
            ? "bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
            : "bg-white/5 text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)] hover:bg-white/10",
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
    <PricingShell>
      <section>
        <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--sinaxys-border)] bg-white/5 px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]/90">
          <span className="h-2 w-2 rounded-full bg-[color:var(--sinaxys-primary)]" />
          OKRs grátis • Add-ons pagos
        </div>

        <h1 className="mt-4 text-4xl font-semibold leading-[1.03] tracking-tight md:text-5xl">Planos pensados para execução.</h1>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70 md:text-base">
          Comece com o módulo de gestão de OKRs (grátis). Quando precisar ir além — ROI, pessoas, onboarding e performance — habilite módulos
          pagos.
        </p>
      </section>

      <section className="mt-10">
        <div className="grid gap-4 md:grid-cols-3">
          <PlanCard plan={plans[0]} delayClass="motion-safe:delay-100" />
          <PlanCard plan={plans[1]} delayClass="motion-safe:delay-150" />
          <PlanCard plan={plans[2]} delayClass="motion-safe:delay-200" />
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">Módulos</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">O que está incluso — e o que é add-on.</h2>
            <p className="mt-2 max-w-prose text-sm text-[color:var(--sinaxys-ink)]/70">
              Você começa com OKRs e amplia conforme o momento da operação.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {modules.map((m, idx) => (
            <Card
              key={m.title}
              className={cn(
                "rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur",
                "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-700",
                idx % 2 === 0 ? "motion-safe:delay-100" : "motion-safe:delay-150",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                  {m.icon}
                </div>
                <Badge className={cn("rounded-full", m.badge.className)}>{m.badge.label}</Badge>
              </div>
              <div className="mt-4 text-base font-semibold tracking-tight">{m.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">{m.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur md:p-10">
          <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-start">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">Compra techtouch</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Como vender com self-serve (cartão).</h2>
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">
                Sugestão de jornada 100% digital: landing → pricing → cadastro → onboarding guiado → upgrade dentro do produto.
              </p>

              <div className="mt-6 grid gap-3">
                {[
                  {
                    icon: <Building2 className="h-4 w-4" />,
                    title: "1) Cadastro rápido",
                    desc: "Crie conta e empresa em 2–3 telas. Evite formulário longo.",
                  },
                  {
                    icon: <Users className="h-4 w-4" />,
                    title: "2) Primeiro valor em 10 minutos",
                    desc: "Assistente de OKRs: ciclo + 1 objetivo + 1 KR + check-in.",
                  },
                  {
                    icon: <BarChart3 className="h-4 w-4" />,
                    title: "3) Gatilhos de upgrade",
                    desc: "Quando a pessoa tentar usar ROI, Org, PDI etc., mostre paywall contextual.",
                  },
                  {
                    icon: <BriefcaseBusiness className="h-4 w-4" />,
                    title: "4) Checkout simples",
                    desc: "Cartão + recibo. Sem call. Cancelamento self-serve.",
                  },
                ].map((s) => (
                  <div key={s.title} className="flex items-start gap-3 rounded-2xl bg-[color:var(--sinaxys-bg)]/60 p-4 ring-1 ring-[color:var(--sinaxys-border)]">
                    <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                      {s.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{s.title}</div>
                      <div className="mt-1 text-sm text-[color:var(--sinaxys-ink)]/70">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/60 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Pagamento</div>
                    <div className="mt-2 text-sm text-[color:var(--sinaxys-ink)]/70">
                      Para cartão-only e SaaS, o caminho mais simples costuma ser checkout hospedado.
                    </div>
                  </div>
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                </div>
              </Card>

              <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/30 p-6">
                <div className="text-sm font-semibold">Próximo passo</div>
                <p className="mt-2 text-sm text-[color:var(--sinaxys-ink)]/70">
                  Se você quiser, eu implemento o checkout cartão (self-serve) e a habilitação automática de módulos pagos.
                </p>
                <Button
                  asChild
                  className="mt-4 h-10 w-full rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                >
                  <Link to="/login">Entrar e configurar</Link>
                </Button>
              </Card>
            </div>
          </div>
        </Card>
      </section>
    </PricingShell>
  );
}
