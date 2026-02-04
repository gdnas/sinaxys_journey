import React, { createContext, useContext, useMemo, useState } from "react";

export type CompanyColors = {
  ink: string;
  primary: string;
  bg: string;
  tint: string;
  border: string;
};

export type CompanySettings = {
  name: string;
  tagline: string;
  logoDataUrl?: string;
  colors: CompanyColors;
};

const COMPANY_KEY = "sinaxys-journey-company:v1";

const defaultSettings: CompanySettings = {
  name: "Sinaxys Journey",
  tagline: "Aprendizado com clareza. Evolução com propósito.",
  logoDataUrl: undefined,
  colors: {
    ink: "#20105B",
    primary: "#542AEF",
    bg: "#F6F4FF",
    tint: "#EFEAFF",
    border: "#E6E1FF",
  },
};

function isHexColor(s: string) {
  return /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(s.trim());
}

function normalizeHex(hex: string) {
  const h = hex.trim();
  if (!isHexColor(h)) return null;
  if (h.length === 4) {
    const r = h[1];
    const g = h[2];
    const b = h[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return h.toUpperCase();
}

function hexToHsl(hex: string) {
  const norm = normalizeHex(hex);
  if (!norm) return null;
  const r = parseInt(norm.slice(1, 3), 16) / 255;
  const g = parseInt(norm.slice(3, 5), 16) / 255;
  const b = parseInt(norm.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function mergeSettings(raw: unknown): CompanySettings {
  const base = structuredClone(defaultSettings);
  if (!raw || typeof raw !== "object") return base;

  const r = raw as Partial<CompanySettings>;

  if (typeof r.name === "string" && r.name.trim()) base.name = r.name.trim();
  if (typeof r.tagline === "string" && r.tagline.trim()) base.tagline = r.tagline.trim();
  if (typeof r.logoDataUrl === "string" && r.logoDataUrl.startsWith("data:")) base.logoDataUrl = r.logoDataUrl;

  const colors = (r.colors ?? {}) as Partial<CompanyColors>;
  for (const k of ["ink", "primary", "bg", "tint", "border"] as const) {
    const v = colors[k];
    const norm = typeof v === "string" ? normalizeHex(v) : null;
    if (norm) base.colors[k] = norm;
  }

  return base;
}

export function loadCompanySettings(): CompanySettings {
  const raw = localStorage.getItem(COMPANY_KEY);
  if (!raw) return defaultSettings;
  try {
    return mergeSettings(JSON.parse(raw));
  } catch {
    return defaultSettings;
  }
}

export function saveCompanySettings(settings: CompanySettings) {
  localStorage.setItem(COMPANY_KEY, JSON.stringify(settings));
}

export function applyCompanyTheme(settings: CompanySettings) {
  const root = document.documentElement;

  root.style.setProperty("--sinaxys-ink", settings.colors.ink);
  root.style.setProperty("--sinaxys-primary", settings.colors.primary);
  root.style.setProperty("--sinaxys-bg", settings.colors.bg);
  root.style.setProperty("--sinaxys-tint", settings.colors.tint);
  root.style.setProperty("--sinaxys-border", settings.colors.border);

  // Keep shadcn primary in sync for components that rely on it.
  const primaryHsl = hexToHsl(settings.colors.primary);
  if (primaryHsl) {
    root.style.setProperty("--primary", `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`);
    root.style.setProperty("--ring", `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`);
  }
}

type CompanyState = {
  company: CompanySettings;
  setCompany: (next: CompanySettings) => void;
  resetCompany: () => void;
};

const CompanyContext = createContext<CompanyState | null>(null);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompanyState] = useState<CompanySettings>(() => loadCompanySettings());

  const value = useMemo<CompanyState>(() => {
    return {
      company,
      setCompany(next) {
        const merged = mergeSettings(next);
        saveCompanySettings(merged);
        applyCompanyTheme(merged);
        setCompanyState(merged);
      },
      resetCompany() {
        saveCompanySettings(defaultSettings);
        applyCompanyTheme(defaultSettings);
        setCompanyState(defaultSettings);
      },
    };
  }, [company]);

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany deve ser usado dentro de <CompanyProvider>.");
  return ctx;
}
