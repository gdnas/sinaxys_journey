import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import {
  ArrowLeft,
  Star,
  MoreVertical,
  Edit,
  Trash2,
  Clock,
  User,
  Heart,
  Info,
  History,
  MessageSquare,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { KnowledgeSidebar } from "@/components/knowledge/KnowledgeSidebar";
import { KnowledgeEditor } from "@/components/knowledge/KnowledgeEditor";
import {
  getKnowledgePage,
  updateKnowledgePage,
  deleteKnowledgePage,
  getPagePath,
  KnowledgePage as KnowledgePageType,
} from "@/lib/knowledgeDb";
import { Skeleton } from "@/components/ui/skeleton";

export default function KnowledgePage() {
  const { pageId } = useParams<{ pageId: string }>();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedIcon, setEditedIcon] = useState("");
  const [editedContent, setEditedContent] = useState<any>({ type: "doc", content: [] });
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  // Query for page data
  const { data: page, isLoading } = useQuery({
    queryKey: ["knowledge-page", pageId],
    queryFn: () => getKnowledgePage(pageId!),
    enabled: !!pageId,
  });

  // Query for page path (breadcrumbs)
  const { data: allPages = [] } = useQuery({
    queryKey: ["knowledge-pages", companyId],
    queryFn: () => getKnowledgePages(String(companyId)),
    enabled: !!companyId,
  });

  const pagePath = page ? getPagePath(page.id, allPages) : [];

  const isAdmin = user?.role === "ADMIN" || user?.role === "MASTERADMIN";

  // Initialize edit state when page loads
  useEffect(() => {
    if (page) {
      setEditedTitle(page.title);
      setEditedIcon(page.icon);
      setEditedContent(page.content || { type: "doc", content: [] });
    }
  }, [page]);

  // Mutation for updating page
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!page) throw new Error("Page not found");
      return updateKnowledgePage(page.id, {
        title: editedTitle,
        icon: editedIcon,
        content: editedContent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-page", pageId] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-pages", companyId] });
      toast.success("Página atualizada com sucesso!");
      setIsEditing(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar página");
    },
  });

  // Mutation for deleting page
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!page) throw new Error("Page not found");
      return deleteKnowledgePage(page.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-pages", companyId] });
      toast.success("Página excluída com sucesso!");
      navigate("/knowledge");
    },
    onError: () => {
      toast.error("Erro ao excluir página");
    },
  });

  // Mutation for toggling favorite
  const favoriteMutation = useMutation({
    mutationFn: async (isFavorite: boolean) => {
      if (!page) throw new Error("Page not found");
      return updateKnowledgePage(page.id, { is_favorite: isFavorite });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-page", pageId] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-favorite-pages", companyId] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-recent-pages", companyId] });
    },
  });

  const handleSave = () => {
    if (!editedTitle.trim()) {
      toast.error("O título é obrigatório");
      return;
    }
    updateMutation.mutate();
  };

  const handleCancel = () => {
    if (page) {
      setEditedTitle(page.title);
      setEditedIcon(page.icon);
      setEditedContent(page.content || { type: "doc", content: [] });
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja excluir esta página?")) {
      deleteMutation.mutate();
    }
  };

  const handleToggleFavorite = () => {
    if (page) {
      favoriteMutation.mutate(!page.is_favorite);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)]">
        <div className="w-72 border-r p-4 space-y-4 hidden md:block">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-full" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">Página não encontrada</p>
              <Link to="/knowledge">
                <Button>Voltar para Conhecimento</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canEdit = isAdmin || isEditing;

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Left Sidebar */}
      <KnowledgeSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="border-b px-6 py-4"
        >
          {/* Breadcrumbs */}
          {pagePath.length > 1 && (
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Link to="/knowledge" className="hover:underline">
                Conhecimento
              </Link>
              {pagePath.slice(0, -1).map((p, i) => (
                <span key={p.id} className="flex items-center gap-2">
                  <span>/</span>
                  <Link to={`/knowledge/${p.id}`} className="hover:underline truncate max-w-[200px]">
                    {p.title}
                  </Link>
                </span>
              ))}
              <span>/</span>
              <span className="text-foreground truncate max-w-[200px]">{page.title}</span>
            </nav>
          )}

          <div className="flex items-start justify-between gap-4">
            {/* Page Title and Icon */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {isEditing ? (
                <select
                  value={editedIcon}
                  onChange={(e) => setEditedIcon(e.target.value)}
                  className="text-4xl bg-transparent border-0 cursor-pointer"
                >
                  {["📄", "📝", "📚", "📖", "📋", "📌", "🎯", "💡", "🔧", "📊", "🗂️", "📁"].map(
                    (emoji) => (
                      <option key={emoji} value={emoji}>
                        {emoji}
                      </option>
                    )
                  )}
                </select>
              ) : (
                <span className="text-4xl">{page.icon}</span>
              )}

              {isEditing ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-2xl font-bold px-0 border-0 focus-visible:ring-0 h-auto"
                  placeholder="Título da página"
                />
              ) : (
                <h1 className="text-2xl font-bold">{page.title}</h1>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleFavorite}
                className={cn(page.is_favorite && "text-yellow-500")}
              >
                <Star
                  className={cn("h-4 w-4", page.is_favorite && "fill-yellow-500")}
                />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAdmin && !isEditing && (
                    <>
                      <DropdownMenuItem onClick={() => setIsEditing(true)} className="gap-2">
                        <Edit className="h-4 w-4" />
                        Editar página
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleDelete} className="gap-2 text-destructive">
                        <Trash2 className="h-4 w-4" />
                        Excluir página
                      </DropdownMenuItem>
                    </>
                  )}
                  {isEditing && (
                    <DropdownMenuItem onClick={handleCancel} className="gap-2">
                      Cancelar edição
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Sheet open={rightPanelOpen} onOpenChange={setRightPanelOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Info className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>Informações da página</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Criado em
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(page.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Última atualização
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(page.updated_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    {page.created_by && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Criado por
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {page.created_by}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Edit Actions */}
          <AnimatePresence>
            {isEditing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 mt-4"
              >
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Content Area */}
        <ScrollArea className="flex-1">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-4xl mx-auto px-6 py-8"
          >
            <KnowledgeEditor
              content={editedContent}
              onChange={setEditedContent}
              editable={canEdit}
              placeholder={isEditing ? "Comece a escrever..." : ""}
            />
          </motion.div>
        </ScrollArea>
      </div>
    </div>
  );
}