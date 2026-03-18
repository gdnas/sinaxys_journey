import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company';
import { X, ExternalLink, Calendar, User, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WorkItemPriorityBadge from './WorkItemPriorityBadge';
import WorkItemStatusBadge from './WorkItemStatusBadge';

interface KanbanTaskDialogProps {
  taskId: string;
  projectId: string;
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function KanbanTaskDialog({ taskId, projectId, open, onClose, onRefresh }: KanbanTaskDialogProps) {
  const { toast } = useToast();
  const { companyId } = useCompany();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [task, setTask] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (open && taskId) {
      loadTask();
      loadUsers();
    }
  }, [open, taskId]);

  const loadTask = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_items')
        .select('*')
        .eq('id', taskId)
        .maybeSingle();

      if (error) throw error;

      setTask(data);
      setTitle(data?.title ?? '');
      setDescription(data?.description ?? '');
      setStatus(data?.status ?? '');
      setPriority(data?.priority ?? '');
      setAssigneeUserId(data?.assignee_user_id ?? '');
      setStartDate(data?.start_date ?? '');
      setDueDate(data?.due_date ?? '');
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Erro ao carregar tarefa',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('name', { ascending: true });

      setUsers(data ?? []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: 'Título é obrigatório', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('work_items')
        .update({
          title,
          description,
          status,
          priority,
          assignee_user_id: assigneeUserId || null,
          start_date: startDate || null,
          due_date: dueDate || null,
        })
        .eq('id', taskId);

      if (error) throw error;

      toast({ title: 'Tarefa atualizada com sucesso' });
      if (onRefresh) onRefresh();
      onClose();
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Erro ao atualizar tarefa',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGoToPage = () => {
    navigate(`/app/projetos/${projectId}/tarefas/${taskId}/editar`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isOverdue = task?.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <Card className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <WorkItemStatusBadge status={status} />
                <WorkItemPriorityBadge priority={priority} />
              </div>
              <h2 className="text-xl font-bold">{title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleGoToPage}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Página completa
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título da tarefa" />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição detalhada da tarefa"
                  rows={4}
                />
              </div>

              {/* Status and Priority */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
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

                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
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

              {/* Assignee */}
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select value={assigneeUserId} onValueChange={setAssigneeUserId}>
                  <SelectTrigger>
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

              {/* Dates */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de início</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Prazo final</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>

              {/* Meta info */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Criado em:</span>
                  <span>{formatDate(task?.created_at)}</span>
                </div>
                {task?.completed_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-green-600" />
                    <span className="text-muted-foreground">Concluído em:</span>
                    <span className="text-green-600">{formatDate(task.completed_at)}</span>
                  </div>
                )}
                {isOverdue && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>Esta tarefa está atrasada!</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}