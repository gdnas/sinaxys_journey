import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company";

export default function Signup() {
  const { toast } = useToast();
  const { company } = useCompany();

  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [doneForEmail, setDoneForEmail] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const e = email.trim().toLowerCase();
    return (
      name.trim().length >= 2 &&
      companyName.trim().length >= 2 &&
      e.includes("@") &&
      password.trim().length >= 8 &&
      password.trim() === confirm.trim()
    );
  }, [name, companyName, email, password, confirm]);

  if (doneForEmail) {
    return (
      <div className="min-h-screen bg-[color:var(--sinaxys-bg)]">
        <div className="mx-auto grid max-w-lg gap-6 px-4 py-10 md:px-6 md:py-16">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Confirme seu e-mail</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enviamos um link de confirmação para <span className="font-medium text-[color:var(--sinaxys-ink)]">{doneForEmail}</span>.
                </p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                <CheckCircle2 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
              </div>
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-2xl bg-white">
                  <Mail className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                </div>
                <div>
                  <div className="font-semibold text-[color:var(--sinaxys-ink)]">Próximo passo</div>
                  <div className="mt-1 text-muted-foreground">
                    Abra o e-mail e clique em <span className="font-medium">Confirmar</span>. Depois, volte e faça login.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button asChild className="h-11 flex-1 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                <Link to="/login">
                  Ir para login
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <Button
                variant="outline"
                className="h-11 flex-1 rounded-2xl"
                onClick={async () => {
                  try {
                    const e = doneForEmail.trim().toLowerCase();
                    const { error } = await supabase.auth.resend({
                      type: "signup",
                      email: e,
                      options: { emailRedirectTo: "https://kairoos.ai/login?confirmed=1" },
                    });
                    if (error) throw error;
                    toast({ title: "E-mail reenviado", description: "Verifique sua caixa de entrada (e spam)." });
                  } catch (err) {
                    toast({
                      title: "Não foi possível reenviar",
                      description: err instanceof Error ? err.message : "Tente novamente.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Reenviar e-mail
              </Button>
            </div>
          </Card>

          <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5 text-sm text-muted-foreground">
            Dica: use o mesmo e-mail que você pretende usar no dia a dia da empresa.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--sinaxys-bg)]">
      <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-10 md:grid-cols-2 md:px-6 md:py-16">
        <section className="md:pt-4">
          <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium text-[color:var(--sinaxys-ink)]">
            <span className="h-2 w-2 rounded-full bg-[color:var(--sinaxys-primary)]" />
            Comece em 2 minutos
          </div>

          <h1 className="mt-4 text-3xl font-semibold leading-tight text-[color:var(--sinaxys-ink)] md:text-4xl">Crie sua conta</h1>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
            Entre com seus dados para criar o acesso e começar a usar a plataforma.
          </p>

          <div className="mt-6 text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link className="text-[color:var(--sinaxys-primary)] hover:underline" to="/login">
              Entrar
            </Link>
          </div>
        </section>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Criar conta</div>
          <p className="mt-1 text-sm text-muted-foreground">Preencha os dados para receber o e-mail de confirmação.</p>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-2">
              <Label>Seu nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" autoComplete="name" />
            </div>

            <div className="grid gap-2">
              <Label>Empresa</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="Ex.: Kairoos (ou sua empresa)"
                autoComplete="organization"
              />
            </div>

            <div className="grid gap-2">
              <Label>E-mail</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="nome@empresa.com"
                autoComplete="email"
              />
            </div>

            <div className="grid gap-2">
              <Label>Senha (mín. 8 caracteres)</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl" type="password" autoComplete="new-password" />
            </div>

            <div className="grid gap-2">
              <Label>Confirmar senha</Label>
              <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11 rounded-xl" type="password" autoComplete="new-password" />
            </div>

            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!canSubmit || submitting}
              onClick={async () => {
                try {
                  setSubmitting(true);
                  const payload = {
                    email: email.trim().toLowerCase(),
                    password: password,
                    name: name.trim(),
                    companyName: companyName.trim(),
                  };

                  const { data, error } = await supabase.functions.invoke("public-signup", { body: payload });
                  if (error) throw error;

                  if (!data?.ok) {
                    throw new Error(data?.message ?? "Não foi possível criar sua conta.");
                  }

                  setDoneForEmail(payload.email);
                } catch (err) {
                  toast({
                    title: "Não foi possível criar a conta",
                    description: err instanceof Error ? err.message : "Tente novamente.",
                    variant: "destructive",
                  });
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              Criar conta
            </Button>

            <div className="text-xs text-muted-foreground">
              Ao continuar, você receberá um e-mail de confirmação para ativar o acesso.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}