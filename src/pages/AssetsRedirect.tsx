import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AssetsRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionar para o dashboard
    navigate("/app/ativos", { replace: true });
  }, [navigate]);

  return null;
}
