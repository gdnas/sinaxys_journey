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

      "menu.title": "Menu",
      "tooltip.logout": "Sair",
      "menu.fundamentals.open": "Clique para abrir",

      // Nav
      "nav.master.overview": "Visão geral",
      "nav.master.companies": "Empresas",
      "nav.master.users": "Usuários",
      "nav.master.qapipeline": "QA Pipeline",
      "nav.journey": "Minha jornada",
      "nav.home": "Início",
      "nav.pdi": "PDI & Performance",
      "nav.points.group": "Points",
      "nav.points.ranking": "Ranking",
      "nav.okr": "OKRs",
      "nav.knowledge": "Conhecimento",
      "nav.company.group": "Empresa",
      "nav.company.orgchart": "Organograma",
      "nav.company.users": "Usuários",
      "nav.company.import": "Importar usuários",
      "nav.company.departments": "Departamentos",
      "nav.company.costs": "Custos",
      "nav.company.brand": "Marca & Módulos",
      "nav.tracks.group": "Trilhas",
      "nav.tracks.list": "Trilhas",
      "nav.tracks.certificates": "Certificados",
      "nav.tracks.videos": "Vídeos de Trilhas",
      "nav.tracks.build": "Montar trilhas",
      "nav.head.users": "Head — Usuários",
      "nav.head.costs": "Head — Custos",
      "nav.myarea": "Minha área",
      "nav.profile": "Perfil",
      "nav.integrations": "Integrações",
      "nav.settings": "Configurações",

      // ThemeToggle
      "theme.light": "Tema claro",
      "theme.dark": "Modo escuro",

      // Comments
      "comments.leave": "Deixe um comentário",
      "comments.login_required": "Faça login para comentar.",
      "comments.send": "Enviar",
      "comments.edit": "Editar",
      "comments.delete": "Excluir",
      "comments.none": "Nenhum comentário ainda.",
      "comments.login_to_like": "Faça login para curtir",
      "comments.mention_notified": "Notificado",
      "comments.mention_errors": "Erro ao notificar",
      "comments.delete_confirm": "Deseja excluir este comentário?",
      "comments.edit_prompt": "Editar comentário",

      // General
      "ok": "OK",
      "cancel": "Cancelar"
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

      "menu.title": "Menu",
      "tooltip.logout": "Log out",
      "menu.fundamentals.open": "Click to open",

      // Nav
      "nav.master.overview": "Overview",
      "nav.master.companies": "Companies",
      "nav.master.users": "Users",
      "nav.master.qapipeline": "QA Pipeline",
      "nav.journey": "My journey",
      "nav.home": "Home",
      "nav.pdi": "PDI & Performance",
      "nav.points.group": "Points",
      "nav.points.ranking": "Ranking",
      "nav.okr": "OKRs",
      "nav.knowledge": "Knowledge",
      "nav.company.group": "Company",
      "nav.company.orgchart": "Org chart",
      "nav.company.users": "Users",
      "nav.company.import": "Import users",
      "nav.company.departments": "Departments",
      "nav.company.costs": "Costs",
      "nav.company.brand": "Brand & Modules",
      "nav.tracks.group": "Tracks",
      "nav.tracks.list": "Tracks",
      "nav.tracks.certificates": "Certificates",
      "nav.tracks.videos": "Track videos",
      "nav.tracks.build": "Build tracks",
      "nav.head.users": "Head — Users",
      "nav.head.costs": "Head — Costs",
      "nav.myarea": "My area",
      "nav.profile": "Profile",
      "nav.integrations": "Integrations",
      "nav.settings": "Settings",

      // ThemeToggle
      "theme.light": "Light theme",
      "theme.dark": "Dark mode",

      // Comments
      "comments.leave": "Leave a comment",
      "comments.login_required": "Sign in to comment.",
      "comments.send": "Send",
      "comments.edit": "Edit",
      "comments.delete": "Delete",
      "comments.none": "No comments yet.",
      "comments.login_to_like": "Sign in to like",
      "comments.mention_notified": "Notified",
      "comments.mention_errors": "Error notifying",
      "comments.delete_confirm": "Do you want to delete this comment?",
      "comments.edit_prompt": "Edit comment",

      // General
      "ok": "OK",
      "cancel": "Cancel"
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

      "menu.title": "Menü",
      "tooltip.logout": "Abmelden",
      "menu.fundamentals.open": "Klicken zum Öffnen",

      // Nav
      "nav.master.overview": "Übersicht",
      "nav.master.companies": "Unternehmen",
      "nav.master.users": "Benutzer",
      "nav.master.qapipeline": "QA Pipeline",
      "nav.journey": "Meine Reise",
      "nav.home": "Startseite",
      "nav.pdi": "PDI & Leistung",
      "nav.points.group": "Punkte",
      "nav.points.ranking": "Ranking",
      "nav.okr": "OKRs",
      "nav.knowledge": "Wissen",
      "nav.company.group": "Unternehmen",
      "nav.company.orgchart": "Organigramm",
      "nav.company.users": "Benutzer",
      "nav.company.import": "Benutzer importieren",
      "nav.company.departments": "Abteilungen",
      "nav.company.costs": "Kosten",
      "nav.company.brand": "Marke & Module",
      "nav.tracks.group": "Tracks",
      "nav.tracks.list": "Tracks",
      "nav.tracks.certificates": "Zertifikate",
      "nav.tracks.videos": "Track Videos",
      "nav.tracks.build": "Tracks erstellen",
      "nav.head.users": "Head — Benutzer",
      "nav.head.costs": "Head — Kosten",
      "nav.myarea": "Mein Bereich",
      "nav.profile": "Profil",
      "nav.integrations": "Integrationen",
      "nav.settings": "Einstellungen",

      // ThemeToggle
      "theme.light": "Lichtdesign",
      "theme.dark": "Dunkler Modus",

      // Comments
      "comments.leave": "Einen Kommentar hinterlassen",
      "comments.login_required": "Bitte anmelden, um zu kommentieren.",
      "comments.send": "Senden",
      "comments.edit": "Bearbeiten",
      "comments.delete": "Löschen",
      "comments.none": "Noch keine Kommentare.",
      "comments.login_to_like": "Bitte anmelden, um zu liken",
      "comments.mention_notified": "Benachrichtigt",
      "comments.mention_errors": "Fehler beim Benachrichtigen",
      "comments.delete_confirm": "Möchten Sie diesen Kommentar löschen?",
      "comments.edit_prompt": "Kommentar bearbeiten",

      // General
      "ok": "OK",
      "cancel": "Abbrechen"
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