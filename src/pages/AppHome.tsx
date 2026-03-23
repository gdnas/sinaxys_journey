import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import AdminExecutiveHome from "@/pages/AdminExecutiveHome";
import HeadTacticalHome from "@/pages/HeadTacticalHome";
import CollaboratorOperationalHome from "@/pages/CollaboratorOperationalHome";

export default function AppHome() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === "MASTERADMIN") return <Navigate to="/master/overview" replace />;
  
  if (user.role === "ADMIN") return <AdminExecutiveHome />;
  if (user.role === "HEAD") return <HeadTacticalHome />;
  return <CollaboratorOperationalHome />;
}