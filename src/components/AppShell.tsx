import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Shield, Users, LayoutDashboard, GraduationCap, Award, Menu, User as UserIcon, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { SINAXYS, roleLabel } from "@/lib/sinaxys";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: ("ADMIN" | "HEAD" | "COLABORADOR")[];
};

const nav: NavItem[] = [
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
  {
    to: "/head",
    label: "Painel do departamento",
    icon: <Users className="h-4 w-4" />,
    roles: ["HEAD"],
  },
  {
    to: "/head/tracks",
    label: "Trilhas",
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
    to: "/org",
    label: "Organograma",
    icon: <Network className="h-4 w-4" />,
    roles: ["ADMIN", "HEAD", "COLABORADOR"],
  },
  {
    to: "/profile",
    label: "Meu perfil",
    icon: <UserIcon className="h-4 w-4" />,
    roles: ["ADMIN", "HEAD", "COLABORADOR"],
  },
];

function SideNav({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
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
              isActive
                ? "bg-[color:var(--sinaxys-tint)]"
                : "hover:bg-[color:var(--sinaxys-tint)]/70",
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
      <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--sinaxys-ink)]">
        Regra da jornada
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Você avança em sequência. Ao concluir o módulo atual, o próximo é liberado automaticamente.
      </p>
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
  const navigate = useNavigate();

  if (!user) return <>{children}</>;

  const visible = nav.filter((n) => n.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-[color:var(--sinaxys-bg)]">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl md:hidden"
                  aria-label="Abrir menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[86vw] max-w-sm p-4">
                <SheetHeader className="text-left">
                  <SheetTitle className="text-[color:var(--sinaxys-ink)]">Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-4 grid gap-3">
                  <SideNav items={visible} />
                  <Separator />
                  <JourneyRuleCard />
                </div>
              </SheetContent>
            </Sheet>

            <Link to={"/"} className="flex items-center gap-3">
              <div
                className="grid h-9 w-9 place-items-center rounded-xl"
                style={{ backgroundColor: SINAXYS.colors.primary }}
              >
                <span className="text-sm font-semibold text-white">SJ</span>
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                  {SINAXYS.name}
                </div>
                <div className="hidden text-xs text-muted-foreground sm:block">
                  Aprendizado com clareza. Evolução com propósito.
                </div>
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
                <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-right md:block">
                <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">{user.name}</div>
                <div className="text-xs text-muted-foreground">{roleLabel(user.role)}</div>
              </div>
            </button>

            <Button
              variant="outline"
              className="rounded-full border-[color:var(--sinaxys-border)] bg-white"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
              <span className="sm:hidden">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
          <aside className="hidden rounded-2xl border bg-white p-3 md:block">
            <SideNav items={visible} />
            <Separator className="my-3" />
            <JourneyRuleCard />
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}