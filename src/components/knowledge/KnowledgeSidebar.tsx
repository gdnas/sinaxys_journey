import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Search,
  Plus,
  X,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCompany } from "@/lib/company";
import { cn } from "@/lib/utils";
import { getKnowledgeSpaces, getKnowledgePages, buildPageTree } from "@/lib/knowledgeDb";
import { KnowledgePageTree } from "./KnowledgePageTree";
import { useIsMobile } from "@/hooks/use-mobile";

interface KnowledgeSidebarProps {
  className?: string;
}

export function KnowledgeSidebar({ className }: KnowledgeSidebarProps) {
  const { companyId } = useCompany();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-collapse on mobile
  useEffect(() => {
    setCollapsed(isMobile);
  }, [isMobile]);

  // Close mobile sheet on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const { data: spaces = [] } = useQuery({
    queryKey: ["knowledge-spaces", companyId],
    queryFn: () => getKnowledgeSpaces(String(companyId)),
    enabled: !!companyId,
  });

  const { data: allPages = [] } = useQuery({
    queryKey: ["knowledge-pages", companyId],
    queryFn: () => getKnowledgePages(String(companyId)),
    enabled: !!companyId,
  });

  const pageTree = buildPageTree(allPages);

  const filteredSpaces = spaces.filter((space) =>
    space.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mobile: Use Sheet
  if (isMobile) {
    return (
      <>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="absolute -left-12 top-6 z-10">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-left">Conhecimento</SheetTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </SheetHeader>

            <div className="p-4 space-y-4">
              <Link
                to="/knowledge"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition",
                  location.pathname === "/knowledge"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <FolderOpen className="h-4 w-4" />
                <span>Conhecimento</span>
              </Link>

              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredSpaces.length === 0 ? (
                  <div className="px-2 py-4 text-center">
                    <FolderOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-muted-foreground">
                      {searchQuery ? "Nenhum espaço encontrado" : "Nenhum espaço"}
                    </p>
                  </div>
                ) : (
                  filteredSpaces.map((space) => {
                    const spacePages = pageTree.filter((p) => p.space_id === space.id);
                    const hasPages = spacePages.length > 0;
                    const isSpaceActive = location.pathname.startsWith(
                      `/knowledge/space/${space.id}`
                    );

                    return (
                      <Collapsible key={space.id} defaultOpen={hasPages}>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "w-full justify-start gap-2 px-2 py-1.5 h-auto",
                              isSpaceActive && "bg-muted"
                            )}
                          >
                            <span className="text-base">{space.icon}</span>
                            <span className="text-sm font-medium truncate flex-1 text-left">
                              {space.name}
                            </span>
                            {hasPages && (
                              <ChevronRight className="h-3 w-3 flex-shrink-0 transition-transform" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-2">
                          <KnowledgePageTree pages={spacePages} />
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            <div className="p-3 border-t">
              <Link to="/knowledge" onClick={() => setMobileOpen(false)} className="block">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Espaço
                </Button>
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: Collapsible sidebar
  return (
    <div
      className={cn(
        "border-r bg-background transition-all duration-300 hidden md:block",
        collapsed ? "w-12" : "w-72",
        className
      )}
    >
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 h-6 w-6 rounded-full border bg-background shadow-sm z-10"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      {collapsed ? (
        // Collapsed State
        <div className="p-3 space-y-2">
          <Link
            to="/knowledge"
            className="flex items-center justify-center p-2 rounded-md hover:bg-muted transition"
            title="Conhecimento"
          >
            <LayoutDashboard className="h-5 w-5" />
          </Link>
        </div>
      ) : (
        // Expanded State
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b space-y-3">
            <Link
              to="/knowledge"
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition",
                location.pathname === "/knowledge"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <FolderOpen className="h-4 w-4" />
              <span>Conhecimento</span>
            </Link>

            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          {/* Spaces Tree */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredSpaces.length === 0 ? (
                <div className="px-2 py-4 text-center">
                  <FolderOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-muted-foreground">
                    {searchQuery ? "Nenhum espaço encontrado" : "Nenhum espaço"}
                  </p>
                </div>
              ) : (
                filteredSpaces.map((space) => {
                  const spacePages = pageTree.filter((p) => p.space_id === space.id);
                  const hasPages = spacePages.length > 0;
                  const isSpaceActive = location.pathname.startsWith(
                    `/knowledge/space/${space.id}`
                  );

                  return (
                    <Collapsible key={space.id} defaultOpen={hasPages}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "w-full justify-start gap-2 px-2 py-1.5 h-auto",
                            isSpaceActive && "bg-muted"
                          )}
                        >
                          <span className="text-base">{space.icon}</span>
                          <span className="text-sm font-medium truncate flex-1 text-left">
                            {space.name}
                          </span>
                          {hasPages && (
                            <ChevronRight className="h-3 w-3 flex-shrink-0 transition-transform" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-2">
                        <KnowledgePageTree pages={spacePages} />
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-3 border-t">
            <Link to="/knowledge" className="block">
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Novo Espaço
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}