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

// Upload a file to the 'user-documents' storage bucket.
// For images we perform a client-side resize + JPEG compression to reduce size.
// Returns a storage path encoded as `storage://<path>` which should be stored in the DB.
export async function uploadUserDocumentFile(params: {
  companyId: string;
  userId: string;
  file: File;
}): Promise<string> {
  const { companyId, userId, file } = params;

  // Allowed types: images and PDFs
  const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Tipo de arquivo não suportado. Envie imagens ou PDF.");
  }

  // Max size 10MB
  const MAX_BYTES = 10 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    throw new Error("Arquivo muito grande. Tamanho máximo: 10MB.");
  }

  // Helper: compress images via canvas
  async function compressImage(file: File, maxDim = 1600, quality = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const ratio = width / height;
            if (ratio > 1) {
              width = maxDim;
              height = Math.round(maxDim / ratio);
            } else {
              height = maxDim;
              width = Math.round(maxDim * ratio);
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas not supported");
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (b) => {
              if (!b) return reject(new Error("Compression failed"));
              resolve(b);
            },
            "image/jpeg",
            quality
          );
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = (e) => reject(new Error("Failed to load image for compression"));
      img.src = URL.createObjectURL(file);
    });
  }

  const isImage = file.type.startsWith("image/");
  let uploadBlob: Blob | File = file;
  let contentType = file.type || "application/octet-stream";

  if (isImage) {
    try {
      const compressed = await compressImage(file);
      uploadBlob = compressed;
      contentType = "image/jpeg";
    } catch (e) {
      // If compression fails, fall back to original file
      uploadBlob = file;
      contentType = file.type || "application/octet-stream";
    }
  }

  const ext = isImage ? "jpg" : file.name.split(".").pop() ?? "bin";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const path = `${companyId}/${userId}/${filename}`;

  // Upload to storage bucket 'user-documents'
  const storage = supabase.storage.from("user-documents");
  const { error: uploadError } = await storage.upload(path, uploadBlob as Blob, {
    cacheControl: "3600",
    upsert: false,
    contentType,
  } as any);

  // If bucket is not found, attempt to create it via an edge function and retry once.
  if (uploadError) {
    const message = String(uploadError.message || uploadError.message || uploadError);
    if (/bucket not found/i.test(message) || /no such bucket/i.test(message) || /Bucket not found/i.test(message)) {
      try {
        // Invoke Supabase Edge Function to create the bucket using service role key.
        // The function is expected at supabase/functions/create-user-documents-bucket
        const fn = await supabase.functions.invoke("create-user-documents-bucket");
        // fn.data may be present; check for error
        // Retry upload once
        const { error: retryError } = await storage.upload(path, uploadBlob as Blob, {
          cacheControl: "3600",
          upsert: false,
          contentType,
        } as any);
        if (retryError) throw retryError;
      } catch (e) {
        throw uploadError;
      }
    } else {
      throw uploadError;
    }
  }

  // Return storage path encoded so caller can store it in DB and later request signed URL.
  return `storage://${path}`;
}

// Create a signed URL for a storage path previously saved in the DB (format: storage://<path>)
export async function createSignedUrlForStoragePath(storageUrl: string, expiresInSeconds = 60): Promise<string> {
  if (!storageUrl.startsWith("storage://")) {
    throw new Error("Invalid storage path");
  }
  const path = storageUrl.replace("storage://", "");
  const { data, error } = await supabase.storage.from("user-documents").createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  // v1 returns { signedURL } or data?.signedUrl depending on SDK; normalize
  const anyData: any = data;
  return anyData.signedURL || anyData.signedUrl || anyData.publicUrl || "";
}