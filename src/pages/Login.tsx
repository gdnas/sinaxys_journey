import { FormEvent, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
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
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="relative overflow-hidden rounded-[2rem] border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-primary)] p-8 shadow-sm sm:p-10 lg:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_30%)]" />
            <div className="relative flex min-h-[320px] flex-col justify-between">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur">
                acesso seguro
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-white text-2xl font-bold tracking-[0.2em] text-[color:var(--sinaxys-primary)] shadow-sm">
                    K
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                      plataforma
                    </div>
                    <h1 className="text-4xl font-semibold tracking-[0.22em] text-white sm:text-5xl">
                      KAIROOS
                    </h1>
                  </div>
                </div>

                <div className="h-px w-24 bg-white/30" />

                <p className="max-w-md text-sm leading-7 text-white/82 sm:text-base">
                  Acesse sua conta com segurança e entre no ambiente operacional da Kairoos.
                </p>
              </div>
            </div>
          </section>

          <Card className="rounded-[2rem] border-[color:var(--sinaxys-border)] bg-white p-6 shadow-[0_20px_60px_rgba(94,60,255,0.08)] sm:p-8">
            <div>
              <div className="inline-flex items-center rounded-full bg-[color:var(--sinaxys-tint)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--sinaxys-primary)]">
                login
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">
                Entrar na Kairoos
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Use seu email e sua senha para continuar.
              </p>
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
                    className="h-12 rounded-2xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] pl-11 text-[color:var(--sinaxys-ink)]"
                    disabled={submitting || loading}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password">Senha</Label>
                  <Link to="/forgot" className="text-sm font-medium text-[color:var(--sinaxys-primary)] transition hover:opacity-80">
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    className="h-12 rounded-2xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] pl-11 pr-12 text-[color:var(--sinaxys-ink)]"
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
                className="mt-2 h-12 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white shadow-[0_12px_30px_rgba(94,60,255,0.28)] hover:bg-[color:var(--sinaxys-primary)]/90"
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