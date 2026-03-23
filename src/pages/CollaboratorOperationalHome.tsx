/**
 * KAIROOS 2.0 Fase 1: Collaborator Operational Home Page
 *
 * Dashboard operacional para usuários com role COLLABORATOR.
 * Foco nas tarefas que precisam ser concluídas hoje.
 */

import { Card } from '@/components/ui/card';
import { CheckCircle2, Calendar, Target } from 'lucide-react';

export default function CollaboratorOperationalHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Minhas Tarefas Hoje</h1>
        <p className="text-muted-foreground">
          Foco nas tarefas que precisam ser concluídas hoje
        </p>
      </div>

      {/* Lista de tarefas */}
      <div className="space-y-3">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-5 w-5 text-red-600" />
            <div className="flex-1">
              <div className="font-semibold">Bug crítico no checkout</div>
              <div className="text-sm text-muted-foreground">
                Projeto: Refator de API | Vence: Hoje às 14h
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-5 w-5 text-orange-600" />
            <div className="flex-1">
              <div className="font-semibold">Implementar autenticação</div>
              <div className="text-sm text-muted-foreground">
                Projeto: Nova Feature | Vence: Amanhã
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <div className="font-semibold">Atualizar documentação</div>
              <div className="text-sm text-muted-foreground">
                Projeto: Nova Feature | Vence: Em 3 dias
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Links rápidos */}
      <Card className="p-4">
        <h2 className="font-semibold mb-3">Acesso Rápido</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <a href="/app/projetos/tarefas" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Calendar className="h-4 w-4" />
            Minhas Tarefas
          </a>
          <a href="/okr" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Target className="h-4 w-4" />
            Meus OKRs
          </a>
        </div>
      </Card>
    </div>
  );
}
