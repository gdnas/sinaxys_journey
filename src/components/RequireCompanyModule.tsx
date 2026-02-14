import { Navigate, useLocation } from "react-router-dom";
import { useCompanyModuleEnabled } from "@/hooks/useCompanyModuleEnabled";
import { useAuth } from "@/lib/auth";
import type { ModuleKey } from "@/lib/modulesDb";

export function RequireCompanyModule({
  moduleKey,
  fallbackTo = "/app",
  children,
}: {
  moduleKey: ModuleKey;
  fallbackTo?: string;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const location = useLocation();
  const { enabled, isLoading } = useCompanyModuleEnabled(moduleKey);

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (user.role === "MASTERADMIN") return <>{children}</>;

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white px-6 py-4 text-sm text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  if (!enabled) return <Navigate to={fallbackTo} replace />;

  return <>{children}</>;
}
