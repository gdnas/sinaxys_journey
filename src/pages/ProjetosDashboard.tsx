import { Link } from "react-router-dom";
import { CalendarClock, Layers, CheckCircle2, FolderOpen, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export default function ProjetosDashboard() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-6xl grid gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--sinaxys-ink)]">
            {t("nav.projects.group")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Gerencie projetos, tarefas e acompanhe o progresso da sua equipe
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Início</span>
        <span>/</span>
        <span className="text-[color:var(--sinaxys-primary)]">{t("nav.projects.home")}</span>
      </nav>

      {/* Cards de Acesso Rápido */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex flex-col gap-4 h-full">
            <div className="h-12 w-12 rounded-2xl bg-[color:var(--sinaxys-tint)] flex items-center justify-center">
              <Layers className="h-6 w-6 text-[color:var(--sinaxys-primary)]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[color:var(--sinaxys-ink)]">
                {t("nav.projects.list")}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Visualize e gerencie todos os projetos da sua equipe
              </p>
            </div>
            <Button asChild className="w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white">
              <Link to="/app/projetos/lista">
                Ver projetos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex flex-col gap-4 h-full">
            <div className="h-12 w-12 rounded-2xl bg-[color:var(--sinaxys-tint)] flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-[color:var(--sinaxys-primary)]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[color:var(--sinaxys-ink)]">
                {t("nav.projects.tasks")}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Acompanhe e gerencie tarefas individuais
              </p>
            </div>
            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link to="/app/projetos/tarefas">
                Ver tarefas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex flex-col gap-4 h-full">
            <div className="h-12 w-12 rounded-2xl bg-[color:var(--sinaxys-tint)] flex items-center justify-center">
              <CalendarClock className="h-6 w-6 text-[color:var(--sinaxys-primary)]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[color:var(--sinaxys-ink)]">
                Visão Geral
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Dashboard com métricas e status dos projetos
              </p>
            </div>
            <Button asChild variant="outline" className="w-full rounded-xl" disabled>
              <span>
                Em breve
                <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Button>
          </div>
        </Card>
      </div>

      {/* Empty State */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/30 p-12">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="h-20 w-20 rounded-3xl bg-white flex items-center justify-center shadow-sm">
            <FolderOpen className="h-10 w-10 text-[color:var(--sinaxys-primary)]" />
          </div>
          <div className="max-w-md">
            <h3 className="text-xl font-bold text-[color:var(--sinaxys-ink)]">
              Nenhum projeto ainda
            </h3>
            <p className="mt-2 text-muted-foreground">
              Comece criando seu primeiro projeto para organizar o trabalho da sua equipe.
            </p>
          </div>
          <Button className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white" disabled>
            Criar primeiro projeto
          </Button>
        </div>
      </Card>
    </div>
  );
}
