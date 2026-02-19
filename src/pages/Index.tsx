import { Link, Navigate } from "react-router-dom";
import { ArrowRight, BarChart3, Layers, ShieldCheck, Sparkles, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";

function Landing() {
  const { company } = useCompany();

  return (
    <div className="min-h-screen bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)]">
      <header className="sticky top-0 z-30 border-b border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-2xl bg-white ring-1 ring-[color:var(--sinaxys-border)]">
              <img src="/kairoos-mark.svg" alt="KAIROOS" className="h-7 w-7" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">{company.name}</div>
              <div className="text-[11px] font-medium text-muted-foreground">Strategy → People → Execution</div>
            </div>
          </div>

          <nav className="hidden items-center gap-5 text-sm md:flex">
            <a href="#produto" className="text-muted-foreground hover:text-[color:var(--sinaxys-ink)]">
              Produto
            </a>
            <a href="#casos" className="text-muted-foreground hover:text-[color:var(--sinaxys-ink)]">
              Casos
            </a>
            <a href="#seguranca" className="text-muted-foreground hover:text-[color:var(--sinaxys-ink)]">
              Segurança
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="h-9 rounded-full">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild className="h-9 rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
              <Link to="/login">
                Ver a plataforma
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-10 md:px-6 md:pb-16 md:pt-14">
          <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--sinaxys-border)] bg-white px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]">
                <span className="h-2 w-2 rounded-full bg-[color:var(--sinaxys-primary)]" />
                KAIROOS Operating System
              </div>

              <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
                Conecte estratégia, pessoas e execução diária em um único sistema.
              </h1>
              <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground md:text-base">
                OKRs vivos, alinhamento em camadas, custos e ROI, org chart e rituais de gestão — tudo com clareza, cadência e rastreabilidade.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild className="h-11 rounded-full bg-[color:var(--sinaxys-primary)] px-6 text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                  <Link to="/login">
                    Acessar plataforma
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-full border-[color:var(--sinaxys-border)] bg-white px-6">
                  <a href="#produto">Entender como funciona</a>
                </Button>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Alinhamento", value: "Tier 1 → Tier 2" },
                  { label: "ROI", value: "custos + timing" },
                  { label: "Gestão", value: "rituais + execução" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                    <div className="text-xs font-semibold text-muted-foreground">{s.label}</div>
                    <div className="mt-1 text-sm font-semibold">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-[28px] border border-[color:var(--sinaxys-border)] bg-white/35" />
              <div className="relative overflow-hidden rounded-[28px] border border-[color:var(--sinaxys-border)] bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Painel de OKRs</div>
                      <div className="text-xs text-muted-foreground">progressos, vínculos e ROI</div>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-[color:var(--sinaxys-tint)] px-2 py-1 text-[11px] font-semibold text-[color:var(--sinaxys-ink)]">
                    <Sparkles className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" />
                    KAIROOS
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {["Crescer receita com previsibilidade", "Aumentar eficiência operacional", "Elevar performance do time"].map((t, idx) => (
                    <div
                      key={t}
                      className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-muted-foreground">Objetivo</div>
                          <div className="mt-1 truncate text-sm font-semibold">{t}</div>
                        </div>
                        <div
                          className="grid h-9 w-9 place-items-center rounded-2xl bg-white text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]"
                          aria-hidden
                        >
                          {idx === 0 ? <BarChart3 className="h-4 w-4" /> : idx === 1 ? <Layers className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                        </div>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-white ring-1 ring-[color:var(--sinaxys-border)]">
                        <div
                          className="h-2 rounded-full bg-[color:var(--sinaxys-primary)]"
                          style={{ width: `${[62, 38, 74][idx]}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                        <span>Atual</span>
                        <span className="text-[color:var(--sinaxys-ink)]">{["62%", "38%", "74%"][idx]}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/55 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Business case</div>
                      <div className="mt-1 text-sm font-semibold">Custos agregados + ROI</div>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
                      +18% ROI
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="produto" className="mx-auto max-w-6xl px-4 pb-12 md:px-6 md:pb-16">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: <Target className="h-5 w-5" />,
                title: "OKRs com alinhamento em camadas",
                desc: "Conecte objetivos Tier 1 e Tier 2, vincule KRs e mantenha visão clara de impacto e dependências.",
              },
              {
                icon: <Users className="h-5 w-5" />,
                title: "Pessoas, organograma e rituais",
                desc: "Estrutura, liderança, times e execução: o contexto certo para decisões melhores e cadência consistente.",
              },
              {
                icon: <BarChart3 className="h-5 w-5" />,
                title: "Custos e ROI de verdade",
                desc: "Custos humanos e não-humanos, agregação automática e timing de faturamento para validar o business case.",
              },
            ].map((f) => (
              <Card key={f.title} className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                  {f.icon}
                </div>
                <div className="mt-4 text-base font-semibold">{f.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="casos" className="mx-auto max-w-6xl px-4 pb-12 md:px-6 md:pb-16">
          <div className="grid gap-6 rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-6 md:grid-cols-[1.1fr_0.9fr] md:p-10">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">Casos de uso</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">De estratégia a execução, sem perder contexto.</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Ideal para times que precisam sair do "deck bonito" e entrar na rotina com rastreabilidade: quem faz, quanto custa, quando retorna e
                como isso conecta com a estratégia.
              </p>
              <div className="mt-6 grid gap-3">
                {["Planejamento e desdobramento (Tier 1/Tier 2)", "Alocação de custos e ROI por iniciativa", "Acompanhamento semanal e evidências"].map(
                  (x) => (
                    <div key={x} className="flex items-start gap-3 rounded-2xl bg-[color:var(--sinaxys-bg)] p-4">
                      <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="text-sm font-semibold">{x}</div>
                    </div>
                  ),
                )}
              </div>
            </div>
            <div className="grid content-start gap-3">
              {[
                { k: "Tempo de alinhamento", v: "-30%" },
                { k: "Rastreabilidade", v: "+2x" },
                { k: "Clareza de ROI", v: "contínua" },
              ].map((m) => (
                <div key={m.k} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-5">
                  <div className="text-xs font-semibold text-muted-foreground">{m.k}</div>
                  <div className="mt-1 text-lg font-semibold text-[color:var(--sinaxys-ink)]">{m.v}</div>
                </div>
              ))}
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/60 p-5">
                <div className="text-sm font-semibold">Quer ver por dentro?</div>
                <p className="mt-1 text-sm text-muted-foreground">Use seu acesso (ou peça ao admin) e explore com seus dados.</p>
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

        <section id="seguranca" className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6 md:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">Segurança</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">Acesso controlado e rastreável.</div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    A plataforma opera com autenticação e controle por papéis. O foco é manter informações de gestão acessíveis a quem precisa — sem
                    fricção.
                  </p>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>
            </Card>
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
              <div className="text-sm font-semibold">Pronto para começar?</div>
              <p className="mt-2 text-sm text-muted-foreground">Acesse com sua conta e vá direto para sua jornada de execução.</p>
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

      <footer className="border-t border-[color:var(--sinaxys-border)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-2">
            <img src="/kairoos-mark.svg" alt="" className="h-5 w-5" />
            <span className="font-semibold text-[color:var(--sinaxys-ink)]">KAIROOS</span>
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