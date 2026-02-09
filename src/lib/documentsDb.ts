import { supabase } from "@/integrations/supabase/client";

export type ContractAttachment = {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  kind: "LINK" | "FILE" | string;
  url: string | null;
  created_at: string;
};

export type UserDocument = {
  id: string;
  company_id: string;
  user_id: string;
  category: string;
  title: string;
  kind: "LINK" | "FILE" | string;
  url: string | null;
  created_at: string;
};

export async function listContractAttachments(params: { companyId: string; userId: string }) {
  const { data, error } = await supabase
    .from("contract_attachments")
    .select("*")
    .eq("company_id", params.companyId)
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ContractAttachment[];
}

export async function createContractAttachment(params: {
  companyId: string;
  userId: string;
  title: string;
  url: string;
  kind?: "LINK" | "FILE";
}) {
  const { data, error } = await supabase
    .from("contract_attachments")
    .insert({
      company_id: params.companyId,
      user_id: params.userId,
      title: params.title.trim(),
      kind: params.kind ?? "LINK",
      url: params.url.trim(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as any as ContractAttachment;
}

export async function deleteContractAttachment(id: string) {
  const { error } = await supabase.from("contract_attachments").delete().eq("id", id);
  if (error) throw error;
}

export async function listUserDocuments(params: { companyId: string; userId: string }) {
  const { data, error } = await supabase
    .from("user_documents")
    .select("*")
    .eq("company_id", params.companyId)
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserDocument[];
}

export async function createUserDocument(params: {
  companyId: string;
  userId: string;
  category?: string;
  title: string;
  url: string;
  kind?: "LINK" | "FILE";
}) {
  const { data, error } = await supabase
    .from("user_documents")
    .insert({
      company_id: params.companyId,
      user_id: params.userId,
      category: params.category ?? "EMPRESA",
      title: params.title.trim(),
      kind: params.kind ?? "LINK",
      url: params.url.trim(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as any as UserDocument;
}

export async function deleteUserDocument(id: string) {
  const { error } = await supabase.from("user_documents").delete().eq("id", id);
  if (error) throw error;
}
