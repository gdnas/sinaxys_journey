import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, X, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCompany } from "@/lib/company";
import { searchKnowledgePages } from "@/lib/knowledgeDb";
import { highlightText } from "@/lib/utils";

interface KnowledgeSearchProps {
  trigger?: React.ReactNode;
  placeholder?: string;
}

export function KnowledgeSearch({
  trigger,
  placeholder = "Buscar páginas...",
}: KnowledgeSearchProps) {
  const { companyId } = useCompany();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["knowledge-search", companyId, debouncedQuery],
    queryFn: () => searchKnowledgePages(String(companyId), debouncedQuery),
    enabled: !!companyId && debouncedQuery.length >= 2,
  });

  // Focus input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Clear search when popover closes
  const handleClose = () => {
    setOpen(false);
    setTimeout(() => setQuery(""), 200);
  };

  const handleResultClick = (pageId: string) => {
    navigate(`/knowledge/${pageId}`);
    handleClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClose();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 w-full justify-start">
            <Search className="h-4 w-4" />
            <span className="text-muted-foreground">{placeholder}</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="flex items-center px-3 py-2 border-b">
          <Search className="h-4 w-4 text-muted-foreground mr-2" />
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 px-0"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {query.length < 2 ? (
            <div className="p-8 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground">
                Digite pelo menos 2 caracteres para buscar
              </p>
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Buscando...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground">Nenhum resultado encontrado</p>
            </div>
          ) : (
            <div className="p-2">
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {results.length} {results.length === 1 ? "resultado" : "resultados"}
              </p>
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result.id)}
                  className={cn(
                    "w-full flex items-start gap-3 px-2 py-2 rounded-md hover:bg-muted transition",
                    "text-left"
                  )}
                >
                  <span className="text-2xl flex-shrink-0 mt-0.5">{result.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {highlightText(result.title, query)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {result.space_name}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {results.length > 0 && (
          <div className="border-t p-2 text-xs text-muted-foreground text-center">
            Use as setas para navegar, Enter para selecionar, Esc para fechar
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Global keyboard shortcut handler
export function useKnowledgeSearchShortcut() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}
