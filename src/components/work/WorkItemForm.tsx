import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useCompany } from '@/lib/company';
import { X } from 'lucide-react';

export default function WorkItemForm({ workItem, projectId, onSaved, onCancel }: { workItem?: any; projectId: string; onSaved?: (p: any) => void; onCancel?: () => void }) {
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
  
  // Available users and tasks for dropdowns
  const [users, setUsers] = useState<any[]>([]);
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);

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

  useEffect(() => {
    async function loadData() {
      try {
        // Load company users
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('company_id', companyId)
          .eq('active', true)
          .order('name', { ascending: true });

        // Load available tasks from project (excluding current task)
        const { data: tasksData } = await supabase
          .from('work_items')
          .select('id, title')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true });

        const filteredTasks = workItem 
          ? tasksData?.filter(t => t.id !== workItem.id) ?? []
          : tasksData ?? [];

        setUsers(usersData ?? []);
        setAvailableTasks(filteredTasks);
      } catch (err) {
        console.error('Error loading data:', err);
      }
    }
    if (companyId && projectId) {
      loadData();
    }
  }, [companyId, projectId, workItem]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast({ title: 'Título é obrigatório', variant: 'destructive' });
    
    setLoading(true);
    try {
      const tenantId = companyId;
      
      if (workItem) {
        const { data, error } = await supabase
          .from('work_items')
          .update({ 
            title, 
            description, 
            status, 
            priority, 
            assignee_user_id: assigneeUserId || null, 
            parent_id: parentTaskId || null, 
            start_date: startDate || null, 
            due_date: dueDate || null 
          })
          .eq('id', workItem.id)
          .select()
          .maybeSingle();
        if (error) throw error;
        toast({ title: 'Tarefa atualizada' });
        onSaved?.(data);
      } else {
        const { data, error } = await supabase
          .from('work_items')
          .insert([{
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
              type: 'task',
            }])
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
    <div className="relative">
      {onCancel && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-0 top-0"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label>Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Título da tarefa" />
        </div>

        <div className="grid gap-2">
          <Label>Descrição</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição detalhada da tarefa" rows={3} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="todo">A fazer</SelectItem>
                <SelectItem value="in_progress">Em progresso</SelectItem>
                <SelectItem value="review">Em revisão</SelectItem>
                <SelectItem value="done">Concluído</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Responsável (opcional)</Label>
          <Select value={assigneeUserId} onValueChange={setAssigneeUserId}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Selecione um responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sem responsável</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Tarefa pai (opcional)</Label>
          <Select value={parentTaskId} onValueChange={setParentTaskId}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Selecione uma tarefa pai" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sem tarefa pai</SelectItem>
              {availableTasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Data de início (opcional)</Label>
            <Input type="date" value={startDate ?? ''} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Prazo final (opcional)</Label>
            <Input type="date" value={dueDate ?? ''} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" className="rounded-xl" disabled={loading}>
            {loading ? 'Salvando...' : workItem ? 'Salvar alterações' : 'Criar tarefa'}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" className="rounded-xl" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
