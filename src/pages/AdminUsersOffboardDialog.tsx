import React, { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function AdminUsersOffboardDialog({
  open,
  onOpenChange,
  userId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string | null;
  onDone?: () => void;
}) {
  const { toast } = useToast();
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Agendar desligamento</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-3">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Modo: Em processo de desligamento</div>
            <div className="mt-1 text-xs text-muted-foreground">O usuário terá acesso limitado imediatamente e será desativado na data agendada. Durante o período, o custo permanece registrado.</div>
          </div>

          <div className="grid gap-2">
            <Label>Data de inativação (opcional)</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="h-11 rounded-xl"
              placeholder="Selecione a data e hora"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
            onClick={async () => {
              if (!userId) return;
              setSubmitting(true);
              try {
                const payload: any = { userId };
                if (scheduledAt) payload.scheduledAt = new Date(scheduledAt).toISOString();
                const { data, error } = await supabase.functions.invoke("admin-set-offboarding", { body: payload });
                if (error) throw error;
                if (!data?.ok) throw new Error(data?.message ?? "Erro ao agendar desligamento.");

                toast({ title: "Desligamento agendado" });
                onOpenChange(false);
                onDone?.();
              } catch (e) {
                const msg = (e as any)?.message ?? "Erro inesperado";
                toast({ title: "Não foi possível agendar", description: msg, variant: "destructive" });
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting}
          >
            {submitting ? "Agendando…" : "Agendar desligamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
