import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ChevronDown, FileText, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import { KnowledgePage as KnowledgePageType } from "@/lib/knowledgeDb";

interface KnowledgePageTreeProps {
  pages: (KnowledgePageType & { children?: KnowledgePageType[] })[];
  expandedIds?: Set<string>;
  onToggleExpand?: (pageId: string) => void;
  level?: number;
}

export function KnowledgePageTree({
  pages,
  expandedIds = new Set(),
  onToggleExpand,
  level = 0,
}: KnowledgePageTreeProps) {
  const handleToggle = (e: React.MouseEvent, pageId: string) => {
    e.preventDefault();
    onToggleExpand?.(pageId);
  };

  return (
    <ul className={cn("space-y-1", level > 0 && "ml-4")}>
      {pages.map((page) => {
        const hasChildren = page.children && page.children.length > 0;
        const isExpanded = expandedIds.has(page.id);

        return (
          <li key={page.id}>
            <div className="flex items-center gap-1 group">
              {hasChildren ? (
                <button
                  onClick={(e) => handleToggle(e, page.id)}
                  className="p-1 hover:bg-muted rounded transition flex-shrink-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              ) : (
                <span className="w-5 flex-shrink-0" />
              )}

              <Link
                to={`/knowledge/${page.id}`}
                className={cn(
                  "flex items-center gap-2 flex-1 px-2 py-1.5 rounded-md text-sm transition",
                  "hover:bg-muted group-hover:bg-muted",
                  "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="text-base flex-shrink-0">{page.icon}</span>
                <span className="truncate">{page.title}</span>
                {hasChildren && !isExpanded && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    ({page.children?.length})
                  </span>
                )}
              </Link>
            </div>

            {hasChildren && isExpanded && (
              <KnowledgePageTree
                pages={page.children || []}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                level={level + 1}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

interface KnowledgePageTreeBySpaceProps {
  spaceId: string;
  pages: KnowledgePageType[];
}

export function KnowledgePageTreeBySpace({
  spaceId,
  pages,
}: KnowledgePageTreeBySpaceProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleToggleExpand = (pageId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  };

  const spacePages = pages.filter((p) => p.space_id === spaceId);

  if (spacePages.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhuma página neste espaço</p>
      </div>
    );
  }

  return (
    <KnowledgePageTree
      pages={spacePages}
      expandedIds={expandedIds}
      onToggleExpand={handleToggleExpand}
    />
  );
}
