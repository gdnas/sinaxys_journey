import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Role, User } from "@/lib/domain";
import { supabase } from "@/integrations/supabase/client";

// Multi-tenant is 100% Supabase-driven:
// - Auth via Supabase Auth
// - Tenant/company comes exclusively from public.profiles.company_id
// - No local seed, no localStorage-based company selection

type AuthState = {
  user: User | null;
  /** Current tenant (always from profiles.company_id). */
  activeCompanyId: string | null;
  /** Only meaningful for MASTERADMIN: updates profiles.company_id (server-side persisted). */
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

function normalizeRole(raw: unknown): Role {
  const t = String(raw ?? "")
    .trim()
    .toUpperCase()
    // common accent/typo normalization
    .replace("COLABORADOR(A)", "COLABORADOR")
    .replace("COLABORADORA", "COLABORADOR")
    .replace("COLABORADOR/A", "COLABORADOR");

  if (t === "MASTERADMIN" || t === "ADMIN" || t === "HEAD" || t === "COLABORADOR") return t as Role;

  // Least-privilege fallback: treat unknown roles as collaborator.
  return "COLABORADOR";
}

function mapProfileToUser(p: DbProfile): User {
  return {
    id: p.id,
    email: p.email,
    name: p.name ?? p.email.split("@")[0],
    role: normalizeRole(p.role),
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

      // Best-effort: normalize duplicated links (same email across companies) on the backend.
      try {
        await supabase.functions.invoke("tenant-unify", { body: {} });
      } catch {
        // If the function is not deployed, still proceed.
      }

      const p = await fetchMyProfile(session.user.id);
      if (!p) {
        // IMPORTANT: never create/vinculate tenant on login.
        // If profile is missing, access must be provisioned out-of-band.
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
      setActiveCompanyIdState(p.company_id ?? null);

      // Best-effort: register an access event (count + last access).
      // This is used on the Users pages for ADMIN/HEAD/MASTERADMIN visibility.
      void (async () => {
        try {
          await supabase.rpc("record_access");
        } catch {
          // ignore
        }
      })();
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
        // Only MASTERADMIN should change tenant context.
        if (user?.role !== "MASTERADMIN") return;
        await supabase.from("profiles").update({ company_id: companyId }).eq("id", user.id);
        await hydrateFromSession();
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