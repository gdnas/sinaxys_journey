import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export default function AdminRewards() {
  const { user } = useAuth();
  if (!user || user.role !== "ADMIN") return null;

  // Tiers & premiações agora vivem dentro do Ranking (Sinaxys Points)
  return <Navigate to="/rankings?tab=tiers" replace />;
}