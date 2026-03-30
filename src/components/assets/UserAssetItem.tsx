import { format } from "date-fns";
import { FileText, ExternalLink, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getAssetStatusLabel,
  getAssetCategoryLabel,
  getAssetConditionLabel,
  type UserAsset,
} from "@/lib/assetsDb";

interface UserAssetItemProps {
  asset: UserAsset;
  onView: (assetId: string) => void;
  onContract?: (contractUrl: string) => void;
  isHistory?: boolean;
}

export function UserAssetItem({
  asset,
  onView,
  onContract,
  isHistory = false,
}: UserAssetItemProps) {
  const hasContract = !!asset.signed_document_url;

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
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

  return (
    <Card className="p-4 border border-[color:var(--sinaxys-border)] bg-white rounded-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {/* Nome do ativo */}
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-[color:var(--sinaxys-ink)]">
              {asset.asset_type}
            </h4>
            {isHistory && (
              <Badge variant="outline" className="text-xs rounded-full">
                Devolvido
              </Badge>
            )}
          </div>

          {/* Código e categoria */}
          <div className="text-sm text-muted-foreground mb-2">
            <span className="font-mono">{asset.asset_code}</span>
            <span className="mx-2">•</span>
            <span>{getAssetCategoryLabel(asset.category)}</span>
          </div>

          {/* Dados técnicos */}
          <div className="text-sm text-[color:var(--sinaxys-ink)] mb-3">
            <span className="font-medium">{asset.brand}</span>
            {asset.model && <span> • {asset.model}</span>}
            {asset.serial_number && <span> • S/N: {asset.serial_number}</span>}
          </div>

          {/* Status e estado */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge className={`px-2 py-1 rounded-full text-xs ${getStatusColor(asset.status)}`}>
              {getAssetStatusLabel(asset.status)}
            </Badge>
            <Badge variant="outline" className="text-xs rounded-full">
              Estado: {getAssetConditionLabel(asset.condition_initial)}
            </Badge>
          </div>

          {/* Datas */}
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">Cedido em:</span>{" "}
              {format(new Date(asset.assigned_at), "dd/MM/yyyy")}
            </div>
            {!isHistory && asset.expected_return_date && (
              <div>
                <span className="font-medium">Previsto:</span>{" "}
                {format(new Date(asset.expected_return_date), "dd/MM/yyyy")}
              </div>
            )}
            {isHistory && asset.returned_at && (
              <div>
                <span className="font-medium">Devolvido em:</span>{" "}
                {format(new Date(asset.returned_at), "dd/MM/yyyy")}
              </div>
            )}
            {isHistory && asset.return_condition && (
              <div>
                <span className="font-medium">Estado final:</span>{" "}
                {getAssetConditionLabel(asset.return_condition)}
              </div>
            )}
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView(asset.id)}
            className="rounded-xl"
          >
            Ver detalhes
          </Button>
          {hasContract && onContract && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onContract(asset.signed_document_url!)}
              className="rounded-xl"
            >
              <FileText className="h-4 w-4 mr-1" />
              Contrato
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
