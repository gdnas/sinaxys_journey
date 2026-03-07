import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import {
  Plus,
  Search,
  FolderOpen,
  Clock,
  Star,
  FileText,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getKnowledgeSpaces,
  getRecentPages,
  getFavoritePages,
  createKnowledgeSpace,
  createKnowledgePage,
  deleteKnowledgeSpace,
} from "@/lib/knowledgeDb";
import { KnowledgeSearch } from "@/components/knowledge/KnowledgeSearch";
import { KnowledgeHubSkeleton } from "@/components/knowledge/KnowledgeSkeleton";

export default function KnowledgeHub() {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [newSpaceDialogOpen, setNewSpaceDialogOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceDescription, setNewSpaceDescription] = useState("");

  const { data: spaces = [], isLoading: spacesLoading } = useQuery({
    queryKey: ["knowledge-spaces", companyId],
    queryFn: () => getKnowledgeSpaces(String(companyId)),
    enabled: !!companyId,
  });

  const { data: recentPages = [], isLoading: recentLoading } = useQuery({
    queryKey: ["knowledge-recent-pages", companyId],
    queryFn: () => getRecentPages(String(companyId), 10),
    enabled: !!companyId,
  });

  const { data: favoritePages = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ["knowledge-favorite-pages", companyId],
    queryFn: () => getFavoritePages(String(companyId)),
    enabled: !!companyId,
  });

  const filteredSpaces = spaces.filter((space) =>
    space.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim()) {
      toast.error("Por favor, insira um nome para o espaço");
      return;
    }

    try {
      const newSpace = await createKnowledgeSpace(
        String(companyId),
        newSpaceName.trim(),
        newSpaceDescription.trim() || undefined
      );
      toast.success("Espaço criado com sucesso!");
      setNewSpaceDialogOpen(false);
      setNewSpaceName("");
      setNewSpaceDescription("");
      navigate(`/knowledge/space/${newSpace.id}`);
    } catch (error) {
      toast.error("Erro ao criar espaço");
      console.error(error);
    }
  };

  const handleCreatePage = async (spaceId: string) => {
    try {
      const newPage = await createKnowledgePage(
        spaceId,
        String(companyId),
        "Nova Página",
        user?.id || ""
      );
      toast.success("Página criada com sucesso!");
      navigate(`/knowledge/${newPage.id}`);
    } catch (error) {
      toast.error("Erro ao criar página");
      console.error(error);
    }
  };

  const handleDeleteSpace = async (spaceId: string, spaceName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o espaço "${spaceName}" e todas as suas páginas?`)) {
      return;
    }

    try {
      await deleteKnowledgeSpace(spaceId);
      toast.success("Espaço excluído com sucesso!");
    } catch (error) {
      toast.error("Erro ao excluir espaço");
      console.error(error);
    }
  };

  const isAdmin = user?.role === "ADMIN" || user?.role === "MASTERADMIN";

  if (spacesLoading && !spaces.length) {
    return <KnowledgeHubSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conhecimento</h1>
          <p className="text-muted-foreground">Documentação e base de conhecimento da empresa</p>
        </div>
        {isAdmin && (
          <Dialog open={newSpaceDialogOpen} onOpenChange={setNewSpaceDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Espaço
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Espaço</DialogTitle>
                <DialogDescription>
                  Crie um novo espaço para organizar suas páginas de conhecimento
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Processos RH, Marketing, Documentos..."
                    value={newSpaceName}
                    onChange={(e) => setNewSpaceName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateSpace();
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva o propósito deste espaço..."
                    value={newSpaceDescription}
                    onChange={(e) => setNewSpaceDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewSpaceDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateSpace}>Criar Espaço</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <KnowledgeSearch placeholder="Buscar páginas..." />

      {/* Favorites */}
      {!favoritesLoading && favoritePages.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            <h2 className="text-xl font-semibold">Favoritos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoritePages.map((page, index) => (
              <motion.div
                key={page.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link
                  to={`/knowledge/${page.id}`}
                  className="block transition hover:shadow-md"
                >
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{page.icon}</span>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{page.title}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Atualizado {new Date(page.updated_at).toLocaleDateString("pt-BR")}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Pages */}
      {!recentLoading && recentPages.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Recentes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPages.map((page, index) => (
              <motion.div
                key={page.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link
                  to={`/knowledge/${page.id}`}
                  className="block transition hover:shadow-md"
                >
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{page.icon}</span>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{page.title}</CardTitle>
                        </div>
                        {page.is_favorite && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Atualizado {new Date(page.updated_at).toLocaleDateString("pt-BR")}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Spaces */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Espaços</h2>
        </div>

        {filteredSpaces.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? "Nenhum espaço encontrado" : "Nenhum espaço ainda"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? "Tente uma busca diferente"
                    : isAdmin
                    ? "Crie seu primeiro espaço para começar"
                    : "Espere um administrador criar espaços"}
                </p>
                {isAdmin && !searchQuery && (
                  <Button onClick={() => setNewSpaceDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Espaço
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSpaces.map((space, index) => (
              <motion.div
                key={space.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="group hover:shadow-md transition">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{space.icon}</span>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{space.name}</CardTitle>
                          {space.description && (
                            <CardDescription className="line-clamp-2 mt-1">
                              {space.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleCreatePage(space.id)}
                              className="gap-2"
                            >
                              <FileText className="h-4 w-4" />
                              Nova Página
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteSpace(space.id, space.name)}
                              className="gap-2 text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Excluir Espaço
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Link
                      to={`/knowledge/space/${space.id}`}
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <FolderOpen className="h-4 w-4" />
                      Ver todas as páginas
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}