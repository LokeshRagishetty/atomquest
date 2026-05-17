import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { env } from "@/env";

type SupabaseAdminClient = ReturnType<typeof createClient<Database>>;

let adminClient: SupabaseAdminClient | null = null;

export function createSupabaseAdminClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}
