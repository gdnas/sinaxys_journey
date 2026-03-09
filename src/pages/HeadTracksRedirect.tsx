import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function HeadTracksRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/tracks", { replace: true });
  }, [navigate]);

  return null;
}