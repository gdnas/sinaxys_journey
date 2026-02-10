import { Navigate, useLocation } from "react-router-dom";
import type { Role } from "@/lib/domain";
import { useAuth } from "@/lib/auth";

export function RequireAuth({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // While hydrating the session, don't redirect (prevents flicker to /login).
  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white px-6 py-4 text-sm text-muted-foreground">
          Carregando…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Force password update on first access
  if (user.mustChangePassword && location.pathname !== "/password") {
    return <Navigate to="/password" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}