import { Link, Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  if (!enabled) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4">
        <Card className="w-full max-w-xl rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Módulo indisponível</div>
          <p className="mt-2 text-sm text-muted-foreground">
            O módulo <span className="font-medium text-[color:var(--sinaxys-ink)]">{moduleKey}</span> não está habilitado para a sua empresa.
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {user.role === "ADMIN" && (
              <Button asChild className="h-10 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                <Link to="/admin/brand">Habilitar em Admin</Link>
              </Button>
            )}
            <Button asChild variant="outline" className="h-10 rounded-xl">
              <Link to={fallbackTo}>Voltar</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}