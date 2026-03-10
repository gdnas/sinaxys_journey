import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import i18n from '@/i18n';
import { useAuth } from '@/lib/auth';
import * as profilesDb from '@/lib/profilesDb';

const LANGUAGES = [
  { value: 'pt', label: 'Português (BR)' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
];

export function LanguageSwitcher() {
  const { user } = useAuth();
  const current = i18n.language || 'pt';

  async function setLanguage(v: string) {
    try {
      await i18n.changeLanguage(v);
      if (user?.id) {
        await profilesDb.updateProfile(user.id, { preferred_language: v });
      }
    } catch (e) {
      // ignore
    }
  }

  return (
    <div className="w-36">
      <Select value={current} onValueChange={(v: string) => void setLanguage(v)}>
        <SelectTrigger>
          <SelectValue placeholder="Lang" />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map(l => (
            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
