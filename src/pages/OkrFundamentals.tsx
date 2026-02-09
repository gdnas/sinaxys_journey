import { useMemo, useState } from "react";
import { BookOpenText, Save } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { getCompanyFundamentals, upsertCompanyFundamentals } from "@/lib/okrDb";
import { OkrPageHeader } from "@/components/OkrPageHeader";

function Block({ label, value }: { label: string; value?: string | null }) {
  const v = value?.trim();
  return (
    <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {v ? (
        <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--sinaxys-ink)]">{v}</div>
      ) : (
        <div className="mt-2 text-sm text-muted-foreground">Ainda não definido.</div>
      )}
    </div>
  );
}

export default function OkrFundamentals() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useCompany();

  const canEdit = !!user && (user.role === "ADMIN" || user.role === "HEAD" || user.role === "MASTERADMIN");

  if (!user || !companyId) return null;

  const { data: fundamentals, isLoading } = useQuery({
    queryKey: ["okr-fundamentals", companyId],
    queryFn: () => getCompanyFundamentals(companyId),
  });

  const [open, setOpen] = useState(false);

  const initial = useMemo(() => {
    return {
      mission: fundamentals?.mission ?? "",
      vision: fundamentals?.vision ?? "",
      purpose: fundamentals?.purpose ?? "",
      values: fundamentals?.values ?? "",
      culture: fundamentals?.culture ?? "",
      strategic_north: fundamentals?.strategic_north ?? "",
    };
  }, [fundamentals]);

  const [mission, setMission] = useState("");
  const [vision, setVision] = useState("");
  const [purpose, setPurpose] = useState("");
  const [values, setValues] = useState("");
  const [culture, setCulture] = useState("");
  const [north, setNorth] = useState("");

  const syncFromInitial = () => {
    setMission(initial.mission);
    setVision(initial.vision);
    setPurpose(initial.purpose);
    setValues(initial.values);
    setCulture(initial.culture);
    setNorth(initial.strategic_north);
  };

  const hasAny =
    !!fundamentals &&
    [fundamentals.mission, fundamentals.vision, fundamentals.purpose, fundamentals.values, fundamentals.culture, fundamentals.strategic_north].some(
      (t) => !!t?.trim(),
    );

  return (
    <div className="grid gap-6">
      <OkrPageHeader
        title="Fundamentos da empresa"
        subtitle="Tudo começa aqui: missão, visão, propósito e norte estratégico. Cada OKR nasce conectado a esses fundamentos."
        icon={<BookOpenText className="h-5 w-5" />}
        actions={
          canEdit ? (
            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              onClick={() => {
                syncFromInitial();
                setOpen(true);
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              Editar
            </Button>
          ) : null
        }
      />

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Visão inspiradora (rápido)</div>
            <p className="mt-1 text-sm text-muted-foreground">Para qualquer pessoa entender para onde a empresa está indo.</p>
          </div>

          {hasAny ? (
            <div className="rounded-full bg-[color:var(--sinaxys-tint)] px-4 py-2 text-xs font-semibold text-[color:var(--sinaxys-ink)]">
              Pronto para conectar OKRs
            </div>
          ) : (
            <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
              Precisa de setup
            </div>
          )}
        </div>

        <Separator className="my-5" />

        {isLoading ? <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Carregando…</div> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Block label="Propósito" value={fundamentals?.purpose} />
          <Block label="Visão" value={fundamentals?.vision} />
          <Block label="Missão" value={fundamentals?.mission} />
          <Block label="Norte estratégico" value={fundamentals?.strategic_north} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Block label="Valores" value={fundamentals?.values} />
          <Block label="Cultura" value={fundamentals?.culture} />
        </div>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) syncFromInitial();
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar fundamentos</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Propósito</Label>
              <Textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="min-h-[88px] rounded-2xl"
                placeholder="Por que existimos? Qual impacto queremos no mundo?"
              />
            </div>
            <div className="grid gap-2">
              <Label>Visão</Label>
              <Textarea
                value={vision}
                onChange={(e) => setVision(e.target.value)}
                className="min-h-[88px] rounded-2xl"
                placeholder="Como é o futuro quando a empresa vence?"
              />
            </div>

            <div className="grid gap-2">
              <Label>Missão</Label>
              <Textarea
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                className="min-h-[88px] rounded-2xl"
                placeholder="O que fazemos diariamente para chegar lá?"
              />
            </div>

            <div className="grid gap-2">
              <Label>Norte estratégico</Label>
              <Textarea
                value={north}
                onChange={(e) => setNorth(e.target.value)}
                className="min-h-[88px] rounded-2xl"
                placeholder="Uma frase ou princípio que orienta decisões difíceis."
              />
            </div>

            <div className="grid gap-2">
              <Label>Valores</Label>
              <Textarea
                value={values}
                onChange={(e) => setValues(e.target.value)}
                className="min-h-[88px] rounded-2xl"
                placeholder="O que não negociamos (em bullet points ou texto curto)."
              />
            </div>

            <div className="grid gap-2">
              <Label>Cultura</Label>
              <Textarea
                value={culture}
                onChange={(e) => setCulture(e.target.value)}
                className="min-h-[88px] rounded-2xl"
                placeholder="Como trabalhamos por aqui?"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              onClick={async () => {
                try {
                  await upsertCompanyFundamentals(companyId, {
                    mission,
                    vision,
                    purpose,
                    values,
                    culture,
                    strategic_north: north,
                  });
                  await qc.invalidateQueries({ queryKey: ["okr-fundamentals", companyId] });
                  toast({ title: "Fundamentos salvos" });
                  setOpen(false);
                } catch (e) {
                  toast({
                    title: "Não foi possível salvar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
