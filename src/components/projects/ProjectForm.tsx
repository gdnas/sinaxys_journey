import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company';

export default function ProjectForm({ project, onSaved }: { project?: any; onSaved?: (p: any) => void }) {
  const { toast } = useToast();
  const { companyId } = useCompany();
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [ownerUserId, setOwnerUserId] = useState(project?.owner_user_id ?? '');
  const [startDate, setStartDate] = useState(project?.start_date ?? '');
  const [dueDate, setDueDate] = useState(project?.due_date ?? '');
  const [status, setStatus] = useState(project?.status ?? 'not_started');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(project?.name ?? '');
    setDescription(project?.description ?? '');
    setOwnerUserId(project?.owner_user_id ?? '');
    setStartDate(project?.start_date ?? '');
    setDueDate(project?.due_date ?? '');
    setStatus(project?.status ?? 'not_started');
  }, [project]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast({ title: 'Nome é obrigatório', variant: 'destructive' });
    if (!ownerUserId) return toast({ title: 'Responsável é obrigatório', variant: 'destructive' });
    if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) return toast({ title: 'Prazo final não pode ser menor que início', variant: 'destructive' });

    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const tenantId = companyId;

      if (project) {
        // update
        const { data, error } = await supabase
          .from('projects')
          .update({ name, description, owner_user_id: ownerUserId, start_date: startDate || null, due_date: dueDate || null, status })
          .eq('id', project.id)
          .select()
          .maybeSingle();
        if (error) throw error;
        toast({ title: 'Projeto atualizado' });
        onSaved?.(data);
      } else {
        // insert
        const { data, error } = await supabase
          .from('projects')
          .insert([
            {
              tenant_id: tenantId,
              name,
              description,
              owner_user_id: ownerUserId,
              created_by_user_id: user?.id,
              visibility: 'public',
              admin_private_mode: null,
              status,
              start_date: startDate || null,
              due_date: dueDate || null,
            },
          ])
          .select()
          .maybeSingle();

        if (error) throw error;

        // insert project member as owner (ignore duplicate errors)
        await supabase.from('project_members').insert([{ tenant_id: tenantId, project_id: data.id, user_id: ownerUserId, role_in_project: 'owner' }]);

        toast({ title: 'Projeto criado' });
        onSaved?.(data);
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label>Nome</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="grid gap-2">
        <Label>Descrição</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="grid gap-2">
        <Label>Responsável (user id)</Label>
        <Input value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)} required placeholder="ID do usuário (ex.: perfil)" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Data de início</Label>
          <Input type="date" value={startDate ?? ''} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <Label>Prazo final</Label>
          <Input type="date" value={dueDate ?? ''} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Status</Label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border p-2">
          <option value="not_started">Não iniciado</option>
          <option value="on_track">No prazo</option>
          <option value="at_risk">Em risco</option>
          <option value="delayed">Atrasado</option>
          <option value="completed">Concluído</option>
        </select>
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="rounded-xl" disabled={loading}>
          {project ? 'Salvar' : 'Criar projeto'}
        </Button>
      </div>
    </form>
  );
}