import React, { useEffect, useState } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageSquare, Eye, ChevronDown, ChevronUp } from "lucide-react";
import * as commentsDb from "@/lib/commentsDb";
import { useAuth } from "@/lib/auth";

export type ItemType = "TRACK" | "MODULE";

type Stats = { views: number };
type LikeRow = { user_id: string };
type LikesRes = { count: number; rows: LikeRow[] };
type Comment = { id: string; content: string; user_id: string; created_at: string };

export function CommentsPanel({ itemType, itemId }: { itemType: ItemType; itemId: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [open, setOpen] = useState(false);
  const [newComment, setNewComment] = useState("");

  const statsQuery = useQuery<Stats>({
    queryKey: ["stats", itemType, itemId],
    queryFn: () => commentsDb.getStats(itemType, itemId),
    enabled: !!itemId,
  });

  const likesQuery = useQuery<LikesRes>({
    queryKey: ["likes", itemType, itemId],
    queryFn: () => commentsDb.getLikes(itemType, itemId),
    enabled: !!itemId,
  });

  const commentsQuery = useQuery<Comment[]>({
    queryKey: ["comments", itemType, itemId],
    queryFn: () => commentsDb.getComments(itemType, itemId),
    enabled: !!itemId,
  });

  // increment view when panel first becomes visible (open)
  useEffect(() => {
    if (!itemId) return;
    if (open) {
      void commentsDb.incrementView(itemType, itemId).then(() => qc.invalidateQueries({ queryKey: ["stats", itemType, itemId] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itemId]);

  // Mutation for like toggle
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Login necessário");
      return commentsDb.toggleLike(itemType, itemId, userId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["likes", itemType, itemId] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!userId) throw new Error("Login necessário");
      return commentsDb.addComment(itemType, itemId, userId, content);
    },
    onSuccess: () => {
      setNewComment("");
      qc.invalidateQueries({ queryKey: ["comments", itemType, itemId] });
    },
  });

  const likedByUser = !!likesQuery.data?.rows?.find((r) => r.user_id === userId);
  const likesCount = likesQuery.data?.count ?? 0;
  const views = statsQuery.data?.views ?? 0;

  return (
    <div className="mt-6">
      <Collapsible open={open} onOpenChange={(v) => setOpen(v)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--sinaxys-tint)] px-3 py-2 text-sm font-semibold text-[color:var(--sinaxys-ink)]">
              <Eye className="h-4 w-4" /> {views}
            </div>
            <div className="inline-flex items-center gap-2">
              <Button
                variant={likedByUser ? undefined : "outline"}
                className="h-9 rounded-full"
                onClick={() => {
                  if (!user) {
                    alert("Faça login para curtir");
                    return;
                  }
                  void likeMutation.mutate();
                }}
              >
                <Heart className={`mr-2 h-4 w-4 ${likedByUser ? "text-rose-500" : ""}`} /> {likesCount}
              </Button>
            </div>
            <div className="inline-flex items-center gap-2">
              <Button variant="outline" className="h-9 rounded-full" onClick={() => setOpen((s) => !s)}>
                <MessageSquare className="mr-2 h-4 w-4" /> Comentários ({commentsQuery.data?.length ?? 0})
              </Button>
            </div>
          </div>

          <div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="h-9 rounded-full">
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          <div className="mt-4 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
            <div className="grid gap-3">
              {user ? (
                <div className="grid gap-2">
                  <Label>Deixe um comentário</Label>
                  <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} className="min-h-[80px] rounded-2xl" />
                  <div className="flex items-center justify-end">
                    <Button
                      disabled={!newComment.trim() || addCommentMutation.status === "pending"}
                      className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white"
                      onClick={() => void addCommentMutation.mutate(newComment.trim())}
                    >
                      Enviar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Faça login para comentar.</div>
              )}

              <div className="grid gap-2">
                {commentsQuery.data && commentsQuery.data.length ? (
                  commentsQuery.data.map((c) => (
                    <div key={c.id} className="rounded-xl border p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{c.user_id}</div>
                        <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">{c.content}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">Nenhum comentário ainda.</div>
                )}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}