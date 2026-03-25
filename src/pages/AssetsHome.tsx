import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Briefcase,
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  Users,
  Wrench,
  CheckCircle,
  TrendingDown,
  PercentBadge as PercentBadge,
} from "lucide-react";
import { useCompany } from "@/lib/company";
import { useAuth } from "@/lib/auth";
import { getAssetsDashboardStats } from "@/lib/assetsDb";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireCompanyModule } from "@/components/RequireCompanyModule";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function PercentBadge({ value }: { value: number }) {
  return (
    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)]/15 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-white p-2 text-[color:var(--sinaxys-primary)] shadow-sm">
          <TrendingDown className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Depreciação
          </div>
          <div className="mt-1 text-lg font-bold text-[color:var(--sinaxys-ink)]">
            {value.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrapper com verificação de autenticação e módulo
function AssetsHomeWrapper() {
  return (
    <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
      <RequireCompanyModule moduleKey="ASSETS">
        <AssetsHome />
      </RequireCompanyModule>
    </RequireAuth>
  );
}

// Default export for the module (this is the important one)
export default AssetsHomeWrapper;