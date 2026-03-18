import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, MoreVertical, Pencil, Trash2, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/auth';

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
  const { user } = useAuth();

  // Estados para edição
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Estados para exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);

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

  const startEditing = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  const saveEdit = async () => {
    if (!editingCommentId || !editingContent.trim()) return;

    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('work_item_comments')
        .update({
          content: editingContent.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingCommentId);

      if (error) throw error;

      setEditingCommentId(null);
      setEditingContent('');
      fetchComments();
      onUpdate?.();
      toast({
        title: 'Comentário editado',
        description: 'Seu comentário foi atualizado com sucesso.',
      });
    } catch (error) {
      console.error('Error editing comment:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível editar o comentário.',
        variant: 'destructive',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = (commentId: string) => {
    setCommentToDelete(commentId);
    setDeleteDialogOpen(true);
  };

  const deleteComment = async () => {
    if (!commentToDelete) return;

    setDeletingComment(true);
    try {
      const { error } = await supabase
        .from('work_item_comments')
        .delete()
        .eq('id', commentToDelete);

      if (error) throw error;

      setDeleteDialogOpen(false);
      setCommentToDelete(null);
      fetchComments();
      onUpdate?.();
      toast({
        title: 'Comentário excluído',
        description: 'O comentário foi removido com sucesso.',
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o comentário.',
        variant: 'destructive',
      });
    } finally {
      setDeletingComment(false);
    }
  };

  const canEditOrDelete = (comment: Comment) => {
    // Usuário pode editar/excluir seus próprios comentários
    if (comment.user_id === user?.id) return true;
    
    // ADMIN pode editar/excluir qualquer comentário
    if (user?.role === 'ADMIN') return true;
    
    return false;
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
            <div key={comment.id} className="flex gap-3 group">
              <Avatar className="h-8 w-8 flex-shrink-0">
                {comment.user.avatar_url ? (
                  <img src={comment.user.avatar_url} alt={comment.user.name} />
                ) : (
                  <AvatarFallback className="text-xs">
                    {getInitials(comment.user.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
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

                {editingCommentId === comment.id ? (
                  // Modo de edição
                  <div className="space-y-2">
                    <Textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="min-h-[60px] resize-none text-sm"
                      disabled={savingEdit}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={saveEdit}
                        disabled={!editingContent.trim() || savingEdit}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                        disabled={savingEdit}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Modo de visualização
                  <div className="flex items-start gap-2">
                    <p className="text-sm text-foreground whitespace-pre-wrap flex-1">
                      {comment.content}
                    </p>
                    
                    {canEditOrDelete(comment) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startEditing(comment)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => confirmDelete(comment.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )}
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

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comentário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este comentário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingComment}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteComment}
              disabled={deletingComment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingComment ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}