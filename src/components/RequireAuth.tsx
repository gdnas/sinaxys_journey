import { Navigate, useLocation } from "react-router-dom";
import type { Role } from "@/lib/domain";
import { useAuth } from "@/lib/auth";

export function RequireAuth({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Evita loop/flicker enquanto a sessão/perfil ainda está carregando.
  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Force password update on first access
  if (user.mustChangePassword && location.pathname !== "/password") {
    return <Navigate to="/password" replace />;
  }

  // MASTERADMIN é super-user (pode acessar qualquer tela). A segurança real fica no RLS do Supabase.
  if (roles && user.role !== "MASTERADMIN" && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}