import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Layers3,
  Network,
  Repeat2,
  ShieldAlert,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MarketingShell } from "@/components/MarketingShell";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-4">
      <div className="text-xs font-semibold text-[color:var(--sinaxys-ink)]/70">{label}</div>
      <div className="mt-1 text-sm font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">{value}</div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm text-[color:var(--sinaxys-ink)]/75">
      <CheckCircle2 className="mt-0.5 h-4 w-4 text-[color:var(--sinaxys-primary)]" />
      <div>{children}</div>
    </div>
  );
}

function Landing() {
  return (
    <MarketingShell>
      {/* HERO */}
      <section className="relative">
        <div className="grid gap-8 pt-4 md:grid-cols-[1.15fr_0.85fr] md:items-start md:pt-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--sinaxys-border)] bg-white/5 px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]/85">
              <span className="h-2 w-2 rounded-full bg-[color:var(--sinaxys-primary)]" />
              Execution Operating System
            </div>

            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Visibilidade total da execução.
              <br />
              Sem complexidade.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70 md:text-base">
              Sistema que conecta metas, pessoas, iniciativas e resultados em um único lugar.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild className="h-11 rounded-full bg-[color:var(--sinaxys-primary)] px-6 text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                <Link to="/signup">
                  Começar grátis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 px-6 text-[color:var(--sinaxys-ink)] hover:bg-white/5"
              >
                <Link to="/como-funciona">Ver como funciona na prática</Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Metric label="Clareza" value="o que importa agora" />
              <Metric label="Ownership" value="quem responde pelo quê" />
              <Metric label="Decisão" value="com contexto e números" />
            </div>

            <div className="mt-6 max-w-xl rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/40 p-4 text-sm text-[color:var(--sinaxys-ink)]/70">
              Empresas não precisam de mais ferramentas. Precisam de clareza operacional.
            </div>
          </div>

          {/* HERO VISUAL */}
          <div className="relative">
            <div className="absolute -inset-3 rounded-[28px] border border-[color:var(--sinaxys-border)] bg-white/5" />
            <div className="relative overflow-hidden rounded-[28px] border border-[color:var(--sinaxys-border)] bg-white/5 p-4 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold tracking-tight">Execution overview</div>
                  <div className="mt-1 text-xs text-[color:var(--sinaxys-ink)]/70">metas → iniciativas → responsáveis → resultado</div>
                </div>
                <div className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
                  live
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {[
                  { title: "Meta", icon: <Target className="h-4 w-4" />, body: "Direção e resultados-chave" },
                  { title: "Iniciativas", icon: <Layers3 className="h-4 w-4" />, body: "Trabalho conectado ao impacto" },
                  { title: "Pessoas", icon: <Network className="h-4 w-4" />, body: "Contexto e ownership" },
                  { title: "ROI", icon: <Wallet className="h-4 w-4" />, body: "Custo, timing e retorno" },
                ].map((row) => (
                  <div
                    key={row.title}
                    className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/45 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5 text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                          {row.icon}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{row.title}</div>
                          <div className="mt-1 text-sm text-[color:var(--sinaxys-ink)]/70">{row.body}</div>
                        </div>
                      </div>
                      <div className="h-9 w-9 rounded-2xl bg-white/5 ring-1 ring-[color:var(--sinaxys-border)]" />
                    </div>
                  </div>
                ))}
              </div>

              <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[color:var(--sinaxys-primary)]/15 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="mt-12">
        <div className="grid gap-6 rounded-3xl border border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur md:grid-cols-[1fr_0.9fr] md:p-10">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">Problema</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">O caos invisível da execução</h2>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">
              Quando a empresa cresce, o trabalho se multiplica. Sem um sistema, a execução vira ruído.
            </p>

            <div className="mt-6 grid gap-2">
              <Bullet>Iniciativas demais — sem priorização visível.</Bullet>
              <Bullet>Responsáveis difusos — ninguém "fecha" o ciclo.</Bullet>
              <Bullet>Reuniões improdutivas — sem evidência do que avançou.</Bullet>
              <Bullet>Falta de clareza — decisões por feeling.</Bullet>
              <Bullet>Risco operacional — trabalho importante fica invisível.</Bullet>
            </div>

            <div className="mt-6 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/40 p-4 text-sm text-[color:var(--sinaxys-ink)]/70">
              Empresas perdem energia e dinheiro na execução desalinhada.
            </div>
          </div>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/45 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Sintomas que aparecem</div>
                <div className="mt-2 text-sm text-[color:var(--sinaxys-ink)]/70">
                  Sem visibilidade, a operação passa a ser gerida por urgência.
                </div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/5 ring-1 ring-[color:var(--sinaxys-border)]">
                <ShieldAlert className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {["Projetos concorrendo", "Dependências invisíveis", "Sem dono claro", "Sem critério de decisão"].map((t) => (
                <div key={t} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 px-4 py-3 text-sm font-semibold">
                  {t}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* SOLUÇÃO */}
      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">Solução</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Um lugar onde tudo se conecta.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">
              Metas, projetos, responsáveis, cadência e ROI — no mesmo fluxo. Simples de operar e difícil de perder controle.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          {[
            { t: "Metas", d: "Direção e vínculo" },
            { t: "Projetos", d: "Trabalho real" },
            { t: "Responsáveis", d: "Ownership" },
            { t: "Cadência", d: "Ritual e evidência" },
            { t: "ROI", d: "Custo e retorno" },
          ].map((x, idx) => (
            <Card
              key={x.t}
              className={cn(
                "rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-5 backdrop-blur",
                "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-700",
                idx === 0 ? "motion-safe:delay-100" : idx === 1 ? "motion-safe:delay-150" : idx === 2 ? "motion-safe:delay-200" : idx === 3 ? "motion-safe:delay-250" : "motion-safe:delay-300",
              )}
            >
              <div className="text-sm font-semibold">{x.t}</div>
              <div className="mt-2 text-sm text-[color:var(--sinaxys-ink)]/70">{x.d}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="mt-12">
        <div className="grid gap-6 rounded-3xl border border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-10">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">Como funciona</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">3 passos.</h2>

            <div className="mt-6 grid gap-3">
              {[
                {
                  n: "01",
                  title: "Estruture metas",
                  desc: "Defina direção e resultados-chave com vínculo entre níveis.",
                  icon: <Target className="h-5 w-5" />,
                },
                {
                  n: "02",
                  title: "Organize execução e responsáveis",
                  desc: "Ownership claro: iniciativas, donos, dependências e cadência.",
                  icon: <Users className="h-5 w-5" />,
                },
                {
                  n: "03",
                  title: "Tenha visibilidade total",
                  desc: "Progresso, rituais e ROI para decisões seguras.",
                  icon: <Repeat2 className="h-5 w-5" />,
                },
              ].map((s) => (
                <div key={s.n} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/45 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5 ring-1 ring-[color:var(--sinaxys-border)] text-[color:var(--sinaxys-primary)]">
                      {s.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold tracking-[0.16em] text-[color:var(--sinaxys-ink)]/70">{s.n}</span>
                        <span className="text-sm font-semibold">{s.title}</span>
                      </div>
                      <div className="mt-1 text-sm text-[color:var(--sinaxys-ink)]/70">{s.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid content-start gap-3">
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/45 p-6">
              <div className="text-sm font-semibold">Sem setup longo</div>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">
                Você entra, estrutura metas e define cadência. O sistema sustenta a execução conforme a operação cresce.
              </p>
            </Card>
            <Button
              asChild
              className="h-11 rounded-full bg-[color:var(--sinaxys-primary)] px-6 text-white hover:bg-[color:var(--sinaxys-primary)]/90"
            >
              <Link to="/como-funciona">Ver na prática</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* EVOLUÇÃO */}
      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">Evolução</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Comece simples. Evolua para execução completa.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">
              O caminho é claro: primeiro direção e cadência. Depois pessoas, ownership e governança. Por fim, ROI e controle financeiro.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[{
            t: "Comece grátis estruturando metas",
            d: "Mapa de metas e cadência básica para tirar a execução do improviso.",
            icon: <Target className="h-5 w-5" />,
            cta: { label: "Começar grátis", to: "/login" },
          }, {
            t: "Evolua para execução completa",
            d: "Times e responsáveis com contexto, ownership e governança.",
            icon: <Network className="h-5 w-5" />,
            cta: { label: "Ver planos", to: "/pricing" },
          }, {
            t: "Tenha clareza financeira e operacional",
            d: "ROI por iniciativa com custo real, timing e visão executiva.",
            icon: <Wallet className="h-5 w-5" />,
            cta: { label: "Agendar demo", to: "/demo" },
          }].map((c, idx) => (
            <Card
              key={c.t}
              className={cn(
                "rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur",
                "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-700",
                idx === 0 ? "motion-safe:delay-100" : idx === 1 ? "motion-safe:delay-150" : "motion-safe:delay-200",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-semibold tracking-tight">{c.t}</div>
                  <div className="mt-2 text-sm text-[color:var(--sinaxys-ink)]/70">{c.d}</div>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/5 ring-1 ring-[color:var(--sinaxys-border)] text-[color:var(--sinaxys-primary)]">
                  {c.icon}
                </div>
              </div>
              <Button
                asChild
                variant="outline"
                className="mt-5 h-10 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-[color:var(--sinaxys-ink)] hover:bg-white/5"
              >
                <Link to={c.cta.to}>{c.cta.label}</Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* PARA QUEM É */}
      <section className="mt-12">
        <div className="grid gap-6 rounded-3xl border border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur md:grid-cols-2 md:p-10">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">Para quem é</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Empresas em crescimento com operação real.</h2>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">
              20–300 pessoas. Múltiplos projetos, times e prioridades concorrentes. Decisão precisa, sem ruído.
            </p>
          </div>

          <div className="grid gap-3">
            {["Startups em escala", "Empresas tech", "Serviços com múltiplas frentes", "Operações com squads e projetos"].map((t) => (
              <div key={t} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/45 px-4 py-3 text-sm font-semibold">
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS EMOCIONAIS */}
      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">O que muda</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Menos ansiedade. Mais controle.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">
              Executivos compram clareza: o que está em andamento, o que está travado e onde está o retorno.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          {["Clareza", "Organização", "Decisão segura", "Menos desperdício", "Ritmo"].map((t) => (
            <Card key={t} className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-5 backdrop-blur">
              <div className="text-sm font-semibold">{t}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mt-12">
        <div className="grid gap-6 rounded-3xl border border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur md:grid-cols-[1.2fr_0.8fr] md:p-10">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]/80">Pronto para ver</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Veja sua empresa com clareza pela primeira vez.</h2>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">
              Comece no free. Evolua quando a operação pedir mais pessoas, governança e ROI.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end sm:justify-center">
            <Button asChild className="h-11 rounded-full bg-[color:var(--sinaxys-primary)] px-6 text-white hover:bg-[color:var(--sinaxys-primary)]/90">
              <Link to="/login">Começar grátis</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 px-6 text-[color:var(--sinaxys-ink)] hover:bg-white/5"
            >
              <Link to="/demo">Agendar demonstração</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

export default function Index() {
  const { user } = useAuth();

  // Logged-out users should see the premium marketing landing page.
  if (!user) return <Landing />;

  if (user.mustChangePassword) return <Navigate to="/password" replace />;

  if (user.role === "MASTERADMIN") return <Navigate to="/master/overview" replace />;

  return <Navigate to="/app" replace />;
}