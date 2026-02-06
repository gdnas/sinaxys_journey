import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const { user, loading } = useAuth();

  // Evita loop/flicker enquanto a sessão/perfil ainda está carregando.
  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;

  if (user.mustChangePassword) return <Navigate to="/password" replace />;

  if (user.role === "MASTERADMIN") return <Navigate to="/master/overview" replace />;
  if (user.role === "COLABORADOR") return <Navigate to="/app" replace />;
  if (user.role === "HEAD") return <Navigate to="/head" replace />;
  return <Navigate to="/admin/users" replace />;
}