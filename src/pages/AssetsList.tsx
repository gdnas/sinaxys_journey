import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Search, Plus, Filter, Box, MoreHorizontal, ArrowLeft } from "lucide-react";
import { useCompany } from "@/lib/company";
import { useAuth } from "@/lib/auth";
import { listAssets, getAssetStatusLabel, getAssetCategoryLabel, type AssetFilters } from "@/lib/assetsDb";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireCompanyModule } from "@/components/RequireCompanyModule";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

// Named exports
export { AssetsList };
// Default export for module (importante wrapper)
export default AssetsListWrapper;