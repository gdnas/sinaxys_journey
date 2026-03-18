import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorkItemSubtasksProps {
  workItemId: string;
  tenantId: string;
  onUpdate?: () => void;
}

interface Subtask {
  id: string;
  title: string;
  status: string;
  completed_at: string | null;
}

export function WorkItemSubtasks({ workItemId, tenantId, onUpdate }: WorkItemSubtasksProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubtasks();
  }, [workItemId]);

  const fetchSubtasks = async () => {
    try {
      const { data, error } = await supabase
        .from('work_items')
        .select('id, title, status, completed_at')
        .eq('parent_id', workItemId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setSubtasks(data || []);
    } catch (error) {
      console.error('Error fetching subtasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('work_items')
        .insert({
          tenant_id: tenantId,
          parent_id: workItemId,
          title: newSubtaskTitle,
          type: 'task',
          status: 'todo',
          priority: 'medium',
          created_by_user_id: userData.user.id,
        });

      if (error) throw error;

      setNewSubtaskTitle('');
      fetchSubtasks();
      onUpdate?.();
      toast({
        title: 'Subtarefa criada',
        description: 'A subtarefa foi adicionada com sucesso.',
      });
    } catch (error) {
      console.error('Error creating subtask:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a subtarefa.',
        variant: 'destructive',
      });
    }
  };

  const toggleSubtask = async (subtask: Subtask) => {
    try {
      const newStatus = subtask.status === 'done' ? 'todo' : 'done';
      const { error } = await supabase
        .from('work_items')
        .update({ status: newStatus })
        .eq('id', subtask.id);

      if (error) throw error;

      fetchSubtasks();
      onUpdate?.();
    } catch (error) {
      console.error('Error toggling subtask:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a subtarefa.',
        variant: 'destructive',
      });
    }
  };

  const deleteSubtask = async (subtaskId: string) => {

  };

  const completedCount = subtasks.filter(s => s.status === 'done').length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando subtarefas...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Subtarefas</h3>
        <span className="text-xs text-muted-foreground">
          {completedCount}/{totalCount} concluídas
        </span>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Subtasks list */}
      <div className="space-y-2">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <Checkbox
              checked={subtask.status === 'done'}
              onCheckedChange={() => toggleSubtask(subtask)}
            />
            <span
              className={`flex-1 text-sm ${
                subtask.status === 'done' ? 'line-through text-muted-foreground' : ''
              }`}
            >
              {subtask.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
              onClick={() => deleteSubtask(subtask.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add new subtask */}
      <div className="flex gap-2">
        <Input
          placeholder="Nova subtarefa..."
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              createSubtask();
            }
          }}
          className="flex-1"
        />
        <Button
          size="icon"
          onClick={createSubtask}
          disabled={!newSubtaskTitle.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}