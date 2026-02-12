import { supabase } from "@/integrations/supabase/client";

export const ONBOARDING_VERSION = 1 as const;

export type OnboardingStatus = {
  completedAt: string | null;
  version: number;
};

export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_completed_at,onboarding_version")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  return {
    completedAt: (data?.onboarding_completed_at as string | null) ?? null,
    version: Number(data?.onboarding_version ?? 0) || 0,
  };
}

export async function markOnboardingCompleted(userId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString(), onboarding_version: ONBOARDING_VERSION })
    .eq("id", userId);

  if (error) throw error;
}

export async function resetOnboarding(userId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: null, onboarding_version: 0 })
    .eq("id", userId);

  if (error) throw error;
}
