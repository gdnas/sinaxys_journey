import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Layers3, Network, Repeat2, Target, Wallet } from "lucide-react";
import { MarketingShell } from "@/components/MarketingShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function StepCard({
  n,
  title,
  desc,
  icon,
}: {
  n: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]/80 ring-1 ring-[color:var(--sinaxys-border)]">
            <span className="text-[color:var(--sinaxys-primary)]">{n}</span>
            <span className="opacity-70">/</span>
            <span>3</span>
          </div>
          <div className="mt-4 text-lg font-semibold tracking-tight">{title}</div>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">{desc}</p>
        </div>

        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/5 ring-1 ring-[color:var(--sinaxys-border)]">
          <div className="text-[color:var(--sinaxys-primary)]">{icon}</div>
        </div>
      </div>
    </Card>
  );
}

function DiagramRow({
  left,
  label,
  right,
  tint,
}: {
  left: string;
  label: string;
  right: string;
  tint: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 px-4 py-3 text-sm font-semibold">
        {left}
      </div>
      <div className={cn("rounded-full px-3 py-1 text-xs font-semibold ring-1", tint)}>{label}</div>
      <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 px-4 py-3 text-sm font-semibold">
        {right}
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <MarketingShell
      active="how"
      title="Como funciona"
      description="KAIROOS organiza execução como infraestrutura: metas, iniciativas, responsáveis, cadência e ROI — conectados em um fluxo simples."
    >
      {/* Visual overview */}
      <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]/80">Visão do sistema</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">Um mapa que não quebra quando a operação cresce.</div>
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">
            Em vez de planilhas e ferramentas desconectadas, você vê a cadeia completa: do objetivo ao responsável, do ritual ao resultado.
          </p>

          <div className="mt-6 grid gap-3">
            <DiagramRow
              left="Metas"
              label="desdobramento"
              right="Projetos & iniciativas"
              tint="bg-indigo-500/10 text-indigo-200 ring-indigo-500/20"
            />
            <DiagramRow
              left="Projetos"
              label="ownership"
              right="Responsáveis"
              tint="bg-emerald-500/10 text-emerald-200 ring-emerald-500/20"
            />
            <DiagramRow
              left="Responsáveis"
              label="cadência"
              right="Rituais e evidências"
              tint="bg-sky-500/10 text-sky-200 ring-sky-500/20"
            />
            <DiagramRow
              left="Evidências"
              label="impacto"
              right="Resultados & ROI"
              tint="bg-violet-500/10 text-violet-200 ring-violet-500/20"
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild className="h-11 rounded-full bg-[color:var(--sinaxys-primary)] px-6 text-white hover:bg-[color:var(--sinaxys-primary)]/90">
              <Link to="/login">
                Começar grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 px-6 text-[color:var(--sinaxys-ink)] hover:bg-white/5"
            >
              <Link to="/demo">Agendar demonstração</Link>
            </Button>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]/80">O que você enxerga</div>

          <div className="mt-4 grid gap-3">
            {[
              {
                icon: <Target className="h-5 w-5" />,
                title: "Mapa de metas",
                desc: "Tier 1 e Tier 2 com vínculo explícito. Sem ambiguidade.",
              },
              {
                icon: <Network className="h-5 w-5" />,
                title: "Contexto de pessoas",
                desc: "Estrutura, responsáveis e relações que sustentam a execução.",
              },
              {
                icon: <Repeat2 className="h-5 w-5" />,
                title: "Rituais",
                desc: "Cadência semanal com evidência do que avançou e do que travou.",
              },
              {
                icon: <Wallet className="h-5 w-5" />,
                title: "ROI",
                desc: "Custo, timing e retorno no mesmo lugar para decidir com controle.",
              },
            ].map((i) => (
              <div key={i.title} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5 ring-1 ring-[color:var(--sinaxys-border)] text-[color:var(--sinaxys-primary)]">
                    {i.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{i.title}</div>
                    <div className="mt-1 text-sm text-[color:var(--sinaxys-ink)]/70">{i.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* 3 steps */}
      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">3 passos</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Simplicidade operacional.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">
              Estruture metas, organize execução e mantenha visibilidade. Sem recomeçar toda semana.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StepCard
            n="01"
            title="Estruture metas"
            desc="Defina a direção e desdobre sem perder o vínculo entre níveis."
            icon={<Layers3 className="h-5 w-5" />}
          />
          <StepCard
            n="02"
            title="Organize execução e responsáveis"
            desc="Ownership explícito: quem faz, quando, com qual custo e dependência."
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <StepCard
            n="03"
            title="Tenha visibilidade total"
            desc="Rituais, progresso e ROI para decisões seguras — sem ruído."
            icon={<Target className="h-5 w-5" />}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10">
        <div className="grid gap-6 rounded-3xl border border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur md:grid-cols-[1.2fr_0.8fr] md:p-10">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]/80">Pronto para usar</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Veja sua empresa com clareza operacional.</h2>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">
              Comece pelo plano gratuito estruturando metas e cadência. Evolua para execução completa conforme a operação exigir.
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
