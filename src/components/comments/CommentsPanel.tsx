import React, { useEffect, useState, useRef } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Heart, MessageSquare, Eye, ChevronDown, ChevronUp } from "lucide-react";
import * as commentsDb from "@/lib/commentsDb";
import { useAuth } from "@/lib/auth";
import { OrgPersonDialog } from "@/components/OrgPersonDialog";
import * as profilesDb from "@/lib/profilesDb";

export type ItemType = "TRACK" | "MODULE";

type Stats = { views: number };
type LikeRow = { user_id: string };
type LikesRes = { count: number; rows: LikeRow[] };
type Comment = { id: string; content: string; user_id: string; created_at: string };

function normalizeText(s: string) {
  try {
    return s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();
  } catch {
    return String(s).toLowerCase().trim();
  }
}

export function CommentsPanel({ itemType, itemId }: { itemType: ItemType; itemId: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  // comment count for display (track-level summary / badge)
  const commentCountQuery = useQuery<number>({
    queryKey: ["comments-count", itemType, itemId],
    queryFn: () => commentsDb.getCommentCount(itemType, itemId),
    enabled: !!itemId,
  });

  const [page, setPage] = useState(0);
  const perPage = 5;
  const [personOpen, setPersonOpen] = useState(false);
  const [personProfile, setPersonProfile] = useState<any | null>(null);

  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; avatar_url?: string | null }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState("");

  const commentsQuery = useQuery<{ rows: (Comment & { user_name?: string; avatar_url?: string; mentions?: any[] })[]; total: number } | null>({
    queryKey: ["comments", itemType, itemId, page, perPage],
    queryFn: () => commentsDb.getComments(itemType, itemId, page, perPage),
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
    onSuccess: (res: any) => {
      // res is { comment, notifErrors, mentionedUserIds, mentionTokens, resolvedProfiles }
      setNewComment("");
      setShowSuggestions(false);
      qc.invalidateQueries({ queryKey: ["comments", itemType, itemId] });
      qc.invalidateQueries({ queryKey: ["comments-count", itemType, itemId] });
      qc.invalidateQueries({ queryKey: ["notifications-unread", userId] });

      const mentioned = res?.mentionedUserIds?.length ?? 0;
      const errors = res?.notifErrors?.length ?? 0;

      // Show a clear diagnostic toast listing mention tokens and resolved profiles
      const tokens: string[] = res?.mentionTokens ?? [];
      const resolved: { token: string; id: string; name: string }[] = res?.resolvedProfiles ?? [];

      if (tokens.length === 0) {
        // no mentions detected
        toast({ title: "Comentário enviado", description: "Nenhuma menção detectada." });
      } else {
        const resolvedList = resolved.map((r) => `@${r.token}→${r.name}`).join(", ");
        const unresolved = tokens.filter((t) => !resolved.find((r) => r.token === t));
        const unresolvedText = unresolved.length ? `Não resolvidos: ${unresolved.join(", ")}.` : "";
        toast({ title: `Menções (${tokens.length})`, description: `${resolvedList || "Nenhuma menção resolvida."} ${unresolvedText}` });
      }

      if (mentioned > 0) {
        toast({ title: `Notificado${mentioned > 1 ? 's' : ''}`, description: `${mentioned} usuário${mentioned > 1 ? 's' : ''} notificado(s).` });
      }
      if (errors > 0) {
        toast({ title: `Erro ao notificar`, description: `${errors} notificação(ões) falharam.`, variant: "destructive" });
      }
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err?.message ?? "Não foi possível enviar o comentário.", variant: "destructive" });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      if (!userId) throw new Error("Login necessário");
      return commentsDb.updateComment(commentId, userId, content);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", itemType, itemId] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!userId) throw new Error("Login necessário");
      return commentsDb.deleteComment(commentId, userId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", itemType, itemId] });
      qc.invalidateQueries({ queryKey: ["comments-count", itemType, itemId] });
    },
  });

  const likedByUser = !!likesQuery.data?.rows?.find((r) => r.user_id === userId);
  const likesCount = likesQuery.data?.count ?? 0;
  const views = statsQuery.data?.views ?? 0;

  const totalComments = commentCountQuery.data ?? commentsQuery.data?.total ?? 0;

  // Fetch company suggestions when suggestionQuery changes
  useEffect(() => {
    let mounted = true;
    async function loadSuggestions() {
      if (!user?.companyId || !suggestionQuery) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      try {
        const list = await profilesDb.listProfilePublicByCompany(user.companyId);
        const q = normalizeText(suggestionQuery);
        const filtered = (list || [])
          .filter((p) => normalizeText(p.name).includes(q) || normalizeText(p.id).includes(q))
          .slice(0, 6)
          .map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url }));
        if (mounted) {
          setSuggestions(filtered);
          setShowSuggestions(filtered.length > 0);
        }
      } catch (e) {
        // ignore
      }
    }
    void loadSuggestions();
    return () => {
      mounted = false;
    };
  }, [suggestionQuery, user?.companyId]);

  // handle input change for autocomplete detection
  function handleCommentChange(v: string) {
    setNewComment(v);
    // find the last token prefixed by @ that is currently being edited
    const caretPos = textareaRef.current?.selectionStart ?? v.length;
    const upto = v.slice(0, caretPos);
    const atMatch = upto.match(/@([\w.\-]{1,})$/);
    if (atMatch) {
      const token = atMatch[1];
      setSuggestionQuery(token);
    } else {
      setSuggestionQuery("");
      setShowSuggestions(false);
    }
  }

  function applySuggestion(s: { id: string; name: string }) {
    // replace the last @token with @name<space>
    const t = newComment;
    const caretPos = textareaRef.current?.selectionStart ?? t.length;
    const before = t.slice(0, caretPos);
    const after = t.slice(caretPos);
    const newBefore = before.replace(/@([\w.\-]{1,})$/, `@${s.name} `);
    const newText = newBefore + after;
    setNewComment(newText);
    setShowSuggestions(false);
    setSuggestionQuery("");
    // focus textarea and move caret to after inserted text
    window.requestAnimationFrame(() => {
      if (textareaRef.current) {
        const pos = newBefore.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    });
  }

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
                <MessageSquare className="mr-2 h-4 w-4" /> Comentários ({totalComments})
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

        <CollapsibleContent className="overflow-hidden transition-all duration-200 ease-in-out data-[state=open]:max-h-[800px] max-h-0 data-[state=open]:opacity-100 opacity-0">
          <div className="mt-4 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
            <div className="grid gap-3">
              {user ? (
                <div className="relative grid gap-2">
                  <Label>Deixe um comentário</Label>
                  <Textarea
                    ref={textareaRef}
                    value={newComment}
                    onChange={(e) => handleCommentChange(e.target.value)}
                    className="min-h-[80px] rounded-2xl"
                    placeholder="Escreva algo e use @ para mencionar alguém da sua companhia"
                  />

                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute left-4 right-4 top-[calc(100%_-_8px)] z-50 mt-2 max-h-60 overflow-auto rounded-lg border bg-white shadow-lg">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
                          onClick={() => applySuggestion(s)}
                        >
                          <img src={s.avatar_url ?? undefined} alt={s.name} className="h-8 w-8 rounded-full" />
                          <div className="text-sm font-medium">{s.name}</div>
                        </button>
                      ))}
                    </div>
                  )}

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
                {commentsQuery.data && commentsQuery.data.rows && commentsQuery.data.rows.length ? (
                  <>
                    {commentsQuery.data.rows.map((c) => (
                      <div key={c.id} className="rounded-xl border p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {c.avatar_url ? (
                              <img src={c.avatar_url} alt={c.user_name} className="h-8 w-8 rounded-full" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-[color:var(--sinaxys-tint)]" />
                            )}
                            <button className="text-sm font-semibold text-[color:var(--sinaxys-ink)] hover:underline" onClick={async () => {
                              try {
                                const prof = await profilesDb.getProfile(c.user_id);
                                setPersonProfile(prof);
                                setPersonOpen(true);
                              } catch (e) {
                                // ignore
                              }
                            }}>{c.user_name}</button>
                          </div>
                          <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {(() => {
                            // Render content replacing mention tokens with links that open OrgPersonDialog
                            const mentionRegex = /@([\w.\-]+)/g;
                            if (!c.mentions || !c.mentions.length) return <>{c.content}</>;
                            const parts: any[] = [];
                            let lastIndex = 0;
                            let match: RegExpExecArray | null;
                            const text = c.content || "";
                            mentionRegex.lastIndex = 0;
                            while ((match = mentionRegex.exec(text)) !== null) {
                              const token = match[1];
                              const start = match.index;
                              const end = mentionRegex.lastIndex;
                              if (start > lastIndex) parts.push(text.slice(lastIndex, start));
                              const resolved = (c.mentions as any[]).find((m) => m.token === token)?.match ?? null;
                              if (resolved) {
                                parts.push(
                                  <button key={`${c.id}-${start}`} className="text-[color:var(--sinaxys-primary)] font-semibold underline" onClick={async () => {
                                    try {
                                      const prof = await profilesDb.getProfile(resolved.id);
                                      setPersonProfile(prof);
                                      setPersonOpen(true);
                                    } catch (e) {
                                      // ignore
                                    }
                                  }}>
                                    @{resolved.name}
                                  </button>
                                );
                              } else {
                                parts.push(text.slice(start, end));
                              }
                              lastIndex = end;
                            }
                            if (lastIndex < text.length) parts.push(text.slice(lastIndex));
                            return parts.map((p, i) => (typeof p === "string" ? <span key={i}>{p}</span> : p));
                          })()}
                        </div>
                        {c.user_id === userId ? (
                          <div className="mt-2 flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => {
                              const newText = window.prompt("Editar comentário", c.content);
                              if (newText !== null) updateCommentMutation.mutate({ commentId: c.id, content: newText });
                            }}>
                              Editar
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => {
                              if (confirm("Deseja excluir este comentário?")) deleteCommentMutation.mutate(c.id);
                            }}>
                              Excluir
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}

                    {/* Pagination controls */}
                    {commentsQuery.data.total > perPage && (
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">Página {page + 1} de {Math.ceil(commentsQuery.data.total / perPage)}</div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Anterior</Button>
                          <Button variant="outline" disabled={(page + 1) * perPage >= commentsQuery.data.total} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Nenhum comentário ainda.</div>
                )}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
      <OrgPersonDialog open={personOpen} onOpenChange={setPersonOpen} profile={personProfile} departmentName={null} companyId={user?.companyId ?? ""} />
    </div>
  );
}