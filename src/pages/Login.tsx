import { FormEvent, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const { toast } = useToast();
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => email.trim().length >= 6 && password.trim().length > 0, [email, password]);

  if (user) {
    return <Navigate to={from ?? "/app"} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;

    try {
      setSubmitting(true);
      const result = await login(email.trim(), password);

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

      navigate(from ?? "/app", { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--sinaxys-bg)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-[color:var(--sinaxys-border)] bg-white p-8 shadow-sm sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--sinaxys-primary)]">
              acesso seguro
            </div>

            <div className="mt-8 space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Plataforma operacional</p>
                <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)] sm:text-5xl">
                  kairoos
                </h1>
                <p className="mt-2 text-xl font-medium text-[color:var(--sinaxys-primary)] sm:text-2xl">
                  Executing Operating System
                </p>
              </div>

              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                Entre com seu email e sua senha para acessar o ambiente de execução da sua operação.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/45 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Identidade</div>
                <div className="mt-2 text-sm font-semibold text-[color:var(--sinaxys-ink)]">Login com email corporativo</div>
              </div>
              <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/45 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Privacidade</div>
                <div className="mt-2 text-sm font-semibold text-[color:var(--sinaxys-ink)]">Senha visível só quando você quiser</div>
              </div>
            </div>
          </section>

          <Card className="rounded-[2rem] border-[color:var(--sinaxys-border)] bg-white p-6 shadow-sm sm:p-8">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Entrar</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">
                Acesse sua conta
              </h2>
            </div>

            <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nome@empresa.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    className="h-12 rounded-2xl border-[color:var(--sinaxys-border)] pl-11"
                    disabled={submitting || loading}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    className="h-12 rounded-2xl border-[color:var(--sinaxys-border)] pl-11 pr-12"
                    disabled={submitting || loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[color:var(--sinaxys-tint)] hover:text-[color:var(--sinaxys-primary)]"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="mt-2 h-12 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                disabled={!canSubmit || submitting || loading}
              >
                {submitting ? "Entrando..." : "Entrar"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
