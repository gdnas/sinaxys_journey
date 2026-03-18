import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, MoreVertical, Pencil, Trash2, X, Check, AtSign } from 'lucide-react';
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
import { useCompany } from '@/lib/company';
import * as workItemCommentsDb from '@/lib/workItemCommentsDb';
import { MentionAutocomplete } from '@/components/comments/MentionAutocomplete';

interface WorkItemCommentsProps {
  workItemId: string;
  highlightCommentId?: string | null;
  onUpdate?: () => void;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  mentions?: { token: string; match: { id: string; name: string } | null }[];
}

export function WorkItemComments({ workItemId, highlightCommentId, onUpdate }: WorkItemCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentsContainerRef = useRef<HTMLDivElement>(null);

  // Estados para edição
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Estados para exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);

  // Estados para menções (novo comentário)
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionStartIndex, setMentionStartIndex] = useState(0);

  // Estados para menções (edição)
  const [showEditMentionMenu, setShowEditMentionMenu] = useState(false);
  const [editMentionSearch, setEditMentionSearch] = useState('');
  const [editMentionPosition, setEditMentionPosition] = useState({ top: 0, left: 0 });
  const [editMentionStartIndex, setEditMentionStartIndex] = useState(0);

  useEffect(() => {
    fetchComments();
  }, [workItemId]);

  // Scroll to highlighted comment
  useEffect(() => {
    if (highlightCommentId && commentsContainerRef.current) {
      // Wait for comments to load
      setTimeout(() => {
        const commentElement = document.getElementById(`comment-${highlightCommentId}`);
        if (commentElement) {
          commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add highlight animation
          commentElement.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
          setTimeout(() => {
            commentElement.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
          }, 3000);
        }
      }, 300);
    }
  }, [highlightCommentId, comments]);

  const fetchComments = async () => {
    try {
      const result = await workItemCommentsDb.getComments(workItemId);
      setComments(result.rows);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>, isEdit = false) => {
    const value = e.target.value;
    const textarea = e.target;

    if (isEdit) {
      setEditingContent(value);
    } else {
      setNewComment(value);
    }

    // Detect @ mention
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);

    // Find the last @ symbol before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Check if there's a space after the @ (meaning we're still typing the mention)
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      const hasSpaceAfterAt = textAfterAt.includes(' ');

      if (!hasSpaceAfterAt) {
        // We're typing a mention
        const search = textAfterAt;
        const rect = textarea.getBoundingClientRect();
        const lineHeight = 24; // approximate line height

        // Calculate position (simplified)
        const top = rect.bottom + window.scrollY + 5;
        const left = rect.left + window.scrollX;

        if (isEdit) {
          setEditMentionSearch(search);
          setEditMentionPosition({ top, left });
          setEditMentionStartIndex(lastAtIndex);
          setShowEditMentionMenu(true);
          setShowMentionMenu(false);
        } else {
          setMentionSearch(search);
          setMentionPosition({ top, left });
          setMentionStartIndex(lastAtIndex);
          setShowMentionMenu(true);
          setShowEditMentionMenu(false);
        }
        return;
      }
    }

    // No mention being typed
    setShowMentionMenu(false);
    setShowEditMentionMenu(false);
  };

  const handleMentionSelect = (userId: string, name: string, isEdit = false) => {
    if (isEdit) {
      const beforeMention = editingContent.substring(0, editMentionStartIndex);
      const afterMention = editingContent.substring(editMentionStartIndex + editMentionSearch.length + 1);
      const newContent = `${beforeMention}@${name} ${afterMention}`;
      setEditingContent(newContent);
      setShowEditMentionMenu(false);
      // Focus back on textarea
      setTimeout(() => {
        editTextareaRef.current?.focus();
        editTextareaRef.current?.setSelectionRange(
          editMentionStartIndex + name.length + 2,
          editMentionStartIndex + name.length + 2
        );
      }, 0);
    } else {
      const beforeMention = newComment.substring(0, mentionStartIndex);
      const afterMention = newComment.substring(mentionStartIndex + mentionSearch.length + 1);
      const newContent = `${beforeMention}@${name} ${afterMention}`;
      setNewComment(newContent);
      setShowMentionMenu(false);
      // Focus back on textarea
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(
          mentionStartIndex + name.length + 2,
          mentionStartIndex + name.length + 2
        );
      }, 0);
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      await workItemCommentsDb.addComment(workItemId, userData.user.id, newComment.trim());

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
    setShowEditMentionMenu(false);
  };

  const saveEdit = async () => {
    if (!editingCommentId || !editingContent.trim()) return;

    setSavingEdit(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      await workItemCommentsDb.updateComment(editingCommentId, userData.user.id, editingContent.trim());

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
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      await workItemCommentsDb.deleteComment(commentToDelete, userData.user.id);

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
    if (comment.user_id === user?.id) return true;
    if (user?.role === 'ADMIN') return true;
    return false;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderContentWithMentions = (content: string, mentions?: Comment['mentions']) => {
    if (!mentions || mentions.length === 0) {
      return content;
    }

    let result = content;
    mentions.forEach(({ token, match }) => {
      if (match) {
        // Replace @token with highlighted version
        const regex = new RegExp(`@${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
        result = result.replace(regex, `@${match.name}`);
      }
    });

    // Simple highlighting for @mentions
    const parts = result.split(/(@[\w.\-]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="font-semibold text-blue-600 bg-blue-50 px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
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
      <div ref={commentsContainerRef} className="space-y-3 max-h-60 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              id={`comment-${comment.id}`}
              className={`flex gap-3 group transition-all duration-300 ${
                highlightCommentId === comment.id ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg p-2' : ''
              }`}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                {comment.avatar_url ? (
                  <img src={comment.avatar_url} alt={comment.user_name} />
                ) : (
                  <AvatarFallback className="text-xs">
                    {getInitials(comment.user_name)}
                  </AvatarFallback>
                )}
              </Avatar>

              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">
                    {comment.user_name}
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
                    <div className="relative">
                      <Textarea
                        ref={editTextareaRef}
                        value={editingContent}
                        onChange={(e) => handleTextareaChange(e, true)}
                        className="min-h-[60px] resize-none text-sm"
                        disabled={savingEdit}
                        autoFocus
                      />
                      {showEditMentionMenu && (
                        <MentionAutocomplete
                          search={editMentionSearch}
                          onSelect={(userId, name) => handleMentionSelect(userId, name, true)}
                          position={editMentionPosition}
                          companyId={companyId}
                          onClose={() => setShowEditMentionMenu(false)}
                        />
                      )}
                    </div>
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
                      {renderContentWithMentions(comment.content, comment.mentions)}
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
      <div className="space-y-2">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            placeholder="Adicione um comentário... Use @ para mencionar alguém"
            value={newComment}
            onChange={(e) => handleTextareaChange(e, false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !showMentionMenu) {
                e.preventDefault();
                addComment();
              }
            }}
            className="min-h-[60px] resize-none"
            disabled={submitting}
          />
          {showMentionMenu && (
            <MentionAutocomplete
              search={mentionSearch}
              onSelect={(userId, name) => handleMentionSelect(userId, name, false)}
              position={mentionPosition}
              companyId={companyId}
              onClose={() => setShowMentionMenu(false)}
            />
          )}
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={addComment}
            disabled={!newComment.trim() || submitting}
          >
            <Send className="h-4 w-4 mr-1" />
            Enviar
          </Button>
        </div>
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