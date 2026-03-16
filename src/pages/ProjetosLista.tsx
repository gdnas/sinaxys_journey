import { Link } from "react-router-dom";
import { FolderKanban, Plus, Search, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

export default function ProjetosLista() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-6xl grid gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[color:var(--sinaxys-ink)]">
              {t("nav.projects.list")}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Visualize e gerencie todos os projetos da sua equipe
            </p>
          </div>
          <Button className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white" disabled>
            <Plus className="mr-2 h-4 w-4" />
            Novo Projeto
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/app/projetos/dashboard" className="hover:text-[color:var(--sinaxys-primary)]">
          {t("nav.projects.home")}
        </Link>
        <span>/</span>
        <span className="text-[color:var(--sinaxys-primary)]">{t("nav.projects.list")}</span>
      </nav>

      {/* Filtros */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar projetos..."
              className="pl-10 rounded-xl"
              disabled
            />
          </div>
          <Button variant="outline" className="rounded-xl" disabled>
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
        </div>
      </Card>

      {/* Empty State */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/30 p-12">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="h-20 w-20 rounded-3xl bg-white flex items-center justify-center shadow-sm">
            <FolderKanban className="h-10 w-10 text-[color:var(--sinaxys-primary)]" />
          </div>
          <div className="max-w-md">
            <h3 className="text-xl font-bold text-[color:var(--sinaxys-ink)]">
              Nenhum projeto encontrado
            </h3>
            <p className="mt-2 text-muted-foreground">
              Não há projetos cadastrados ainda. Crie seu primeiro projeto para começar.
            </p>
          </div>
          <Button className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white" disabled>
            <Plus className="mr-2 h-4 w-4" />
            Criar primeiro projeto
          </Button>
        </div>
      </Card>

      {/* Placeholder Info */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-amber-50 dark:bg-amber-950/20 p-6">
        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <FolderKanban className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-[color:var(--sinaxys-ink)]">
              Fase 1 - Módulo em desenvolvimento
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta é uma página placeholder. A funcionalidade de criação e listagem de projetos será implementada nas próximas fases.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
