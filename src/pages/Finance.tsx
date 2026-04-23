import { BarChart3, ShieldCheck, Wallet, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Finance() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[color:var(--sinaxys-bg)] px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-[28px] border border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur md:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--sinaxys-border)] bg-white/5 px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]/80">
            <span className="h-2 w-2 rounded-full bg-[color:var(--sinaxys-primary)]" />
            Financial Planning & Performance
          </div>

          <div className="mt-5 grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                Planejamento financeiro conectado à execução.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70 md:text-base">
                Uma camada gerencial para orçamento, forecast, margem e análise — sem virar ERP e sem duplicar a operação existente.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-11 rounded-full bg-[color:var(--sinaxys-primary)] px-6 text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                  <Link to="/admin/modules">
                    Ativar módulo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 px-6 text-[color:var(--sinaxys-ink)] hover:bg-white/5">
                  <Link to="/admin/costs">Ver custos</Link>
                </Button>
              </div>
            </div>

            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/45 p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/5 text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Sprint 0 pronta para expansão</div>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">
                    A base já respeita feature flag por empresa e prepara o caminho para contas, períodos, cenários e versões.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  "Feature flag por empresa",
                  "Integração com cost_items",
                  "Compatível com RLS",
                  "Base para /finance",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 px-4 py-3 text-sm font-semibold">
                    {item}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Governança",
              desc: "Controle por empresa, com ativação/desativação centralizada.",
              icon: <ShieldCheck className="h-5 w-5" />,
            },
            {
              title: "Visão executiva",
              desc: "Estrutura pensada para leitura gerencial, não contábil.",
              icon: <BarChart3 className="h-5 w-5" />,
            },
            {
              title: "Próximos passos",
              desc: "A próxima sprint cria a estrutura de contas gerenciais.",
              icon: <Wallet className="h-5 w-5" />,
            },
          ].map((card) => (
            <Card key={card.title} className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-5 backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5 text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                  {card.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold">{card.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">{card.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}