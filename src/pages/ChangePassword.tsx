import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export default function ChangePassword() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, refresh } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const needsChange = !!user?.mustChangePassword;

  const canSave = useMemo(() => {
    const p = password.trim();
    const c = confirm.trim();
    return p.length >= 6 && p === c;
  }, [password, confirm]);

  if (!user) return null;

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Segurança</div>
            <div className="mt-1 text-xl font-semibold text-[color:var(--sinaxys-ink)]">Definir nova senha</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {needsChange ? "Primeiro acesso: escolha uma senha nova para continuar." : "Atualize sua senha de acesso."}
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <KeyRound className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Nova senha (mín. 6 caracteres)</Label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="h-11 rounded-xl"
              autoComplete="new-password"
            />
          </div>

          <div className="grid gap-2">
            <Label>Confirmar nova senha</Label>
            <Input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              className="h-11 rounded-xl"
              autoComplete="new-password"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">Dica: use uma senha única e não compartilhe com terceiros.</div>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!canSave || saving}
              onClick={async () => {
                try {
                  setSaving(true);

                  const { error } = await supabase.auth.updateUser({ password: password.trim() });
                  if (error) throw error;

                  // Best-effort: clear must_change_password flag
                  await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id);

                  refresh?.();
                  toast({ title: "Senha atualizada" });
                  navigate("/");
                } catch (e) {
                  toast({
                    title: "Não foi possível salvar",
                    description: e instanceof Error ? e.message : "Tente novamente.",
                    variant: "destructive",
                  });
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}