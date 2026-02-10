import { createClient } from "@supabase/supabase-js";

export let SUPABASE_URL = "";
export let SUPABASE_ANON_KEY = "";
export let APP_MODE = "real";

function readWindowEnv() {
  if (typeof window === "undefined") return null;
  return window.__ENV || null;
}

export function refreshConfig() {
  const env = readWindowEnv();
  SUPABASE_URL = (env?.SUPABASE_URL || "").trim();
  SUPABASE_ANON_KEY = (env?.SUPABASE_ANON_KEY || "").trim();
  APP_MODE = (env?.APP_MODE || "real").trim();
  return { SUPABASE_URL, SUPABASE_ANON_KEY, APP_MODE };
}

export function hasSupabaseConfig() {
  refreshConfig();
  return !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
}

export function makeClient() {
  refreshConfig();

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
