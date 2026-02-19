import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Layers,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Wallet,
  Network,
  Handshake,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { cn } from "@/lib/utils";

function FeatureCard({
  icon,
  title,
  desc,
  delayClass,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  delayClass?: string;
}) {
  return (
    <Card
      className={cn(
        "group rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur",
        "text-[color:var(--sinaxys-ink)] shadow-sm",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-700",
        delayClass,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
          {icon}
        </div>
        <div className="h-10 w-10 rounded-2xl bg-white/5 ring-1 ring-[color:var(--sinaxys-border)] transition group-hover:bg-white/10" />
      </div>
      <div className="mt-4 text-base font-semibold tracking-tight">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">{desc}</p>
    </Card>
  );
}

function Landing() {
  const { company } = useCompany();

  return (
    <div className="min-h-screen bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)]">
      {/* Texture layer (no gradients) */}
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
              <div className="text-sm font-semibold tracking-[0.18em]">{company.name}</div>
              <div className="text-[11px] font-medium text-[color:var(--sinaxys-ink)]/70">Strategy • People • Execution</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="h-9 rounded-full border border-transparent text-[color:var(--sinaxys-ink)]/80 hover:bg-white/5 hover:text-[color:var(--sinaxys-ink)]"
            >
              <Link to="/pricing">Planos</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="h-9 rounded-full border border-transparent text-[color:var(--sinaxys-ink)]/80 hover:bg-white/5 hover:text-[color:var(--sinaxys-ink)]"
            >
              <Link to="/login">Entrar</Link>
            </Button>
            <Button
              asChild
              className="h-9 rounded-full bg-[color:var(--sinaxys-primary)] px-4 text-white hover:bg-[color:var(--sinaxys-primary)]/90"
            >
              <Link to="/pricing">
                Ver planos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="relative mx-auto max-w-6xl px-4 pb-12 pt-10 md:px-6 md:pb-16 md:pt-14">
          <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--sinaxys-border)] bg-white/5 px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]/90">
                <span className="h-2 w-2 rounded-full bg-[color:var(--sinaxys-primary)]" />
                KAIROOS Operating System
              </div>

              <h1 className="mt-4 text-4xl font-semibold leading-[1.03] tracking-tight md:text-5xl">
                Estratégia com clareza.
                <br />
                Execução com cadência.
              </h1>
              <p className="mt-4 max-w-prose text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70 md:text-base">
                O KAIROOS conecta objetivos, pessoas e decisões diárias em um único fluxo. Alinhe Tier 1 e Tier 2, monitore KRs com contexto e
                valide ROI com custos agregados e timing de retorno.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  asChild
                  className="h-11 rounded-full bg-[color:var(--sinaxys-primary)] px-6 text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                >
                  <Link to="/pricing">
                    Começar com OKRs grátis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 px-6 text-[color:var(--sinaxys-ink)] hover:bg-white/5"
                >
                  <a href="#modulos">Ver módulos</a>
                </Button>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Alinhamento", value: "Tier 1 → Tier 2" },
                  { label: "ROI", value: "custos + timing" },
                  { label: "Ritual", value: "gestão semanal" },
                ].map((s, idx) => (
                  <div
                    key={s.label}
                    className={cn(
                      "rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-4",
                      "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-700",
                      idx === 0 ? "motion-safe:delay-150" : idx === 1 ? "motion-safe:delay-200" : "motion-safe:delay-300",
                    )}
                  >
                    <div className="text-xs font-semibold text-[color:var(--sinaxys-ink)]/70">{s.label}</div>
                    <div className="mt-1 text-sm font-semibold tracking-tight">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* HERO VISUAL */}
            <div
              className={cn(
                "relative",
                "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-700 motion-safe:delay-200",
              )}
            >
              <div className="absolute -inset-4 rounded-[30px] border border-[color:var(--sinaxys-border)] bg-white/5" />
              <div className="relative overflow-hidden rounded-[30px] border border-[color:var(--sinaxys-border)] bg-white/5 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Painel de execução</div>
                      <div className="text-xs text-[color:var(--sinaxys-ink)]/70">progressos + vínculos + ROI</div>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px] font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
                    <Sparkles className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" />
                    Live
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {[
                    { t: "Crescer receita com previsibilidade", icon: <BarChart3 className="h-4 w-4" />, p: 62 },
                    { t: "Aumentar eficiência operacional", icon: <Layers className="h-4 w-4" />, p: 38 },
                    { t: "Elevar performance do time", icon: <Users className="h-4 w-4" />, p: 74 },
                  ].map((row) => (
                    <div key={row.t} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[color:var(--sinaxys-ink)]/70">Objetivo</div>
                          <div className="mt-1 truncate text-sm font-semibold">{row.t}</div>
                        </div>
                        <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white/5 text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                          {row.icon}
                        </div>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-white/5 ring-1 ring-[color:var(--sinaxys-border)]">
                        <div className="h-2 rounded-full bg-[color:var(--sinaxys-primary)]" style={{ width: `${row.p}%` }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-[color:var(--sinaxys-ink)]/70">
                        <span>Atual</span>
                        <span className="text-[color:var(--sinaxys-ink)]">{row.p}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/35 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-[color:var(--sinaxys-ink)]/70">Business case</div>
                      <div className="mt-1 text-sm font-semibold">Custos agregados + ROI</div>
                    </div>
                    <div className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
                      +18% ROI
                    </div>
                  </div>
                </div>

                <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[color:var(--sinaxys-primary)]/15 blur-2xl" />
              </div>

              <div className="pointer-events-none absolute -bottom-6 left-6 hidden rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 px-4 py-3 text-xs font-semibold text-[color:var(--sinaxys-ink)]/80 backdrop-blur md:block motion-safe:animate-float">
                "O que custa" + "quando retorna" — no mesmo lugar.
              </div>
            </div>
          </div>
        </section>

        {/* PRODUCT */}
        <section id="produto" className="mx-auto max-w-6xl px-4 pb-12 md:px-6 md:pb-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">Produto</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">O fluxo completo de gestão.</h2>
              <p className="mt-2 max-w-prose text-sm text-[color:var(--sinaxys-ink)]/70">
                Tudo o que você precisa para sair do planejamento e manter execução consistente — com visibilidade e responsabilidade.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={<Target className="h-5 w-5" />}
              title="OKRs e alinhamento em camadas"
              desc="Conecte objetivos Tier 1 e Tier 2, vincule KRs e mantenha contexto claro de impacto e dependências."
              delayClass="motion-safe:delay-100"
            />
            <FeatureCard
              icon={<CalendarClock className="h-5 w-5" />}
              title="Cadência operacional"
              desc="Rituais semanais, evidências e acompanhamento do que realmente está em andamento — sem perder o fio da estratégia."
              delayClass="motion-safe:delay-150"
            />
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="ROI com custos reais"
              desc="Custos humanos e não-humanos, agregação automática e data esperada de faturamento para validar o business case."
              delayClass="motion-safe:delay-200"
            />
          </div>
        </section>

        {/* MODULES & PRICING */}
        <section id="modulos" className="mx-auto max-w-6xl px-4 pb-12 md:px-6 md:pb-16">
          <div className="grid gap-6 rounded-3xl border border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-10">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">Módulos</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">OKRs grátis. O resto, como add-on pago.</h2>
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">
                Você começa com gestão completa de OKRs (Tier 1/Tier 2, mapa, ciclos). Conforme a operação amadurece, habilita ROI, pessoas,
                onboarding e performance.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  asChild
                  className="h-11 rounded-full bg-[color:var(--sinaxys-primary)] px-6 text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                >
                  <Link to="/pricing">Ver planos e add-ons</Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="h-11 rounded-full bg-white/0 px-6 text-[color:var(--sinaxys-ink)]/80 hover:bg-white/5"
                >
                  <Link to="/login">Já tenho conta</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {[{
                title: "OKRs",
                desc: "Gestão completa",
                icon: <Target className="h-4 w-4" />,
                pill: "Grátis",
                pillClass: "bg-[color:var(--sinaxys-primary)] text-white",
              }, {
                title: "ROI & custos",
                desc: "Business case",
                icon: <Wallet className="h-4 w-4" />,
                pill: "Pago",
                pillClass: "bg-white/5 text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]",
              }, {
                title: "Org & pessoas",
                desc: "Estrutura",
                icon: <Network className="h-4 w-4" />,
                pill: "Pago",
                pillClass: "bg-white/5 text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]",
              }, {
                title: "PDI & Performance",
                desc: "Evolução",
                icon: <Handshake className="h-4 w-4" />,
                pill: "Pago",
                pillClass: "bg-white/5 text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]",
              }, {
                title: "Trilhas",
                desc: "Onboarding",
                icon: <CalendarClock className="h-4 w-4" />,
                pill: "Pago",
                pillClass: "bg-white/5 text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]",
              }, {
                title: "Points",
                desc: "Reconhecimento",
                icon: <Trophy className="h-4 w-4" />,
                pill: "Pago",
                pillClass: "bg-white/5 text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]",
              }].map((m, idx) => (
                <div
                  key={m.title}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/60 p-4",
                    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-700",
                    idx === 0 ? "motion-safe:delay-100" : idx === 1 ? "motion-safe:delay-150" : idx === 2 ? "motion-safe:delay-200" : idx === 3 ? "motion-safe:delay-250" : idx === 4 ? "motion-safe:delay-300" : "motion-safe:delay-350",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                      {m.icon}
                    </div>
                    <div className="leading-tight">
                      <div className="text-sm font-semibold">{m.title}</div>
                      <div className="text-xs text-[color:var(--sinaxys-ink)]/70">{m.desc}</div>
                    </div>
                  </div>
                  <div className={cn("rounded-full px-3 py-1 text-xs font-semibold", m.pillClass)}>{m.pill}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="como" className="mx-auto max-w-6xl px-4 pb-12 md:px-6 md:pb-16">
          <div className="grid gap-6 rounded-3xl border border-[color:var(--sinaxys-border)] bg-white/5 p-6 md:grid-cols-[1.15fr_0.85fr] md:p-10">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">Como funciona</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Clareza em 3 passos.</h2>
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">
                O KAIROOS organiza o desdobramento e cria rastreabilidade do começo ao fim — do objetivo ao custo e ao resultado.
              </p>

              <div className="mt-6 grid gap-3">
                {[
                  {
                    title: "Defina o Tier 1",
                    desc: "Objetivos estratégicos e resultados-chave que importam.",
                  },
                  {
                    title: "Desdobre em Tier 2",
                    desc: "Iniciativas e ownership: quem faz o quê — e com qual custo.",
                  },
                  {
                    title: "Acompanhe e ajuste",
                    desc: "Cadência, evidências e ROI para decidir com confiança.",
                  },
                ].map((s, idx) => (
                  <div
                    key={s.title}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/60 p-4",
                      "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-700",
                      idx === 0 ? "motion-safe:delay-100" : idx === 1 ? "motion-safe:delay-150" : "motion-safe:delay-200",
                    )}
                  >
                    <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{s.title}</div>
                      <div className="mt-1 text-sm text-[color:var(--sinaxys-ink)]/70">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid content-start gap-3">
              {[{ k: "Tempo de alinhamento", v: "-30%" }, { k: "Rastreabilidade", v: "+2x" }, { k: "Clareza de ROI", v: "contínua" }].map(
                (m, idx) => (
                  <div
                    key={m.k}
                    className={cn(
                      "rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/60 p-5",
                      "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-700",
                      idx === 0 ? "motion-safe:delay-150" : idx === 1 ? "motion-safe:delay-200" : "motion-safe:delay-300",
                    )}
                  >
                    <div className="text-xs font-semibold text-[color:var(--sinaxys-ink)]/70">{m.k}</div>
                    <div className="mt-1 text-lg font-semibold tracking-tight">{m.v}</div>
                  </div>
                ),
              )}

              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/30 p-5">
                <div className="text-sm font-semibold">Quer entrar agora?</div>
                <p className="mt-1 text-sm text-[color:var(--sinaxys-ink)]/70">
                  Use seu acesso (ou peça ao administrador) e explore com dados reais.
                </p>
                <Button
                  asChild
                  className="mt-4 h-10 rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                >
                  <Link to="/login">Entrar</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* SECURITY */}
        <section id="seguranca" className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-6 md:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">Segurança</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">Acesso controlado e rastreável.</div>
                  <p className="mt-3 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">
                    A plataforma opera com autenticação e controle por papéis. O objetivo é manter informações de gestão acessíveis a quem precisa —
                    sem fricção.
                  </p>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>
            </Card>
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-6">
              <div className="text-sm font-semibold">Pronto para começar?</div>
              <p className="mt-2 text-sm text-[color:var(--sinaxys-ink)]/70">Acesse com sua conta e vá direto para a execução.</p>
              <Button
                asChild
                className="mt-4 h-10 w-full rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              >
                <Link to="/login">Entrar</Link>
              </Button>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-[color:var(--sinaxys-ink)]/70 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-2">
            <img src="/kairoos-mark.svg" alt="" className="h-5 w-5" />
            <span className="font-semibold tracking-[0.18em] text-[color:var(--sinaxys-ink)]">KAIROOS</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#produto" className="hover:text-[color:var(--sinaxys-ink)]">
              Produto
            </a>
            <a href="#seguranca" className="hover:text-[color:var(--sinaxys-ink)]">
              Segurança
            </a>
            <Link className="hover:text-[color:var(--sinaxys-ink)]" to="/login">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Index() {
  const { user } = useAuth();

  // Logged-out users should see the public landing page.
  if (!user) return <Landing />;

  if (user.mustChangePassword) return <Navigate to="/password" replace />;

  // Master Admin keeps the platform backoffice as the default landing.
  if (user.role === "MASTERADMIN") return <Navigate to="/master/overview" replace />;

  // Everyone inside a company lands on "Minha jornada".
  return <Navigate to="/app" replace />;
}