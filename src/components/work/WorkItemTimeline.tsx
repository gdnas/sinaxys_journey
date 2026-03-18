import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckCircle2, 
  MessageSquare, 
  Plus, 
  GitBranch,
  User,
  Flag,
  Clock
} from 'lucide-react';

interface WorkItemTimelineProps {
  workItemId: string;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, any>;
  created_at: string;
  user: {
    name: string;
    avatar_url: string | null;
  };
}

export function WorkItemTimeline({ workItemId }: WorkItemTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [workItemId]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('work_item_events')
        .select(`
          id,
          event_type,
          old_value,
          new_value,
          metadata,
          created_at,
          user:profiles!work_item_events_user_id_fkey(
            name,
            avatar_url
          )
        `)
        .eq('work_item_id', workItemId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transformar o array de user em objeto único
      const transformedData = (data || []).map((event: any) => ({
        ...event,
        user: Array.isArray(event.user) ? event.user[0] : event.user
      }));
      
      setEvents(transformedData);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return <Plus className="h-4 w-4" />;
      case 'status_changed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'comment_added':
        return <MessageSquare className="h-4 w-4" />;
      case 'subtask_created':
        return <GitBranch className="h-4 w-4" />;
      case 'subtask_completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'assigned':
        return <User className="h-4 w-4" />;
      case 'priority_changed':
        return <Flag className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return 'bg-blue-500';
      case 'status_changed':
        return 'bg-green-500';
      case 'comment_added':
        return 'bg-purple-500';
      case 'subtask_created':
        return 'bg-orange-500';
      case 'subtask_completed':
        return 'bg-green-500';
      case 'assigned':
        return 'bg-indigo-500';
      case 'priority_changed':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getEventTitle = (event: TimelineEvent) => {
    switch (event.event_type) {
      case 'created':
        return 'Tarefa criada';
      case 'status_changed':
        return `Status alterado de "${event.old_value}" para "${event.new_value}"`;
      case 'comment_added':
        return 'Comentário adicionado';
      case 'subtask_created':
        return `Subtarefa criada: "${event.metadata?.subtask_title || event.new_value}"`;
      case 'subtask_completed':
        return `Subtarefa concluída: "${event.metadata?.subtask_title || event.new_value}"`;
      case 'assigned':
        return `Atribuído para "${event.new_value}"`;
      case 'priority_changed':
        return `Prioridade alterada de "${event.old_value}" para "${event.new_value}"`;
      default:
        return 'Evento';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando histórico...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Histórico</h3>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum evento registrado ainda.
        </p>
      ) : (
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={event.id} className="flex gap-3">
              {/* Timeline line */}
              {index !== events.length - 1 && (
                <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border" />
              )}

              {/* Icon */}
              <div
                className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${getEventColor(
                  event.event_type
                )} flex items-center justify-center text-white`}
              >
                {getEventIcon(event.event_type)}
              </div>

              {/* Content */}
              <div className="flex-1 space-y-1 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">
                    {event.user.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(event.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <p className="text-sm text-foreground">
                  {getEventTitle(event)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}