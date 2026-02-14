import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck2, Map, Sparkles, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { getCompanyFundamentals, listOkrCycles, listOkrObjectives } from "@/lib/okrDb";
import { OkrPageHeader } from "@/components/OkrPageHeader";
import { OkrSubnav } from "@/components/OkrSubnav";

function Pill({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold leading-snug text-[color:var(--sinaxys-ink)]">{value}</div>
    </div>
  );
}

export default function OkrHome() {
  const { user } = useAuth();
  const { companyId } = useCompany();

  if (!user) return null;

  const cid = companyId ?? "";
  const hasCompany = !!companyId;

  const { data: fundamentals } = useQuery({
    queryKey: ["okr-fundamentals", cid],
    enabled: hasCompany,
    queryFn: () => getCompanyFundamentals(cid),
  });

  const { data: cycles = [] } = useQuery({
    queryKey: ["okr-cycles", cid],
    enabled: hasCompany,
    queryFn: () => listOkrCycles(cid),
  });

  const activeQuarter = cycles.find((c) => c.type === "QUARTERLY" && c.status === "ACTIVE") ?? null;

  const { data: activeObjectives = [] } = useQuery({
    queryKey: ["okr-objectives", cid, activeQuarter?.id],
    enabled: hasCompany && !!activeQuarter?.id,
    queryFn: () => listOkrObjectives(cid, String(activeQuarter?.id)),
  });

  const hasFundamentals =
    !!fundamentals &&
    [fundamentals.purpose, fundamentals.vision, fundamentals.mission, fundamentals.strategic_north].some((t) => !!t?.trim());

  if (!hasCompany) {
    return (
      <div className="grid gap-6">
        <OkrPageHeader
          title="OKRs — Sinaxys"
          subtitle="Carregando contexto da empresa…"
          icon={<Target className="h-5 w-5" />}
        />
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm text-muted-foreground">Aguardando identificação da empresa do seu usuário…</div>
        </Card>
      </div>
    );
  }

  const isAdminish = user.role === "ADMIN" || user.role === "HEAD" || user.role === "MASTERADMIN";

  const recommended = !activeQuarter
    ? {
        title: "Comece criando o trimestre",
        desc: "Sem um ciclo ativo, fica impossível desdobrar objetivos e gerar tarefas do dia.",
        cta: "Criar / ativar ciclo",
        to: "/okr/ciclos",
      }
    : !hasFundamentals && isAdminish
      ? {
          title: "Defina fundamentos (10 min)",
          desc: "Fundamentos dão contexto. Sem eles, objetivos viram lista solta.",
          cta: "Preencher fundamentos",
          to: "/okr/fundamentos",
        }
      : {
          title: "Execute o que importa hoje",
          desc: "Sua rotina semanal com contexto de objetivo e foco em entrega.",
          cta: "Abrir rotina diária",
          to: "/okr/hoje",
        };

  return (
    <div className="grid gap-6">
      <OkrPageHeader
        title="OKRs — Sinaxys"
        subtitle="Estratégia → execução: visão clara, prioridades reais e tarefas do dia em um só lugar."
        icon={<Target className="h-5 w-5" />}
        help={{
          title: "Modelo mental em 15s",
          body: (
            <div className="grid gap-2">
              <div>
                <span className="font-semibold text-[color:var(--sinaxys-ink)]">Objetivo</span> = resultado que queremos.
              </div>
              <div>
                <span className="font-semibold text-[color:var(--sinaxys-ink)]">KR</span> = prova mensurável de que estamos chegando lá.
              </div>
              <div>
                <span className="font-semibold text-[color:var(--sinaxys-ink)]">Entregável</span> = pacote de entrega (Tier I/II).
              </div>
              <div>
                <span className="font-semibold text-[color:var(--sinaxys-ink)]">Tarefas</span> = execução diária (aparece em "Hoje").
              </div>
            </div>
          ),
        }}
        actions={
          <Button
            asChild
            className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
          >
            <Link to="/okr/assistente">
              Abrir assistente
              <Sparkles className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <OkrSubnav />

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Recomendado agora</div>
            <p className="mt-1 text-sm text-muted-foreground">Um próximo passo claro (sem precisar entender tudo antes).</p>
          </div>
          <Button asChild className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
            <Link to={recommended.to}>
              {recommended.cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <Separator className="my-5" />
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{recommended.title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{recommended.desc}</div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Rotina diária</div>
              <p className="mt-1 text-sm text-muted-foreground">O que você precisa fazer hoje (e por quê).</p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
              <CalendarCheck2 className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4">
            <Button asChild variant="outline" className="h-11 w-full rounded-xl">
              <Link to="/okr/hoje">
                Ver minhas prioridades
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Mapa estratégico</div>
              <p className="mt-1 text-sm text-muted-foreground">Entenda a cascata: visão → estratégia → OKRs → tarefas.</p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
              <Map className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4">
            <Button asChild variant="outline" className="h-11 w-full rounded-xl">
              <Link to="/okr/mapa">
                Abrir mapa
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Ciclos & OKRs</div>
              <p className="mt-1 text-sm text-muted-foreground">Criar, desdobrar e acompanhar o trimestre.</p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
              <Target className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4">
            <Button asChild variant="outline" className="h-11 w-full rounded-xl">
              <Link to="/okr/ciclos">
                Abrir ciclos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Fundamentos da empresa</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Missão, visão, propósito e norte estratégico — a origem de cada objetivo.
              </p>
            </div>
            {hasFundamentals ? (
              <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                Configurado
              </Badge>
            ) : (
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">Precisa de setup</Badge>
            )}
          </div>

          <Separator className="my-5" />

          <div className="grid gap-3 md:grid-cols-2">
            <Pill label="Propósito" value={fundamentals?.purpose} />
            <Pill label="Visão" value={fundamentals?.vision} />
            <Pill label="Missão" value={fundamentals?.mission} />
            <Pill label="Norte estratégico" value={fundamentals?.strategic_north} />
          </div>

          <div className="mt-4">
            <Button asChild className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
              <Link to="/okr/fundamentos">
                Ver / editar fundamentos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Trimestre ativo</div>
          <p className="mt-1 text-sm text-muted-foreground">Visão rápida do que está valendo agora.</p>

          <div className="mt-5 rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
            {activeQuarter ? (
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                      {activeQuarter.name?.trim() || `Q${activeQuarter.quarter} / ${activeQuarter.year}`}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{activeObjectives.length} objetivos cadastrados</div>
                  </div>
                  <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">{activeQuarter.status}</Badge>
                </div>

                <Button asChild variant="outline" className="mt-2 h-11 rounded-xl bg-white">
                  <Link to="/okr/ciclos">Ver OKRs do ciclo</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-2">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Nenhum trimestre ativo</div>
                <div className="text-sm text-muted-foreground">Crie um ciclo trimestral para começar a operar OKRs.</div>
                <Button asChild variant="outline" className="mt-2 h-11 rounded-xl bg-white">
                  <Link to="/okr/ciclos">Criar / gerenciar ciclos</Link>
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}