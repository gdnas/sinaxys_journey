import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  GraduationCap,
  LogOut,
  Menu,
  Palette,
  Shield,
  User as UserIcon,
  LayoutDashboard,
  Award,
  Layers,
  Network,
  Wallet,
  UploadCloud,
  Trophy,
  Target,
  Handshake,
  CalendarCheck2,
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
import { roleLabel } from "@/lib/sinaxys";
import { cn } from "@/lib/utils";
import { OnboardingTourProvider } from "@/components/OnboardingTour";

type Role = "MASTERADMIN" | "ADMIN" | "HEAD" | "COLABORADOR";

type NavLinkItem = {
  type: "link";
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
};

type NavGroupItem = {
  type: "group";
  label: string;
  icon: React.ReactNode;
  children: NavLinkItem[];
};

type NavItem = NavLinkItem | NavGroupItem;

const nav: NavItem[] = [
  // Master admin
  {
    type: "link",
    to: "/master/overview",
    label: "Visão geral",
    icon: <BarChart3 className="h-4 w-4" />,
    roles: ["MASTERADMIN"],
  },
  {
    type: "link",
    to: "/master/companies",
    label: "Empresas",
    icon: <Building2 className="h-4 w-4" />,
    roles: ["MASTERADMIN"],
  },
  {
    type: "link",
    to: "/master/users",
    label: "Usuários",
    icon: <Shield className="h-4 w-4" />,
    roles: ["MASTERADMIN"],
  },

  // Jornada
  {
    type: "link",
    to: "/app",
    label: "Minha jornada",
    icon: <LayoutDashboard className="h-4 w-4" />,
    roles: ["COLABORADOR", "HEAD", "ADMIN"],
  },

  // PDI & Performance
  {
    type: "link",
    to: "/pdi-performance",
    label: "PDI & Performance",
    icon: <Handshake className="h-4 w-4" />,
    roles: ["COLABORADOR", "HEAD", "ADMIN", "MASTERADMIN"],
  },

  // Férias
  {
    type: "group",
    label: "Férias",
    icon: <CalendarCheck2 className="h-4 w-4" />,
    children: [
      {
        type: "link",
        to: "/vacation",
        label: "Meus pedidos",
        icon: <CalendarCheck2 className="h-4 w-4" />,
        roles: ["ADMIN", "HEAD", "COLABORADOR"],
      },
      {
        type: "link",
        to: "/vacation/approvals",
        label: "Aprovações",
        icon: <Shield className="h-4 w-4" />,
        roles: ["ADMIN", "HEAD"],
      },
    ],
  },

  // Sinaxys Points
  {
    type: "group",
    label: "Sinaxys Points",
    icon: <Trophy className="h-4 w-4" />,
    children: [
      {
        type: "link",
        to: "/rankings",
        label: "Ranking",
        icon: <Trophy className="h-4 w-4" />,
        roles: ["ADMIN", "HEAD", "COLABORADOR", "MASTERADMIN"],
      },
      {
        type: "link",
        to: "/app/certificates",
        label: "Certificados",
        icon: <Award className="h-4 w-4" />,
        roles: ["COLABORADOR", "HEAD", "ADMIN"],
      },
    ],
  },

  // OKRs
  {
    type: "link",
    to: "/okr",
    label: "OKRs",
    icon: <Target className="h-4 w-4" />,
    roles: ["ADMIN", "HEAD", "COLABORADOR", "MASTERADMIN"],
  },

  // Empresa
  {
    type: "group",
    label: "Empresa",
    icon: <Building2 className="h-4 w-4" />,
    children: [
      {
        type: "link",
        to: "/org",
        label: "Organograma",
        icon: <Network className="h-4 w-4" />,
        roles: ["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"],
      },
      {
        type: "link",
        to: "/admin/departments",
        label: "Departamentos",
        icon: <Layers className="h-4 w-4" />,
        roles: ["ADMIN"],
      },
      {
        type: "link",
        to: "/admin/brand",
        label: "Marca",
        icon: <Palette className="h-4 w-4" />,
        roles: ["ADMIN"],
      },
    ],
  },

  // Trilhas
  {
    type: "group",
    label: "Trilhas",
    icon: <GraduationCap className="h-4 w-4" />,
    children: [
      {
        type: "link",
        to: "/tracks",
        label: "Trilhas",
        icon: <GraduationCap className="h-4 w-4" />,
        roles: ["ADMIN", "HEAD", "COLABORADOR"],
      },
      {
        type: "link",
        to: "/admin/tracks",
        label: "Montar trilhas",
        icon: <GraduationCap className="h-4 w-4" />,
        roles: ["ADMIN"],
      },
      {
        type: "link",
        to: "/head/tracks",
        label: "Head — Trilhas",
        icon: <GraduationCap className="h-4 w-4" />,
        roles: ["HEAD"],
      },
    ],
  },

  // Usuários (admin)
  {
    type: "group",
    label: "Usuários",
    icon: <Shield className="h-4 w-4" />,
    children: [
      {
        type: "link",
        to: "/admin/users",
        label: "Usuários",
        icon: <Shield className="h-4 w-4" />,
        roles: ["ADMIN", "MASTERADMIN"],
      },
      {
        type: "link",
        to: "/admin/import",
        label: "Importar usuários",
        icon: <UploadCloud className="h-4 w-4" />,
        roles: ["ADMIN"],
      },
    ],
  },

  // Head
  {
    type: "link",
    to: "/head/users",
    label: "Head — Usuários",
    icon: <Shield className="h-4 w-4" />,
    roles: ["HEAD"],
  },
  {
    type: "link",
    to: "/head/costs",
    label: "Head — Custos",
    icon: <Wallet className="h-4 w-4" />,
    roles: ["HEAD"],
  },

  // Custos (admin)
  {
    type: "link",
    to: "/admin/costs",
    label: "Custos",
    icon: <Wallet className="h-4 w-4" />,
    roles: ["ADMIN"],
  },

  // Minha área
  {
    type: "link",
    to: "/profile",
    label: "Minha área",
    icon: <UserIcon className="h-4 w-4" />,
    roles: ["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"],
  },
];

function isLinkActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(to + "/");
}

function SideNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const { pathname } = useLocation();

  const groups = items.filter((i): i is NavGroupItem => i.type === "group");
  const defaultOpen = groups
    .filter((g) => g.children.some((c) => isLinkActive(pathname, c.to)))
    .map((g) => g.label);

  return (
    <nav className="flex flex-col gap-1">
      <Accordion type="multiple" defaultValue={defaultOpen} className="grid gap-1">
        {items.map((item) => {
          if (item.type === "link") {
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
                {item.label}
              </NavLink>
            );
          }

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
                  {item.label}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-1 pt-1">
                <div className="grid gap-1">
                  {item.children.map((child) => (
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
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </nav>
  );
}

function JourneyRuleCard() {
  return (
    <div className="rounded-xl bg-[color:var(--sinaxys-tint)] p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--sinaxys-ink)]">Regra da jornada</div>
      <p className="mt-1 text-xs text-muted-foreground">Você avança em sequência. Ao concluir o módulo atual, o próximo é liberado automaticamente.</p>
    </div>
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

  const { data: pdiEnabled = false } = useQuery({
    queryKey: ["company-module", companyId, "PDI_PERFORMANCE"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "PDI_PERFORMANCE"),
    enabled: !!user && !!companyId && user.role !== "MASTERADMIN",
  });

  if (!user) return <>{children}</>;

  const allowPdiLink = user.role === "MASTERADMIN" ? true : !!pdiEnabled;

  const visible = nav
    .map((item) => {
      if (item.type === "link") {
        if (item.to === "/pdi-performance" && !allowPdiLink) return null;
        return item.roles.includes(user.role) ? item : null;
      }

      const children = item.children.filter((c) => {
        if (c.to === "/pdi-performance" && !allowPdiLink) return false;
        return c.roles.includes(user.role);
      });
      if (!children.length) return null;
      return { ...item, children };
    })
    .filter(Boolean) as NavItem[];

  const jobTitleLabel = user.jobTitle?.trim() || "Sem cargo";

  return (
    <OnboardingTourProvider>
      <div className="min-h-screen bg-[color:var(--sinaxys-bg)]">
        <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-xl" aria-label="Abrir menu" data-tour="top-menu">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[86vw] max-w-sm p-4">
                  <SheetHeader className="text-left">
                    <SheetTitle className="text-[color:var(--sinaxys-ink)]">Menu</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 grid gap-3">
                    <SideNav items={visible} />
                    {user.role !== "MASTERADMIN" ? (
                      <>
                        <Separator />
                        <JourneyRuleCard />
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
                  <div className="max-w-[52vw] truncate text-sm font-semibold text-[color:var(--sinaxys-ink)] sm:max-w-[260px]">
                    {company.name}
                  </div>
                  <div className="hidden text-xs text-muted-foreground sm:block">{company.tagline}</div>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex items-center gap-3 rounded-full border border-[color:var(--sinaxys-border)] bg-white px-2 py-1 transition hover:bg-[color:var(--sinaxys-tint)]"
                onClick={() => navigate("/profile")}
                aria-label="Abrir perfil"
                data-tour="top-profile"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">{initials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="hidden max-w-[42vw] min-w-0 text-right sm:block lg:max-w-[360px]">
                  <div className="truncate text-sm font-medium text-[color:var(--sinaxys-ink)]">
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
                    className="rounded-full border-[color:var(--sinaxys-border)] bg-white"
                    onClick={async () => {
                      await logout();
                      navigate("/login");
                    }}
                    aria-label="Sair"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sair</TooltipContent>
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
    </OnboardingTourProvider>
  );
}