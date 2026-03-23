/**
 * KAIROOS 2.0 Fase 1: Template Selector Component
 *
 * Componente visual para seleção de template de fluxo de projeto.
 * O template define o fluxo de status e não pode ser alterado após a criação.
 */

import { TemplateType } from '@/lib/templateWorkflowDb';
import { Card } from '@/components/ui/card';
import { 
  LayoutDashboard, 
  CheckCircle2, 
  ArrowRightCircle, 
  Megaphone 
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
      <div>
        <h3 className="text-lg font-semibold">Selecione o Template *</h3>
        <p className="text-sm text-muted-foreground mt-1">
          O template define o fluxo de status do projeto e não pode ser alterado após a criação.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <Card
              key={template.type}
              className={`cursor-pointer transition-all hover:shadow-md ${template.color} ${template.borderColor} border-2`}
              onClick={() => onSelect(template.type)}
            >
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-white p-2 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-semibold">{template.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {template.description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
