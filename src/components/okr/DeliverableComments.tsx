import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, X, Edit2 } from "lucide-react";
import {
  createDeliverableComment,
  updateDeliverableComment,
  deleteDeliverableComment,
  type DbDeliverableComment,
} from "@/lib/okrDb";
import { toast } from "@/components/ui/use-toast";

interface DeliverableCommentsProps {
  deliverableId: string;
  comments: DbDeliverableComment[];
  onCommentsChange: () => void;
  currentUserId: string;
  currentUserAvatar?: string;
  currentUserEmail?: string;
  canEdit: boolean;
}

export function DeliverableComments({
  deliverableId,
  comments,
  onCommentsChange,
  currentUserId,
  currentUserAvatar,
  currentUserEmail,
  canEdit,
}: DeliverableCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      toast({
        title: "Comentário vazio",
        description: "Por favor, escreva algo antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await createDeliverableComment({
        deliverable_id: deliverableId,
        text: newComment.trim(),
        created_by: currentUserId,
      });

      setNewComment("");
      onCommentsChange();
      toast({ title: "Comentário adicionado" });
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Erro ao adicionar comentário",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editText.trim()) {
      toast({
        title: "Comentário vazio",
        description: "Por favor, escreva algo antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateDeliverableComment(commentId, { text: editText.trim() });
      setEditingCommentId(null);
      setEditText("");
      onCommentsChange();
      toast({ title: "Comentário atualizado" });
    } catch (error) {
      console.error("Error updating comment:", error);
      toast({
        title: "Erro ao atualizar comentário",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteDeliverableComment(commentId);
      onCommentsChange();
      toast({ title: "Comentário removido" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Erro ao remover comentário",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const startEditing = (comment: DbDeliverableComment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.text);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditText("");
  };

  const getInitials = (email: string) => {
    return email
      .split("@")[0]
      .split(".")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-semibold">Comentários ({comments.length})</Label>

      {/* Add new comment */}
      {canEdit && (
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={currentUserAvatar} />
            <AvatarFallback className="text-xs">
              {currentUserEmail ? getInitials(currentUserEmail) : "EU"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Escreva um comentário..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] rounded-xl resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSubmitComment();
                }
              }}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitComment}
                disabled={isSubmitting || !newComment.trim()}
                size="sm"
                className="h-8 rounded-xl"
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                {isSubmitting ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            Nenhum comentário ainda
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs">
                  {getInitials(comment.created_by)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {comment.created_by === currentUserId ? "Você" : comment.created_by}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>

                {editingCommentId === comment.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="min-h-[80px] rounded-xl resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEditComment(comment.id)}
                        size="sm"
                        className="h-8 rounded-xl"
                      >
                        Salvar
                      </Button>
                      <Button
                        onClick={cancelEditing}
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-xl"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="group relative">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {comment.text}
                    </p>
                    {canEdit && comment.created_by === currentUserId && (
                      <div className="absolute right-0 top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(comment)}
                          className="h-6 w-6 p-0 rounded-lg"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="h-6 w-6 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}