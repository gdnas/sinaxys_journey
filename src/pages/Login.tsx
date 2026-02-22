import { useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ArrowRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";

export default function Login() {
  const { toast } = useToast();
  const { user, login, loading } = useAuth();
  const { company } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length >= 6 && password.trim().length >= 1;
  }, [email, password]);

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
                  Entre com seu e-mail e senha. Se você não tiver acesso, solicite ao administrador da sua empresa.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                  <Link className="text-[color:var(--sinaxys-primary)] hover:underline" to="/privacidade">
                    Política de Privacidade
                  </Link>
                  <span className="text-muted-foreground">•</span>
                  <Link className="text-[color:var(--sinaxys-primary)] hover:underline" to="/termos">
                    Termos de Serviço
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Entrar</div>
          <p className="mt-1 text-sm text-muted-foreground">Informe suas credenciais para acessar.</p>

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
                disabled={submitting || loading}
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
                disabled={submitting || loading}
              />
            </div>

            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!canSubmit || submitting || loading}
              onClick={async () => {
                try {
                  setSubmitting(true);
                  const result = await login(email, password);
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
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Entrando…" : "Continuar"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}