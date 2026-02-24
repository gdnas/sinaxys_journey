import { useMemo, useState } from "react";
import { Copy, ImageUp, Mail, Sparkles, Wand2 } from "lucide-react";
import { supabase, supabaseUrl } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const DEFAULTS = {
  brandName: "Kairoos",
  primaryHex: "#7C3AED",
  accentHex: "#22C55E",
  supportEmail: "support@kairoos.ai",
  websiteUrl: "https://kairoos.ai",
  privacyUrl: "https://kairoos.ai/privacidade",
  termsUrl: "https://kairoos.ai/termos",
  logoPathInBucket: "brand/kairoos-logo.jpg",
};

function buildLogoPublicUrl(bucket: string, path: string) {
  // Storage public URL format: {supabaseUrl}/storage/v1/object/public/{bucket}/{path}
  const clean = path.replace(/^\/+/, "");
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${clean}`;
}

function emailWrapperHTML(opts: {
  logoUrl: string;
  title: string;
  bodyHtml: string;
  primaryHex: string;
  accentHex: string;
  brandName: string;
  websiteUrl: string;
  supportEmail: string;
  privacyUrl: string;
  termsUrl: string;
  button?: { label: string; href: string; variant?: "primary" | "accent" };
  extraNote?: string;
}) {
  const button = opts.button;
  const btnBg = button?.variant === "accent" ? opts.accentHex : opts.primaryHex;
  const btnColor = button?.variant === "accent" ? "#062214" : "#ffffff";

  return `
<div style="margin:0; padding:0; background:#0b1020;">
  <div style="max-width:560px; margin:0 auto; padding:28px 18px;">
    <div style="text-align:left; margin-bottom:14px;">
      <img src="${opts.logoUrl}" alt="${opts.brandName}" width="160" style="display:block; max-width:160px; height:auto;" />
    </div>

    <div style="background:#0f172a; border:1px solid rgba(148,163,184,.18); border-radius:18px; padding:22px;">
      <h2 style="margin:0 0 10px; color:#ffffff; font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;">
        ${opts.title}
      </h2>

      <div style="margin:0 0 14px; color:#cbd5e1; font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height:1.7;">
        ${opts.bodyHtml}
      </div>

      ${
        button
          ? `<a href="${button.href}"
             style="display:inline-block; background:${btnBg}; color:${btnColor}; text-decoration:none; padding:12px 16px; border-radius:14px; font-weight:800; font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;">
              ${button.label}
            </a>`
          : ""
      }

      ${
        opts.extraNote
          ? `<p style="margin:16px 0 0; color:#94a3b8; font-size:13px; font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height:1.7;">
              ${opts.extraNote}
            </p>`
          : ""
      }

      <div style="margin-top:16px; padding-top:14px; border-top:1px solid rgba(148,163,184,.18);">
        <p style="margin:0; color:#94a3b8; font-size:12px; font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height:1.5;">
          Link direto (copie e cole no navegador):<br/>
          <span style="color:#e2e8f0; word-break:break-all;">{{ .ConfirmationURL }}</span>
        </p>
      </div>
    </div>

    <p style="margin:14px 4px 0; color:#94a3b8; font-size:12px; font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height:1.5;">
      © ${opts.brandName} • <a href="${opts.websiteUrl}" style="color:${opts.accentHex}; text-decoration:none;">${opts.websiteUrl.replace(/^https?:\/\//, "")}</a>
      • <a href="mailto:${opts.supportEmail}" style="color:${opts.accentHex}; text-decoration:none;">${opts.supportEmail}</a>
      • <a href="${opts.privacyUrl}" style="color:${opts.accentHex}; text-decoration:none;">Privacidade</a>
      • <a href="${opts.termsUrl}" style="color:${opts.accentHex}; text-decoration:none;">Termos</a>
    </p>
  </div>
</div>
`.trim();
}

function templates(opts: {
  logoUrl: string;
  primaryHex: string;
  accentHex: string;
  brandName: string;
  websiteUrl: string;
  supportEmail: string;
  privacyUrl: string;
  termsUrl: string;
}) {
  return {
    resetPassword: {
      subject: `Redefinir sua senha — ${opts.brandName}`,
      html: emailWrapperHTML({
        ...opts,
        title: "Redefinir senha",
        bodyHtml: `<p style="margin:0;">Recebemos uma solicitação para redefinir sua senha no <strong style=\"color:#ffffff;\">${opts.brandName}</strong>.</p>`,
        button: { label: "Criar nova senha", href: "{{ .ConfirmationURL }}", variant: "primary" },
        extraNote: "Se você não solicitou isso, ignore este e-mail com segurança.",
      }),
    },
    confirmSignup: {
      subject: `Confirme seu e-mail — ${opts.brandName}`,
      html: emailWrapperHTML({
        ...opts,
        title: `Bem-vindo ao ${opts.brandName}`,
        bodyHtml: `<p style="margin:0;">Só falta confirmar seu e-mail para ativar sua conta.</p>`,
        button: { label: "Confirmar meu e-mail", href: "{{ .ConfirmationURL }}", variant: "accent" },
        extraNote: `Se você não criou uma conta no ${opts.brandName}, pode ignorar este e-mail.`,
      }),
    },
    magicLink: {
      subject: `Seu link de acesso — ${opts.brandName}`,
      html: emailWrapperHTML({
        ...opts,
        title: `Acesso ao ${opts.brandName}`,
        bodyHtml: `<p style="margin:0;">Use o link abaixo para entrar com segurança na sua conta.</p>`,
        button: { label: `Entrar no ${opts.brandName}`, href: "{{ .ConfirmationURL }}", variant: "primary" },
        extraNote: "Se você não solicitou este link, ignore este e-mail.",
      }),
    },
    inviteUser: {
      subject: `Você foi convidado para o ${opts.brandName}`,
      html: emailWrapperHTML({
        ...opts,
        title: `Convite para o ${opts.brandName}`,
        bodyHtml: `<p style="margin:0;">Você recebeu um convite para acessar o <strong style=\"color:#ffffff;\">${opts.brandName}</strong>.</p>`,
        button: { label: "Aceitar convite", href: "{{ .ConfirmationURL }}", variant: "accent" },
        extraNote: "Se você não esperava esse convite, ignore este e-mail.",
      }),
    },
    changeEmail: {
      subject: `Confirme a troca de e-mail — ${opts.brandName}`,
      html: emailWrapperHTML({
        ...opts,
        title: "Confirmar troca de e-mail",
        bodyHtml: `<p style="margin:0;">Você solicitou alterar o e-mail da sua conta no <strong style=\"color:#ffffff;\">${opts.brandName}</strong>.</p>`,
        button: { label: "Confirmar troca de e-mail", href: "{{ .ConfirmationURL }}", variant: "primary" },
        extraNote: "Se você não fez esta solicitação, recomendamos alterar sua senha.",
      }),
    },
  };
}

async function uploadPublicLogo(file: File, bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
}

function copyToClipboard(text: string) {
  return navigator.clipboard.writeText(text);
}

export default function AdminEmailTemplates() {
  const { toast } = useToast();

  const [brandName, setBrandName] = useState(DEFAULTS.brandName);
  const [primaryHex, setPrimaryHex] = useState(DEFAULTS.primaryHex);
  const [accentHex, setAccentHex] = useState(DEFAULTS.accentHex);
  const [supportEmail, setSupportEmail] = useState(DEFAULTS.supportEmail);
  const [websiteUrl, setWebsiteUrl] = useState(DEFAULTS.websiteUrl);
  const [privacyUrl, setPrivacyUrl] = useState(DEFAULTS.privacyUrl);
  const [termsUrl, setTermsUrl] = useState(DEFAULTS.termsUrl);

  const [bucket] = useState("public-assets");
  const [logoPath, setLogoPath] = useState(DEFAULTS.logoPathInBucket);
  const [uploading, setUploading] = useState(false);

  const logoPublicUrl = useMemo(() => buildLogoPublicUrl(bucket, logoPath), [bucket, logoPath]);

  const t = useMemo(() => {
    return templates({
      logoUrl: logoPublicUrl,
      primaryHex,
      accentHex,
      brandName,
      websiteUrl,
      supportEmail,
      privacyUrl,
      termsUrl,
    });
  }, [logoPublicUrl, primaryHex, accentHex, brandName, websiteUrl, supportEmail, privacyUrl, termsUrl]);

  const TemplateBlock = ({
    title,
    subject,
    html,
  }: {
    title: string;
    subject: string;
    html: string;
  }) => {
    return (
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{title}</div>
            </div>
            <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assunto</div>
            <div className="mt-1 break-words rounded-2xl bg-[color:var(--sinaxys-tint)] px-3 py-2 text-sm text-[color:var(--sinaxys-ink)]">
              {subject}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              className="h-10 rounded-2xl"
              onClick={async () => {
                await copyToClipboard(subject);
                toast({ title: "Assunto copiado" });
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar assunto
            </Button>
            <Button
              className="h-10 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              onClick={async () => {
                await copyToClipboard(html);
                toast({ title: "HTML copiado", description: "Cole no template do Supabase." });
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar HTML
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">HTML</div>
            <Textarea value={html} readOnly className="mt-2 min-h-[220px] rounded-2xl font-mono text-xs" />
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview (aproximado)</div>
            <div className="mt-2 overflow-hidden rounded-3xl border border-[color:var(--sinaxys-border)] bg-white">
              <div
                className="bg-white"
                // Email HTML is static and controlled by us; still sandbox w/ minimal risk.
                dangerouslySetInnerHTML={{ __html: html.split("{{ .ConfirmationURL }}").join("https://kairoos.ai/exemplo-link") }}

              />
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-[color:var(--sinaxys-bg)] px-4 py-10 md:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-ink)]">
            <Sparkles className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
            Admin — Templates de e-mail (Supabase)
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">Branding + upload da logo no Supabase</h1>
          <p className="text-sm text-muted-foreground">
            Esta tela envia a logo para o Supabase Storage (bucket público) e gera os HTMLs prontos para colar nos templates do Supabase.
            <span className="font-medium"> O Supabase não permite que o app altere templates por API</span>, então o fluxo é: upload automático + copiar/colar.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Identidade</div>
                <p className="mt-1 text-sm text-muted-foreground">Ajuste nome, cores e links do rodapé.</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                <Wand2 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="grid gap-2">
                <Label>Nome da marca</Label>
                <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} className="h-11 rounded-2xl" />
              </div>

              <div className="grid gap-2">
                <Label>Cor primária (HEX)</Label>
                <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white px-3 py-2">
                  <div className="h-8 w-8 rounded-xl border" style={{ backgroundColor: primaryHex, borderColor: "rgba(0,0,0,0.08)" }} />
                  <Input value={primaryHex} onChange={(e) => setPrimaryHex(e.target.value)} className="h-10 rounded-xl" />
                  <Input type="color" value={primaryHex} onChange={(e) => setPrimaryHex(e.target.value)} className="h-10 w-14 rounded-xl p-1" />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Cor de destaque (HEX)</Label>
                <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white px-3 py-2">
                  <div className="h-8 w-8 rounded-xl border" style={{ backgroundColor: accentHex, borderColor: "rgba(0,0,0,0.08)" }} />
                  <Input value={accentHex} onChange={(e) => setAccentHex(e.target.value)} className="h-10 rounded-xl" />
                  <Input type="color" value={accentHex} onChange={(e) => setAccentHex(e.target.value)} className="h-10 w-14 rounded-xl p-1" />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Site</Label>
                <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className="h-11 rounded-2xl" />
              </div>

              <div className="grid gap-2">
                <Label>Suporte (e-mail)</Label>
                <Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className="h-11 rounded-2xl" />
              </div>

              <div className="grid gap-2">
                <Label>Privacidade (URL)</Label>
                <Input value={privacyUrl} onChange={(e) => setPrivacyUrl(e.target.value)} className="h-11 rounded-2xl" />
              </div>

              <div className="grid gap-2">
                <Label>Termos (URL)</Label>
                <Input value={termsUrl} onChange={(e) => setTermsUrl(e.target.value)} className="h-11 rounded-2xl" />
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Logo no Supabase Storage</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Faça upload (autenticado) para um bucket público e use a URL pública nos templates.
                </p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                <ImageUp className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="grid gap-2">
                <Label>Caminho no bucket</Label>
                <Input value={logoPath} onChange={(e) => setLogoPath(e.target.value)} className="h-11 rounded-2xl" />
                <div className="text-xs text-muted-foreground">Bucket: <span className="font-mono">{bucket}</span></div>
              </div>

              <div className="grid gap-2">
                <Label>Upload da imagem</Label>
                <Input
                  type="file"
                  accept="image/*"
                  className="h-11 rounded-2xl"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setUploading(true);
                    try {
                      await uploadPublicLogo(f, bucket, logoPath);
                      toast({ title: "Logo enviada", description: "URL pública pronta para usar nos e-mails." });
                    } catch (err: any) {
                      toast({
                        title: "Falha ao enviar logo",
                        description: err?.message ?? "Erro desconhecido.",
                        variant: "destructive",
                      });
                    } finally {
                      setUploading(false);
                      e.currentTarget.value = "";
                    }
                  }}
                />
              </div>

              <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">URL pública</div>
                <div className="mt-2 break-words rounded-2xl bg-white px-3 py-2 text-sm text-[color:var(--sinaxys-ink)]">
                  {logoPublicUrl}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="h-10 rounded-2xl"
                    onClick={async () => {
                      await copyToClipboard(logoPublicUrl);
                      toast({ title: "URL copiada" });
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar URL
                  </Button>

                  <Button
                    className="h-10 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                    disabled={uploading}
                    onClick={() => {
                      toast({
                        title: "Como usar",
                        description: "Cole esta URL no campo logoUrl dos templates (já está aplicado aqui automaticamente).",
                      });
                    }}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Dica
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-6">
          <Tabs defaultValue="reset" className="w-full">
            <TabsList className="w-full justify-start gap-2 rounded-3xl bg-white p-2">
              <TabsTrigger value="reset" className="rounded-2xl">Reset</TabsTrigger>
              <TabsTrigger value="confirm" className="rounded-2xl">Confirmação</TabsTrigger>
              <TabsTrigger value="magic" className="rounded-2xl">Magic Link</TabsTrigger>
              <TabsTrigger value="invite" className="rounded-2xl">Convite</TabsTrigger>
              <TabsTrigger value="change" className="rounded-2xl">Troca de e-mail</TabsTrigger>
            </TabsList>

            <div className="mt-4 grid gap-4">
              <TabsContent value="reset" className="m-0">
                <TemplateBlock title="Reset Password" subject={t.resetPassword.subject} html={t.resetPassword.html} />
              </TabsContent>
              <TabsContent value="confirm" className="m-0">
                <TemplateBlock title="Confirm Signup" subject={t.confirmSignup.subject} html={t.confirmSignup.html} />
              </TabsContent>
              <TabsContent value="magic" className="m-0">
                <TemplateBlock title="Magic Link" subject={t.magicLink.subject} html={t.magicLink.html} />
              </TabsContent>
              <TabsContent value="invite" className="m-0">
                <TemplateBlock title="Invite User" subject={t.inviteUser.subject} html={t.inviteUser.html} />
              </TabsContent>
              <TabsContent value="change" className="m-0">
                <TemplateBlock title="Change Email" subject={t.changeEmail.subject} html={t.changeEmail.html} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
