import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import UnifiedWorkItemsHome from "@/pages/UnifiedWorkItemsHome";

export default function AppHome() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === "MASTERADMIN") return <Navigate to="/master/overview" replace />;
  
  // Use unified home for all roles (ADMIN, HEAD, COLLABORADOR)
  return <UnifiedWorkItemsHome />;
}