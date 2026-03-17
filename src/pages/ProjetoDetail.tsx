import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useProjectAccess } from '@/hooks/useProjectAccess';
import AccessDenied from '@/components/AccessDenied';
import ProjectMembersSection from '@/components/projects/ProjectMembersSection';
import { ArrowLeft, Calendar, User, Users, FolderKanban, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import ProjectCard from '@/components/projects/ProjectCard';

export default function ProjetoDetail() {
  const { projectId } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canView, canEdit, canManageMembers, isLoading, project } = useProjectAccess(String(projectId ?? ''));
  
  const [projectWithRelations, setProjectWithRelations] = useState<any>(null);
  const [tasksCount, setTasksCount] = useState(0);
  const [loadingDetails, setLoadingDetails] = useState(true);

  useEffect(() => {
    async function loadProjectDetails() {
      if (!projectId || isLoading) return;
      
      setLoadingDetails(true);
      try {
        // Load project with owner and department
        const { data: projData, error: projError } = await supabase
          .from('projects')
          .select(`
            *,
            owner:profiles!fk_projects_owner_user_id(id, name, avatar_url),
            project_members:project_members(
              user_id,
              role_in_project,
              user:profiles!fk_project_members_user_id(id, name, avatar_url)
            )
          `)
          .eq('id', projectId)
          .maybeSingle();

        if (projError) throw projError;
        
        // Load department separately since there's no FK constraint
        let departmentData = null;
        if (projData?.department_id) {
          const { data: dept } = await supabase
            .from('departments')
            .select('id, name')
            .eq('id', projData.department_id)
            .maybeSingle();
          departmentData = dept;
        }
        
        const projWithDept = { ...projData, department: departmentData };
        
        // Load tasks count
        const { count, error: countError } = await supabase
          .from('work_items')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId);

        if (countError) throw countError;

        setProjectWithRelations(projWithDept);
        setTasksCount(count ?? 0);
      } catch (err: any) {
        toast({ title: 'Erro ao carregar detalhes', description: err.message || String(err), variant: 'destructive' });
      } finally {
        setLoadingDetails(false);
      }
    }

    loadProjectDetails();
  }, [projectId, isLoading]);

  if (isLoading || loadingDetails) return <div className="p-6">Carregando...</div>;
  if (!canView) return <AccessDenied />;
  
  const proj = projectWithRelations || project;
  if (!proj) return <div className="p-6">Projeto não encontrado</div>;

  const memberCount = Array.isArray(proj.project_members) ? proj.project_members.length : 0;

  return (
    <div className="mx-auto max-w-5xl grid gap-6 pb-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/app/projetos/lista" className="hover:text-[color:var(--sinaxys-primary)]">
          Projetos
        </Link>
        <span>/</span>
        <span className="text-[color:var(--sinaxys-primary)]">{proj.name}</span>
        <span>/</span>
        <span className="text-[color:var(--sinaxys-ink)]">Detalhes</span>
      </nav>

      {/* Main Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Button 
              variant="ghost" 
              className="mb-4" 
              onClick={() => navigate('/app/projetos/lista')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold">{proj.name}</h1>
            
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
              <div className="flex items-center gap-1">
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                Status: 
                <span className="font-medium text-[color:var(--sinaxys-ink)]">
                  {proj.status === 'not_started' ? 'Não iniciado' :
                   proj.status === 'on_track' ? 'No prazo' :
                   proj.status === 'at_risk' ? 'Em risco' :
                   proj.status === 'delayed' ? 'Atrasado' :
                   proj.status === 'completed' ? 'Concluído' : proj.status}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                Visibilidade: <span className="font-medium text-[color:var(--sinaxys-ink)]">
                  {proj.visibility === 'public' ? 'Público' : 'Privado'}
                </span>
              </div>
            </div>

            {proj.description && (
              <p className="mt-4 text-sm text-muted-foreground">{proj.description}</p>
            )}

            {/* Details Grid */}
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 mt-6">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <div className="text-muted-foreground">Responsável</div>
                  <div className="font-medium text-[color:var(--sinaxys-ink)]">
                    {proj.owner?.name || '—'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <div className="text-muted-foreground">Departamento</div>
                  <div className="font-medium text-[color:var(--sinaxys-ink)]">
                    {proj.department?.name || '—'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <div className="text-muted-foreground">Início</div>
                  <div className="font-medium text-[color:var(--sinaxys-ink)]">
                    {proj.start_date ? format(new Date(proj.start_date), 'dd/MM/yyyy') : '—'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <div className="text-muted-foreground">Prazo</div>
                  <div className="font-medium text-[color:var(--sinaxys-ink)]">
                    {proj.due_date ? format(new Date(proj.due_date), 'dd/MM/yyyy') : '—'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <div className="text-muted-foreground">Membros</div>
                  <div className="font-medium text-[color:var(--sinaxysys-ink)]">
                    {memberCount}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <div className="text-muted-foreground">Tarefas</div>
                  <div className="font-medium text-[color:var(--sinaxys-ink)]">
                    {tasksCount}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <div className="text-muted-foreground">Criado em</div>
                  <div className="font-medium text-[color:var(--sinaxysys-ink)]">
                    {proj.created_at ? format(new Date(proj.created_at), 'dd/MM/yyyy') : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              {canEdit && (
                <Button onClick={() => navigate(`/app/projetos/${projectId}/editar`)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Editar projeto
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => navigate(`/app/projetos/${projectId}/tarefas`)}
              >
                <FolderKanban className="mr-2 h-4 w-4" />
                Ver tarefas
              </Button>
            </div>
          </div>
        </div>
      </Card>

        {canManageMembers && <ProjectMembersSection projectId={String(projectId)} />}

        {/* Tasks Preview */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Tarefas</h3>
            <Button variant="outline" onClick={() => navigate(`/app/projetos/${projectId}/tarefas`)}>
              Ver todas
            </Button>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            {tasksCount > 0 
              ? `Este projeto possui ${tasksCount} tarefa${tasksCount > 1 ? 's' : ''}`
              : 'Nenhuma tarefa cadastrada neste projeto ainda.'}
          </div>
        </Card>
    </div>
  );
}
