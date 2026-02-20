import { useMemo, useState } from "react";
import { Calendar, CheckCircle2, Mail, Users } from "lucide-react";
import { MarketingShell } from "@/components/MarketingShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

function isValidEmail(v: string) {
  const s = v.trim();
  return s.includes("@") && s.includes(".") && !s.includes(" ");
}

export default function Demo() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [companySize, setCompanySize] = useState<string>("20-50");
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(() => {
    return name.trim().length >= 2 && isValidEmail(email) && !sending;
  }, [name, email, sending]);

  return (
    <MarketingShell
      active="demo"
      title="Agendar demonstração"
      description="Uma conversa rápida para entender seu contexto e mostrar como o KAIROOS organiza execução com clareza operacional."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur">
          {sent ? (
            <div className="grid gap-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/25">
                <CheckCircle2 className="h-4 w-4" />
                Solicitação enviada
              </div>
              <div className="text-2xl font-semibold tracking-tight">Vamos falar.</div>
              <p className="text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">
                Se o seu e-mail estiver correto, você recebe retorno com próximos horários.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  variant="outline"
                  className="h-11 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-[color:var(--sinaxys-ink)] hover:bg-white/5"
                  onClick={() => {
                    setSent(false);
                    setError(null);
                    setName("");
                    setEmail("");
                    setCompany("");
                    setCompanySize("20-50");
                    setMessage("");
                  }}
                >
                  Enviar outro pedido
                </Button>
                <Button className="h-11 rounded-full bg-[color:var(--sinaxys-primary)] px-6 text-white hover:bg-[color:var(--sinaxys-primary)]/90" asChild>
                  <a href="/">Voltar</a>
                </Button>
              </div>
            </div>
          ) : (
            <form
              className="grid gap-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setError(null);

                if (!canSend) {
                  setError("Preencha nome e e-mail válidos.");
                  return;
                }

                setSending(true);
                try {
                  const { error: insError } = await supabase.from("demo_requests").insert({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    company: company.trim() || null,
                    company_size: companySize,
                    message: message.trim() || null,
                  });
                  if (insError) throw insError;
                  setSent(true);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Não foi possível enviar agora.");
                } finally {
                  setSending(false);
                }
              }}
            >
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-2xl border-[color:var(--sinaxys-border)] bg-white/0"
                  placeholder="Seu nome"
                />
              </div>

              <div className="grid gap-2">
                <Label>E-mail</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-2xl border-[color:var(--sinaxys-border)] bg-white/0"
                  placeholder="voce@empresa.com"
                  inputMode="email"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Empresa</Label>
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="h-11 rounded-2xl border-[color:var(--sinaxys-border)] bg-white/0"
                    placeholder="Nome da empresa"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Tamanho</Label>
                  <Select value={companySize} onValueChange={setCompanySize}>
                    <SelectTrigger className="h-11 rounded-2xl border-[color:var(--sinaxys-border)] bg-white/0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20-50">20–50 pessoas</SelectItem>
                      <SelectItem value="51-100">51–100 pessoas</SelectItem>
                      <SelectItem value="101-300">101–300 pessoas</SelectItem>
                      <SelectItem value="300+">300+ pessoas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Contexto (opcional)</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[120px] rounded-2xl border-[color:var(--sinaxys-border)] bg-white/0"
                  placeholder="Ex.: operação com múltiplos squads e projetos concorrentes; queremos rastrear responsabilidades e ROI."
                />
              </div>

              {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  type="submit"
                  disabled={!canSend}
                  className="h-11 rounded-full bg-[color:var(--sinaxys-primary)] px-6 text-white hover:bg-[color:var(--sinaxys-primary)]/90 disabled:opacity-60"
                >
                  {sending ? "Enviando…" : "Solicitar horários"}
                </Button>
              </div>

              <div className="mt-1 text-xs text-[color:var(--sinaxys-ink)]/60">
                Ao enviar, você concorda em receber contato para agendamento.
              </div>
            </form>
          )}
        </Card>

        <div className="grid content-start gap-4">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Formato</div>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">
                  25 minutos. Sem deck. Direto no fluxo de execução e na estrutura do seu time.
                </p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/5 ring-1 ring-[color:var(--sinaxys-border)]">
                <Calendar className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Para quem</div>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">
                  Founders, CEOs, COOs e diretores de operações em empresas de 20–300 pessoas.
                </p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/5 ring-1 ring-[color:var(--sinaxys-border)]">
                <Users className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Alternativa</div>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">
                  Prefere ir sozinho? Comece pelo plano gratuito e evolua quando precisar de operação completa.
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="mt-4 h-10 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-[color:var(--sinaxys-ink)] hover:bg-white/5"
                >
                  <a href="/login">
                    Começar grátis
                    <Mail className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MarketingShell>
  );
}
