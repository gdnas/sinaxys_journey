import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useProjectAccess } from '@/hooks/useProjectAccess';
import AccessDenied from '@/components/AccessDenied';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProjectMembersSection({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const { canManageMembers, isLoading, project } = useProjectAccess(projectId);
  const [members, setMembers] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [candidates, setCandidates] = useState<any[]>([]);

  async function loadMembers() {
    if (!projectId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select('id,user_id,role_in_project,created_at,profiles(id,name,avatar_url)')
        .eq('project_id', projectId);
      if (error) throw error;
      setMembers((data ?? []) as any[]);
    } catch (err: any) {
      toast({ title: 'Erro ao carregar membros', description: err.message || String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMembers();
  }, [projectId]);

  // Load candidate profiles for the tenant (for adding members) when we have project
  useEffect(() => {
    async function loadCandidates() {
      if (!project?.tenant_id) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('company_id', project.tenant_id)
          .eq('active', true)
          .order('name', { ascending: true });
        if (error) throw error;
        setCandidates(data ?? []);
      } catch (err) {
        console.error('Error loading candidate profiles:', err);
        setCandidates([]);
      }
    }
    loadCandidates();
  }, [project?.tenant_id]);

  async function handleAdd() {
    if (!newUserId) return toast({ title: 'Selecione um usuário', variant: 'destructive' });
    if (members.some((m) => m.user_id === newUserId)) return toast({ title: 'Usuário já é membro', variant: 'destructive' });
    setAdding(true);
    try {
      // Get tenant_id from the project
      const { data: proj } = await supabase.from('projects').select('tenant_id').eq('id', projectId).single();
      if (!proj?.tenant_id) throw new Error('Projeto não encontrado');
      // Insert member with tenant_id - RLS will enforce permission
      const { data, error } = await supabase.from('project_members').insert([{ tenant_id: proj.tenant_id, project_id: projectId, user_id: newUserId, role_in_project: 'member' }]).select();
      if (error) throw error;
      toast({ title: 'Membro adicionado' });
      setNewUserId('');
      await loadMembers();
    } catch (err: any) {
      toast({ title: 'Erro ao adicionar membro', description: err.message || String(err), variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm('Remover este membro do projeto?')) return;
    setLoading(true);
    try {
      // RLS will enforce permission - only owner or ADMIN can delete members
      const { error } = await supabase.from('project_members').delete().match({ project_id: projectId, user_id: userId });
      if (error) throw error;
      toast({ title: 'Membro removido' });
      await loadMembers();
    } catch (err: any) {
      toast({ title: 'Erro ao remover membro', description: err.message || String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) return <Card className="p-4"><div className="text-sm text-muted-foreground">Carregando...</div></Card>;

  if (!canManageMembers) {
    return <AccessDenied message="Você não tem permissão para gerenciar membros. Apenas o owner e admins podem adicionar/remover membros." />;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Membros</h4>
        <div className="text-sm text-muted-foreground">{members.length} membros</div>
      </div>

      <div className="mt-3 grid gap-3">
        {members.length ? members.map((m) => (
          <div key={m.user_id} className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-medium">{m.profiles?.name ?? m.user_id}</div>
              <div className="text-xs text-muted-foreground">{m.role_in_project}</div>
            </div>
            <div>
              <Button variant="ghost" size="sm" onClick={() => handleRemove(m.user_id)}>Remover</Button>
            </div>
          </div>
        )) : <div className="text-sm text-muted-foreground">Nenhum membro</div>}

        <div className="pt-2 border-t mt-2">
          <div className="flex gap-2 items-center">
            <Select value={newUserId} onValueChange={setNewUserId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um usuário pelo nome ou email" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Selecione...</SelectItem>
                {candidates.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={adding || !newUserId}>Adicionar</Button>
          </div>
          <div className="text-xs text-muted-foreground mt-2">Adicione membros pelo nome ou email. O usuário selecionado será adicionado ao projeto.</div>
        </div>
      </div>
    </Card>
  );
}