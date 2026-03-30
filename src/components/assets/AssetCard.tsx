import { format } from "date-fns";
import { Building2, User, FileText, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getAssetStatusLabel,
  getAssetCategoryLabel,
  getAssetConditionLabel,
  type AssetWithAssignee,
  type AssetStatus,
} from "@/lib/assetsDb";

export type { AssetWithAssignee };

interface AssetCardProps {
  asset: AssetWithAssignee;
  onView: (assetId: string) => void;
  onEdit?: (assetId: string) => void;
  onContract?: (contractUrl: string) => void;
  canEdit?: boolean;
  canManage?: boolean;
}

export function AssetCard({
  asset,
  onView,
  onEdit,
  onContract,
  canEdit = false,
  canManage = false,
}: AssetCardProps) {
  const assignee = asset.current_assignment?.profile;
  const hasContract = !!asset.current_assignment?.signed_document_url;
  const isAvailable = asset.status === 'in_stock' || asset.status === 'reserved';

  const getStatusColor = (status: AssetStatus): string => {
    const colors: Record<AssetStatus, string> = {
      in_stock: "bg-green-100 text-green-700 hover:bg-green-100",
      reserved: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
      in_use: "bg-blue-100 text-blue-700 hover:bg-blue-100",
      in_return: "bg-orange-100 text-orange-700 hover:bg-orange-100",
      returned: "bg-gray-100 text-gray-700 hover:bg-gray-100",
      in_maintenance: "bg-purple-100 text-purple-700 hover:bg-purple-100",
      acquired_by_user: "bg-indigo-100 text-indigo-700 hover:bg-indigo-100",
      lost: "bg-red-100 text-red-700 hover:bg-red-100",
      discarded: "bg-gray-100 text-gray-700 hover:bg-gray-100",
    };
    return colors[status] || "";
  };

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
    return (a + b).toUpperCase();
  };

  return (
    <Card className="p-5 border border-[color:var(--sinaxys-border)] bg-white hover:shadow-md transition-all rounded-2xl">
      {/* Header: Nome + Status + Contrato */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg text-[color:var(--sinaxys-ink)]">{asset.asset_type}</h3>
            <Badge variant="outline" className="text-xs rounded-full">
              {asset.asset_code}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {getAssetCategoryLabel(asset.category)}
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className={`px-3 py-1 rounded-full ${getStatusColor(asset.status)}`}>
            {getAssetStatusLabel(asset.status)}
          </Badge>
          {hasContract ? (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 px-2 py-1 rounded-full">
              ✓ Contrato
            </Badge>
          ) : asset.current_assignment ? (
            <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 px-2 py-1 rounded-full">
              Sem contrato
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Dados técnicos compactos */}
      <div className="text-sm mb-3 text-[color:var(--sinaxys-ink)]">
        <span className="font-medium">{asset.brand}</span>
        {asset.model && <span> • {asset.model}</span>}
        {asset.serial_number && <span> • S/N: {asset.serial_number}</span>}
      </div>

      {/* Responsável atual (layout compacto) */}
      {assignee ? (
        <div className="flex items-center gap-2 text-sm mb-3 p-2 bg-[color:var(--sinaxys-tint)]/30 rounded-xl">
          <Avatar className="h-6 w-6">
            <AvatarImage src={undefined} alt={assignee.name} />
            <AvatarFallback className="text-[10px] bg-[color:var(--sinaxys-primary)] text-white">
              {initials(assignee.name)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-[color:var(--sinaxys-ink)]">{assignee.name}</span>
          {assignee.job_title && <span className="text-muted-foreground">• {assignee.job_title}</span>}
          <span className="text-muted-foreground ml-auto">
            {format(new Date(asset.current_assignment!.assigned_at), 'dd/MM/yyyy')}
          </span>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground mb-3 p-2 bg-[color:var(--sinaxys-tint)]/30 rounded-xl">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Sem responsável atual</span>
          </div>
        </div>
      )}

      {/* Ações rápidas */}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onView(asset.id)} className="rounded-xl">
          Ver detalhes
        </Button>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => onEdit?.(asset.id)} className="rounded-xl">
            Editar
          </Button>
        )}
        {hasContract && onContract && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onContract(asset.current_assignment!.signed_document_url!)}
            className="rounded-xl"
          >
            <FileText className="h-4 w-4 mr-1" />
            Contrato
          </Button>
        )}
      </div>
    </Card>
  );
}