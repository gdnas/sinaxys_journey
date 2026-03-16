import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useCompany } from '@/lib/company';

export default function WorkItemForm({ workItem, projectId, onSaved }: { workItem?: any; projectId: string; onSaved?: (p: any) => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const [title, setTitle] = useState(workItem?.title ?? '');
  const [description, setDescription] = useState(workItem?.description ?? '');
  const [status, setStatus] = useState(workItem?.status ?? 'todo');
  const [priority, setPriority] = useState(workItem?.priority ?? 'medium');
  const [assigneeUserId, setAssigneeUserId] = useState(workItem?.assignee_user_id ?? '');
  const [parentTaskId, setParentTaskId] = useState(workItem?.parent_id ?? '');
  const [startDate, setStartDate] = useState(workItem?.start_date ?? '');
  const [dueDate, setDueDate] = useState(workItem?.due_date ?? '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTitle(workItem?.title ?? '');
    setDescription(workItem?.description ?? '');
    setStatus(workItem?.status ?? 'todo');
    setPriority(workItem?.priority ?? 'medium');
    setAssigneeUserId(workItem?.assignee_user_id ?? '');
    setParentTaskId(workItem?.parent_id ?? '');
    setStartDate(workItem?.start_date ?? '');
    setDueDate(workItem?.due_date ?? '');
  }, [workItem]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast({ title: 'Título é obrigatório', variant: 'destructive' });

    setLoading(true);
    try {
      const tenantId = companyId;

      if (workItem) {
        const { data, error } = await supabase
          .from('work_items')
          .update({ title, description, status, priority, assignee_user_id: assigneeUserId || null, parent_id: parentTaskId || null, start_date: startDate || null, due_date: dueDate || null })
          .eq('id', workItem.id)
          .select()
          .maybeSingle();
        if (error) throw error;
        toast({ title: 'Tarefa atualizada' });
        onSaved?.(data);
      } else {
        const { data, error } = await supabase
          .from('work_items')
          .insert([
            {
              tenant_id: tenantId,
              project_id: projectId,
              title,
              description,
              status,
              priority,
              assignee_user_id: assigneeUserId || null,
              created_by_user_id: user?.id,
              parent_id: parentTaskId || null,
              start_date: startDate || null,
              due_date: dueDate || null,
            },
          ])
          .select()
          .maybeSingle();

        if (error) throw error;
        toast({ title: 'Tarefa criada' });
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
        <Label>Titulo</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Titulo da tarefa" />
      </div>

      <div className="grid gap-2">
        <Label>Descricao</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descricao detalhada da tarefa" rows={3} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Status</Label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border p-2">
            <option value="backlog">Backlog</option>
            <option value="todo">A fazer</option>
            <option value="in_progress">Em progresso</option>
            <option value="review">Em revisao</option>
            <option value="done">Concluido</option>
            <option value="blocked">Bloqueado</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Prioridade</Label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-xl border p-2">
            <option value="low">Baixa</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Responsavel (user id - opcional)</Label>
        <Input value={assigneeUserId} onChange={(e) => setAssigneeUserId(e.target.value)} placeholder="ID do usuario responsavel" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Data de inicio (opcional)</Label>
          <Input type="date" value={startDate ?? ''} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Prazo final (opcional)</Label>
          <Input type="date" value={dueDate ?? ''} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Tarefa pai (opcional)</Label>
        <Input value={parentTaskId} onChange={(e) => setParentTaskId(e.target.value)} placeholder="ID da tarefa pai para hierarquia" />
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="rounded-xl" disabled={loading}>
          {loading ? 'Salvando...' : workItem ? 'Salvar alteracoes' : 'Criar tarefa'}
        </Button>
      </div>
    </form>
  );
}
