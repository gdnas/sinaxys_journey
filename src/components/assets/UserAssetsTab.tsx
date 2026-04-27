import { useState, useEffect } from "react";
import { Box } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { UserAssetItem } from "./UserAssetItem";
import {
  listUserAssets,
  listUserAssetHistory,
  type UserAsset,
} from "@/lib/assetsDb";
import { useAuth } from "@/lib/auth";

interface UserAssetsTabProps {
  userId: string;
  companyId: string;
  userRole?: string;
  currentUserId?: string;
}

function isValidUuid(value: string | null | undefined) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function UserAssetsTab({
  userId,
  companyId,
  userRole,
  currentUserId,
}: UserAssetsTabProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [currentAssets, setCurrentAssets] = useState<UserAsset[]>([]);
  const [historyAssets, setHistoryAssets] = useState<UserAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const hasValidUserId = isValidUuid(userId);

  // Verificar permissão
  const canView =
    userRole === "MASTERADMIN" ||
    userRole === "ADMIN" ||
    userRole === "HEAD" ||
    userId === currentUserId;

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    if (!hasValidUserId) {
      setLoading(false);
      return;
    }

    loadAssets();
  }, [userId, companyId, canView, hasValidUserId]);

  async function loadAssets() {
    try {
      setLoading(true);

      // Carregar ativos atuais e histórico em paralelo
      const [currentData, historyData] = await Promise.all([
        listUserAssets(userId, companyId),
        listUserAssetHistory(userId, companyId),
      ]);

      setCurrentAssets(currentData);
      setHistoryAssets(historyData);
    } catch (error) {
      console.error("Error loading user assets:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os ativos do usuário.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!canView) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">
          Você não tem permissão para visualizar os ativos deste usuário.
        </p>
      </div>
    );
  }

  if (!hasValidUserId) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Usuário ainda não carregado.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Ativos Atuais - Skeleton */}
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--sinaxys-ink)] mb-4">
            Ativos Atuais ({currentAssets.length})
          </h3>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-4 border border-[color:var(--sinaxys-border)] rounded-2xl">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-4 w-64 mb-3" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Histórico - Skeleton */}
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--sinaxys-ink)] mb-4">
            Histórico de Ativos ({historyAssets.length})
          </h3>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-4 border border-[color:var(--sinaxys-border)] rounded-2xl">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-4 w-64 mb-3" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ativos Atuais */}
      <div>
        <h3 className="text-lg font-semibold text-[color:var(--sinaxys-ink)] mb-4 flex items-center gap-2">
          Ativos Atuais
          <Badge variant="secondary" className="rounded-full">
            {currentAssets.length}
          </Badge>
        </h3>

        {currentAssets.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-[color:var(--sinaxys-tint)] flex items-center justify-center mb-3">
              <Box className="h-6 w-6 text-[color:var(--sinaxys-primary)]" />
            </div>
            <p className="text-sm text-muted-foreground">
              Nenhum ativo vinculado no momento
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentAssets.map((asset) => (
              <UserAssetItem
                key={asset.id}
                asset={asset}
                onView={(assetId) => window.location.href = `/app/ativos/${assetId}`}
                onContract={(contractUrl) => window.open(contractUrl, "_blank", "noopener,noreferrer")}
                isHistory={false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Histórico de Ativos */}
      <div>
        <h3 className="text-lg font-semibold text-[color:var(--sinaxys-ink)] mb-4 flex items-center gap-2">
          Histórico de Ativos
          <Badge variant="secondary" className="rounded-full">
            {historyAssets.length}
          </Badge>
        </h3>

        {historyAssets.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-[color:var(--sinaxys-tint)] flex items-center justify-center mb-3">
              <Box className="h-6 w-6 text-[color:var(--sinaxys-primary)]" />
            </div>
            <p className="text-sm text-muted-foreground">
              Nenhum histórico de ativos devolvidos
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {historyAssets.map((asset) => (
              <UserAssetItem
                key={asset.id}
                asset={asset}
                onView={(assetId) => window.location.href = `/app/ativos/${assetId}`}
                onContract={(contractUrl) => window.open(contractUrl, "_blank", "noopener,noreferrer")}
                isHistory={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}