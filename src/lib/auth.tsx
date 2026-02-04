import React, { createContext, useContext, useMemo, useState } from "react";
import type { Role, User } from "@/lib/domain";
import { mockDb } from "@/lib/mockDb";

const AUTH_KEY = "sinaxys-journey-auth:v1";
const ACTIVE_COMPANY_KEY = "sinaxys-journey-active-company:v1";

type AuthState = {
  user: User | null;
  activeCompanyId: string | null;
  setActiveCompanyId: (companyId: string | null) => void;
  login: (email: string) => { ok: true } | { ok: false; message: string };
  logout: () => void;
  refresh?: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

function loadUserId() {
  return localStorage.getItem(AUTH_KEY);
}

function saveUserId(id: string | null) {
  if (!id) localStorage.removeItem(AUTH_KEY);
  else localStorage.setItem(AUTH_KEY, id);
}

function loadActiveCompanyId() {
  return localStorage.getItem(ACTIVE_COMPANY_KEY);
}

function saveActiveCompanyId(id: string | null) {
  if (!id) localStorage.removeItem(ACTIVE_COMPANY_KEY);
  else localStorage.setItem(ACTIVE_COMPANY_KEY, id);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() => loadUserId());
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(() => loadActiveCompanyId());
  const [version, setVersion] = useState(0);

  const user = useMemo(() => {
    if (!userId) return null;
    const u = mockDb.get().users.find((x) => x.id === userId);
    return u?.active ? u : null;
  }, [userId, version]);

  // Keep company selection consistent with the logged-in user.
  const effectiveCompanyId = useMemo(() => {
    if (!user) return null;
    if (user.role !== "MASTERADMIN") return user.companyId ?? null;

    const companies = mockDb.getCompanies();
    if (activeCompanyId && companies.some((c) => c.id === activeCompanyId)) return activeCompanyId;
    return companies[0]?.id ?? null;
  }, [user, activeCompanyId, version]);

  const value: AuthState = {
    user,
    activeCompanyId: effectiveCompanyId,
    setActiveCompanyId(companyId) {
      saveActiveCompanyId(companyId);
      setActiveCompanyIdState(companyId);
      setVersion((v) => v + 1);
    },
    login(email: string) {
      const u = mockDb.findUserByEmail(email);
      if (!u) return { ok: false, message: "Não encontramos este usuário ativo. Verifique o e-mail." };

      saveUserId(u.id);
      setUserId(u.id);

      // Auto-select company
      if (u.role !== "MASTERADMIN") {
        saveActiveCompanyId(u.companyId ?? null);
        setActiveCompanyIdState(u.companyId ?? null);
      } else {
        const companies = mockDb.getCompanies();
        const next = loadActiveCompanyId() ?? companies[0]?.id ?? null;
        saveActiveCompanyId(next);
        setActiveCompanyIdState(next);
      }

      setVersion((v) => v + 1);
      return { ok: true };
    },
    logout() {
      saveUserId(null);
      setUserId(null);
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