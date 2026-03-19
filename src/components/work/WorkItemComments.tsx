import { useState, useEffect, useRef } from 'react';
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
import { useCompany } from '@/lib/company';
import * as workItemCommentsDb from '@/lib/workItemCommentsDb';
import { MentionAutocomplete, type User as MentionUser } from '@/components/comments/MentionAutocomplete';

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

function normalizeMentionToken(value: string) {
  try {
    return value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9._-]/g, '');
  } catch {
    return String(value)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9._-]/g, '');
  }
}

function getMentionToken(user: MentionUser) {
  const emailPrefix = user.email.split('@')[0] ?? '';
  return normalizeMentionToken(emailPrefix || user.name || user.id);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);

  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionStartIndex, setMentionStartIndex] = useState(0);

  const [showEditMentionMenu, setShowEditMentionMenu] = useState(false);
  const [editMentionSearch, setEditMentionSearch] = useState('');
  const [editMentionPosition, setEditMentionPosition] = useState({ top: 0, left: 0 });
  const [editMentionStartIndex, setEditMentionStartIndex] = useState(0);

  useEffect(() => {
    void fetchComments();
  }, [workItemId]);

  useEffect(() => {
    if (highlightCommentId && commentsContainerRef.current) {
      setTimeout(() => {
        const commentElement = document.getElementById(`comment-${highlightCommentId}`);
        if (commentElement) {
          commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      const hasSpaceAfterAt = textAfterAt.includes(' ');

      if (!hasSpaceAfterAt) {
        const rect = textarea.getBoundingClientRect();
        const top = rect.bottom + window.scrollY + 5;
        const left = rect.left + window.scrollX;

        if (isEdit) {
          setEditMentionSearch(textAfterAt);
          setEditMentionPosition({ top, left });
          setEditMentionStartIndex(lastAtIndex);
          setShowEditMentionMenu(true);
          setShowMentionMenu(false);
        } else {
          setMentionSearch(textAfterAt);
          setMentionPosition({ top, left });
          setMentionStartIndex(lastAtIndex);
          setShowMentionMenu(true);
          setShowEditMentionMenu(false);
        }
        return;
      }
    }

    setShowMentionMenu(false);
    setShowEditMentionMenu(false);
  };

  const handleMentionSelect = (mentionedUser: MentionUser, isEdit = false) => {
    const token = getMentionToken(mentionedUser);

    if (isEdit) {
      const beforeMention = editingContent.substring(0, editMentionStartIndex);
      const afterMention = editingContent.substring(editMentionStartIndex + editMentionSearch.length + 1);
      const newContent = `${beforeMention}@${token} ${afterMention}`;
      setEditingContent(newContent);
      setShowEditMentionMenu(false);

      setTimeout(() => {
        editTextareaRef.current?.focus();
        editTextareaRef.current?.setSelectionRange(
          editMentionStartIndex + token.length + 2,
          editMentionStartIndex + token.length + 2,
        );
      }, 0);

      return;
    }

    const beforeMention = newComment.substring(0, mentionStartIndex);
    const afterMention = newComment.substring(mentionStartIndex + mentionSearch.length + 1);
    const newContent = `${beforeMention}@${token} ${afterMention}`;
    setNewComment(newContent);
    setShowMentionMenu(false);

    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(
        mentionStartIndex + token.length + 2,
        mentionStartIndex + token.length + 2,
      );
    }, 0);
  };

  const buildMentionFeedback = (
    result: Awaited<ReturnType<typeof workItemCommentsDb.addComment>>,
    action: 'criado' | 'editado',
  ) => {
    const mentions = result.mentionTokens.length;
    const notified = result.mentionedUserIds.length;
    const notifErrors = result.notifErrors.length;

    if (mentions === 0) {
      return {
        title: `Comentário ${action}`,
        description: 'Seu comentário foi salvo com sucesso.',
      };
    }

    if (notified > 0 && notifErrors === 0) {
      return {
        title: `Comentário ${action}`,
        description: `${notified} pessoa${notified > 1 ? 's foram' : ' foi'} notificada${notified > 1 ? 's' : ''}.`,
      };
    }

    if (notified > 0 && notifErrors > 0) {
      return {
        title: `Comentário ${action}`,
        description: `${notified} pessoa${notified > 1 ? 's foram' : ' foi'} notificada${notified > 1 ? 's' : ''}, mas ${notifErrors} notificação(ões) falharam.`,
      };
    }

    return {
      title: `Comentário ${action}`,
      description: 'A menção foi salva, mas nenhuma pessoa válida foi notificada.',
    };
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const result = await workItemCommentsDb.addCommentWithNotify(workItemId, userData.user.id, newComment.trim());

      setNewComment('');
      await fetchComments();
      onUpdate?.();

      const feedback = buildMentionFeedback(result, 'criado');
      toast(feedback);
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

      const result = await workItemCommentsDb.updateComment(editingCommentId, userData.user.id, editingContent.trim());

      setEditingCommentId(null);
      setEditingContent('');
      await fetchComments();
      onUpdate?.();

      toast({
        title: 'Comentário editado',
        description: result ? 'Seu comentário foi atualizado com sucesso.' : 'Seu comentário foi salvo.',
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
      await fetchComments();
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
      .map((part) => part[0])
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
      if (!match) return;

      const displayName = match.name.trim();
      const tokenRegex = new RegExp(`@${escapeRegExp(token)}`, 'g');
      const displayStartsWithToken = displayName.toLowerCase().startsWith(token.toLowerCase());

      if (displayStartsWithToken) {
        const remainder = displayName.slice(token.length).trim();
        if (remainder) {
          const fullNameRegex = new RegExp(`@${escapeRegExp(token)}(?:\\s+${escapeRegExp(remainder)})?`, 'g');
          result = result.replace(fullNameRegex, `@${displayName}`);
          return;
        }
      }

      result = result.replace(tokenRegex, `@${displayName}`);
    });

    const parts = result.split(/(@[\w.\-]+)/g);
    return parts.map((part, index) => {
      if (!part.startsWith('@')) {
        return part;
      }

      return (
        <span
          key={index}
          className="rounded-md bg-violet-500/15 px-1.5 py-0.5 font-semibold text-violet-200"
        >
          {part}
        </span>
      );
    });
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando comentários...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Comentários ({comments.length})</h3>

      <div ref={commentsContainerRef} className="max-h-60 space-y-3 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              id={`comment-${comment.id}`}
              className={`group flex gap-3 transition-all duration-300 ${
                highlightCommentId === comment.id ? 'rounded-lg p-2 ring-2 ring-blue-500 ring-offset-2' : ''
              }`}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                {comment.avatar_url ? (
                  <img src={comment.avatar_url} alt={comment.user_name} />
                ) : (
                  <AvatarFallback className="text-xs">{getInitials(comment.user_name)}</AvatarFallback>
                )}
              </Avatar>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{comment.user_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>

                {editingCommentId === comment.id ? (
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
                      {showEditMentionMenu ? (
                        <MentionAutocomplete
                          search={editMentionSearch}
                          onSelect={(mentionedUser) => handleMentionSelect(mentionedUser, true)}
                          position={editMentionPosition}
                          companyId={companyId}
                          onClose={() => setShowEditMentionMenu(false)}
                        />
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={saveEdit}
                        disabled={!editingContent.trim() || savingEdit}
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                        disabled={savingEdit}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <p className="flex-1 whitespace-pre-wrap text-sm text-foreground">
                      {renderContentWithMentions(comment.content, comment.mentions)}
                    </p>

                    {canEditOrDelete(comment) ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startEditing(comment)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => confirmDelete(comment.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

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
                void addComment();
              }
            }}
            className="min-h-[60px] resize-none"
            disabled={submitting}
          />
          {showMentionMenu ? (
            <MentionAutocomplete
              search={mentionSearch}
              onSelect={(mentionedUser) => handleMentionSelect(mentionedUser, false)}
              position={mentionPosition}
              companyId={companyId}
              onClose={() => setShowMentionMenu(false)}
            />
          ) : null}
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => void addComment()} disabled={!newComment.trim() || submitting}>
            <Send className="mr-1 h-4 w-4" />
            Enviar
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comentário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este comentário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingComment}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void deleteComment()}
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