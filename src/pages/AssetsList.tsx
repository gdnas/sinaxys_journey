import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Search, Plus, Filter, Box, MoreHorizontal, ArrowLeft } from "lucide-react";
import { useCompany } from "@/lib/company";
import { useAuth } from "@/lib/auth";
import { listAssets, getAssetStatusLabel, getAssetCategoryLabel, type AssetFilters } from "@/lib/assetsDb";
import {
  Card,
  Badge,
  Button,
  Input,
  Select,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";

// =====================
// SUBCOMPONENTS
// =====================

function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
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

  return (
    <Badge variant="outline" className={`rounded-2xl ${statusColors[status] || ""}`}>
      {getAssetStatusLabel(status as any)}
    </Badge>
  );
}

// Wrapper com verificação de autenticação e módulo
function AssetsListWrapper() {
  return (
    <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
      <RequireCompanyModule moduleKey="ASSETS">
        <AssetsList />
      </RequireCompanyModule>
    </RequireAuth>
  );
}

// Default export para o módulo (importante wrapper)
export default AssetsListWrapper;