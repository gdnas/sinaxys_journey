import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import AdminHome from "@/pages/AdminHome";
import HeadHome from "@/pages/HeadHome";
import CollaboratorHome from "@/pages/CollaboratorHome";

export default function AppHome() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === "MASTERADMIN") return <Navigate to="/master/overview" replace />;
  if (user.role === "ADMIN") return <AdminHome />;
  if (user.role === "HEAD") return <HeadHome />;
  return <CollaboratorHome />;
}
