import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ProjetosHome() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionar para o dashboard
    navigate("/app/projetos/dashboard", { replace: true });
  }, [navigate]);

  return null;
}
