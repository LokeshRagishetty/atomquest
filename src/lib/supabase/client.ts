"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { env } from "@/env";

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient<Database>>;

let browserClient: BrowserSupabaseClient | null = null;

export function createSupabaseBrowserClient(): BrowserSupabaseClient {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase browser client is missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}
