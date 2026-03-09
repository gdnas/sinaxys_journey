import { supabase } from "@/integrations/supabase/client";

export type ItemType = "TRACK" | "MODULE";

export async function getStats(itemType: ItemType, itemId: string) {
  const { data, error } = await supabase
    .from("item_stats")
    .select("views")
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data ?? { views: 0 };
}

export async function incrementView(itemType: ItemType, itemId: string) {
  // upsert increment
  const { data, error } = await supabase.rpc("increment_item_views", { p_item_type: itemType, p_item_id: itemId });
  if (error) throw error;
  return data;
}

export async function getLikes(itemType: ItemType, itemId: string) {
  const { data, error } = await supabase
    .from("item_likes")
    .select("user_id", { count: "exact" })
    .eq("item_type", itemType)
    .eq("item_id", itemId);
  if (error) throw error;
  return { count: data?.length ?? 0, rows: data ?? [] };
}

export async function toggleLike(itemType: ItemType, itemId: string, userId: string) {
  // check if liked
  const { data: existing } = await supabase
    .from("item_likes")
    .select("id")
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    const { error } = await supabase.from("item_likes").delete().eq("id", existing.id);
    if (error) throw error;
    return { liked: false };
  }

  const { error } = await supabase.from("item_likes").insert({ item_type: itemType, item_id: itemId, user_id: userId });
  if (error) throw error;
  return { liked: true };
}

export async function getComments(itemType: ItemType, itemId: string) {
  const { data, error } = await supabase
    .from("item_comments")
    .select("id, content, user_id, created_at")
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addComment(itemType: ItemType, itemId: string, userId: string, content: string) {
  const { data, error } = await supabase.from("item_comments").insert({ item_type: itemType, item_id: itemId, user_id: userId, content }).select();
  if (error) throw error;
  return data?.[0];
}
