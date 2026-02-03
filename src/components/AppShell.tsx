import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Shield, Users, LayoutDashboard, GraduationCap, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return <>{children}</>;

  const visible = nav.filter((n) => n.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-[color:var(--sinaxys-bg)]">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
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
              <div className="text-xs text-muted-foreground">Aprendizado com clareza. Evolução com propósito.</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">{user.name}</div>
              <div className="text-xs text-muted-foreground">{roleLabel(user.role)}</div>
            </div>
            <Button
              variant="outline"
              className="rounded-full border-[color:var(--sinaxys-border)] bg-white"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[240px_1fr] md:px-6">
        <aside className="rounded-2xl border bg-white p-3">
          <nav className="flex flex-col gap-1">
            {visible.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
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
          <Separator className="my-3" />
          <div className="rounded-xl bg-[color:var(--sinaxys-tint)] p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--sinaxys-ink)]">
              Regra da jornada
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Você avança em sequência. Ao concluir o módulo atual, o próximo é liberado automaticamente.
            </p>
          </div>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
