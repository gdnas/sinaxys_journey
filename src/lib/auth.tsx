import { useState, useEffect, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User as BaseUser } from "@/lib/domain";

interface AuthContextType {
  user: BaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; mustChangePassword?: boolean; message?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  companyId: string | null;
  activeCompanyId: string | null;
  setCompanyId: (id: string | null) => void;
  setActiveCompanyId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const hydrateFromSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const userId = session.user.id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (!profile) throw new Error("Perfil não encontrado");
    return profile;
  }
  return null;
};

const mapProfileToUser = (profile: any): BaseUser => profile;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<BaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const profile = await hydrateFromSession();
        if (!mounted) return;
        if (profile) {
          setUser(profile as any);
          setActiveCompanyId(profile.company_id ?? null);
        }
      } catch (e) {
        console.error("hydrateFromSession failed:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        hydrateFromSession()
          .then((p) => {
            if (!mounted) return;
            if (p) {
              setUser(p as any);
              setActiveCompanyId(p.company_id ?? null);
            }
          })
          .catch(() => {});
      } else if (event === "SIGNED_OUT") {
        if (!mounted) return;
        setUser(null);
        setActiveCompanyId(null);
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { ok: false, message: error.message };
      }

      const profile = await hydrateFromSession();
      if (!profile) throw new Error("Perfil não encontrado");

      setActiveCompanyId(profile.company_id ?? null);

      if (profile.limited_access) {
        const limitedUser: any = { ...profile };
        limitedUser.active = false;
        limitedUser.limitedAccess = true;
        limitedUser.role = "COLABORADOR";

        await supabase.auth.updateUser({
          data: { limited_access: true }
        });
        setUser(limitedUser);
      } else {
        setUser(profile);
      }
      
      return { ok: true };
    } catch (error: any) {
      console.error("Login error:", error);
      return { ok: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
    setUser(null);
    setActiveCompanyId(null);
  };

  const refresh = async () => {
    await supabase.auth.refreshSession();
    const profile = await hydrateFromSession();
    setUser(profile);
    setActiveCompanyId(profile?.company_id ?? null);
  };

  const authContextValue: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refresh,
    companyId: activeCompanyId,
    activeCompanyId: activeCompanyId,
    setCompanyId: setActiveCompanyId,
    setActiveCompanyId: setActiveCompanyId
  };

  return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};