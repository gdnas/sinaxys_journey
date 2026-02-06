import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, KeyRound, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";
import { useCompany } from "@/lib/company";
import { roleLabel } from "@/lib/sinaxys";

export default function Invite() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { setCompany } = useCompany();

  const invite = useMemo(() => {
    if (!token) return null;
    return mockDb.getInviteByToken(token);
  }, [token]);

  const company = useMemo(() => {
    if (!invite) return null;
    return mockDb.getCompany(invite.companyId);
  }, [invite?.companyId]);

  // Apply brand while user is on invite flow (nice for production feel)
  useEffect(() => {
    if (!company) return;
    setCompany({
      name: company.name,
      tagline: company.tagline,
      logoDataUrl: company.logoDataUrl,
      colors: company.colors,
    });
  }, [company?.id, setCompany]);

  const [name, setName] = useState(invite?.name ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const used = !!invite?.usedAt;
  const canSubmit =
    !!invite &&
    !used &&
    name.trim().length >= 3 &&
    password.trim().length >= 6 &&
    password.trim() === confirm.trim();

  return (
    <div className="min-h-screen bg-[color:var(--sinaxys-bg)]">
      <div className="mx-auto grid max-w-lg gap-6 px-4 py-10 md:py-14">
        <div className="rounded-3xl border bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Convite</div>
              <div className="mt-1 text-xl font-semibold text-[color:var(--sinaxys-ink)]">
                {company?.name ?? "Acesso à plataforma"}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie sua senha e ative seu acesso para começar sua jornada.
              </p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              {invite ? (
                used ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <KeyRound className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                )
              ) : (
                <ShieldAlert className="h-5 w-5 text-rose-600" />
              )}
            </div>
          </div>
        </div>

        {!invite ? (
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Convite inválido</div>
            <p className="mt-1 text-sm text-muted-foreground">
              O link pode estar incompleto ou expirado. Solicite um novo convite ao administrador.
            </p>
            <div className="mt-4">
              <Button asChild variant="outline" className="rounded-xl">
                <Link to="/login">Ir para login</Link>
              </Button>
            </div>
          </Card>
        ) : used ? (
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Convite já utilizado</div>
            <p className="mt-1 text-sm text-muted-foreground">Seu acesso já foi ativado. Entre com seu e-mail e senha.</p>
            <div className="mt-4">
              <Button asChild className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                <Link to="/login">Ir para login</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Ativar acesso</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Convite para <span className="font-medium text-[color:var(--sinaxys-ink)]">{invite.email}</span> — perfil
              <span className="font-medium text-[color:var(--sinaxys-ink)]"> {roleLabel(invite.role)}</span>
            </p>

            <div className="mt-5 grid gap-4">
              <div className="grid gap-2">
                <Label>Seu nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
              </div>

              <div className="grid gap-2">
                <Label>Senha (mín. 6 caracteres)</Label>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  className="h-11 rounded-xl"
                  autoComplete="new-password"
                />
              </div>

              <div className="grid gap-2">
                <Label>Confirmar senha</Label>
                <Input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  type="password"
                  className="h-11 rounded-xl"
                  autoComplete="new-password"
                />
              </div>

              <Button
                className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                disabled={!canSubmit || submitting}
                onClick={() => {
                  if (!token || !invite) return;
                  try {
                    setSubmitting(true);

                    const created = mockDb.acceptInvite(token, { name });
                    mockDb.setUserPassword(created.id, password, { mustChangePassword: false });

                    const result = login(created.email, password);
                    if (result.ok === false) {
                      toast({
                        title: "Não foi possível entrar",
                        description: result.message,
                        variant: "destructive",
                      });
                      return;
                    }

                    toast({
                      title: "Acesso ativado",
                      description: "Tudo certo — bem-vindo(a)!",
                    });
                    navigate("/");
                  } catch (e) {
                    toast({
                      title: "Não foi possível ativar",
                      description: e instanceof Error ? e.message : "Tente novamente.",
                      variant: "destructive",
                    });
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                Ativar e entrar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="text-xs text-muted-foreground">
                Ao ativar, você cria uma senha para acessar a plataforma.
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}