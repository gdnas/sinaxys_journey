import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Plus, Search, Star, Clock, Folder, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import {
  listKnowledgeSpaces,
  listKnowledgePagesByCompany,
  getRecentPages,
  getFavoritePages,
  countPagesInSpace,
  type DbKnowledgeSpace,
  type DbKnowledgePage,
} from "@/lib/knowledgeDb";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function KnowledgeHome() {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const [searchQuery, setSearchQuery] = useState("");

  if (!user) return null;

  const cid = companyId ?? "";
  const hasCompany = !!companyId;

  const { data: spaces = [] } = useQuery({
    queryKey: ["knowledge-spaces", cid],
    enabled: hasCompany,
    queryFn: () => listKnowledgeSpaces(cid),
  });

  const { data: allPages = [] } = useQuery({
    queryKey: ["knowledge-pages-all", cid],
    enabled: hasCompany,
    queryFn: () => listKnowledgePagesByCompany(cid),
  });

  const recentPages = getRecentPages(allPages, 6);
  const favoritePages = getFavoritePages(allPages);

  const filteredSpaces = spaces.filter(space =>
    space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    space.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecentPages = recentPages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFavoritePages = favoritePages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!hasCompany) {
    return (
      <div className="grid gap-6">
        <div className="text-sm text-muted-foreground">Aguardando identificação da empresa...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl grid gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--sinaxys-ink)]">
            Base de Conhecimento
          </h1>
          <p className="text-muted-foreground mt-1">
            Documente, organize e compartilhe conhecimento da sua empresa
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
            <Link to="/knowledge/new-space">
              <Plus className="mr-2 h-4 w-4" />
              Novo Espaço
            </Link>
          </Button>

          {/* Button to open "Montar trilha de conhecimento" (Admin Tracks). Visible only to ADMIN and HEAD */}
          {(user.role === "ADMIN" || user.role === "HEAD") && (
            <Link to="/admin/tracks" className="h-11 rounded-xl border px-4 py-2 text-sm font-medium text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]/70 inline-flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Montar Trilha de Conhecimento
            </Link>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar espaços, páginas ou conteúdo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 pl-12 rounded-2xl border-[color:var(--sinaxys-border)]"
        />
      </div>

      {/* Spaces Grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Folder className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          <h2 className="text-xl font-bold text-[color:var(--sinaxys-ink)]">Espaços</h2>
          <Badge variant="outline" className="rounded-full">{filteredSpaces.length}</Badge>
        </div>
        
        {filteredSpaces.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSpaces.map((space) => (
              <Link key={space.id} to={`/knowledge/space/${space.id}`}>
                <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6 hover:shadow-lg hover:border-[color:var(--sinaxys-primary)]/30 transition-all cursor-pointer h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-4xl">{space.icon}</div>
                    <Badge variant="outline" className="rounded-full text-xs">
                      {countPagesInSpace(space.id, allPages)} páginas
                    </Badge>
                  </div>
                  <h3 className="font-bold text-[color:var(--sinaxys-ink)] mb-2">{space.name}</h3>
                  {space.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{space.description}</p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-8 text-center">
            <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-bold text-[color:var(--sinaxys-ink)] mb-2">Nenhum espaço encontrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? "Tente uma busca diferente" : "Crie seu primeiro espaço para começar"}
            </p>
            {!searchQuery && (
              <Button asChild className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white">
                <Link to="/knowledge/new-space">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Espaço
                </Link>
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* Recent Pages */}
      {filteredRecentPages.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            <h2 className="text-xl font-bold text-[color:var(--sinaxys-ink)]">Páginas Recentes</h2>
            <Badge variant="outline" className="rounded-full">{filteredRecentPages.length}</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecentPages.map((page) => (
              <Link key={page.id} to={`/knowledge/page/${page.id}`}>
                <Card className="rounded-2xl border-[color:var(--sinaxys-border)] bg-white p-4 hover:shadow-md hover:border-[color:var(--sinaxys-primary)]/30 transition-all cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl shrink-0">{page.icon}</div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-[color:var(--sinaxys-ink)] truncate">{page.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Atualizado {new Date(page.updated_at || "").toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Favorite Pages */}
      {filteredFavoritePages.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold text-[color:var(--sinaxys-ink)]">Favoritos</h2>
            <Badge variant="outline" className="rounded-full">{filteredFavoritePages.length}</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFavoritePages.map((page) => (
              <Link key={page.id} to={`/knowledge/page/${page.id}`}>
                <Card className="rounded-2xl border-[color:var(--sinaxys-border)] bg-white p-4 hover:shadow-md hover:border-[color:var(--sinaxys-primary)]/30 transition-all cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl shrink-0">{page.icon}</div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-[color:var(--sinaxys-ink)] truncate">{page.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Atualizado {new Date(page.updated_at || "").toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Star className="h-4 w-4 text-amber-500 shrink-0 fill-amber-500" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {spaces.length === 0 && !searchQuery && (
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-12 text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[color:var(--sinaxys-ink)] mb-2">
            Comece sua Base de Conhecimento
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Crie espaços para organizar sua documentação e adicione páginas para compartilhar conhecimento com sua equipe.
          </p>
          <Button asChild className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
            <Link to="/knowledge/new-space">
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Espaço
            </Link>
          </Button>
        </Card>
      )}
    </div>
  );
}