import { Navigate, useLocation } from "react-router-dom";
import type { Role } from "@/lib/domain";
import { useAuth } from "@/lib/auth";

export function RequireAuth({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
