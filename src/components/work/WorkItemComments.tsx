import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WorkItemCommentsProps {
  workItemId: string;
  onUpdate?: () => void;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user: {
    name: string;
    avatar_url: string | null;
  };
}

export function WorkItemComments({ workItemId, onUpdate }: WorkItemCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchComments();
  }, [workItemId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('work_item_comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          user:profiles!work_item_comments_user_id_fkey(
            name,
            avatar_url
          )
        `)
        .eq('work_item_id', workItemId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Transformar o array de user em objeto único
      const transformedData = (data || []).map((comment: any) => ({
        ...comment,
        user: Array.isArray(comment.user) ? comment.user[0] : comment.user
      })).filter((comment: any) => comment.user !== null);
      
      setComments(transformedData);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('work_item_comments')
        .insert({
          work_item_id: workItemId,
          user_id: userData.user.id,
          content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment('');
      fetchComments();
      onUpdate?.();
      toast({
        title: 'Comentário adicionado',
        description: 'Seu comentário foi adicionado com sucesso.',
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o comentário.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
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
    return <div className="text-sm text-muted-foreground">Carregando comentários...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">
        Comentários ({comments.length})
      </h3>

      {/* Comments list */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                {comment.user.avatar_url ? (
                  <img src={comment.user.avatar_url} alt={comment.user.name} />
                ) : (
                  <AvatarFallback className="text-xs">
                    {getInitials(comment.user.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {comment.user.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add comment */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Adicione um comentário..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              addComment();
            }
          }}
          className="min-h-[60px] resize-none"
          disabled={submitting}
        />
        <Button
          size="icon"
          onClick={addComment}
          disabled={!newComment.trim() || submitting}
          className="self-end"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}