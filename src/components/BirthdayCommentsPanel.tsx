import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Heart } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  getBirthdayComments,
  createBirthdayComment,
  updateBirthdayComment,
  deleteBirthdayComment,
  enrichBirthdayCommentsWithAuthors,
  getBirthdayCommentLikes,
  toggleBirthdayCommentLike,
  isCommentLikedByUser,
} from "@/lib/internalCommunicationDb";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface BirthdayCommentsPanelProps {
  birthdayEvent: any;
  onClose: () => void;
}

export function BirthdayCommentsPanel({ birthdayEvent, onClose }: BirthdayCommentsPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<{ id: string; content: string } | null>(null);

  const { data: comments, isLoading } = useQuery({
    queryKey: ["birthday-comments", birthdayEvent.id],
    queryFn: async () => {
      const raw = await getBirthdayComments(birthdayEvent.id);
      const enriched = await enrichBirthdayCommentsWithAuthors(raw);
      
      // Fetch likes for each comment
      const commentsWithLikes = await Promise.all(
        enriched.map(async (comment) => {
          const [likes, isLiked] = await Promise.all([
            getBirthdayCommentLikes(comment.id),
            user ? isCommentLikedByUser(comment.id, user.id) : Promise.resolve(false),
          ]);
          return {
            ...comment,
            likes,
            isLiked,
            likeCount: likes.length,
          };
        })
      );
      
      return commentsWithLikes;
    },
    enabled: !!birthdayEvent.id,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async (content: string) => {
      const comment = await createBirthdayComment(birthdayEvent.id, user!.id, content);

      // Send notification
      try {
        await supabase.functions.invoke("notifications-internal-communication", {
          body: {
            action: "birthday_comment",
            payload: {
              eventId: birthdayEvent.id,
              authorUserId: user!.id,
              authorName: user!.name,
              companyId: birthdayEvent.company_id,
            },
          },
        });
      } catch (error) {
        console.error("[BirthdayCommentsPanel] Failed to send notification:", error);
      }

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["birthday-comments", birthdayEvent.id] });
      setNewComment("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      updateBirthdayComment(commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["birthday-comments", birthdayEvent.id] });
      setEditingComment(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => deleteBirthdayComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["birthday-comments", birthdayEvent.id] });
    },
  });

  const likeMutation = useMutation({
    mutationFn: (commentId: string) =>
      toggleBirthdayCommentLike(commentId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["birthday-comments", birthdayEvent.id] });
    },
  });

  const handleSubmit = () => {
    if (newComment.trim()) {
      createMutation.mutate(newComment.trim());
    }
  };

  const handleUpdate = () => {
    if (editingComment && editingComment.content.trim()) {
      updateMutation.mutate({
        commentId: editingComment.id,
        content: editingComment.content.trim(),
      });
    }
  };

  const handleLike = (commentId: string) => {
    if (!user) return;
    likeMutation.mutate(commentId);
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 border-b pb-4">
        {birthdayEvent.employee_avatar ? (
          <Avatar className="h-16 w-16 border-4 border-pink-200">
            <AvatarImage src={birthdayEvent.employee_avatar} alt={birthdayEvent.employee_name} />
            <AvatarFallback className="bg-gradient-to-br from-pink-500 to-rose-500 text-xl text-white">
              {getInitials(birthdayEvent.employee_name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <Avatar className="h-16 w-16 border-4 border-pink-200 bg-gradient-to-br from-pink-500 to-rose-500 text-white">
            <AvatarFallback className="text-xl">{getInitials(birthdayEvent.employee_name)}</AvatarFallback>
          </Avatar>
        )}
        <div>
          <h3 className="text-xl font-bold text-gray-900">Parabéns, {birthdayEvent.employee_name}! 🎉</h3>
          <p className="text-sm text-muted-foreground">
            {birthdayEvent.employee_job_title && <span>{birthdayEvent.employee_job_title}</span>}
            {birthdayEvent.employee_job_title && birthdayEvent.employee_department_name && <span> • </span>}
            {birthdayEvent.employee_department_name && <span>{birthdayEvent.employee_department_name}</span>}
          </p>
        </div>
      </div>

      {/* Comment Form */}
      <div className="space-y-2">
        <Textarea
          placeholder="Escreva uma mensagem de parabéns..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="min-h-[80px] resize-none rounded-xl"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Fechar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || createMutation.isPending}
            className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
          >
            {createMutation.isPending ? "Enviando..." : "Enviar mensagem 🎊"}
          </Button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground">
          Mensagens ({comments?.length ?? 0})
        </h4>
        <ScrollArea className="h-[300px] rounded-xl border">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-sm text-muted-foreground">Carregando mensagens...</div>
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="space-y-4 p-4">
              {comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-3">
                  {comment.author_avatar ? (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.author_avatar} alt={comment.author_name} />
                      <AvatarFallback className="text-xs">
                        {getInitials(comment.author_name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Avatar className="h-8 w-8 bg-gray-200">
                      <AvatarFallback className="text-xs">
                        {getInitials(comment.author_name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{comment.author_name}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                    </div>
                    {editingComment?.id === comment.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingComment.content}
                          onChange={(e) =>
                            setEditingComment({ ...editingComment, content: e.target.value })
                          }
                          className="min-h-[60px] resize-none rounded-lg text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingComment(null)}
                            className="h-8 rounded-lg"
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleUpdate}
                            disabled={updateMutation.isPending}
                            className="h-8 rounded-lg bg-purple-600 hover:bg-purple-700"
                          >
                            {updateMutation.isPending ? "Salvando..." : "Salvar"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="group relative">
                        <p className="text-sm text-gray-700">{comment.content}</p>
                        
                        {/* Actions */}
                        <div className="mt-2 flex items-center gap-2">
                          {/* Like button */}
                          <button
                            onClick={() => handleLike(comment.id)}
                            disabled={!user || likeMutation.isPending}
                            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors ${
                              comment.isLiked
                                ? "bg-pink-100 text-pink-600"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            <Heart
                              className={`h-3.5 w-3.5 ${comment.isLiked ? "fill-pink-600" : ""}`}
                            />
                            {comment.likeCount > 0 && (
                              <span className="font-medium">{comment.likeCount}</span>
                            )}
                          </button>

                          {/* Edit/Delete buttons */}
                          {(comment.author_user_id === user?.id || user?.role === "ADMIN" || user?.role === "MASTERADMIN") && (
                            <button
                              onClick={() => {
                                if (comment.author_user_id === user?.id) {
                                  setEditingComment({ id: comment.id, content: comment.content });
                                } else {
                                  if (window.confirm("Deseja excluir este comentário?")) {
                                    deleteMutation.mutate(comment.id);
                                  }
                                }
                              }}
                              className="h-6 w-6 rounded-full bg-gray-200 text-gray-600 transition-opacity group-hover:block hover:bg-red-100 hover:text-red-600"
                            >
                              {comment.author_user_id === user?.id ? (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="mb-3 text-4xl">💬</div>
              <p className="text-sm text-muted-foreground">
                Nenhuma mensagem ainda. Seja o primeiro a parabenizar!
              </p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}