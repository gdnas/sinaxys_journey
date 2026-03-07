import { supabase } from "@/integrations/supabase/client";

export type UserDocument = {
  id: string;
  company_id: string;
  user_id: string;
  category: string;
  title: string;
  url: string | null;
  kind: string;
  created_at: string;
};

export type ContractAttachment = {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  url: string | null;
  created_at: string;
};

export async function listUserDocuments({ companyId, userId }: { companyId: string; userId: string }) {
  const { data, error } = await supabase
    .from("user_documents")
    .select("*")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserDocument[];
}

export async function createUserDocument({
  companyId,
  userId,
  category,
  title,
  url,
  kind,
}: {
  companyId: string;
  userId: string;
  category: string;
  title: string;
  url: string;
  kind: string;
}) {
  const { data, error } = await supabase
    .from("user_documents")
    .insert({
      company_id: companyId,
      user_id: userId,
      category,
      title,
      url,
      kind,
    })
    .select()
    .single();
  if (error) throw error;
  return data as UserDocument;
}

export async function deleteUserDocument(id: string) {
  const { error } = await supabase.from("user_documents").delete().eq("id", id);
  if (error) throw error;
}

export async function listContractAttachments({ companyId, userId }: { companyId: string; userId: string }) {
  const { data, error } = await supabase
    .from("contract_attachments")
    .select("*")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ContractAttachment[];
}

export async function createContractAttachment({
  companyId,
  userId,
  title,
  url,
}: {
  companyId: string;
  userId: string;
  title: string;
  url: string;
}) {
  const { data, error } = await supabase
    .from("contract_attachments")
    .insert({
      company_id: companyId,
      user_id: userId,
      title,
      url,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ContractAttachment;
}

export async function deleteContractAttachment(id: string) {
  const { error } = await supabase.from("contract_attachments").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadUserDocumentFile({
  companyId,
  userId,
  file,
}: {
  companyId: string;
  userId: string;
  file: File;
}) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${companyId}/${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage.from("user-documents").upload(filePath, file);
  if (uploadError) throw uploadError;

  return `storage://user-documents/${filePath}`;
}

export async function createSignedUrlForStoragePath(storagePath: string, expiresIn: number = 60) {
  const path = storagePath.replace("storage://user-documents/", "");
  const { data, error } = await supabase.storage.from("user-documents").createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}