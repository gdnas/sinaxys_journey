import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[create-user-documents-bucket] incoming request");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("SUPABASE_PROJECT_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[create-user-documents-bucket] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500, headers: corsHeaders });
  }

  try {
    const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { "x-edge-function": "true" } },
    });

    console.log("[create-user-documents-bucket] creating bucket 'user-documents' (if not exists)");

    // Try to create the bucket. If exists, Supabase returns an error which we will ignore.
    const { data, error } = await client.storage.createBucket("user-documents", { public: false });
    if (error) {
      // If bucket exists, the error message contains 'Bucket already exists' — treat as success
      console.warn("[create-user-documents-bucket] createBucket warning", { error: error.message });
      // Check if bucket already exists by listing
      const { data: listData, error: listError } = await client.storage.listBuckets();
      if (listError) {
        console.error("[create-user-documents-bucket] failed to list buckets", { error: listError.message });
        return new Response(JSON.stringify({ error: listError.message }), {
          status: 500,
          headers: corsHeaders,
        });
      }
      const exists = (listData ?? []).some((b: any) => b.name === "user-documents");
      if (!exists) {
        console.error("[create-user-documents-bucket] bucket not found after create attempt");
        return new Response(JSON.stringify({ error: "Could not create bucket" }), { status: 500, headers: corsHeaders });
      }
      console.log("[create-user-documents-bucket] bucket already exists (ok)");
      return new Response(JSON.stringify({ ok: true, message: "bucket exists" }), { status: 200, headers: corsHeaders });
    }

    console.log("[create-user-documents-bucket] bucket created", data);
    return new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("[create-user-documents-bucket] unexpected error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});