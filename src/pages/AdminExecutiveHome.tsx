/**
 * KAIROOS 2.0 Fase 1: Admin Executive Home Page
 *
 * Dashboard executivo para usuários com role ADMIN.
 * Visão consolidada da estratégia e execução da empresa.
 */

import { Card } from '@/components/ui/card';
import { LayoutDashboard, Target, AlertTriangle } from 'lucide-react';

export default function AdminExecutiveHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard Executivo</h1>
        <p className="text-muted-foreground">
          Visão consolidada da estratégia e execução da empresa
        </p>
      </div>

      {/* Cards de métricas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-3">
              <Target className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <div className="text-2xl font-semibold">12</div>
              <div className="text-sm text-muted-foreground">OKRs Ativos</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-3">
              <LayoutDashboard className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <div className="text-2xl font-semibold">8</div>
              <div className="text-sm text-muted-foreground">Projetos em Andamento</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-3">
              <AlertTriangle className="h-6 w-6 text-red-700" />
            </div>
            <div>
              <div className="text-2xl font-semibold">3</div>
              <div className="text-sm text-muted-foreground">Work Items Atrasados</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Links rápidos */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Acesso Rápido</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <a href="/okr" className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
            <div className="font-semibold">Gerenciar OKRs</div>
            <div className="text-sm text-muted-foreground">Definir e acompanhar objetivos estratégicos</div>
          </a>
          <a href="/app/projetos/lista" className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
            <div className="font-semibold">Gerenciar Projetos</div>
            <div className="text-sm text-muted-foreground">Visualizar e gerenciar projetos da empresa</div>
          </a>
        </div>
      </Card>
    </div>
  );
}
