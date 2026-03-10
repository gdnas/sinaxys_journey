import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  pt: {
    translation: {
      "settings.title": "Configurações",
      "settings.description": "Ajuste preferências de idioma, tema e notificações.",
      "settings.language": "Idioma",
      "settings.theme": "Tema",
      "settings.notifications": "Notificações",
      "settings.save": "Salvar alterações",
      "settings.saved": "Configurações atualizadas.",
      "settings.error": "Não foi possível salvar.",
      "settings.mentions": "Menções",
      "settings.comments": "Comentários",
      "settings.follows": "Novos seguidores",
    }
  },
  en: {
    translation: {
      "settings.title": "Settings",
      "settings.description": "Adjust platform language, theme and notification preferences.",
      "settings.language": "Language",
      "settings.theme": "Theme",
      "settings.notifications": "Notifications",
      "settings.save": "Save changes",
      "settings.saved": "Settings updated.",
      "settings.error": "Could not save.",
      "settings.mentions": "Mentions",
      "settings.comments": "Comments",
      "settings.follows": "New followers",
    }
  },
  de: {
    translation: {
      "settings.title": "Einstellungen",
      "settings.description": "Plattform-Sprache, Thema und Benachrichtigungseinstellungen anpassen.",
      "settings.language": "Sprache",
      "settings.theme": "Thema",
      "settings.notifications": "Benachrichtigungen",
      "settings.save": "Änderungen speichern",
      "settings.saved": "Einstellungen aktualisiert.",
      "settings.error": "Konnte nicht gespeichert werden.",
      "settings.mentions": "Erwähnungen",
      "settings.comments": "Kommentare",
      "settings.follows": "Neue Follower",
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'pt',
  fallbackLng: 'pt',
  interpolation: { escapeValue: false }
});

export default i18n;