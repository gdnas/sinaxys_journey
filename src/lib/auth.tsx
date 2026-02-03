import React, { createContext, useContext, useMemo, useState } from "react";
import type { Role, User } from "@/lib/domain";
import { mockDb } from "@/lib/mockDb";

const AUTH_KEY = "sinaxys-journey-auth:v1";

type AuthState = {
  user: User | null;
  login: (email: string) => { ok: true } | { ok: false; message: string };
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

function loadUserId() {
  return localStorage.getItem(AUTH_KEY);
}

function saveUserId(id: string | null) {
  if (!id) localStorage.removeItem(AUTH_KEY);
  else localStorage.setItem(AUTH_KEY, id);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() => loadUserId());

  const user = useMemo(() => {
    if (!userId) return null;
    const u = mockDb.get().users.find((x) => x.id === userId);
    return u?.active ? u : null;
  }, [userId]);

  const value: AuthState = {
    user,
    login(email: string) {
      const u = mockDb.findUserByEmail(email);
      if (!u) return { ok: false, message: "Não encontramos este usuário ativo. Verifique o e-mail." };
      saveUserId(u.id);
      setUserId(u.id);
      return { ok: true };
    },
    logout() {
      saveUserId(null);
      setUserId(null);
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
