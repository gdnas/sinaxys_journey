/**
 * KAIROOS 2.0 Fase 1: Template Badge Component
 *
 * Badge visual para exibir o tipo de template do projeto.
 */

import { TemplateType } from '@/lib/templateWorkflowDb';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  CheckCircle2, 
  ArrowRightCircle, 
  Megaphone 
} from 'lucide-react';

interface TemplateBadgeProps {
  templateType: TemplateType;
}

const templateConfig = {
  BUILD: { icon: LayoutDashboard, label: 'Build', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  PROCESS: { icon: CheckCircle2, label: 'Process', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  PIPELINE: { icon: ArrowRightCircle, label: 'Pipeline', color: 'bg-green-100 text-green-700 border-green-300' },
  CAMPAIGN: { icon: Megaphone, label: 'Campaign', color: 'bg-pink-100 text-pink-700 border-pink-300' },
};

export default function TemplateBadge({ templateType }: TemplateBadgeProps) {
  const config = templateConfig[templateType];
  const Icon = config.icon;

  return (
    <Badge className={config.color} variant="outline">
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}
