import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import ProjectForm from '@/components/projects/ProjectForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function ProjetoEdit() {
  const { projectId } = useParams();
  const [project, setProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();
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

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Editar projeto</h2>
        {loading ? <div>Carregando...</div> : <ProjectForm project={project} onSaved={() => navigate(`/app/projetos/${projectId}`)} />}
      </Card>
    </div>
  );
}
