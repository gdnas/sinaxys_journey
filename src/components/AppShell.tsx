import { Link, NavLink, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { roleLabel } from "@/lib/sinaxys";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: ("MASTERADMIN" | "ADMIN" | "HEAD" | "COLABORADOR")[];
};

const nav: NavItem[] = [
  // Master admin
  {
    to: "/master/overview",
    label: "Visão geral",
    icon: <BarChart3 className="h-4 w-4" />,
    roles: ["MASTERADMIN"],
  },
  {
    to: "/master/companies",
    label: "Empresas",
    icon: <Building2 className="h-4 w-4" />,
    roles: ["MASTERADMIN"],
  },
  {
    to: "/master/users",
    label: "Usuários",
    icon: <Shield className="h-4 w-4" />,
    roles: ["MASTERADMIN"],
  },

  // Colaborador
  {
    to: "/app",
    label: "Minha jornada",
    icon: <LayoutDashboard className="h-4 w-4" />,
    roles: ["COLABORADOR"],
  },
  {
    to: "/app/certificates",
    label: "Certificados",
    icon: <Award className="h-4 w-4" />,
    roles: ["COLABORADOR"],
  },

  // Empresa
  {
    to: "/tracks",
    label: "Trilhas",
    icon: <GraduationCap className="h-4 w-4" />,
    roles: ["ADMIN", "HEAD", "COLABORADOR"],
  },
  {
    to: "/head/tracks",
    label: "Head — Trilhas",
    icon: <GraduationCap className="h-4 w-4" />,
    roles: ["HEAD"],
  },
  {
    to: "/admin/users",
    label: "Usuários",
    icon: <Shield className="h-4 w-4" />,
    roles: ["ADMIN"],
  },
  {
    to: "/admin/departments",
    label: "Departamentos",
    icon: <Layers className="h-4 w-4" />,
    roles: ["ADMIN"],
  },
  {
    to: "/admin/brand",
    label: "Empresa & marca",
    icon: <Palette className="h-4 w-4" />,
    roles: ["ADMIN"],
  },
  {
    to: "/profile",
    label: "Minha área",
    icon: <UserIcon className="h-4 w-4" />,
    roles: ["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"],
  },
];

function SideNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
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
      ))}
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
  const { company } = useCompany();
  const navigate = useNavigate();

  if (!user) return <>{children}</>;

  const visible = nav.filter((n) => n.roles.includes(user.role));
  const jobTitleLabel = user.jobTitle?.trim() || "Sem cargo";

  return (
    <div className="min-h-screen bg-[color:var(--sinaxys-bg)]">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl" aria-label="Abrir menu">
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

            <Link to="/" className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-[color:var(--sinaxys-primary)]">
                {company.logoDataUrl ? (
                  <img src={company.logoDataUrl} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-sm font-semibold text-white">{initials(company.name || "SJ")}</span>
                )}
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{company.name}</div>
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
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="hidden text-right sm:block">
                <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">
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
  );
}