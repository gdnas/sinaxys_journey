import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, SendHorizonal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => email.trim().includes("@"), [email]);

  return (
    <div className="min-h-screen bg-[color:var(--sinaxys-bg)]">
      <div className="mx-auto grid max-w-lg gap-6 px-4 py-10 md:px-6 md:py-16">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Recuperar acesso</div>
              <p className="mt-1 text-sm text-muted-foreground">Enviaremos um link para você definir uma nova senha.</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Mail className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                placeholder="nome@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl"
                autoComplete="email"
                disabled={submitting}
              />
            </div>

            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!canSubmit || submitting}
              onClick={async () => {
                const e = email.trim().toLowerCase();
                if (!e) return;

                try {
                  setSubmitting(true);
                  const redirectTo = `https://kairoos.ai/password`;
                  const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo });

                  if (error) throw error;

                  toast({
                    title: "Link enviado",
                    description: "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.",
                  });
                } catch (err) {
                  toast({
                    title: "Não foi possível enviar",
                    description: err instanceof Error ? err.message : "Tente novamente.",
                    variant: "destructive",
                  });
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <SendHorizonal className="mr-2 h-4 w-4" />
              {submitting ? "Enviando…" : "Enviar link"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <Link className="text-[color:var(--sinaxys-primary)] hover:underline" to="/login">
                Voltar para entrar
              </Link>
            </div>
          </div>
        </Card>

        <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5 text-sm text-muted-foreground">
          Dica: verifique spam/lixo eletrônico. O link de redefinição abre a tela de senha do Kairoos.
        </div>
      </div>
    </div>
  );
}
