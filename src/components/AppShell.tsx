import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Award,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Crown,
  GraduationCap,
  Handshake,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  Network,
  Palette,
  Shield,
  Target,
  TestTube,
  Trophy,
  UploadCloud,
  User as UserIcon,
  Video,
  Wallet,
  Wrench,
  Users,
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
import { describedItemsToLines, parseDescribedItems, textPreview } from "@/lib/fundamentalsFormat";
import { roleLabel } from "@/lib/sinaxys";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import NotificationsPanel from "@/components/Notifications/NotificationsPanel";
import type { Role } from "@/lib/domain";
import { useTranslation } from 'react-i18next';

type NavLinkItem = {
  type: "link";
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
  moduleKey?: string;
};

type NavGroupItem = {
  type: "group";
  label: string;
  icon: React.ReactNode;
  children: NavLinkItem[];
  moduleKey?: string;
};

type NavItem = NavLinkItem | NavGroupItem;

const nav: NavItem[] = [
  // Master admin
  {
    type: "link",
    to: "/master/overview",
    label: "nav.master.overview",
    icon: <BarChart3 className="h-4 w-4" />,
    roles: ["MASTERADMIN"],
  },
  {
    type: "link",
    to: "/master/companies",
    label: "nav.master.companies",
    icon: <Building2 className="h-4 w-4" />,
    roles: ["MASTERADMIN"],
  },
  {
    type: "link",
    to: "/master/users",
    label: "nav.master.users",
    icon: <Shield className="h-4 w-4" />,
    roles: ["MASTERADMIN"],
  },
  {
    type: "link",
    to: "/test-runner",
    label: "nav.master.qapipeline",
    icon: <TestTube className="h-4 w-4" />,
    roles: ["MASTERADMIN"],
  },

  // === HOME ===
  {
    type: "link",
    to: "/app",
    label: "nav.home",
    icon: <LayoutDashboard className="h-4 w-4" />,
    roles: ["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"],
  },

  // === ESTRATÉGIA ===
  {
    type: "group",
    label: "nav.strategy.group",
    icon: <Target className="h-4 w-4" />,
    moduleKey: "OKR",
    children: [
      {
        type: "link",
        to: "/okr/fundamentals",
        label: "nav.strategy.fundamentals",
        icon: <BookOpen className="h-4 w-4" />,
        roles: ["ADMIN", "HEAD", "COLABORADOR"],
        moduleKey: "OKR",
      },
      {
        type: "link",
        to: "/okr/long-term",
        label: "nav.strategy.longterm",
        icon: <Target className="h-4 w-4" />,
        roles: ["ADMIN", "HEAD", "COLABORADOR"],
        moduleKey: "OKR",
      },
      {
        type: "link",
        to: "/okr",
        label: "nav.strategy.okr",
        icon: <Target className="h-4 w-4" />,
        roles: ["ADMIN", "HEAD", "COLABORADOR"],
        moduleKey: "OKR",
      },
      {
        type: "link",
        to: "/okr/map",
        label: "nav.strategy.map",
        icon: <Network className="h-4 w-4" />,
        roles: ["ADMIN", "HEAD", "COLABORADOR"],
        moduleKey: "OKR",
      },
    ],
  },

  // === EXECUÇÃO ===
  {
    type: "group",
    label: "nav.execution.group",
    icon: <CalendarClock className="h-4 w-4" />,
    moduleKey: "PROJECTS",
    children: [
      {
        type: "link",
        to: "/app/projetos/dashboard",
        label: "nav.execution.projects",
        icon: <Layers className="h-4 w-4" />,
        roles: ["ADMIN", "HEAD", "COLABORADOR"],
        moduleKey: "PROJECTS",
      },
      {
        type: "link",
        to: "/app/projetos/lista",
        label: "nav.execution.projectslist",
        icon: <Layers className="h-4 w-4" />,
        roles: ["ADMIN", "HEAD", "COLABORADOR"],
        moduleKey: "PROJECTS",
      },
      {
        type: "link",
        to: "/app/projetos/tarefas",
        label: "nav.execution.tasks",
        icon: <CheckCircle2 className="h-4 w-4" />,
        roles: ["ADMIN", "HEAD", "COLABORADOR"],
        moduleKey: "PROJECTS",
      },
    ],
  },

  // === PESSOAS ===
  {
    type: "group",
    label: "nav.people.group",
    icon: <Users className="h-4 w-4" />,
    moduleKey: "ORG",
    children: [
      {
        type: "link",
        to: "/org",
        label: "nav.people.orgchart",
        icon: <Network className="h-4 w-4" />,
        roles: ["ADMIN", "HEAD", "COLABORADOR"],
        moduleKey: "ORG",
      },
      {
        type: "link",
        to: "/admin/users",
        label: "nav.people.users",
        icon: <UserIcon className="h-4 w-4" />,
        roles: ["ADMIN", "HEAD"],
      },
      {
        type: "link",
        to: "/admin/departments",
        label: "nav.people.departments",
        icon: <Layers className="h-4 w-4" />,
        roles: ["ADMIN"],
      },
    ],
  },

  // === EVOLUÇÃO ===
  {
    type: "group",
    label: "nav.evolution.group",
    icon: <GraduationCap className="h-4 w-4" />,
    moduleKey: "TRACKS",
    children: [
      {
        type: "link",
        to: "/tracks",
        label: "nav.evolution.tracks",
        icon: <GraduationCap className="h-4 w-4" />,
        roles: ["ADMIN", "HEAD", "COLABORADOR"],
        moduleKey: "TRACKS",
      },
      {
        type: "link",
        to: "/app/certificates",
        label: "nav.evolution.certificates",
        icon: <Award className="h-4 w-4" />,
        roles: ["ADMIN", "HEAD", "COLABORADOR"],
        moduleKey: "TRACKS",
      },
      {
        type: "link",
        to: "/videos",
        label: "nav.evolution.videos",
        icon: <Video className="h-4 w-4" />,
        roles: ["ADMIN", "HEAD", "COLABORADOR"],
        moduleKey: "TRACKS",
      },
      {
        type: "link",
        to: "/rankings",
        label: "nav.evolution.points",
        icon: <Trophy className="h-4 w-4" />,
        roles: ["ADMIN", "HEAD", "COLABORADOR"],
        moduleKey: "POINTS",
      },
    ],
  },

  // === EMPRESA ===
  {
    type: "group",
    label: "nav.company.group",
    icon: <Building2 className="h-4 w-4" />,
    children: [
      {
        type: "link",
        to: "/admin/brand",
        label: "nav.company.brand",
        icon: <Palette className="h-4 w-4" />,
        roles: ["ADMIN", "MASTERADMIN"],
      },
      {
        type: "link",
        to: "/admin/email",
        label: "nav.company.email",
        icon: <Wrench className="h-4 w-4" />,
        roles: ["ADMIN", "MASTERADMIN"],
      },
      {
        type: "link",
        to: "/admin/costs",
        label: "nav.company.costs",
        icon: <Wallet className="h-4 w-4" />,
        roles: ["ADMIN", "HEAD"],
        moduleKey: "COSTS",
      },
      {
        type: "link",
        to: "/admin/import",
        label: "nav.company.import",
        icon: <UploadCloud className="h-4 w-4" />,
        roles: ["ADMIN", "HEAD"],
      },
      {
        type: "link",
        to: "/settings",
        label: "nav.company.settings",
        icon: <Palette className="h-4 w-4" />,
        roles: ["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"],
      },
    ],
  },

  // Outros itens (PDI, Knowledge, etc.)
  {
    type: "link",
    to: "/pdi-performance",
    label: "nav.pdi",
    icon: <Handshake className="h-4 w-4" />,
    roles: ["COLABORADOR", "HEAD", "ADMIN"],
    moduleKey: "PDI_PERFORMANCE",
  },

  {
    type: "link",
    to: "/knowledge",
    label: "nav.knowledge",
    icon: <BookOpen className="h-4 w-4" />,
    roles: ["ADMIN", "HEAD", "COLABORADOR"],
    moduleKey: "KNOWLEDGE",
  },

  // Head specific
  {
    type: "link",
    to: "/head/users",
    label: "nav.head.users",
    icon: <Shield className="h-4 w-4" />,
    roles: ["HEAD"],
  },
  {
    type: "link",
    to: "/head/costs",
    label: "nav.head.costs",
    icon: <Wallet className="h-4 w-4" />,
    roles: ["HEAD"],
    moduleKey: "COSTS",
  },

  // Trilhas para Head
  {
    type: "link",
    to: "/admin/tracks",
    label: "nav.tracks.build",
    icon: <GraduationCap className="h-4 w-4" />,
    roles: ["ADMIN", "HEAD"],
    moduleKey: "TRACKS",
  },

  // Minha área
  {
    type: "link",
    to: "/profile",
    label: "nav.profile",
    icon: <UserIcon className="h-4 w-4" />,
    roles: ["ADMIN", "HEAD", "COLABORADOR"],
  },
  {
    type: "link",
    to: "/integrations",
    label: "nav.integrations",
    icon: <Wrench className="h-4 w-4" />,
    roles: ["ADMIN", "HEAD", "COLABORADOR"],
  },
];

function isLinkActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(to + "/");
}

function SideNav({ items, onNavigate, moduleAllowed }: { items: NavItem[]; onNavigate?: () => void; moduleAllowed: (key?: string) => boolean }) {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  const groups = items.filter((i): i is NavGroupItem => i.type === "group");
  const defaultOpen = groups
    .filter((g) => g.children.some((c) => isLinkActive(pathname, c.to)))
    .map((g) => g.label);

  return (
    <nav className="flex flex-col gap-1">
      <Accordion type="multiple" defaultValue={defaultOpen} className="grid gap-1">
        {items.map((item) => {
          if (item.type === "link") {
            // Determine if the module for this link is allowed for the company
            const allowed = moduleAllowed(item.moduleKey);
            // If user doesn't have role for this link, skip
            const { user } = useAuth();
            if (!item.roles.includes(user?.role ?? "" as any)) return null;

            if (allowed) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[color:var(--sinaxys-ink)] transition",
                      isActive ? "bg-[color:var(--sinaxys-tint)]" : "hover:bg-[color:var(--sinaxys-tint)]/70",
                    )
                  }
                >
                  <span className="text-[color:var(--sinaxys-primary)]">{item.icon}</span>
                  {t(item.label)}
                </NavLink>
              );
            }

            // If not allowed, render a disabled-looking item with tooltip
            return (
              <div
                key={item.to}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[color:var(--sinaxys-ink)] transition opacity-60",
                  "hover:bg-[color:var(--sinaxys-tint)]/70 cursor-not-allowed",
                )}
                onClick={(e) => e.preventDefault()}
                title={t('modules.disabled')}
              >
                <span className="text-[color:var(--sinaxys-primary)]">{item.icon}</span>
                {t(item.label)}
              </div>
            );
          }

          // For groups: we still show the group label even if the group's module is disabled.
          return (
            <AccordionItem key={item.label} value={item.label} className="border-0">
              <AccordionTrigger
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-medium text-[color:var(--sinaxys-ink)] hover:no-underline",
                  item.children.some((c) => isLinkActive(pathname, c.to))
                    ? "bg-[color:var(--sinaxys-tint)]"
                    : "hover:bg-[color:var(--sinaxys-tint)]/70",
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="text-[color:var(--sinaxys-primary)]">{item.icon}</span>
                  {t(item.label)}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-1 pt-1">
                <div className="grid gap-1">
                  {item.children.map((child) => {
                    // Show child even if module disabled, but render disabled appearance when not allowed
                    const childAllowed = moduleAllowed(child.moduleKey);
                    const { user } = useAuth();
                    if (!child.roles.includes(user?.role ?? "" as any)) return null;

                    if (childAllowed) {
                      return (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            cn(
                              "ml-6 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[color:var(--sinaxys-ink)] transition",
                              isActive ? "bg-[color:var(--sinaxys-tint)]" : "hover:bg-[color:var(--sinaxys-tint)]/70",
                            )
                          }
                        >
                          <span className="text-[color:var(--sinaxys-primary)]">{child.icon}</span>
                          {t(child.label)}
                        </NavLink>
                      );
                    }

                    return (
                      <div
                        key={child.to}
                        className="ml-6 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[color:var(--sinaxys-ink)] opacity-60 cursor-not-allowed"
                        title={t('modules.disabled')}
                      >
                        <span className="text-[color:var(--sinaxys-primary)]">{child.icon}</span>
                        {t(child.label)}
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </nav>
  );
}

function pickRandom<T>(items: T[]) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

function FundamentalsSpotlightCard() {
  const { company, companyId } = useCompany();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: fundamentals } = useQuery({
    queryKey: ["company-fundamentals", companyId],
    queryFn: () => getCompanyFundamentals(String(companyId)),
    enabled: !!companyId,
  });

  const candidates = useMemo(() => {
    const res: Array<
      | { kind: "purpose" | "mission" | "vision"; label: string; text: string }
      | { kind: "values" | "culture"; label: string; text: string; index: number }
    > = [];
    if (!fundamentals) return res;

    const addText = (kind: "purpose" | "mission" | "vision", label: string, raw?: string | null) => {
      const t = (raw ?? "").trim();
      if (!t) return;
      // Do NOT truncate — user asked for the full text.
      res.push({ kind, label, text: t });
    };

    addText("purpose", "Propósito", fundamentals.purpose);
    addText("mission", "Missão", fundamentals.mission);
    addText("vision", "Visão", fundamentals.vision);

    const valuesLines = describedItemsToLines(parseDescribedItems(fundamentals.values));
    valuesLines.forEach((line, index) => {
      const t = String(line ?? "").trim();
      if (!t) return;
      res.push({ kind: "values", label: "Valores", text: t, index });
    });

    const cultureLines = describedItemsToLines(parseDescribedItems(fundamentals.culture));
    cultureLines.forEach((line, index) => {
      const t = String(line ?? "").trim();
      if (!t) return;
      res.push({ kind: "culture", label: "Cultura", text: t, index });
    });

    return res;
  }, [fundamentals]);

  const [selected, setSelected] = useState<
    | { kind: "purpose" | "mission" | "vision"; label: string; text: string }
    | { kind: "values" | "culture"; label: string; text: string; index: number }
    | null
  >(null);

  useEffect(() => {
    setSelected(pickRandom(candidates));
  }, [pathname, companyId, candidates]);

  const destination = useMemo(() => {
    if (!selected) return "/okr/fundamentals";
    if (selected.kind === "values" || selected.kind === "culture") {
      return `/okr/fundamentals?focus=${selected.kind}&i=${selected.index}`;
    }
    return `/okr/fundamentals?focus=${selected.kind}`;
  }, [selected]);

  return (
    <button
      type="button"
      onClick={() => navigate(destination)}
      className={cn(
        "w-full rounded-xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-3 text-left",
        "transition hover:bg-[color:var(--sinaxys-tint)]/80 hover:shadow-sm",
      )}
      title={t('menu.fundamentals.open')}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-sm">
          {company.logoDataUrl ? (
            <img src={company.logoDataUrl} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">{initials(company.name || "SJ")}</div>
          )}
        </div>

        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--sinaxys-ink)]">
            {selected?.label ?? t('menu.fundamentals.open')}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-snug text-[color:var(--sinaxys-ink)]">
            {selected?.text ?? (company.tagline || "Defina os fundamentos e volte aqui para ver um destaque aleatório.")}
          </p>
          <div className="mt-2 text-[11px] font-semibold text-[color:var(--sinaxys-primary)]">{t('menu.fundamentals.open')}</div>
        </div>
      </div>
    </button>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { company, companyId } = useCompany();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation();

  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // When route changes (navigation), close the mobile sheet menu.
    setMenuOpen(false);
  }, [pathname]);

  // Module flags
  const { data: pdiEnabled = true } = useQuery({
    queryKey: ["company-module", companyId, "PDI_PERFORMANCE"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "PDI_PERFORMANCE"),
    enabled: !!user && !!companyId && user.role !== "MASTERADMIN",
  });
  const { data: tracksEnabled = true } = useQuery({
    queryKey: ["company-module", companyId, "TRACKS"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "TRACKS"),
    enabled: !!user && !!companyId && user.role !== "MASTERADMIN",
  });
  const { data: pointsEnabled = true } = useQuery({
    queryKey: ["company-module", companyId, "POINTS"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "POINTS"),
    enabled: !!user && !!companyId && user.role !== "MASTERADMIN",
  });
  const { data: costsEnabled = true } = useQuery({
    queryKey: ["company-module", companyId, "COSTS"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "COSTS"),
    enabled: !!user && !!companyId && user.role !== "MASTERADMIN",
  });
  const { data: okrEnabled = true } = useQuery({
    queryKey: ["company-module", companyId, "OKR"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "OKR"),
    enabled: !!user && !!companyId && user.role !== "MASTERADMIN",
  });
  const { data: orgEnabled = true } = useQuery({
    queryKey: ["company-module", companyId, "ORG"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "ORG"),
    enabled: !!user && !!companyId && user.role !== "MASTERADMIN",
  });
  const { data: knowledgeEnabled = true } = useQuery({
    queryKey: ["company-module", companyId, "KNOWLEDGE"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "KNOWLEDGE"),
    enabled: !!user && !!companyId && user.role !== "MASTERADMIN",
  });
  const { data: projectsEnabled = true } = useQuery({
    queryKey: ["company-module", companyId, "PROJECTS"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "PROJECTS"),
    enabled: !!user && !!companyId && user.role !== "MASTERADMIN",
  });

  if (!user) return <>{children}</>;

  const allowPdiLink = user.role === "MASTERADMIN" ? true : !!pdiEnabled;
  const allowTracks = user.role === "MASTERADMIN" ? true : !!tracksEnabled;
  const allowPoints = user.role === "MASTERADMIN" ? true : !!pointsEnabled;
  const allowCosts = user.role === "MASTERADMIN" ? true : !!costsEnabled;
  const allowOkr = user.role === "MASTERADMIN" ? true : !!okrEnabled;
  const allowOrg = user.role === "MASTERADMIN" ? true : !!orgEnabled;
  const allowKnowledge = user.role === "MASTERADMIN" ? true : !!knowledgeEnabled;
  const allowProjects = user.role === "MASTERADMIN" ? true : !!projectsEnabled;

  const moduleAllowed = (key?: string) => {
    if (!key) return true;
    switch (key) {
      case "PDI_PERFORMANCE":
        return allowPdiLink;
      case "TRACKS":
        return allowTracks;
      case "POINTS":
        return allowPoints;
      case "COSTS":
        return allowCosts;
      case "OKR":
        return allowOkr;
      case "ORG":
        return allowOrg;
      case "KNOWLEDGE":
        return allowKnowledge;
      case "PROJECTS":
        return allowProjects;
      default:
        return true;
    }
  };

  const visible = nav
    .map((item) => {
      if (item.type === "link") {
        if (!moduleAllowed(item.moduleKey)) return null;
        return item.roles.includes(user.role) ? item : null;
      }

      if (!moduleAllowed(item.moduleKey)) return null;

      const children = item.children.filter((c) => {
        if (!moduleAllowed(c.moduleKey)) return false;
        return c.roles.includes(user.role);
      });
      if (!children.length) return null;
      return { ...item, children };
    })
    .filter(Boolean) as NavItem[];

  const jobTitleLabel = user.jobTitle?.trim() || "Sem cargo";

  return (
    <div className="min-h-screen bg-[color:var(--sinaxys-bg)]">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur dark:bg-[hsl(var(--background))]/85">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-xl" aria-label="Abrir menu" data-tour="top-menu">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[86vw] max-w-sm p-4">
                  <SheetHeader className="text-left">
                    <SheetTitle className="text-[color:var(--sinaxys-ink)]">{t('menu.title')}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 grid gap-3">
                    <SideNav items={visible} onNavigate={() => setMenuOpen(false)} moduleAllowed={moduleAllowed} />
                    {user.role !== "MASTERADMIN" ? (
                      <>
                        <Separator />
                        <FundamentalsSpotlightCard />
                      </>
                    ) : null}
                  </div>
                </SheetContent>
              </Sheet>

              <Link to="/" className="flex min-w-0 items-center gap-3">
                <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-[color:var(--sinaxys-primary)]">
                  {company.logoDataUrl ? (
                    <img src={company.logoDataUrl} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-sm font-semibold text-white">{initials(company.name || "SJ")}</span>
                  )}
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="max-w-[52vw] truncate text-sm font-semibold text-[color:var(--sinaxys-ink)] dark:text-[hsl(var(--foreground))] sm:max-w-[260px]">
                    {company.name}
                  </div>
                  <div className="hidden text-xs text-muted-foreground sm:block">{company.tagline}</div>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <ThemeToggle />
              <NotificationsPanel />
              <button
                type="button"
                className="flex items-center gap-3 rounded-full border border-[color:var(--sinaxys-border)] bg-white px-2 py-1 transition hover:bg-[color:var(--sinaxys-tint)] dark:border-border dark:bg-background dark:hover:bg-muted"
                onClick={() => navigate("/profile")}
                aria-label="Abrir perfil"
                data-tour="top-profile"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] dark:bg-muted dark:text-[hsl(var(--foreground))]">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden max-w-[42vw] min-w-0 text-right sm:block lg:max-w-[360px]">
                  <div className="truncate text-sm font-medium text-[color:var(--sinaxys-ink)] dark:text-[hsl(var(--foreground))]">
                    {user.name} <span className="text-muted-foreground">— {jobTitleLabel}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{roleLabel(user.role)}</div>
                </div>
              </button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full border-[color:var(--sinaxys-border)] bg-white dark:border-border dark:bg-background"
                    onClick={async () => {
                      await logout();
                      navigate("/login");
                    }}
                    aria-label="Sair"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('tooltip.logout')}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>

      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-6">
          <main className="min-w-0 max-w-full">{children}</main>
        </div>
      </div>
    </div>
  );
}