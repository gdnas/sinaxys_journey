export const corsHeaders = {
  // MVP: allow any origin. If you want to restrict, replace "*" with your APP_BASE_URL.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};