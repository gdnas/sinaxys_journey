import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[color:var(--sinaxys-bg)] px-4 py-10">
      <div className="mx-auto max-w-xl rounded-3xl border bg-white p-6">
        <h1 className="text-2xl font-semibold text-[color:var(--sinaxys-ink)]">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O caminho <span className="font-medium text-[color:var(--sinaxys-ink)]">{location.pathname}</span> não existe nesta versão.
        </p>
        <Button asChild variant="outline" className="mt-5 rounded-xl">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;