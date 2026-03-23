/**
 * KAIROOS 2.0 Fase 1: Head Tactical Home Page
 *
 * Dashboard tático para usuários com role HEAD.
 * Foco nos OKRs e Projetos do departamento.
 */

import { Card } from '@/components/ui/card';
import { Target, LayoutDashboard, CheckCircle2 } from 'lucide-react';

export default function HeadTacticalHome() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Coluna Esquerda: OKRs do Departamento */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">OKRs do Departamento</h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe os objetivos e resultados-chave da sua equipe
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-semibold">Aumentar MRR em 30%</div>
                <div className="text-sm text-muted-foreground">Progresso: 65%</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-semibold">Lançar 3 novas features</div>
                <div className="text-sm text-muted-foreground">Progresso: 2/3</div>
              </div>
            </div>
          </div>
        </Card>

        <a href="/okr" className="block text-center text-sm text-blue-600 hover:underline">
          Ver todos os OKRs →
        </a>
      </div>

      {/* Coluna Direita: Projetos do Departamento */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Projetos do Departamento</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os projetos de execução da sua equipe
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="h-5 w-5 text-purple-600" />
              <div>
                <div className="font-semibold">Nova Feature de Automação</div>
                <div className="text-sm text-muted-foreground">Template: Build | Progresso: 80%</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-semibold">Refator de API</div>
                <div className="text-sm text-muted-foreground">Template: Build | Progresso: 100%</div>
              </div>
            </div>
          </div>
        </Card>

        <a href="/app/projetos/lista" className="block text-center text-sm text-blue-600 hover:underline">
          Ver todos os projetos →
        </a>
      </div>
    </div>
  );
}
