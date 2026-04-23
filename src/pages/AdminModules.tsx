import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/lib/company";
import { isCompanyModuleEnabled, setCompanyModuleEnabled } from "@/lib/modulesDb";
import ModuleToggle from "@/components/ModuleToggle";
import {
  Target,
  Handshake,
  GraduationCap,
  CalendarClock,
  Trophy,
  Wallet,
  Network,
  Building2,
  Megaphone,
  Box,
  Users2,
  LineChart,
} from "lucide-react";

interface ModuleSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

function ModuleSection({ icon, title, description, children }: ModuleSectionProps) {
  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
      <div className="flex items-start gap-4 mb-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Separator className="mb-5" />
      <div className="grid gap-3">
        {children}
      </div>
    </Card>
  );
}

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

  const { data: internalCommEnabled = true, refetch: refetchInternalComm } = useQuery({
    queryKey: ["company-module", companyId, "INTERNAL_COMMUNICATION"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "INTERNAL_COMMUNICATION"),
    enabled: queryEnabled,
  });

  const { data: assetsEnabled = true, refetch: refetchAssets } = useQuery({
    queryKey: ["company-module", companyId, "ASSETS"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "ASSETS"),
    enabled: queryEnabled,
  });

  const { data: squadIntelligenceEnabled = true, refetch: refetchSquadIntelligence } = useQuery({
    queryKey: ["company-module", companyId, "SQUAD_INTELLIGENCE"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "SQUAD_INTELLIGENCE"),
    enabled: queryEnabled,
  });

  const { data: financeEnabled = true, refetch: refetchFinance } = useQuery({
    queryKey: ["company-module", companyId, "FINANCE"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "FINANCE"),
    enabled: queryEnabled,
  });

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('nav.company.modules')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure os módulos disponíveis por área funcional.
          </p>
        </div>
      </div>

      {/* ESTRATÉGIA */}
      <ModuleSection
        icon={<Target className="h-6 w-6 text-[color:var(--sinaxys-primary)]" />}
        title="Estratégia"
        description="Definição de direção, objetivos e resultados-chave da empresa."
      >
        <ModuleToggle
          icon={<Target className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
          title="OKRs (primário)"
          description="Módulo primário e essencial. Define direção estratégica, objetivos, resultados-chave e conecta toda a execução da empresa."
          checked={okrEnabled}
          locked
          onChange={() => null}
        />

        <ModuleToggle
          icon={<Wallet className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
          title="ROI dentro de OKR"
          description="Controle de impacto financeiro. Calcule e acompanhe o retorno sobre investimentos de objetivos e tarefas específicas."
          checked={okrRoiEnabled}
          onChange={async (v) => {
            if (!companyId) return;
            await setCompanyModuleEnabled(companyId, "OKR_ROI", v);
            await refetchOkrRoi();
            toast({ title: v ? "ROI ativado" : "ROI ocultado", description: "As telas de OKR serão atualizadas automaticamente." });
          }}
        />
      </ModuleSection>

      {/* EXECUÇÃO */}
      <ModuleSection
        icon={<CalendarClock className="h-6 w-6 text-[color:var(--sinaxys-primary)]" />}
        title="Execução"
        description="Gestão operacional de projetos e tarefas."
      >
        <ModuleToggle
          icon={<CalendarClock className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
          title="Gestão de Projetos"
          description="Gestão operacional de projetos e tarefas. Acompanhe entregáveis, dependências e progresso das iniciativas."
          checked={projectsEnabled}
          onChange={async (v) => {
            if (!companyId) return;
            await setCompanyModuleEnabled(companyId, "PROJECTS", v);
            await refetchProjects();
            toast({ title: v ? "Módulo ativado" : "Módulo ocultado", description: "O menu será atualizado automaticamente." });
          }}
        />
      </ModuleSection>

      {/* EVOLUÇÃO */}
      <ModuleSection
        icon={<GraduationCap className="h-6 w-6 text-[color:var(--sinaxys-primary)]" />}
        title="Evolução"
        description="Desenvolvimento do time, conhecimento e engajamento."
      >
        <ModuleToggle
          icon={<Handshake className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
          title="PDI & Performance"
          description="Cultura de feedback contínuo. Check-ins, 1:1, histórico profissional e acompanhamento de evolução das pessoas."
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
          title="Trilhas de Conhecimento"
          description="Estruturação de conhecimento e onboarding. Crie trilhas sequenciais com vídeos, checkpoints e quiz para evolução do time."
          checked={tracksEnabled}
          onChange={async (v) => {
            if (!companyId) return;
            await setCompanyModuleEnabled(companyId, "TRACKS", v);
            await refetchTracks();
            toast({ title: v ? "Módulo ativado" : "Módulo ocultado", description: "O menu será atualizado automaticamente." });
          }}
        />

        <ModuleToggle
          icon={<Trophy className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
          title="Points"
          description="Sistema de reconhecimento e engajamento. Ranking, prêmios e gamificação para motivar e celebrar conquistas da equipe."
          checked={pointsEnabled}
          onChange={async (v) => {
            if (!companyId) return;
            await setCompanyModuleEnabled(companyId, "POINTS", v);
            await refetchPoints();
            toast({ title: v ? "Módulo ativado" : "Módulo ocultado", description: "O menu será atualizado automaticamente." });
          }}
        />
      </ModuleSection>

      {/* EMPRESA */}
      <ModuleSection
        icon={<Building2 className="h-6 w-6 text-[color:var(--sinaxys-primary)]" />}
        title="Empresa"
        description="Estrutura organizacional, finanças e comunicação interna."
      >
        <ModuleToggle
          icon={<Network className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
          title="Organograma"
          description="Estrutura organizacional e contexto. Visualize hierarquia, reporting lines e informações das pessoas da empresa."
          checked={orgEnabled}
          onChange={async (v) => {
            if (!companyId) return;
            await setCompanyModuleEnabled(companyId, "ORG", v);
            await refetchOrg();
            toast({ title: v ? "Módulo ativado" : "Módulo ocultado", description: "O menu será atualizado automaticamente." });
          }}
        />

        <ModuleToggle
          icon={<Wallet className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
          title="Custos e Despesas"
          description="Gestão financeira por pessoa e projeto. Apoie decisões estratégicas com dados de custo e, opcionalmente, cálculo de ROI."
          checked={costsEnabled}
          onChange={async (v) => {
            if (!companyId) return;
            await setCompanyModuleEnabled(companyId, "COSTS", v);
            await refetchCosts();
            toast({ title: v ? "Módulo ativado" : "Módulo ocultado", description: "O menu será atualizado automaticamente." });
          }}
        />

        <ModuleToggle
          icon={<LineChart className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
          title="Finance"
          description="Planejamento financeiro e performance. Orçamento, forecast, margem e análise gerencial conectados à execução."
          checked={financeEnabled}
          onChange={async (v) => {
            if (!companyId) return;
            await setCompanyModuleEnabled(companyId, "FINANCE", v);
            await refetchFinance();
            toast({ title: v ? "Módulo ativado" : "Módulo ocultado", description: "O menu será atualizado automaticamente." });
          }}
        />

        <ModuleToggle
          icon={<Megaphone className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
          title="Recados"
          description="Mural de comunicados internos. Publique avisos corporativos ou de time para manter todos alinhados e informados."
          checked={internalCommEnabled}
          onChange={async (v) => {
            if (!companyId) return;
            await setCompanyModuleEnabled(companyId, "INTERNAL_COMMUNICATION", v);
            await refetchInternalComm();
            toast({ title: v ? "Módulo ativado" : "Módulo ocultado", description: "O menu será atualizado automaticamente." });
          }}
        />

        <ModuleToggle
          icon={<Box className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
          title="Gestão de Ativos"
          description="Controle completo do patrimônio da empresa. Acompanhe ativos, cessões, depreciação e ocorrências."
          checked={assetsEnabled}
          onChange={async (v) => {
            if (!companyId) return;
            await setCompanyModuleEnabled(companyId, "ASSETS", v);
            await refetchAssets();
            toast({ title: v ? "Módulo ativado" : "Módulo ocultado", description: "O menu será atualizado automaticamente." });
          }}
        />
      </ModuleSection>

      {/* SQUAD INTELLIGENCE */}
      <ModuleSection
        icon={<Users2 className="h-6 w-6 text-[color:var(--sinaxys-primary)]" />}
        title="Squad Intelligence"
        description="Gestão de squads cross-functionais e alocação de pessoas."
      >
        <ModuleToggle
          icon={<Users2 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
          title="Squads"
          description="Gerencie squads cross-functionais, aloque pessoas em múltiplos squads e acompanhe os custos por squad."
          checked={squadIntelligenceEnabled}
          onChange={async (v) => {
            if (!companyId) return;
            await setCompanyModuleEnabled(companyId, "SQUAD_INTELLIGENCE", v);
            await refetchSquadIntelligence();
            toast({ title: v ? "Módulo ativado" : "Módulo ocultado", description: "O menu será atualizado automaticamente." });
          }}
        />
      </ModuleSection>
    </div>
  );
}