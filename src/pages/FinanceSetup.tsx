import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function FinanceSetup() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[color:var(--sinaxys-bg)] px-4 py-6 md:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <Card className="rounded-[28px] border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur md:p-10">
          <div className="inline-flex items-center rounded-full border border-[color:var(--sinaxys-border)] bg-white/5 px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]/80">
            Configuração inicial
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
            Configuração do Financeiro
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70 md:text-base">
            Nas próximas etapas você irá configurar contas, períodos e cenários.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-11 rounded-full bg-[color:var(--sinaxys-primary)] px-6 text-white hover:bg-[color:var(--sinaxys-primary)]/90">
              <Link to="/finance">Voltar ao Finance</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 px-6 text-[color:var(--sinaxys-ink)] hover:bg-white/5">
              <Link to="/admin/modules">Gerenciar módulos</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}