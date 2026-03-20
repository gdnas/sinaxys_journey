import { supabase } from "@/integrations/supabase/client";

export async function getSharedFeedbacksForUser(userId: string) {
  const { data, error } = await supabase
    .from("feedback_shares")
    .select("feedback_id, public, created_at, feedbacks(*)")
    .eq("public", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function setFeedbackShare(feedbackId: string, makePublic: boolean) {
  if (makePublic) {
    const { data, error } = await supabase
      .from("feedback_shares")
      .upsert({ feedback_id: feedbackId, public: true })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  } else {
    const { error } = await supabase.from("feedback_shares").delete().eq("feedback_id", feedbackId);
    if (error) throw error;
    return null;
  }
}
