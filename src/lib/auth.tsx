import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  loading: boolean;
  authError?: string | null;
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
  const [sessionChecked, setSessionChecked] = useState(false);
  const [profile, setProfile] = useState<User | null>(null);
  const [profileStatus, setProfileStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(() => loadActiveCompanyId());
  const [version, setVersion] = useState(0);
  const signOutOnceRef = useRef(false);

  // Initial session + auth changes
  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const uid = data.session?.user?.id ?? null;
        setSessionUserId(uid);
        setSessionChecked(true);
      })
      .catch(() => {
        if (!mounted) return;
        setSessionUserId(null);
        setSessionChecked(true);
      });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id ?? null;
      setSessionChecked(true);

      if (event === "SIGNED_IN") {
        setAuthError(null);
        signOutOnceRef.current = false;
      }

      // Evita refetch em loop (ex.: TOKEN_REFRESHED) quando o usuário não mudou.
      setSessionUserId((prev) => {
        const changed = prev !== uid;
        if (changed) setVersion((v) => v + 1);
        return uid;
      });

      if (event === "SIGNED_OUT") {
        setProfile(null);
        setProfileStatus("idle");
      }
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
      setProfileStatus("idle");
      return;
    }

    let cancelled = false;
    setProfileStatus("loading");

    fetchProfile(sessionUserId)
      .then(async (p) => {
        if (cancelled) return;

        // Se existe sessão mas não existe profile, isso dá sensação de "loga e desloga".
        if (!p) {
          setAuthError("Seu perfil não foi encontrado na base. Peça ao admin para provisionar o usuário.");
          setProfile(null);
          setProfileStatus("error");

          if (!signOutOnceRef.current) {
            signOutOnceRef.current = true;
            try {
              await supabase.auth.signOut();
            } catch {
              // ignore
            }
          }
          return;
        }

        setAuthError(null);
        setProfile(p);
        setProfileStatus("loaded");

        // Keep company selection consistent
        if (p.role !== "MASTERADMIN") {
          saveActiveCompanyId(p.companyId ?? null);
          setActiveCompanyIdState(p.companyId ?? null);
        }
      })
      .catch(async () => {
        if (cancelled) return;

        setAuthError("Não foi possível carregar seu perfil. Verifique permissões (RLS) na tabela profiles.");
        setProfile(null);
        setProfileStatus("error");

        if (!signOutOnceRef.current) {
          signOutOnceRef.current = true;
          try {
            await supabase.auth.signOut();
          } catch {
            // ignore
          }
        }
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

  const loading = !sessionChecked || (sessionUserId && profileStatus === "loading");

  const value: AuthState = {
    user: profile?.active ? profile : null,
    activeCompanyId: effectiveCompanyId,
    loading,
    authError,
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

      setAuthError(null);
      signOutOnceRef.current = false;

      const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
      if (error) return { ok: false, message: error.message };

      // O redirecionamento acontece quando o profile carregar (evita corrida e loop).
      return { ok: true, mustChangePassword: false };
    },
    async logout() {
      await supabase.auth.signOut();
      setProfile(null);
      setProfileStatus("idle");
      setSessionUserId(null);
      setSessionChecked(true);
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