import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { createClient } from "@/lib/supabaseClient";
import { User as BaseUser } from "@/lib/domain";

interface AuthContextType {
  user: BaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; mustChangePassword?: boolean; message?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<BaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);

  const signup = async ({ email, password }: { email: string; password: string }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            limited_access: false,
            limited_access: false
          }
        }
      });
      if (error) throw error;
      router.push("/");
    } catch (error) {
      console.error("Signup error:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.signInWithPassword(email, password);
      if (error) throw error;
      await hydrateFromSession();
      const { data: session } = data;
      if (session?.user) {
        const userId = session.user.id;
        const client = createClient();
        const { data: profile } = await client
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .select(
            `
              id,email,name,role,company_id,department_id,active,must_change_password,avatar_url,phone,job_title,contract_url,monthly_cost_brl,joined_at,manager_id,address_zip,address_line1,address_line2,address_neighborhood,address_city,address_state,address_country,
              emergency_contact_name,emergency_contact_phone,birth_date,created_at,updated_at,preferred_language,theme_preference,notification_preferences,
              offboarding_state,offboarding_scheduled_at,limited_access
            `
          )
          .single();

        if (!profile) throw new Error("Perfil não encontrado");

        if (profile.limited_access) {
          const limitedUser = mapProfileToUser(profile);
          limitedUser.active = false;
          (limitedUser as any).limitedAccess = true;
          (limitedUser as any).role = "COLABORADOR";

          // Persist limitedAccess in memory AND on the JWT token (via updateUser) so that the next request is immediately 'limbo' without needing to re-fetch profile.
          const { data: updatedSession } = await supabase.auth.updateUser({
            data: { limited_access: true }
          });
          setUser(limitedUser);
        } else {
          const normalUser = mapProfileToUser(profile);
          setUser(normalUser);
        }
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    setUser(null);
    setActiveCompanyId(null);
  };

  const refresh = async () => {
    await supabase.auth.refreshSession();
    const { data: session } = await supabase.auth.getSession();
    if (session?.user) {
      const userId = session.user.id;
      const client = createClient();
      const { data: profile } = await client
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .select("id,email,name,role,company_id,department_id,active,must_change_password,avatar_url,phone,job_title,contract_url,monthly_cost_brl,joined_at,manager_id,address_zip,address_line1,address_line2,address_neighborhood,address_city,address_state,address_country,emergency_contact_name,emergency_contact_phone,birth_date,created_at,updated_at,preferred_language,theme_preference,notification_preferences,offboarding_state,offboarding_scheduled_at,limited_access")
        .single();
      if (!profile) throw new Error("Perfil não encontrado");
      const normalUser = mapProfileToUser(profile);
      setUser(normalUser);
    } else {
      setUser(null);
    }
  };

  const authContextValue: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refresh,
    companyId: activeCompanyId
  };

  return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  return !!ctx.user;
};