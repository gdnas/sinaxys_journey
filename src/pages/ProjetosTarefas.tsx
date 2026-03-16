import { Link } from "react-router-dom";
import { CheckSquare, Plus, Search, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

export default function ProjetosTarefas() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-6xl grid gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[color:var(--sinaxys-ink)]">
              {t("nav.projects.tasks")}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Acompanhe e gerencie tarefas individuais
            </p>
          </div>
          <Button className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white" disabled>
            <Plus className="mr-2 h-4 w-4" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/app/projetos/dashboard" className="hover:text-[color:var(--sinaxys-primary)]">
          {t("nav.projects.home")}
        </Link>
        <span>/</span>
        <span className="text-[color:var(--sinaxys-primary)]">{t("nav.projects.tasks")}</span>
      </nav>

      {/* Filtros e Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Backlog</span>
            <div className="text-3xl font-bold text-[color:var(--sinaxys-ink)]">0</div>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Em Andamento</span>
            <div className="text-3xl font-bold text-[color:var(--sinaxys-primary)]">0</div>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Concluídas</span>
            <div className="text-3xl font-bold text-emerald-600">0</div>
          </div>
        </Card>
      </div>

      {/* Barra de Busca */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefas..."
              className="pl-10 rounded-xl"
              disabled
            />
          </div>
          <Button variant="outline" className="rounded-xl" disabled>
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
          <div className="flex gap-2">
            <Badge variant="outline" className="rounded-xl cursor-pointer hover:bg-[color:var(--sinaxys-tint)]">
              Todas
            </Badge>
            <Badge variant="outline" className="rounded-xl cursor-pointer hover:bg-[color:var(--sinaxys-tint)]">
              Minhas
            </Badge>
            <Badge variant="outline" className="rounded-xl cursor-pointer hover:bg-[color:var(--sinaxys-tint)]">
              Prioritárias
            </Badge>
          </div>
        </div>
      </Card>

      {/* Empty State */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/30 p-12">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="h-20 w-20 rounded-3xl bg-white flex items-center justify-center shadow-sm">
            <CheckSquare className="h-10 w-10 text-[color:var(--sinaxys-primary)]" />
          </div>
          <div className="max-w-md">
            <h3 className="text-xl font-bold text-[color:var(--sinaxys-ink)]">
              Nenhuma tarefa encontrada
            </h3>
            <p className="mt-2 text-muted-foreground">
              Não há tarefas cadastradas ainda. Crie sua primeira tarefa para começar.
            </p>
          </div>
          <Button className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white" disabled>
            <Plus className="mr-2 h-4 w-4" />
            Criar primeira tarefa
          </Button>
        </div>
      </Card>

      {/* Placeholder Info */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-amber-50 dark:bg-amber-950/20 p-6">
        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <CheckSquare className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-[color:var(--sinaxys-ink)]">
              Fase 1 - Módulo em desenvolvimento
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta é uma página placeholder. A funcionalidade de criação e gerenciamento de tarefas será implementada nas próximas fases.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
