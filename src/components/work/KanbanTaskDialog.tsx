import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company';
import { X, ExternalLink, Calendar, User, Clock, AlertCircle, Save } from 'lucide-react';
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
  const [assigneeUserId, setAssigneeUserId] = useState('__none__');
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
      setAssigneeUserId(data?.assignee_user_id ?? '__none__');
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
          assignee_user_id: assigneeUserId === '__none__' ? null : assigneeUserId,
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <Card className="border-border/50 shadow-xl">
          {/* Header - Task View Style */}
          <div className="p-6 border-b border-border/50">
            <div className="flex items-start justify-between gap-4 mb-4">
              {/* Status and Priority */}
              <div className="flex items-center gap-2">
                <WorkItemStatusBadge status={status} />
                <WorkItemPriorityBadge priority={priority} />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleGoToPage} className="text-muted-foreground hover:text-foreground">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Página completa
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Title - Inline Edit */}
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da tarefa"
              className="text-2xl font-bold border-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto py-0"
            />
          </div>

          {loading ? (
            <div className="p-6 text-center">Carregando...</div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Description - Inline Edit */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Adicione uma descrição..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Properties Grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
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

                {/* Priority */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Prioridade</Label>
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

                {/* Assignee */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Responsável</Label>
                  <Select value={assigneeUserId} onValueChange={setAssigneeUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem responsável</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Prazo final</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>

              {/* Meta Info */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Criado em:</span>
                  <span className="font-medium">{formatDate(task?.created_at)}</span>
                </div>
                {task?.completed_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-green-600" />
                    <span className="text-muted-foreground">Concluído em:</span>
                    <span className="font-medium text-green-600">{formatDate(task.completed_at)}</span>
                  </div>
                )}
                {isOverdue && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Esta tarefa está atrasada!</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <Button variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}