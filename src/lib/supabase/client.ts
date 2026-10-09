"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Cliente público (somente leitura + realtime). */
export function getBrowserClient(): SupabaseClient {
  if (!client) {
    // Aceita os nomes criados pela integração Vercel ↔ Supabase (anon antiga ou publishable nova).
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    client = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return client;
}
