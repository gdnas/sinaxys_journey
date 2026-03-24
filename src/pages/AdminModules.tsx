import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/lib/company";
import { isCompanyModuleEnabled, setCompanyModuleEnabled } from "@/lib/modulesDb";
import ModuleToggle from "@/components/ModuleToggle";
import { InternalCommunicationModuleCard } from "@/components/InternalCommunicationModuleCard";
import { Target, Handshake, GraduationCap, CalendarClock, Trophy, Wallet, Network, BarChart3 } from "lucide-react";

export default function AdminModules() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { company, companyId } = useCompany();

  const queryEnabled = !!companyId;

  const { data: okrEnabled = true, refetch: refetchOkr } = useQuery({
    queryKey: ["company-module", companyId, "OKR"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "OKR"),
    enabled: queryEnabled,
  });

  const { data: okrRoiEnabled = true, refetch: refetchOkrRoi } = useQuery({
    queryKey: ["company-module", companyId, "OKR_ROI"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "OKR_ROI"),
    enabled: queryEnabled,
  });

  const { data: pdiEnabled = true, refetch: refetchPdi } = useQuery({
    queryKey: ["company-module", companyId, "PDI_PERFORMANCE"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "PDI_PERFORMANCE"),
    enabled: queryEnabled,
  });

  const { data: tracksEnabled = true, refetch: refetchTracks } = useQuery({
    queryKey: ["company-module", companyId, "TRACKS"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "TRACKS"),
    enabled: queryEnabled,
  });

  const { data: projectsEnabled = true, refetch: refetchProjects } = useQuery({
    queryKey: ["company-module", companyId, "PROJECTS"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "PROJECTS"),
    enabled: queryEnabled,
  });

  const { data: pointsEnabled = true, refetch: refetchPoints } = useQuery({
    queryKey: ["company-module", companyId, "POINTS"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "POINTS"),
    enabled: queryEnabled,
  });

  const { data: costsEnabled = true, refetch: refetchCosts } = useQuery({
    queryKey: ["company-module", companyId, "COSTS"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "COSTS"),
    enabled: queryEnabled,
  });

  const { data: orgEnabled = true, refetch: refetchOrg } = useQuery({
    queryKey: ["company-module", companyId, "ORG"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "ORG"),
    enabled: queryEnabled,
  });

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('nav.company.modules')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie a visibilidade de módulos da empresa.</p>
        </div>
        <div />
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Módulos (visibilidade por empresa)</div>
            <p className="mt-1 text-sm text-muted-foreground">
              OKRs é o módulo primário. Os demais podem ser ocultados conforme a estratégia da empresa.
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <BarChart3 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-3">
          <ModuleToggle
            icon={<Target className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
            title="OKRs (primário)"
            description="Foco e execução: ciclos, objetivos, KRs, entregáveis e tarefas."
            checked={okrEnabled}
            locked
            onChange={() => null}
          />

          <ModuleToggle
            icon={<Handshake className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
            title="PDI & Performance"
            description="Check-ins, 1:1, feedback contínuo e histórico profissional."
            checked={pdiEnabled}
            onChange={async (v) => {
              if (!companyId) return;
              await setCompanyModuleEnabled(companyId, "PDI_PERFORMANCE", v);
              await refetchPdi();
              toast({ title: v ? "Módulo ativado" : "Módulo ocultado", description: "O menu será atualizado automaticamente." });
            }}
          />

          <ModuleToggle
            icon={<GraduationCap className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
            title="Trilhas"
            description="Onboarding e aprendizagem contínua em sequência (conteúdo, checkpoints e quiz)."
            checked={tracksEnabled}
            onChange={async (v) => {
              if (!companyId) return;
              await setCompanyModuleEnabled(companyId, "TRACKS", v);
              await refetchTracks();
              toast({ title: v ? "Módulo ativado" : "Módulo ocultado", description: "O menu será atualizado automaticamente." });
            }}
          />

          <ModuleToggle
            icon={<CalendarClock className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
            title="Gestão de Projetos"
            description="Gerencie projetos, tarefas e acompanhe o progresso operacional da empresa."
            checked={projectsEnabled}
            onChange={async (v) => {
              if (!companyId) return;
              await setCompanyModuleEnabled(companyId, "PROJECTS", v);
              await refetchProjects();
              toast({ title: v ? "Módulo ativado" : "Módulo ocultado", description: "O menu será atualizado automaticamente." });
            }}
          />

          <ModuleToggle
            icon={<Trophy className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
            title="Points"
            description="Reconhecimento: ranking, regras, prêmios e recompensas."
            checked={pointsEnabled}
            onChange={async (v) => {
              if (!companyId) return;
              await setCompanyModuleEnabled(companyId, "POINTS", v);
              await refetchPoints();
              toast({ title: v ? "Módulo ativado" : "Módulo ocultado", description: "O menu será atualizado automaticamente." });
            }}
          />

          <ModuleToggle
            icon={<Wallet className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
            title="Custos e Despesas"
            description="Custos mensais por pessoa para apoiar decisões e (opcionalmente) cálculos de ROI."
            checked={costsEnabled}
            onChange={async (v) => {
              if (!companyId) return;
              await setCompanyModuleEnabled(companyId, "COSTS", v);
              await refetchCosts();
              toast({ title: v ? "Módulo ativado" : "Módulo ocultado", description: "O menu será atualizado automaticamente." });
            }}
          />

          <ModuleToggle
            icon={<Network className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
            title="Organograma"
            description="Organograma e contexto da organização (pessoas e reporting lines)."
            checked={orgEnabled}
            onChange={async (v) => {
              if (!companyId) return;
              await setCompanyModuleEnabled(companyId, "ORG", v);
              await refetchOrg();
              toast({ title: v ? "Módulo ativado" : "Módulo ocultado", description: "O menu será atualizado automaticamente." });
            }}
          />

          <ModuleToggle
            icon={<Target className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
            title="ROI dentro de OKR (opcional)"
            description="Habilita a seção de impacto financeiro e ROI em objetivos/tarefas."
            checked={okrRoiEnabled}
            onChange={async (v) => {
              if (!companyId) return;
              await setCompanyModuleEnabled(companyId, "OKR_ROI", v);
              await refetchOkrRoi();
              toast({ title: v ? "ROI ativado" : "ROI ocultado", description: "As telas de OKR serão atualizadas automaticamente." });
            }}
          />
        </div>
      </Card>

      <div className="grid gap-4">
        <InternalCommunicationModuleCard />
      </div>
    </div>
  );
}
