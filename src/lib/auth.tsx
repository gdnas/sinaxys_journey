import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Role, User } from "@/lib/domain";
import { supabase } from "@/integrations/supabase/client";

// NOTE: historically this project used localStorage + mockDb for auth/tenant selection.
// That caused multi-tenant bugs across browsers/sessions.
// We now source the tenant from Supabase `profiles.company_id` and (for MASTERADMIN) persist the
// selected company back into the profile so it is consistent across sessions.

const ACTIVE_COMPANY_KEY = "sinaxys-journey-active-company:v1";

type AuthState = {
  user: User | null;
  /**
   * For normal users: equals `user.companyId`.
   * For MASTERADMIN: the currently selected company context.
   */
  activeCompanyId: string | null;
  setActiveCompanyId: (companyId: string | null) => Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: true; mustChangePassword: boolean } | { ok: false; message: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  loading: boolean;
};

type DbProfile = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  company_id: string | null;
  department_id: string | null;
  active: boolean;
  must_change_password: boolean;
  avatar_url: string | null;
  phone: string | null;
  job_title: string | null;
  contract_url: string | null;
  monthly_cost_brl: number | null;
  joined_at: string | null;
  manager_id: string | null;
};

const AuthContext = createContext<AuthState | null>(null);

function loadActiveCompanyIdFromStorage() {
  return localStorage.getItem(ACTIVE_COMPANY_KEY);
}

function saveActiveCompanyIdToStorage(id: string | null) {
  if (!id) localStorage.removeItem(ACTIVE_COMPANY_KEY);
  else localStorage.setItem(ACTIVE_COMPANY_KEY, id);
}

function mapProfileToUser(p: DbProfile): User {
  return {
    id: p.id,
    email: p.email,
    name: p.name ?? p.email.split("@")[0],
    role: p.role as Role,
    companyId: p.company_id ?? undefined,
    departmentId: p.department_id ?? undefined,
    active: !!p.active,
    mustChangePassword: !!p.must_change_password,
    avatarUrl: p.avatar_url ?? undefined,
    phone: p.phone ?? undefined,
    jobTitle: p.job_title ?? undefined,
    contractUrl: p.contract_url ?? undefined,
    monthlyCostBRL: typeof p.monthly_cost_brl === "number" ? Number(p.monthly_cost_brl) : undefined,
    joinedAt: p.joined_at ?? undefined,
    managerId: p.manager_id ?? undefined,
  };
}

async function fetchMyProfile(userId: string): Promise<DbProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,email,name,role,company_id,department_id,active,must_change_password,avatar_url,phone,job_title,contract_url,monthly_cost_brl,joined_at,manager_id",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as any;
}

async function chooseDefaultCompanyId(): Promise<string | null> {
  const { data, error } = await supabase.from("companies").select("id").order("created_at", { ascending: true }).limit(1);
  if (error) throw error;
  return (data?.[0]?.id as string | undefined) ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sessionUserIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const hydrateFromSession = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session?.user) {
        sessionUserIdRef.current = null;
        if (!mountedRef.current) return;
        setUser(null);
        setActiveCompanyIdState(null);
        return;
      }

      sessionUserIdRef.current = session.user.id;

      // Optional self-heal: if there are duplicated profile links for this email, normalize on the backend.
      // This keeps company_id stable across browsers/sessions.
      try {
        await supabase.functions.invoke("tenant-unify", { body: {} });
      } catch {
        // Best-effort. If the function is not deployed, we still proceed.
      }

      const p = await fetchMyProfile(session.user.id);
      if (!p) {
        // Never create/vinculate a new company at login.
        // If profile is missing, deny access (this must be provisioned by an admin).
        await supabase.auth.signOut();
        sessionUserIdRef.current = null;
        if (!mountedRef.current) return;
        setUser(null);
        setActiveCompanyIdState(null);
        return;
      }

      const nextUser = mapProfileToUser(p);
      if (!nextUser.active) {
        await supabase.auth.signOut();
        sessionUserIdRef.current = null;
        if (!mountedRef.current) return;
        setUser(null);
        setActiveCompanyIdState(null);
        return;
      }

      if (!mountedRef.current) return;
      setUser(nextUser);

      // Tenant selection
      if (nextUser.role !== "MASTERADMIN") {
        setActiveCompanyIdState(p.company_id ?? null);
        return;
      }

      // MASTERADMIN: persist last selected company in the profile (so it's consistent across browsers).
      // Prefer profile.company_id (server-side persisted), then localStorage fallback.
      const stored = loadActiveCompanyIdFromStorage();
      let cid = p.company_id ?? stored ?? null;

      if (!cid) {
        cid = await chooseDefaultCompanyId();
      }

      setActiveCompanyIdState(cid);

      // Persist the selection to both profile + local storage.
      saveActiveCompanyIdToStorage(cid);

      if (cid && cid !== p.company_id) {
        // Only MASTERADMIN can safely write this field without impacting RLS for normal users.
        await supabase.from("profiles").update({ company_id: cid }).eq("id", p.id);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    hydrateFromSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextId = session?.user?.id ?? null;
      if (sessionUserIdRef.current === nextId) return;
      sessionUserIdRef.current = nextId;
      hydrateFromSession();
    });

    return () => {
      mountedRef.current = false;
      data.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthState>(() => {
    return {
      user,
      activeCompanyId,
      loading,
      async setActiveCompanyId(companyId: string | null) {
        saveActiveCompanyIdToStorage(companyId);
        setActiveCompanyIdState(companyId);

        // Persist selection for MASTERADMIN.
        if (user?.role === "MASTERADMIN") {
          await supabase.from("profiles").update({ company_id: companyId }).eq("id", user.id);
        }
      },
      async login(email: string, password: string) {
        const e = email.trim().toLowerCase();
        const p = password;

        if (!e.includes("@")) return { ok: false as const, message: "Informe um e-mail válido." };
        if (!p.trim()) return { ok: false as const, message: "Informe a senha." };

        const { error } = await supabase.auth.signInWithPassword({
          email: e,
          password: p,
        });

        if (error) {
          return { ok: false as const, message: error.message };
        }

        // Deterministic mustChangePassword:
        // 1) refresh local state
        // 2) fetch profile now and return its flag
        await hydrateFromSession();

        const { data: uData } = await supabase.auth.getUser();
        const uid = uData.user?.id;
        if (!uid) return { ok: true as const, mustChangePassword: false };

        const prof = await fetchMyProfile(uid);
        return { ok: true as const, mustChangePassword: !!prof?.must_change_password };
      },
      async logout() {
        await supabase.auth.signOut();
        setUser(null);
        setActiveCompanyIdState(null);
      },
      async refresh() {
        await hydrateFromSession();
      },
    };
  }, [user, activeCompanyId, loading]);

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