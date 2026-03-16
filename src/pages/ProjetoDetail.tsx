import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ProjectForm from '@/components/projects/ProjectForm';

export default function ProjetoDetail() {
  const { projectId } = useParams();
  const { toast } = useToast();
  const [project, setProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('projects')
          .select(`*, 
            owner:profiles(id,name,avatar_url), 
            members:project_members(user_id,role_in_project)`)
          .eq('id', projectId)
          .maybeSingle();
        if (error) throw error;
        setProject(data);
      } catch (err: any) {
        toast({ title: 'Erro ao carregar projeto', description: err.message || String(err), variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!project) return <div className="p-6">Projeto não encontrado</div>;

  return (
    <div className="mx-auto max-w-4xl grid gap-6 pb-12">
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <div className="text-sm text-muted-foreground">Status: {project.status}</div>
            <p className="mt-3 text-sm text-muted-foreground">{project.description}</p>
            <div className="mt-3 text-sm">
              <div>Owner: {project.owner?.name ?? '—'}</div>
              <div>Departamento: {project.department_id ?? '—'}</div>
              <div>Início: {project.start_date ?? '—'}</div>
              <div>Prazo: {project.due_date ?? '—'}</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('editar')}>Editar</Button>
            <Button variant="outline" onClick={() => navigate('/app/projetos/lista')}>Voltar</Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold">Membros</h3>
        <div className="mt-3">
          {project.members?.length ? (
            project.members.map((m: any) => (
              <div key={m.user_id} className="flex items-center justify-between py-2">
                <div>{m.user_id}</div>
                <div className="text-sm text-muted-foreground">{m.role_in_project}</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">Nenhum membro</div>
          )}
        </div>
      </Card>

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
