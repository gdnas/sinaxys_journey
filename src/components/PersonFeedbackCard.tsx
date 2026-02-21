import { useMemo, useState } from "react";
import { MessageSquareText, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createFeedback, type FeedbackKind } from "@/lib/pdiPerformanceDb";

function kindBadge(kind: FeedbackKind) {
  switch (kind) {
    case "ELOGIO":
      return "elogio";
    case "RECONHECIMENTO":
      return "reconhecimento";
    case "CONSTRUTIVO":
      return "construtivo";
    case "ATENCAO":
      return "atenção";
  }
}

export function PersonFeedbackCard({
  tenantId,
  fromUserId,
  toUserId,
  toUserLabel,
}: {
  tenantId: string;
  fromUserId: string;
  toUserId: string;
  toUserLabel: string;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [kind, setKind] = useState<FeedbackKind>("RECONHECIMENTO");
  const [message, setMessage] = useState("");

  const badge = useMemo(() => kindBadge(kind), [kind]);

  async function submit() {
    if (!message.trim()) return;

    await createFeedback({
      tenantId,
      fromUserId,
      toUserId,
      kind,
      message,
    });

    setMessage("");
    await qc.invalidateQueries({ queryKey: ["pdi", "feedbacks", tenantId, toUserId] });
    await qc.invalidateQueries({ queryKey: ["pdi", "feedbacks", tenantId, fromUserId] });

    toast({ title: "Feedback registrado", description: "Fica no histórico profissional." });
  }

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Gerar feedback</div>
            <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
              {badge}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Para <span className="font-semibold text-[color:var(--sinaxys-ink)]">{toUserLabel}</span>. Curto e objetivo.
          </p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
          <MessageSquareText className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <div className="grid gap-2">
          <Label>Tipo</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as FeedbackKind)}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ELOGIO">Elogio</SelectItem>
              <SelectItem value="RECONHECIMENTO">Reconhecimento</SelectItem>
              <SelectItem value="CONSTRUTIVO">Feedback construtivo</SelectItem>
              <SelectItem value="ATENCAO">Ponto de atenção</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Mensagem</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-24 rounded-2xl" placeholder="Ex.: gostei de como você conduziu X…" />
        </div>

        <Button
          className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
          disabled={!message.trim() || fromUserId === toUserId}
          onClick={async () => {
            try {
              await submit();
            } catch (e: any) {
              toast({ title: "Não foi possível registrar o feedback", description: e?.message ?? String(e) });
            }
          }}
        >
          Registrar feedback
          <Sparkles className="ml-2 h-4 w-4" />
        </Button>

        {fromUserId === toUserId ? (
          <div className="text-xs text-muted-foreground">Você não pode registrar feedback para você mesmo.</div>
        ) : null}
      </div>
    </Card>
  );
}
