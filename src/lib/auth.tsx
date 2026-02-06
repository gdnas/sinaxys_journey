import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Role, User } from "@/lib/domain";
import { supabase } from "@/integrations/supabase/client";

const ACTIVE_COMPANY_KEY = "sinaxys-journey-active-company:v2";

type AuthState = {
  user: User | null;
  activeCompanyId: string | null;
  setActiveCompanyId: (companyId: string | null) => void;
  login: (email: string, password: string) => Promise<
    | { ok: true; mustChangePassword: boolean }
    | { ok: false; message: string }
  >;
  logout: () => Promise<void>;
  refresh?: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

function loadActiveCompanyId() {
  return localStorage.getItem(ACTIVE_COMPANY_KEY);
}

function saveActiveCompanyId(id: string | null) {
  if (!id) localStorage.removeItem(ACTIVE_COMPANY_KEY);
  else localStorage.setItem(ACTIVE_COMPANY_KEY, id);
}

async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, name, role, company_id, department_id, active, must_change_password, avatar_url, phone, job_title, contract_url, monthly_cost_brl, joined_at, manager_id",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const mapped: User = {
    id: data.id,
    email: data.email,
    name: data.name ?? "",
    role: data.role as Role,
    companyId: data.company_id ?? undefined,
    departmentId: data.department_id ?? undefined,
    active: data.active ?? true,
    mustChangePassword: !!data.must_change_password,
    avatarUrl: data.avatar_url ?? undefined,
    phone: data.phone ?? undefined,
    jobTitle: data.job_title ?? undefined,
    contractUrl: data.contract_url ?? undefined,
    monthlyCostBRL: typeof data.monthly_cost_brl === "number" ? data.monthly_cost_brl : undefined,
    joinedAt: data.joined_at ?? undefined,
    managerId: data.manager_id ?? undefined,
  };

  return mapped;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(() => loadActiveCompanyId());
  const [version, setVersion] = useState(0);

  // Initial session + auth changes
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const uid = data.session?.user?.id ?? null;
      setSessionUserId(uid);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setSessionUserId(uid);
      setVersion((v) => v + 1);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Fetch profile
  useEffect(() => {
    if (!sessionUserId) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    fetchProfile(sessionUserId)
      .then((p) => {
        if (cancelled) return;
        setProfile(p);

        // Keep company selection consistent
        if (p?.role !== "MASTERADMIN") {
          saveActiveCompanyId(p?.companyId ?? null);
          setActiveCompanyIdState(p?.companyId ?? null);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setProfile(null);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionUserId, version]);

  const effectiveCompanyId = useMemo(() => {
    if (!profile) return null;
    if (profile.role !== "MASTERADMIN") return profile.companyId ?? null;
    return activeCompanyId;
  }, [profile, activeCompanyId]);

  const value: AuthState = {
    user: profile?.active ? profile : null,
    activeCompanyId: effectiveCompanyId,
    setActiveCompanyId(companyId) {
      saveActiveCompanyId(companyId);
      setActiveCompanyIdState(companyId);
      setVersion((v) => v + 1);
    },
    async login(email: string, password: string) {
      const e = email.trim().toLowerCase();
      const p = password.trim();
      if (!e.includes("@")) return { ok: false, message: "Informe um e-mail válido." };
      if (!p) return { ok: false, message: "Informe a senha." };

      const { data, error } = await supabase.auth.signInWithPassword({ email: e, password: p });
      if (error) return { ok: false, message: error.message };

      const uid = data.user?.id;
      if (!uid) return { ok: false, message: "Sessão inválida. Tente novamente." };

      try {
        const prof = await fetchProfile(uid);
        setProfile(prof);
        if (prof?.role !== "MASTERADMIN") {
          saveActiveCompanyId(prof?.companyId ?? null);
          setActiveCompanyIdState(prof?.companyId ?? null);
        }
        return { ok: true, mustChangePassword: !!prof?.mustChangePassword };
      } catch (e: any) {
        return { ok: false, message: e?.message ?? "Não foi possível carregar seu perfil." };
      }
    },
    async logout() {
      await supabase.auth.signOut();
      setProfile(null);
      setSessionUserId(null);
      setVersion((v) => v + 1);
    },
    refresh() {
      setVersion((v) => v + 1);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  return ctx;
}

export function hasRole(user: User | null, roles: Role[]) {
  return !!user && roles.includes(user.role);
}