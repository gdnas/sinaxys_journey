import { Box } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetCard, type AssetWithAssignee } from "./AssetCard";

interface AssetListSectionProps {
  assets: AssetWithAssignee[];
  loading?: boolean;
  onView: (assetId: string) => void;
  onEdit?: (assetId: string) => void;
  onContract?: (contractUrl: string) => void;
  onLabel?: (assetId: string) => void;
  canEdit?: boolean;
  canManage?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
}

export function AssetListSection({
  assets,
  loading = false,
  onView,
  onEdit,
  onContract,
  onLabel,
  canEdit = false,
  canManage = false,
  emptyTitle = "Nenhum ativo encontrado",
  emptyDescription = "Tente ajustar os filtros ou adicionar um novo ativo.",
  emptyAction,
}: AssetListSectionProps) {
  // Skeleton loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-5 border border-[color:var(--sinaxys-border)] rounded-2xl space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (assets.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-[color:var(--sinaxys-tint)] flex items-center justify-center mb-4">
          <Box className="h-8 w-8 text-[color:var(--sinaxys-primary)]" />
        </div>
        <h3 className="text-lg font-semibold text-[color:var(--sinaxys-ink)] mb-2">
          {emptyTitle}
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          {emptyDescription}
        </p>
        {emptyAction && (
          <button
            onClick={emptyAction.onClick}
            className="rounded-xl bg-[color:var(--sinaxys-primary)] px-6 py-2 text-white hover:bg-[color:var(--sinaxys-primary)]/90 transition-colors"
          >
            {emptyAction.label}
          </button>
        )}
      </div>
    );
  }

  // Grid de cards
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onView={onView}
          onEdit={onEdit}
          onContract={onContract}
          onLabel={onLabel}
          canEdit={canEdit}
          canManage={canManage}
        />
      ))}
    </div>
  );
}