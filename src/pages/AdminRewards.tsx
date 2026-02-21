import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export default function AdminRewards() {
  const { user } = useAuth();
  if (!user || user.role !== "ADMIN") return null;

  // Prêmios agora vivem dentro do Ranking (Points)
  return <Navigate to="/rankings?tab=tiers" replace />;
}