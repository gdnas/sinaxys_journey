import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, Save, Star, Clock, Users, History, MessageSquare, MoreVertical, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { toast } from "sonner";
import {
  getKnowledgePage,
  updateKnowledgePage,
  deleteKnowledgePage,
  toggleKnowledgePageFavorite,
  listKnowledgePageComments,
  createKnowledgePageComment,
  deleteKnowledgePageComment,
  listKnowledgePageVersions,
  restoreKnowledgePageVersion,
  type DbKnowledgePage,
  type DbKnowledgePageComment,
  type DbKnowledgePageVersion,
} from "@/lib/knowledgeDb";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function KnowledgePage() {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [newComment, setNewComment] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!user || !pageId) return null;

  const { data: page, isLoading: pageLoading } = useQuery({
    queryKey: ["knowledge-page", pageId],
    queryFn: () => getKnowledgePage(pageId),
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["knowledge-comments", pageId],
    queryFn: () => listKnowledgePageComments(pageId),
  });

  const { data: versions = [], isLoading: versionsLoading } = useQuery({
    queryKey: ["knowledge-versions", pageId],
    queryFn: () => listKnowledgePageVersions(pageId),
  });

  const updatePageMutation = useMutation({
    mutationFn: (content: string) => updateKnowledgePage(pageId, { content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: content }] }] } }),
    onSuccess: () => {
      toast.success("Página atualizada com sucesso");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["knowledge-page", pageId] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-versions", pageId] });
    },
    onError: (error) => {
      toast.error("Erro ao atualizar página", { description: error.message });
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: () => deleteKnowledgePage(pageId),
    onSuccess: () => {
      toast.success("Página excluída com sucesso");
      if (page?.space_id) {
        navigate(`/knowledge/space/${page.space_id}`);
      } else {
        navigate("/knowledge");
      }
    },
    onError: (error) => {
      toast.error("Erro ao excluir página", { description: error.message });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (isFavorite: boolean) => toggleKnowledgePageFavorite(pageId, isFavorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-page", pageId] });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: (text: string) => createKnowledgePageComment({
      page_id: pageId,
      text,
      parent_comment_id: null,
      mentions: [],
      created_by: user.id,
      company_id: companyId || "",
    }),
    onSuccess: () => {
      toast.success("Comentário adicionado");
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["knowledge-comments", pageId] });
    },
    onError: (error) => {
      toast.error("Erro ao adicionar comentário", { description: error.message });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteKnowledgePageComment(commentId),
    onSuccess: () => {
      toast.success("Comentário excluído");
      queryClient.invalidateQueries({ queryKey: ["knowledge-comments", pageId] });
    },
  });

  const restoreVersionMutation = useMutation({
    mutationFn: (versionId: string) => restoreKnowledgePageVersion(pageId, versionId),
    onSuccess: () => {
      toast.success("Versão restaurada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["knowledge-page", pageId] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-versions", pageId] });
    },
    onError: (error) => {
      toast.error("Erro ao restaurar versão", { description: error.message });
    },
  });

  const handleSave = () => {
    updatePageMutation.mutate(editedContent);
  };

  const handleToggleFavorite = () => {
    if (page) {
      toggleFavoriteMutation.mutate(!page.is_favorite);
    }
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      createCommentMutation.mutate(newComment);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    deleteCommentMutation.mutate(commentId);
  };

  const handleRestoreVersion = (versionId: string) => {
    restoreVersionMutation.mutate(versionId);
  };

  const getPageContent = (page: DbKnowledgePage) => {
    if (typeof page.content === 'string') {
      return page.content;
    }
    if (page.content?.content?.[0]?.content?.[0]?.text) {
      return page.content.content[0].content[0].text;
    }
    return "";
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-muted-foreground">Página não encontrada</div>
        <Button asChild variant="outline">
          <Link to="/knowledge">Voltar</Link>
        </Button>
      </div>
    );
  }

  const content = getPageContent(page);

  return (
    <div className="mx-auto max-w-5xl grid gap-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to={page.space_id ? `/knowledge/space/${page.space_id}` : "/knowledge"}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      {/* Page Header */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4 flex-1">
            <div className="text-5xl">{page.icon}</div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[color:var(--sinaxys-ink)] mb-2">
                {page.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Atualizado {format(new Date(page.updated_at || ""), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>Criado por {page.created_by === user.id ? 'você' : 'outro usuário'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleFavorite}
              className="rounded-xl"
            >
              <Star className={cn(
                "h-5 w-5",
                page.is_favorite ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
              )} />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="rounded-xl">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(!isEditing)}>
                  <Edit className="mr-2 h-4 w-4" />
                  {isEditing ? "Cancelar Edição" : "Editar"}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder="Escreva o conteúdo da página..."
              className="min-h-[300px] rounded-2xl border-[color:var(--sinaxys-border)] resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={updatePageMutation.isPending}
                className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white"
              >
                <Save className="mr-2 h-4 w-4" />
                {updatePageMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="prose prose-slate max-w-none">
            <div className="whitespace-pre-wrap text-[color:var(--sinaxys-ink)] leading-relaxed">
              {content || "Sem conteúdo"}
            </div>
          </div>
        )}
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="comments" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-[color:var(--sinaxys-bg)]">
          <TabsTrigger value="comments" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <MessageSquare className="mr-2 h-4 w-4" />
            Comentários ({comments.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <History className="mr-2 h-4 w-4" />
            Histórico ({versions.length})
          </TabsTrigger>
        </TabsList>

        {/* Comments Tab */}
        <TabsContent value="comments" className="mt-6">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            {/* Add Comment */}
            <div className="mb-6">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicione um comentário..."
                className="min-h-[80px] rounded-2xl border-[color:var(--sinaxys-border)] resize-none mb-3"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || createCommentMutation.isPending}
                  className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white"
                >
                  {createCommentMutation.isPending ? "Enviando..." : "Enviar Comentário"}
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 p-4 rounded-2xl bg-[color:var(--sinaxys-bg)]/30">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback>
                        {comment.created_by === user.id ? user.name?.[0] : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[color:var(--sinaxys-ink)]">
                          {comment.created_by === user.id ? user.name : 'Usuário'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at || ""), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm text-[color:var(--sinaxys-ink)] whitespace-pre-wrap">{comment.text}</p>
                      {comment.created_by === user.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="mt-2 h-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum comentário ainda. Seja o primeiro a comentar!
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="space-y-3">
              {versions.length > 0 ? (
                versions.map((version, index) => (
                  <div key={version.id} className="flex items-center justify-between p-4 rounded-2xl border border-[color:var(--sinaxys-border)] hover:bg-[color:var(--sinaxys-bg)]/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[color:var(--sinaxys-bg)] flex items-center justify-center">
                        <History className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-semibold text-[color:var(--sinaxys-ink)]">
                          Versão {versions.length - index}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(version.created_at || ""), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                    {index > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreVersion(version.id)}
                        disabled={restoreVersionMutation.isPending}
                        className="rounded-xl"
                      >
                        Restaurar
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum histórico de versões disponível.
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Página</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a página "{page.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePageMutation.mutate()}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}