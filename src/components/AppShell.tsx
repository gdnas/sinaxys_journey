import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Award,
  BarChart3,
  BookOpen,
  Box,
  Building2,
  CalendarClock,
  CheckCircle2,
  Crown,
  GraduationCap,
  Handshake,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  Megaphone,
  Network,
  Palette,
  Settings,
  Shield,
  Target,
  TestTube,
  Trophy,
  User as UserIcon,
  Video,
  Wallet,
  Wrench,
  Users2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { isCompanyModuleEnabled } from "@/lib/modulesDb";
import { getCompanyFundamentals } from "@/lib/okrDb";
import { describedItemsToLines, parseDescribedItems } from "@/lib/fundamentalsFormat";
import { roleLabel } from "@/lib/sinaxys";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import NotificationsPanel from "@/components/Notifications/NotificationsPanel";
import type { Role } from "@/lib/domain";
import { useTranslation } from "react-i18next";

function moduleIcon(key: string) {
  switch (key) {
    case "OKR": return <Target className="h-4 w-4" />;
    case "PROJECTS": return <CalendarClock className="h-4 w-4" />;
    case "PDI_PERFORMANCE": return <Handshake className="h-4 w-4" />;
    case "TRACKS": return <GraduationCap className="h-4 w-4" />;
    case "POINTS": return <Trophy className="h-4 w-4" />;
    case "ORG": return <Network className="h-4 w-4" />;
    case "COSTS": return <Wallet className="h-4 w-4" />;
    case "FINANCE": return <BarChart3 className="h-4 w-4" />;
    case "INTERNAL_COMMUNICATION": return <Megaphone className="h-4 w-4" />;
    case "ASSETS": return <Box className="h-4 w-4" />;
    case "SQUAD_INTELLIGENCE": return <Users2 className="h-4 w-4" />;
    default: return <LayoutDashboard className="h-4 w-4" />;
  }
}

function moduleLabel(key: string) {
  switch (key) {
    case "OKR": return "OKR";
    case "PROJECTS": return "Projetos";
    case "PDI_PERFORMANCE": return "PDI";
    case "TRACKS": return "Trilhas";
    case "POINTS": return "Points";
    case "ORG": return "Org";
    case "COSTS": return "Custos";
    case "FINANCE": return "Finance";
    case "INTERNAL_COMMUNICATION": return "Recados";
    case "ASSETS": return "Ativos";
    case "SQUAD_INTELLIGENCE": return "Squads";
    default: return key;
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { companyId } = useCompany();

  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);

  const { data: fundamentals } = useQuery({
    queryKey: ["company-fundamentals", companyId],
    queryFn: () => getCompanyFundamentals(String(companyId)),
    enabled: !!companyId,
  });

  const moduleKeys = useMemo(() => {
    if (!companyId) return [] as string[];
    return ["OKR", "PROJECTS", "PDI_PERFORMANCE", "TRACKS", "POINTS", "ORG", "COSTS", "FINANCE", "INTERNAL_COMMUNICATION", "ASSETS", "SQUAD_INTELLIGENCE"];
  }, [companyId]);

  const enabledModules = useMemo(() => {
    if (!companyId) return [] as string[];
    return moduleKeys.filter((key) => isCompanyModuleEnabled(String(companyId), key as any));
  }, [companyId, moduleKeys]);

  const topNav = [
    { label: "Início", to: "/app", icon: LayoutDashboard },
    { label: "Finance", to: "/finance", icon: Wallet },
    { label: "Projetos", to: "/app/projetos", icon: Layers },
    { label: "OKR", to: "/okr", icon: Target },
    { label: "Org", to: "/org", icon: Network },
    { label: "PDI", to: "/pdi-performance", icon: Handshake },
    { label: "Ativos", to: "/app/ativos/lista", icon: Box },
    { label: "Configurações", to: "/settings", icon: Settings },
  ];

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)]">
      <header className="sticky top-0 z-40 border-b border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-6">
          <Link to="/app" className="flex items-center gap-3 rounded-2xl px-2 py-1 hover:bg-white/5">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-[color:var(--sinaxys-primary)] text-white">
              <Shield className="h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold leading-none">Sinaxys</div>
              <div className="text-xs text-[color:var(--sinaxys-ink)]/60">Workspace ativo</div>
            </div>
          </Link>

          <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {topNav.map((item) => {
              const Icon = item.icon;
              const active = location.pathname.startsWith(item.to);
              return (
                <Button key={item.to} asChild variant={active ? "default" : "ghost"} className="rounded-full px-4">
                  <Link to={item.to}>
                    <Icon className="mr-2 h-4 w-4" />{item.label}
                  </Link>
                </Button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <NotificationsPanel />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full lg:hidden"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[320px] bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-2">
                  {topNav.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Button key={item.to} asChild variant="ghost" className="justify-start rounded-2xl">
                        <Link to={item.to} onClick={() => setMobileOpen(false)}>
                          <Icon className="mr-2 h-4 w-4" />{item.label}
                        </Link>
                      </Button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-4 md:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-3xl border border-[color:var(--sinaxys-border)] bg-white/5 p-3">
          <Button variant="ghost" className="rounded-full" onClick={() => setModulesOpen((v) => !v)}>
            <BookOpen className="mr-2 h-4 w-4" />Módulos
          </Button>
          <div className="hidden h-6 w-px bg-[color:var(--sinaxys-border)] sm:block" />
          <div className="flex flex-wrap gap-2">
            {enabledModules.map((key) => (
              <Button key={key} asChild variant="outline" className="rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-[color:var(--sinaxys-ink)] hover:bg-white/5">
                <Link to={key === "FINANCE" ? "/finance" : "/app"}>
                  {moduleIcon(key)}<span className="ml-2">{moduleLabel(key)}</span>
                </Link>
              </Button>
            ))}
          </div>
        </div>
        {modulesOpen && (
          <div className="mb-4 rounded-3xl border border-[color:var(--sinaxys-border)] bg-white/5 p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />Estratégia</div>
                <div className="grid gap-2">
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-3 text-sm">OKRs (primário)</div>
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-3 text-sm">ROI dentro de OKR</div>
                </div>
              </div>
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><CalendarClock className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />Execução</div>
                <div className="grid gap-2">
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-3 text-sm">Gestão de Projetos</div>
                </div>
              </div>
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><GraduationCap className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />Evolução</div>
                <div className="grid gap-2">
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-3 text-sm">PDI & Performance</div>
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-3 text-sm">Trilhas de Conhecimento</div>
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-3 text-sm">Points</div>
                </div>
              </div>
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Building2 className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />Empresa</div>
                <div className="grid gap-2">
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-3 text-sm">Organograma</div>
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-3 text-sm">Custos e Despesas</div>
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-3 text-sm">Finance</div>
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-3 text-sm">Recados</div>
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-3 text-sm">Gestão de Ativos</div>
                </div>
              </div>
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Users2 className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />Squad Intelligence</div>
                <div className="grid gap-2">
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-3 text-sm">Squads</div>
                </div>
              </div>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

export default AppShell;
