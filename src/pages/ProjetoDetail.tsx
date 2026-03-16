import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useProjectAccess } from '@/hooks/useProjectAccess';
import AccessDenied from '@/components/AccessDenied';
import ProjectMembersSection from '@/components/projects/ProjectMembersSection';

export default function ProjetoDetail() {
  const { projectId } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canView, canEdit, canManageMembers, isLoading, project } = useProjectAccess(String(projectId ?? ''));

  if (isLoading) return <div className="p-6">Carregando...</div>;
  if (!canView) return <AccessDenied />;

  if (!project) return <div className="p-6">Projeto não encontrado</div>;

  return (
    <div className="mx-auto max-w-4xl grid gap-6 pb-12">
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <div className="text-sm text-muted-foreground">
              Status: {project.status} • Visibilidade: {project.visibility === 'public' ? 'Público' : 'Privado'}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{project.description}</p>
            <div className="mt-3 text-sm">
              <div>Owner: {project.owner?.name ?? '—'}</div>
              <div>Departamento: {project.department_id ?? '—'}</div>
              <div>Início: {project.start_date ?? '—'}</div>
              <div>Prazo: {project.due_date ?? '—'}</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {canEdit && <Button onClick={() => navigate('editar')}>Editar</Button>}
            <Button variant="outline" onClick={() => navigate('/app/projetos/lista')}>Voltar</Button>
          </div>
        </div>
      </Card>

      {canManageMembers && <ProjectMembersSection projectId={String(projectId)} />}

      <Card className="p-6">
        <h3 className="font-semibold">OKRs (placeholder)</h3>
        <div className="mt-3 text-sm text-muted-foreground">Integração com OKR será implementada futuramente.</div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold">Tarefas (placeholder)</h3>
        <div className="mt-3 text-sm text-muted-foreground">Tarefas por projeto serão implementadas na próxima fase.</div>
      </Card>
    </div>
  );
}
