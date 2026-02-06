import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";

export default function Login() {
  const { toast } = useToast();
  const { user, login, loading, authError } = useAuth();
  const { company } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const fromRaw = (location.state as { from?: string } | null)?.from;

  const from = useMemo(() => {
    const f = (fromRaw ?? "").trim();
    // Evita redirecionar de volta para a própria tela de login (isso cria loop).
    if (!f || f === "/login") return null;
    return f;
  }, [fromRaw]);

  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);

  // Se já estiver autenticado, não faz sentido ficar preso na tela de login.
  useEffect(() => {
    if (loading) return;
    if (!user) return;

    if (user.mustChangePassword) {
      navigate("/password", { replace: true });
      return;
    }

    navigate(from ?? "/", { replace: true });
  }, [user, from, navigate, loading]);

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
                <p className="mt-1 text-xs text-muted-foreground">Entre com seu e-mail e senha para acessar a plataforma.</p>
              </div>
            </div>
          </div>
        </section>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Entrar</div>
          <p className="mt-1 text-sm text-muted-foreground">Informe suas credenciais para acessar.</p>

          {authError ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {authError}
            </div>
          ) : null}

          <div className="mt-5 grid gap-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 rounded-xl px-2 text-xs text-muted-foreground hover:bg-[color:var(--sinaxys-tint)] hover:text-[color:var(--sinaxys-ink)]"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="mr-1.5 h-4 w-4" />
                      Ocultar
                    </>
                  ) : (
                    <>
                      <Eye className="mr-1.5 h-4 w-4" />
                      Mostrar
                    </>
                  )}
                </Button>
              </div>

              <div className="relative">
                <Input
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl pr-12"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-xl text-muted-foreground hover:bg-[color:var(--sinaxys-tint)] hover:text-[color:var(--sinaxys-ink)]"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={btnLoading || loading}
              onClick={async () => {
                try {
                  setBtnLoading(true);
                  const result = await login(email, password);
                  if (result.ok === false) {
                    toast({
                      title: "Não foi possível entrar",
                      description: result.message,
                      variant: "destructive",
                    });
                  }
                  // Se ok, o redirecionamento acontece quando o profile carregar (useEffect acima).
                } finally {
                  setBtnLoading(false);
                }
              }}
            >
              {btnLoading || loading ? "Entrando…" : "Continuar"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}