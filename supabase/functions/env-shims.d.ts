/**
 * Type shims for Deno-based Supabase functions.
 *
 * These provide minimal ambient declarations so the project's TypeScript compiler
 * can type-check (and stop reporting TS2307/TS2304) for:
 * - the Deno global (Deno.env.get)
 * - remote module specifiers used in functions (std server serve, esm.sh supabase client)
 *
 * The runtime remains the same (Deno will import the real modules). These
 * declarations only affect build-time type resolution.
 */

declare module "https://deno.land/std@0.190.0/http/server.ts" {
  // Minimal serve declaration used by the function.
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.45.0" {
  // Minimal supabase-js declaration for createClient. We keep it very permissive.
  export type SupabaseClient = any;

  export function createClient(url: string, key: string): SupabaseClient;

  // Re-export common types as any to keep compatibility with existing usage in functions.
  export default createClient;
}

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};