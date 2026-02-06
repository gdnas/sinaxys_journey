import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

const CONFIRM_PHRASE = "RESET_SINAXYS_JOURNEY";

export default function Setup() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Configuração / Reset (Supabase)</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta ação apaga dados no Supabase e recria a base inicial (empresa + departamentos + 2 usuários). Use com extrema cautela.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="rounded-full bg-rose-100 text-rose-900 hover:bg-rose-100">
                <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                Destrutivo
              </Badge>
              {user ? (
                <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                  Logado como: {user.email}
                </Badge>
              ) : (
                <Badge className="rounded-full bg-muted text-muted-foreground hover:bg-muted">Sem sessão</Badge>
              )}
            </div>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <Sparkles className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-rose-200 bg-white p-6">
        <div className="grid gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Confirmar reset</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Para evitar cliques acidentais, digite exatamente: <span className="font-semibold text-[color:var(--sinaxys-ink)]">{CONFIRM_PHRASE}</span>
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Confirmação</Label>
            <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11 rounded-xl" />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              Dica: depois do reset, faça login com os usuários provisionados.
            </div>
            <Button
              className="h-11 rounded-xl bg-rose-600 text-white hover:bg-rose-700"
              disabled={loading || confirm !== CONFIRM_PHRASE}
              onClick={async () => {
                try {
                  setLoading(true);
                  const { data, error } = await supabase.functions.invoke("bootstrap", {
                    body: { confirm },
                  });
                  if (error) throw error;

                  toast({
                    title: "Reset concluído",
                    description: `Base recriada. CompanyId: ${(data as any)?.companyId ?? "—"}`,
                  });

                  await supabase.auth.signOut();
                  navigate("/login", { replace: true });
                } catch (e) {
                  toast({
                    title: "Não foi possível resetar",
                    description: e instanceof Error ? e.message : "Tente novamente.",
                    variant: "destructive",
                  });
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? "Resetando…" : "Resetar agora"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
