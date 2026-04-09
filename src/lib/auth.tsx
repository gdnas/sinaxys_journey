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
  limited_access: boolean;
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
      "id,email,name,role,company_id,department_id,active,must_change_password,avatar_url,phone,job_title,contract_url,monthly_cost_brl,joined_at,manager_id,limited_access",
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
      // If the profile is inactive and NOT in limited_access, block session;
      // otherwise allow limited_access users to continue to limited view.
      if (!nextUser.active && !p.limited_access) {
        await supabase.auth.signOut();
        sessionUserIdRef.current = null;
        if (!mountedRef.current) return;
        setUser(null);
        setActiveCompanyIdState(null);
        return;
      }

      // If user is in offboarding limited access, immediately sign out but allow limited profile view
      if (p.limited_access) {
        // Keep a minimal user in memory so the UI can render limited-access profile views
        const limitedUser = mapProfileToUser(p);
        // explicitly mark as inactive for general access checks
        limitedUser.active = false;
        // mark limited access on the user object so the UI can restrict navigation
        (limitedUser as any).limitedAccess = true;
        // For safety, downgrade role to least-privilege
        limitedUser.role = "COLABORADOR";
        if (!mountedRef.current) return;
        setUser(limitedUser);
        setActiveCompanyIdState(p.company_id ?? null);
        setLoading(false);
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

      // Audit: if profile is limited_access, insert a view log that the user logged in while offboarding
      if (p.limited_access) {
        try {
          await supabase.from("audit_logs").insert({
            company_id: p.company_id,
            actor_user_id: p.id,
            target_user_id: p.id,
            action: "offboarding_limited_login",
            meta: { at: new Date().toISOString() },
          });
        } catch {
          // ignore audit failures
        }
      }

      // Best-effort: create storage bucket used for user documents automatically once per browser.
      // We attempt to invoke the edge function that creates the bucket (idempotent). This avoids
      // failing uploads when the bucket is missing. Keep errors silent.
      try {
        const flagKey = "_user_docs_bucket_created";
        const already = typeof window !== "undefined" && window.localStorage?.getItem(flagKey);
        if (!already) {
          try {
            await supabase.functions.invoke("create-user-documents-bucket");
            try {
              window.localStorage?.setItem(flagKey, "1");
            } catch {
              // ignore
            }
          } catch {
            // ignore errors — upload will retry and attempt to create on demand
          }
        }
      } catch {
        // ignore
      }

    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    hydrateFromSession();

    const { data } = supabase.auth.onAuthStateChange((_event, _session) => {
      // We intentionally re-hydrate on every auth event (token refresh, user updated, etc.).
      // This keeps profile-derived flags (e.g., profiles.active) authoritative.
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

        const { data, error } = await supabase.auth.signInWithPassword({
          email: e,
          password: p,
        });

        if (error) {
          const msg = error.message;
          const isNotConfirmed = /email.*not\s+confirmed/i.test(msg) || /not\s+confirmed/i.test(msg);
          return {
            ok: false as const,
            message: isNotConfirmed
              ? "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada (e spam) e clique no link de confirmação."
              : msg,
          };
        }

        const uid = data.user?.id ?? null;
        if (!uid) {
          return { ok: false as const, message: "Não foi possível validar seu acesso. Tente novamente." };
        }

        // Enforce profile access rules *immediately* after auth.
        // This prevents inactive users from "logging in" and only then being kicked out.
        const prof = await fetchMyProfile(uid);
        if (!prof) {
          // IMPORTANT: never create/vinculate tenant on login.
          // If profile is missing, access must be provisioned out-of-band.
          await supabase.auth.signOut();
          sessionUserIdRef.current = null;
          if (!mountedRef.current) return;
          setUser(null);
          setActiveCompanyIdState(null);
          return { ok: false as const, message: "Seu acesso ainda não foi provisionado. Solicite ao administrador da sua empresa." };
        }

        // Allow login for users in limited_access (offboarding) so they can view their limited profile.
        if (!prof.active && !prof.limited_access) {
          await supabase.auth.signOut();
          return { ok: false as const, message: "Usuário inativo. Solicite reativação ao administrador." };
        }

        await hydrateFromSession();

        return { ok: true as const, mustChangePassword: !!prof.must_change_password };
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