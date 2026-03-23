/**
 * KAIROOS 2.0 Fase 1: Template Selector Component
 *
 * Componente visual para seleção de template de fluxo de projeto.
 * O template define o fluxo de status e não pode ser alterado após a criação.
 * KAIROOS 2.0 Fase 1 Hardening #5: UX mais clara sobre obrigatoriedade e imutabilidade
 */

import { TemplateType, TEMPLATE_WORKFLOWS } from '@/lib/templateWorkflowDb';
import { Card } from '@/components/ui/card';
import { 
  LayoutDashboard, 
  CheckCircle2, 
  ArrowRightCircle, 
  Megaphone,
  AlertTriangle
} from 'lucide-react';

interface TemplateSelectorProps {
  onSelect: (templateType: TemplateType) => void;
}

const templates = [
  {
    type: 'BUILD' as TemplateType,
    icon: LayoutDashboard,
    label: 'Build',
    description: 'Fluxo ágil de desenvolvimento (Produto/Tecnologia)',
    color: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
  {
    type: 'PROCESS' as TemplateType,
    icon: CheckCircle2,
    label: 'Process',
    description: 'Fluxo simples de tarefas (Operações/Financeiro/CS)',
    color: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    type: 'PIPELINE' as TemplateType,
    icon: ArrowRightCircle,
    label: 'Pipeline',
    description: 'Fluxo de vendas (Comercial)',
    color: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  {
    type: 'CAMPAIGN' as TemplateType,
    icon: Megaphone,
    label: 'Campaign',
    description: 'Fluxo de marketing (Marketing/Comunicação)',
    color: 'bg-pink-50',
    borderColor: 'border-pink-200',
  },
];

export default function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-amber-900">Selecione o Template *</h3>
            <p className="text-xs text-amber-800">
              O template define o fluxo de status do projeto. <strong className="text-amber-900">Esta escolha é obrigatória e não pode ser alterada após a criação do projeto.</strong>
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => {
          const Icon = template.icon;
          const workflowStatuses = TEMPLATE_WORKFLOWS[template.type];
          const statusList = Object.values(workflowStatuses).map(s => s.display_name).join(' → ');
          
          return (
            <Card
              key={template.type}
              className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${template.color} ${template.borderColor} border-2`}
              onClick={() => onSelect(template.type)}
            >
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-white p-2 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-semibold">{template.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {template.description}
                </p>
                <div className="rounded-lg bg-white/60 p-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Fluxo de status:</p>
                  <p className="text-xs text-foreground">{statusList}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}