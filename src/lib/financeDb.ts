import { supabase } from "@/integrations/supabase/client";

export type UserFinancialProfile = {
  user_id: string;
  company_id: string | null;
  destination_account: string | null;
  pix_key: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyFinanceSettings = {
  id: string;
  company_id: string;
  legal_name: string | null;
  cnpj: string | null;
  bank_name: string | null;
  agency: string | null;
  account_number: string | null;
  account_holder: string | null;
  pix_key: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type UserInvoiceStatus = "ENVIADA" | "EM_ANALISE" | "APROVADA" | "PAGA" | "REJEITADA" | (string & {});

export type UserInvoice = {
  id: string;
  company_id: string | null;
  user_id: string;
  invoice_number: string | null;
  issue_date: string | null; // date
  amount_brl: number | null;
  description: string | null;
  file_path: string;
  file_name: string | null;
  mime_type: string | null;
  status: UserInvoiceStatus;
  created_at: string;
  updated_at: string;
};

export const FINANCE_INVOICES_BUCKET = "finance-invoices";

function sanitizeFilename(name: string) {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

export async function getUserFinancialProfile(userId: string) {
  const { data, error } = await supabase
    .from("user_financial_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as UserFinancialProfile | null;
}

export async function upsertUserFinancialProfile(params: {
  userId: string;
  companyId: string | null;
  destinationAccount: string | null;
  pixKey: string | null;
}) {
  const { data, error } = await supabase
    .from("user_financial_profiles")
    .upsert(
      {
        user_id: params.userId,
        company_id: params.companyId,
        destination_account: params.destinationAccount,
        pix_key: params.pixKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as any as UserFinancialProfile;
}

export async function getCompanyFinanceSettings(companyId: string) {
  const { data, error } = await supabase
    .from("company_finance_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as CompanyFinanceSettings | null;
}

export async function upsertCompanyFinanceSettings(params: {
  companyId: string;
  patch: Partial<Omit<CompanyFinanceSettings, "id" | "company_id" | "created_at" | "updated_at">>;
}) {
  const payload = {
    company_id: params.companyId,
    ...params.patch,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("company_finance_settings")
    .upsert(payload, { onConflict: "company_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data as any as CompanyFinanceSettings;
}

export async function listUserInvoices(params: { userId: string; companyId?: string | null }) {
  let q = supabase.from("user_invoices").select("*").eq("user_id", params.userId);
  if (params.companyId) q = q.eq("company_id", params.companyId);

  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserInvoice[];
}

export async function createUserInvoice(params: {
  id: string;
  userId: string;
  companyId: string | null;
  invoiceNumber: string | null;
  issueDate: string | null; // YYYY-MM-DD
  amountBRL: number | null;
  description: string | null;
  filePath: string;
  fileName: string;
  mimeType: string | null;
}) {
  const { data, error } = await supabase
    .from("user_invoices")
    .insert({
      id: params.id,
      user_id: params.userId,
      company_id: params.companyId,
      invoice_number: params.invoiceNumber,
      issue_date: params.issueDate,
      amount_brl: params.amountBRL,
      description: params.description,
      file_path: params.filePath,
      file_name: params.fileName,
      mime_type: params.mimeType,
      status: "ENVIADA",
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as any as UserInvoice;
}

export async function deleteUserInvoice(id: string) {
  const { error } = await supabase.from("user_invoices").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadInvoiceFile(params: { userId: string; invoiceId: string; file: File }) {
  const safeName = sanitizeFilename(params.file.name) || `arquivo-${Date.now()}`;
  const path = `${params.userId}/${params.invoiceId}/${safeName}`;

  const { error } = await supabase.storage
    .from(FINANCE_INVOICES_BUCKET)
    .upload(path, params.file, { contentType: params.file.type || undefined, upsert: false });

  if (error) throw error;

  return {
    path,
    fileName: safeName,
    mimeType: params.file.type || null,
  };
}

export async function removeInvoiceFile(path: string) {
  const { error } = await supabase.storage.from(FINANCE_INVOICES_BUCKET).remove([path]);
  if (error) throw error;
}

export async function createInvoiceSignedUrl(path: string, expiresInSeconds = 60) {
  const { data, error } = await supabase.storage
    .from(FINANCE_INVOICES_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
