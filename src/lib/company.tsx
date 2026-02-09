import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Company, CompanyColors } from "@/lib/domain";
import { useAuth } from "@/lib/auth";
import { SINAXYS_LOGO_DATA_URL } from "@/lib/brand";
import { supabase } from "@/integrations/supabase/client";

export type CompanyBrand = Pick<Company, "name" | "tagline" | "logoDataUrl" | "colors">;

const DEFAULT_BRAND: CompanyBrand = {
  name: "Sinaxys Journey",
  tagline: "Aprendizado com clareza. Evolução com propósito.",
  logoDataUrl: SINAXYS_LOGO_DATA_URL,
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

function mergeBrand(raw: Partial<CompanyBrand> | null | undefined): CompanyBrand {
  const base: CompanyBrand = structuredClone(DEFAULT_BRAND);
  if (!raw) return base;

  if (typeof raw.name === "string" && raw.name.trim()) base.name = raw.name.trim();
  if (typeof raw.tagline === "string" && raw.tagline.trim()) base.tagline = raw.tagline.trim();
  if (typeof raw.logoDataUrl === "string" && raw.logoDataUrl.startsWith("data:")) base.logoDataUrl = raw.logoDataUrl;

  const colors = (raw.colors ?? {}) as Partial<CompanyColors>;
  for (const k of ["ink", "primary", "bg", "tint", "border"] as const) {
    const v = colors[k];
    const norm = typeof v === "string" ? normalizeHex(v) : null;
    if (norm) (base.colors as any)[k] = norm;
  }

  return base;
}

export function applyCompanyTheme(brand: CompanyBrand) {
  const root = document.documentElement;

  root.style.setProperty("--sinaxys-ink", brand.colors.ink);
  root.style.setProperty("--sinaxys-primary", brand.colors.primary);
  root.style.setProperty("--sinaxys-bg", brand.colors.bg);
  root.style.setProperty("--sinaxys-tint", brand.colors.tint);
  root.style.setProperty("--sinaxys-border", brand.colors.border);

  const primaryHsl = hexToHsl(brand.colors.primary);
  if (primaryHsl) {
    root.style.setProperty("--primary", `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`);
    root.style.setProperty("--ring", `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`);
  }
}

export function bootstrapCompanyTheme() {
  // Applies a neutral default theme before React mounts.
  applyCompanyTheme(DEFAULT_BRAND);
}

type CompanyState = {
  companyId: string | null;
  company: CompanyBrand;
  setCompany: (next: Partial<CompanyBrand>) => void;
  resetCompany: () => void;
};

const CompanyContext = createContext<CompanyState | null>(null);

async function fetchCompanyBrand(companyId: string): Promise<CompanyBrand> {
  const { data, error } = await supabase
    .from("companies")
    .select("name, tagline, logo_data_url, colors")
    .eq("id", companyId)
    .single();

  if (error) throw error;

  return mergeBrand({
    name: data.name,
    tagline: data.tagline ?? "",
    logoDataUrl: data.logo_data_url ?? undefined,
    colors: (data.colors ?? undefined) as any,
  });
}

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user, activeCompanyId } = useAuth();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [company, setCompanyState] = useState<CompanyBrand>(DEFAULT_BRAND);

  useEffect(() => {
    if (!user) {
      setCompanyId(null);
      setCompanyState(DEFAULT_BRAND);
      return;
    }

    // Company context is always derived from profiles.company_id (via AuthProvider)
    const cid = activeCompanyId;
    setCompanyId(cid);

    if (!cid) {
      setCompanyState(DEFAULT_BRAND);
      return;
    }

    let cancelled = false;
    fetchCompanyBrand(cid)
      .then((b) => {
        if (cancelled) return;
        setCompanyState(b);
      })
      .catch(() => {
        if (cancelled) return;
        setCompanyState(DEFAULT_BRAND);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, activeCompanyId]);

  useEffect(() => {
    applyCompanyTheme(company);
  }, [company]);

  const value = useMemo<CompanyState>(() => {
    return {
      companyId,
      company,
      setCompany(next) {
        if (!companyId) {
          setCompanyState((prev) => mergeBrand({ ...prev, ...next }));
          return;
        }

        const merged = mergeBrand({ ...company, ...next });
        setCompanyState(merged);

        supabase
          .from("companies")
          .update({
            name: merged.name,
            tagline: merged.tagline,
            logo_data_url: merged.logoDataUrl ?? null,
            colors: merged.colors as any,
          })
          .eq("id", companyId)
          .then(() => null);
      },
      resetCompany() {
        if (!companyId) {
          setCompanyState(DEFAULT_BRAND);
          return;
        }

        setCompanyState(DEFAULT_BRAND);

        supabase
          .from("companies")
          .update({
            name: DEFAULT_BRAND.name,
            tagline: DEFAULT_BRAND.tagline,
            logo_data_url: DEFAULT_BRAND.logoDataUrl ?? null,
            colors: DEFAULT_BRAND.colors as any,
          })
          .eq("id", companyId)
          .then(() => null);
      },
    };
  }, [companyId, company]);

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany deve ser usado dentro de <CompanyProvider>.");
  return ctx;
}

export function loadCompanySettings(): CompanyBrand {
  return DEFAULT_BRAND;
}