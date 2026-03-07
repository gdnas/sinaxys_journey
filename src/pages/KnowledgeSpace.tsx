import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Search, Star, MoreVertical, Edit, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  getKnowledgeSpace,
  listKnowledgePages,
  deleteKnowledgeSpace,
  createKnowledgePage,
  toggleKnowledgePageFavorite,
  deleteKnowledgePage,
  buildPageTree,
  type DbKnowledgeSpace,
  type DbKnowledgePage,
} from "@/lib/knowledgeDb";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PageTreeItem extends DbKnowledgePage {
  children: PageTreeItem[];
  depth: number;
}

function PageTreeItem({ page, depth, onEdit, onDelete, onToggleFavorite }: { 
  page: PageTreeItem; 
  depth: number;
  onEdit: (page: DbKnowledgePage) => void;
  onDelete: (page: DbKnowledgePage) => void;
  onToggleFavorite: (page: DbKnowledgePage) => void;
}) {
  const indent = depth * 16;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl hover:bg-[color:var(--sinaxys-bg)] transition-colors group",
          depth === 0 && "border-b border-[color:var(--sinaxys-border)]"
        )}
        style={{ marginLeft: `${indent}px` }}
      >
        <Link to={`/knowledge/page/${page.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xl shrink-0">{page.icon}</span>
          <span className="font-medium text-[color:var(--sinaxys-ink)] truncate">{page.title}</span>
        </Link>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg"
            onClick={() => onToggleFavorite(page)}
          >
            <Star className={cn(
              "h-4 w-4",
              page.is_favorite ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
            )} />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(page)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(page)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {page.children.length > 0 && (
        <div>
          {page.children.map((child) => (
            <PageTreeItem
              key={child.id}
              page={child}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function KnowledgeSpace() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<DbKnowledgePage | null>(null);

  if (!user || !spaceId) return null;

  const cid = companyId ?? "";

  const { data: space, isLoading: spaceLoading } = useQuery({
    queryKey: ["knowledge-space", spaceId],
    queryFn: () => getKnowledgeSpace(spaceId),
  });

  const { data: pages = [], isLoading: pagesLoading } = useQuery({
    queryKey: ["knowledge-pages", spaceId],
    queryFn: () => listKnowledgePages(spaceId),
  });

  const deleteSpaceMutation = useMutation({
    mutationFn: () => deleteKnowledgeSpace(spaceId),
    onSuccess: () => {
      toast.success("Espaço excluído com sucesso");
      navigate("/knowledge");
    },
    onError: (error) => {
      toast.error("Erro ao excluir espaço", { description: error.message });
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: (pageId: string) => deleteKnowledgePage(pageId),
    onSuccess: () => {
      toast.success("Página excluída com sucesso");
      queryClient.invalidateQueries({ queryKey: ["knowledge-pages", spaceId] });
      setPageToDelete(null);
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao excluir página", { description: error.message });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ pageId, isFavorite }: { pageId: string; isFavorite: boolean }) =>
      toggleKnowledgePageFavorite(pageId, isFavorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-pages", spaceId] });
    },
  });

  const handleCreatePage = () => {
    navigate(`/knowledge/space/${spaceId}/new-page`);
  };

  const handleEditPage = (page: DbKnowledgePage) => {
    navigate(`/knowledge/page/${page.id}`);
  };

  const handleDeletePage = (page: DbKnowledgePage) => {
    setPageToDelete(page);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePage = () => {
    if (pageToDelete) {
      deletePageMutation.mutate(pageToDelete.id);
    }
  };

  const handleToggleFavorite = (page: DbKnowledgePage) => {
    toggleFavoriteMutation.mutate({
      pageId: page.id,
      isFavorite: !page.is_favorite,
    });
  };

  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pageTree = buildPageTree(filteredPages).map(page => ({
    ...page,
    children: [],
    depth: 0,
  }));

  if (spaceLoading || pagesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-muted-foreground">Espaço não encontrado</div>
        <Button asChild variant="outline">
          <Link to="/knowledge">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl grid gap-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/knowledge">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      {/* Space Header */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-8">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="text-5xl">{space.icon}</div>
            <div>
              <h1 className="text-3xl font-bold text-[color:var(--sinaxys-ink)] mb-2">
                {space.name}
              </h1>
              {space.description && (
                <p className="text-muted-foreground">{space.description}</p>
              )}
              <Badge variant="outline" className="mt-3 rounded-full">
                {pages.length} {pages.length === 1 ? 'página' : 'páginas'}
              </Badge>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => setDeleteDialogOpen(true)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Espaço
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar páginas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 pl-12 rounded-2xl border-[color:var(--sinaxys-border)]"
          />
        </div>
        <Button
          onClick={handleCreatePage}
          className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Página
        </Button>
      </div>

      {/* Pages List */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        {pageTree.length > 0 ? (
          <div className="space-y-1">
            {pageTree.map((page) => (
              <PageTreeItem
                key={page.id}
                page={page}
                depth={0}
                onEdit={handleEditPage}
                onDelete={handleDeletePage}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              {searchQuery ? "Nenhuma página encontrada" : "Nenhuma página neste espaço ainda"}
            </div>
            {!searchQuery && (
              <Button onClick={handleCreatePage} className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white">
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Página
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Delete Space Dialog */}
      <AlertDialog open={deleteDialogOpen && !pageToDelete} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Espaço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o espaço "{space.name}"? Todas as páginas deste espaço também serão excluídas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSpaceMutation.mutate()}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Page Dialog */}
      <AlertDialog open={deleteDialogOpen && !!pageToDelete} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Página</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a página "{pageToDelete?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePage}
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