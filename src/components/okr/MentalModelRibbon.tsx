import { Card } from "@/components/ui/card";

export function MentalModelRibbon() {
  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-4">
      <div className="flex flex-col gap-1.5 text-center">
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">
          Kairoos conecta fundamentos, objetivos, projetos e tarefas do dia.
        </div>
        <div className="text-xs text-muted-foreground">
          Fluxo: Fundamentos → Longo prazo → Ano → Trimestre → Projetos → Hoje
        </div>
      </div>
    </Card>
  );
}
