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

// ... existing code ...
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleModules = useMemo(() => {
    if (!user) return [];
    return [
      { label: "Início", to: "/app", icon: LayoutDashboard },
      { label: "Finance", to: "/finance", icon: Wallet },
      { label: "Projetos", to: "/app/projetos", icon: Layers },
      { label: "OKR", to: "/okr", icon: Target },
      { label: "Org", to: "/org", icon: Building2 },
      { label: "PDI", to: "/pdi-performance", icon: GraduationCap },
      { label: "Ativos", to: "/app/ativos/lista", icon: Box },
      { label: "Configurações", to: "/settings", icon: Settings },
    ];
  }, [user]);

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)]">
      <header className="sticky top-0 z-40 border-b border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link to="/app" className="flex items-center gap-3 font-semibold">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-primary)] text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm leading-none">Sinaxys</div>
              <div className="text-xs text-[color:var(--sinaxys-ink)]/60">{companyId ? "Workspace ativo" : "Sem empresa"}</div>
            </div>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            {visibleModules.map((item) => {
              const Icon = item.icon;
              return (
                <Button key={item.to} asChild variant={location.pathname.startsWith(item.to) ? "default" : "ghost"} className="rounded-full">
                  <Link to={item.to}>
                    <Icon className="mr-2 h-4 w-4" />{item.label}
                  </Link>
                </Button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full md:hidden"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[320px] bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-2">
                  {visibleModules.map((item) => {
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
      <main>{children}</main>
    </div>
  );
}

export default AppShell;
