import { Navigate, useLocation } from "react-router-dom";
import type { Role } from "@/lib/domain";
import { useAuth } from "@/lib/auth";

export function RequireAuth({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  /**
   * IMPORTANT UX BEHAVIOR:
   * Supabase can emit auth events when the tab regains focus (token refresh).
   * During this brief re-hydration we must NOT unmount the protected UI;
   * otherwise any open dialogs/popups lose their in-memory state.
   */
  if (loading) {
    if (user) return <>{children}</>;

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

  if (user.role === "COLABORADOR") {
    return <Navigate to="/" replace />;
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