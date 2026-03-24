import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import * as profilesDb from "@/lib/profilesDb";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useApplyUserTheme } from '@/components/ThemeProvider';

const LANGUAGES = [
  { value: "pt", label: "Português (BR)" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
];

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { setTheme } = useApplyUserTheme();
  const [profile, setProfile] = useState<any | null>(null);
  const [language, setLanguage] = useState<string>(i18n.language || 'pt');
  const [themePref, setThemePref] = useState<string>("light");
  const [notifPrefs, setNotifPrefs] = useState<any>({ mentions: true, comments: true, follows: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user) return;
      const p = await profilesDb.getProfile(user.id);
      if (!mounted) return;
      setProfile(p);
      setLanguage(p?.preferred_language ?? i18n.language ?? "pt");
      setThemePref(p?.theme_preference ?? "light");
      try {
        setNotifPrefs(p?.notification_preferences ?? { mentions: true, comments: true, follows: true });
      } catch {
        setNotifPrefs({ mentions: true, comments: true, follows: true });
      }

      // apply theme immediately when loading
      if (p?.theme_preference) {
        try { setTheme(p.theme_preference); } catch {}
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [user, setTheme]);

  useEffect(() => {
    // change i18n language when selection changes
    void i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    // apply theme when themePref changes
    try { setTheme(themePref as any); } catch {}
  }, [themePref, setTheme]);

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await profilesDb.updateProfile(user.id, { preferred_language: language, theme_preference: themePref, notification_preferences: notifPrefs });
      toast({ title: t('settings.saved'), description: '' });
    } catch (e: any) {
      toast({ title: t('settings.error'), description: e?.message ?? t('settings.error'), variant: "destructive" });
    }
    setSaving(false);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-semibold">Ajustes</h1>
      <p className="mt-2 text-sm text-muted-foreground">Ajuste preferências de idioma, tema e notificações.</p>

      <div className="mt-6 grid gap-4">
        <Card className="p-4">
          <div className="grid gap-2">
            <Label>{t('settings.language')}</Label>
            <Select value={language} onValueChange={(v: string) => setLanguage(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">{t('settings.language')}</p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="grid gap-2">
            <Label>{t('settings.theme')}</Label>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="text-sm text-muted-foreground">Use o toggle para alternar entre claro e escuro (ou escolha abaixo).</div>
            </div>
            <div className="mt-2 flex gap-3">
              <Button variant={themePref === "light" ? undefined : "outline"} onClick={() => setThemePref("light")}>Light</Button>
              <Button variant={themePref === "dark" ? undefined : "outline"} onClick={() => setThemePref("dark")}>Dark</Button>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="grid gap-2">
            <Label>{t('settings.notifications')}</Label>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{t('settings.mentions')}</div>
                <div className="text-sm text-muted-foreground">{t('settings.mentions')}</div>
              </div>
              <Switch checked={!!notifPrefs.mentions} onCheckedChange={(v) => setNotifPrefs({ ...notifPrefs, mentions: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{t('settings.comments')}</div>
                <div className="text-sm text-muted-foreground">{t('settings.comments')}</div>
              </div>
              <Switch checked={!!notifPrefs.comments} onCheckedChange={(v) => setNotifPrefs({ ...notifPrefs, comments: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{t('settings.follows')}</div>
                <div className="text-sm text-muted-foreground">{t('settings.follows')}</div>
              </div>
              <Switch checked={!!notifPrefs.follows} onCheckedChange={(v) => setNotifPrefs({ ...notifPrefs, follows: v })} />
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>{saving ? t('settings.save') + '…' : t('settings.save')}</Button>
        </div>
      </div>
    </div>
  );
}