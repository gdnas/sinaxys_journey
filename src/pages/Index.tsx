import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (user.mustChangePassword) return <Navigate to="/password" replace />;

  // Master Admin keeps the platform backoffice as the default landing.
  if (user.role === "MASTERADMIN") return <Navigate to="/master/overview" replace />;

  // Everyone inside a company lands on "Minha jornada".
  return <Navigate to="/app" replace />;
}