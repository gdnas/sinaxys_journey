import { useMemo, useState } from "react";
import { BarChart3, ShieldCheck, Wallet, ArrowRight, BadgeCheck, Sparkles } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { useCompanyModuleEnabled } from "@/hooks/useCompanyModuleEnabled";
import { trackFinanceModuleEnabled, seedFinanceFiscalPeriods } from "@/lib/financeDb";
import { setCompanyModuleEnabled } from "@/lib/modulesDb";
import { useToast } from "@/hooks/use-toast";

export default function Finance() {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const { enabled, isLoading } = useCompanyModuleEnabled("FINANCE");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isActivating, setIsActivating] = useState(false);

  const isActive = enabled;

  const primaryCta = useMemo(() => {
    if (isActive) {
      return {
        label: "Abrir planejamento",
        to: "/finance/setup",
      };
    }

    return {
      label: "Ativar módulo",
      to: "/admin/modules",
    };
  }, [isActive]);

  async function handleActivate() {
    if (!companyId || !user) return;

    setIsActivating(true);
    await setCompanyModuleEnabled(companyId, "FINANCE", true);
    await trackFinanceModuleEnabled(companyId, user.id);
    await seedFinanceFiscalPeriods(companyId);
    toast({
      title: "Finance ativado",
      description: "Os períodos financeiros iniciais foram criados.",
    });
    navigate("/finance/setup", { replace: true });
  }

  if (!user) return <Navigate to="/login" replace />;
  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4">
        <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white px-6 py-4 text-sm text-muted-foreground">
          Carregando…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[color:var(--sinaxys-bg)] px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-[28px] border border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur md:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--sinaxys-border)] bg-white/5 px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]/80">
              <span className="h-2 w-2 rounded-full bg-[color:var(--sinaxys-primary)]" />
              Financial Planning & Performance
            </div>

            {isActive && (
              <Badge className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-700 hover:bg-emerald-500/10">
                <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                Módulo ativo
              </Badge>
            )}
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
                {isActive ? (
                  <Button asChild className="h-11 rounded-full bg-[color:var(--sinaxys-primary)] px-6 text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                    <Link to={primaryCta.to}>
                      {primaryCta.label}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    onClick={handleActivate}
                    disabled={isActivating}
                    className="h-11 rounded-full bg-[color:var(--sinaxys-primary)] px-6 text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  >
                    {isActivating ? "Ativando..." : primaryCta.label}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}

                {!isActive && (
                  <Button asChild variant="outline" className="h-11 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 px-6 text-[color:var(--sinaxys-ink)] hover:bg-white/5">
                    <Link to="/admin/modules">Gerenciar módulos</Link>
                  </Button>
                )}
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

        {isActive && (
          <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white/5 p-5 text-sm text-[color:var(--sinaxys-ink)]/75">
            <div className="flex items-center gap-2 font-semibold text-[color:var(--sinaxys-ink)]">
              <Sparkles className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
              Módulo ativo
            </div>
            <p className="mt-2">
              O Finance já está habilitado para esta empresa. Você pode seguir para a configuração inicial.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}