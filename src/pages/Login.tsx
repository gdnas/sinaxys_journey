import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { mockDb } from "@/lib/mockDb";
import { roleLabel } from "@/lib/sinaxys";

export default function Login() {
  const { toast } = useToast();
  const { user, login } = useAuth();
  const { company } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const isDev = import.meta.env.DEV;
  const users = useMemo(() => (isDev ? mockDb.getUsers().filter((u) => u.active) : []), [isDev]);

  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-[color:var(--sinaxys-bg)]">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 md:grid-cols-2 md:px-6 md:py-16">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium text-[color:var(--sinaxys-ink)]">
            <span className="h-2 w-2 rounded-full bg-[color:var(--sinaxys-primary)]" />
            Plataforma interna de onboarding e aprendizagem contínua
          </div>

          <h1 className="mt-4 text-3xl font-semibold leading-tight text-[color:var(--sinaxys-ink)] md:text-4xl">{company.name}</h1>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
            Uma experiência sequencial, clara e mensurável para acelerar o onboarding e sustentar evolução constante — com o mesmo padrão de
            confiança que a organização busca entregar.
          </p>

          <div className="mt-6 rounded-2xl border bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-primary)]">
                <KeyRound className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Acesso seguro</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Entre com seu e-mail e senha. Se você recebeu um convite, ative seu acesso pelo link e defina sua senha.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Entrar</div>
          <p className="mt-1 text-sm text-muted-foreground">Informe suas credenciais para acessar.</p>

          <div className="mt-5 grid gap-4">
            {isDev ? (
              <div className="grid gap-2">
                <Label htmlFor="demo">Usuário de demonstração (somente DEV)</Label>
                <Select
                  value={email}
                  onValueChange={(v) => {
                    setEmail(v);
                    setPassword("");
                  }}
                >
                  <SelectTrigger id="demo" className="rounded-xl">
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.email}>
                        {u.name} — {roleLabel(u.role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                placeholder="nome@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl"
                autoComplete="email"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl"
                type="password"
                autoComplete="current-password"
              />
            </div>

            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              onClick={() => {
                const result = login(email, password);
                if (result.ok === false) {
                  toast({
                    title: "Não foi possível entrar",
                    description: result.message,
                    variant: "destructive",
                  });
                  return;
                }

                if (result.mustChangePassword) {
                  navigate("/password", { replace: true });
                  return;
                }

                navigate(from ?? "/");
              }}
            >
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            {isDev ? (
              <div className="text-xs text-muted-foreground">
                Dica DEV: use <span className="font-medium text-[color:var(--sinaxys-ink)]">admin@sinaxys.com</span> para o perfil Admin.
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}