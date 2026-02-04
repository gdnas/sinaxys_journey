import { useMemo, useState } from "react";
import { ImageIcon, Palette, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { loadCompanySettings, useCompany } from "@/lib/company";
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
        <div
          className="h-8 w-8 shrink-0 rounded-xl border"
          style={{ backgroundColor: value, borderColor: "rgba(0,0,0,0.08)" }}
        />
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

export default function AdminBrand() {
  const { toast } = useToast();
  const { company, setCompany, resetCompany } = useCompany();

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

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 rounded-3xl border bg-white p-6 md:flex-row md:items-center">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Admin — Empresa & Marca</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajuste o nome, o logo e o esquema de cores. As mudanças são aplicadas na hora e ficam salvas no ambiente desta empresa.
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
                onClick={() => {
                  resetCompany();
                  const fresh = loadCompanySettings();
                  setName(fresh.name);
                  setTagline(fresh.tagline);
                  setLogoDataUrl(fresh.logoDataUrl);
                  setColors(fresh.colors);
                  toast({ title: "Marca restaurada", description: "Voltamos para o padrão da empresa." });
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
                disabled={!dirty}
                aria-label="Salvar"
                onClick={() => {
                  setCompany({
                    name: name.trim() || company.name,
                    tagline: tagline.trim() || company.tagline,
                    logoDataUrl,
                    colors,
                  });
                  toast({ title: "Marca atualizada", description: "Nome, logo e cores foram aplicados." });
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
              <p className="mt-1 text-sm text-muted-foreground">Nome, tagline e logo que aparecem na navegação e em telas-chave.</p>
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
                placeholder="Ex.: Acme University"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="companyTagline">Tagline</Label>
              <Input
                id="companyTagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="Ex.: Onboarding e evolução com ritmo"
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
                        disabled={!logoDataUrl}
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
            <ColorField
              id="cPrimary"
              label="Primária"
              value={colors.primary}
              onChange={(v) => setColors((c) => ({ ...c, primary: v }))}
            />
            <ColorField
              id="cInk"
              label="Texto / Ink"
              value={colors.ink}
              onChange={(v) => setColors((c) => ({ ...c, ink: v }))}
            />
            <ColorField
              id="cBg"
              label="Fundo"
              value={colors.bg}
              onChange={(v) => setColors((c) => ({ ...c, bg: v }))}
            />
            <ColorField
              id="cTint"
              label="Tint (cards e chips)"
              value={colors.tint}
              onChange={(v) => setColors((c) => ({ ...c, tint: v }))}
            />
            <ColorField
              id="cBorder"
              label="Bordas"
              value={colors.border}
              onChange={(v) => setColors((c) => ({ ...c, border: v }))}
            />
          </div>
        </Card>
      </div>

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
                  <span className="text-sm font-semibold text-white">{(name.trim()[0] ?? "S").toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{name.trim() || "—"}</div>
                <div className="truncate text-xs text-muted-foreground">{tagline.trim() || "—"}</div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="rounded-full bg-[color:var(--sinaxys-tint)] px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]">
                  Chip
                </div>
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