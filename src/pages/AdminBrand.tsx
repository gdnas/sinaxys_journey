import { useMemo, useState } from "react";
import { ImageIcon, Palette, RotateCcw, Save, Trash2, Handshake, Target, Trophy, GraduationCap, Wallet, BarChart3, Network } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { loadCompanySettings, useCompany } from "@/lib/company";
import { isCompanyModuleEnabled, setCompanyModuleEnabled } from "@/lib/modulesDb";
import type { CompanyColors } from "@/lib/domain";

function normalizeHexOrEmpty(v: string) {
  const t = v.trim();
  return t;
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white px-3 py-2">
        <div className="h-8 w-8 shrink-0 rounded-xl border" style={{ backgroundColor: value, borderColor: "rgba(0,0,0,0.08)" }} />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(normalizeHexOrEmpty(e.target.value))}
          className="h-10 rounded-xl"
          placeholder="#542AEF"
        />
        <Input
          aria-label={`${label} (seletor)`}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-xl border-[color:var(--sinaxys-border)] bg-white p-1"
        />
      </div>
      <div className="text-xs text-muted-foreground">Use HEX (ex.: #542AEF). O preview muda imediatamente ao salvar.</div>
    </div>
  );
}

function ModuleToggle({
  icon,
  title,
  description,
  checked,
  locked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  locked?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div
      className={
        "flex flex-col gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 sm:flex-row sm:items-center sm:justify-between " +
        (locked ? "opacity-90" : "")
      }
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-2xl bg-white ring-1 ring-[color:var(--sinaxys-border)]">{icon}</div>
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{description}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{checked ? "ativo" : "inativo"}</div>
        <Switch checked={checked} disabled={locked} onCheckedChange={onChange} />
      </div>
    </div>
  );
}

export default function AdminBrand() {
  const { toast } = useToast();
  const { company, setCompany, resetCompany, companyId } = useCompany();

  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(company.name);
  const [tagline, setTagline] = useState(company.tagline);
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(company.logoDataUrl);
  const [colors, setColors] = useState<CompanyColors>(company.colors);

  const dirty = useMemo(() => {
    return (
      name.trim() !== company.name ||
      tagline.trim() !== company.tagline ||
      (logoDataUrl ?? "") !== (company.logoDataUrl ?? "") ||
      JSON.stringify(colors) !== JSON.stringify(company.colors)
    );
  }, [name, tagline, logoDataUrl, colors, company]);

  const queryEnabled = !!companyId;

  const { data: okrEnabled = true, refetch: refetchOkr } = useQuery({
    queryKey: ["company-module", companyId, "OKR"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "OKR"),
    enabled: queryEnabled,
  });

  const { data: okrRoiEnabled = true, refetch: refetchOkrRoi } = useQuery({
    queryKey: ["company-module", companyId, "OKR_ROI"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "OKR_ROI"),
    enabled: queryEnabled,
  });

  const { data: pdiEnabled = true, refetch: refetchPdi } = useQuery({
    queryKey: ["company-module", companyId, "PDI_PERFORMANCE"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "PDI_PERFORMANCE"),
    enabled: queryEnabled,
  });

  const { data: tracksEnabled = true, refetch: refetchTracks } = useQuery({
    queryKey: ["company-module", companyId, "TRACKS"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "TRACKS"),
    enabled: queryEnabled,
  });

  const { data: pointsEnabled = true, refetch: refetchPoints } = useQuery({
    queryKey: ["company-module", companyId, "POINTS"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "POINTS"),
    enabled: queryEnabled,
  });

  const { data: costsEnabled = true, refetch: refetchCosts } = useQuery({
    queryKey: ["company-module", companyId, "COSTS"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "COSTS"),
    enabled: queryEnabled,
  });

  const { data: orgEnabled = true, refetch: refetchOrg } = useQuery({
    queryKey: ["company-module", companyId, "ORG"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "ORG"),
    enabled: queryEnabled,
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 rounded-3xl border bg-white p-6 md:flex-row md:items-center">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Admin — Empresa, marca e módulos</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina como a sua empresa aparece e quais módulos ficam visíveis para o time. (No futuro, o Master Admin controla o que cada empresa pode ativar.)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl"
                aria-label="Restaurar padrão"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const res = await resetCompany();
                    if (!res.ok) {
                      toast({ title: "Não foi possível restaurar", description: "message" in res ? res.message : "Sem permissão.", variant: "destructive" });
                      return;
                    }

                    const fresh = loadCompanySettings();
                    setName(fresh.name);
                    setTagline(fresh.tagline);
                    setLogoDataUrl(fresh.logoDataUrl);
                    setColors(fresh.colors);
                    toast({ title: "Marca restaurada", description: "Voltamos para o padrão da empresa." });
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Restaurar padrão</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                disabled={!dirty || saving}
                aria-label="Salvar"
                onClick={async () => {
                  setSaving(true);
                  try {
                    const res = await setCompany({
                      name: name.trim() || company.name,
                      tagline: tagline.trim() || company.tagline,
                      logoDataUrl,
                      colors,
                    });

                    if (!res.ok) {
                      toast({ title: "Sem permissão para salvar", description: "message" in res ? res.message : "Sem permissão.", variant: "destructive" });
                      return;
                    }

                    toast({ title: "Marca atualizada", description: "Nome, logo e cores foram salvos para a empresa." });
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Salvar</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Identidade</div>
              <p className="mt-1 text-sm text-muted-foreground">Nome, proposta (tagline) e logo que aparecem no topo e no login.</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <ImageIcon className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="companyName">Nome da empresa / produto</Label>
              <Input
                id="companyName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="Ex.: KAIROOS — Acme"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="companyTagline">Tagline</Label>
              <Input
                id="companyTagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="Ex.: estratégia em execução, desenvolvimento e reconhecimento"
              />
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label>Logo</Label>
              <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-16 w-28 place-items-center overflow-hidden rounded-2xl bg-white p-2 ring-1 ring-[color:var(--sinaxys-border)]">
                    {logoDataUrl ? (
                      <img src={logoDataUrl} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <div className="text-xs font-semibold text-[color:var(--sinaxys-ink)]">sem logo</div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Arquivo de imagem</div>
                    <div className="text-xs text-muted-foreground">PNG/JPG/SVG (fica salvo no ambiente).</div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    type="file"
                    accept="image/*"
                    className="h-11 rounded-xl bg-white"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const result = typeof reader.result === "string" ? reader.result : undefined;
                        setLogoDataUrl(result);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-xl"
                        onClick={() => setLogoDataUrl(undefined)}
                        disabled={!logoDataUrl || saving}
                        aria-label="Remover logo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remover</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Esquema de cores</div>
              <p className="mt-1 text-sm text-muted-foreground">As variáveis são usadas nos principais componentes da UI.</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Palette className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <ColorField id="cPrimary" label="Primária" value={colors.primary} onChange={(v) => setColors((c) => ({ ...c, primary: v }))} />
            <ColorField id="cInk" label="Texto / Ink" value={colors.ink} onChange={(v) => setColors((c) => ({ ...c, ink: v }))} />
            <ColorField id="cBg" label="Fundo" value={colors.bg} onChange={(v) => setColors((c) => ({ ...c, bg: v }))} />
            <ColorField id="cTint" label="Tint (cards e chips)" value={colors.tint} onChange={(v) => setColors((c) => ({ ...c, tint: v }))} />
            <ColorField id="cBorder" label="Bordas" value={colors.border} onChange={(v) => setColors((c) => ({ ...c, border: v }))} />
          </div>
        </Card>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Módulos (visibilidade por empresa)</div>
            <p className="mt-1 text-sm text-muted-foreground">
              OKRs é o módulo primário. Os demais podem ser ocultados conforme a estratégia da empresa.
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <BarChart3 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-3">
          <ModuleToggle
            icon={<Target className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
            title="OKRs (primário)"
            description="Foco e execução: ciclos, objetivos, KRs, entregáveis e tarefas."
            checked={okrEnabled}
            locked
            onChange={() => null}
          />

          <ModuleToggle
            icon={<Handshake className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
            title="PDI & Performance"
            description="Check-ins, 1:1, feedback contínuo e histórico profissional."
            checked={pdiEnabled}
            onChange={async (v) => {
              if (!companyId) return;
              await setCompanyModuleEnabled(companyId, "PDI_PERFORMANCE", v);
              await refetchPdi();
              toast({ title: v ? "Módulo ativado" : "Módulo ocultado", description: "O menu será atualizado automaticamente." });
            }}
          />

          <ModuleToggle
            icon={<GraduationCap className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
            title="Trilhas"
            description="Onboarding e aprendizagem contínua em sequência (conteúdo, checkpoints e quiz)."
            checked={tracksEnabled}
            onChange={async (v) => {
              if (!companyId) return;
              await setCompanyModuleEnabled(companyId, "TRACKS", v);
              await refetchTracks();
              toast({ title: v ? "Módulo ativado" : "Módulo ocultado", description: "O menu será atualizado automaticamente." });
            }}
          />

          <ModuleToggle
            icon={<Trophy className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
            title="Points"
            description="Reconhecimento: ranking, regras, tiers e recompensas."
            checked={pointsEnabled}
            onChange={async (v) => {
              if (!companyId) return;
              await setCompanyModuleEnabled(companyId, "POINTS", v);
              await refetchPoints();
              toast({ title: v ? "Módulo ativado" : "Módulo ocultado", description: "O menu será atualizado automaticamente." });
            }}
          />

          <ModuleToggle
            icon={<Wallet className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
            title="Custos"
            description="Custos mensais por pessoa para apoiar decisões e (opcionalmente) cálculos de ROI."
            checked={costsEnabled}
            onChange={async (v) => {
              if (!companyId) return;
              await setCompanyModuleEnabled(companyId, "COSTS", v);
              await refetchCosts();
              toast({ title: v ? "Módulo ativado" : "Módulo ocultado", description: "O menu será atualizado automaticamente." });
            }}
          />

          <ModuleToggle
            icon={<Network className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
            title="Organograma"
            description="Organograma e contexto da organização (pessoas e reporting lines)."
            checked={orgEnabled}
            onChange={async (v) => {
              if (!companyId) return;
              await setCompanyModuleEnabled(companyId, "ORG", v);
              await refetchOrg();
              toast({ title: v ? "Módulo ativado" : "Módulo ocultado", description: "O menu será atualizado automaticamente." });
            }}
          />

          <ModuleToggle
            icon={<Target className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
            title="ROI dentro de OKR (opcional)"
            description="Habilita a seção de impacto financeiro e ROI em objetivos/tarefas."
            checked={okrRoiEnabled}
            onChange={async (v) => {
              if (!companyId) return;
              await setCompanyModuleEnabled(companyId, "OKR_ROI", v);
              await refetchOkrRoi();
              toast({ title: v ? "ROI ativado" : "ROI ocultado", description: "As telas de OKR serão atualizadas automaticamente." });
            }}
          />
        </div>
      </Card>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Preview rápido</div>
        <p className="mt-1 text-sm text-muted-foreground">Como o topo e alguns elementos ficam com as configurações atuais.</p>

        <div className="mt-5 overflow-hidden rounded-3xl border border-[color:var(--sinaxys-border)]">
          <div className="bg-white/90 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-16 place-items-center overflow-hidden rounded-2xl bg-[color:var(--sinaxys-primary)] p-2">
                {logoDataUrl ? (
                  <img src={logoDataUrl} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-sm font-semibold text-white">{(name.trim()[0] ?? "J").toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{name.trim() || "—"}</div>
                <div className="truncate text-xs text-muted-foreground">{tagline.trim() || "—"}</div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="rounded-full bg-[color:var(--sinaxys-tint)] px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]">Chip</div>
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  aria-label="Ação"
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="bg-[color:var(--sinaxys-bg)] p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--sinaxys-ink)]">Card</div>
                <div className="mt-1 text-sm text-muted-foreground">Bordas e texto seguem a marca.</div>
              </div>
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--sinaxys-ink)]">Card</div>
                <div className="mt-1 text-sm text-muted-foreground">Consistência visual com o restante.</div>
              </div>
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--sinaxys-ink)]">Card</div>
                <div className="mt-1 text-sm text-muted-foreground">Pronto para escalar o tema.</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}