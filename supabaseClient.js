export let SUPABASE_URL = "";
export let SUPABASE_ANON_KEY = "";
export let APP_MODE = "real";
let _clientPromise = null;

// Some browser states can throw AbortError from the default Web Locks flow.
// Use a simple in-process lock to keep auth initialization stable.
async function safeAuthLock(_name, _acquireTimeout, fn) {
  return await fn();
}

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

async function loadSupabaseCreateClient() {
  if (typeof window === "undefined") return null;
  if (!window.__supabaseCreateClient) {
    const mod = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    window.__supabaseCreateClient = mod.createClient;
  }
  return window.__supabaseCreateClient || null;
}

export async function makeClient() {
  refreshConfig();

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  if (_clientPromise) return _clientPromise;
  _clientPromise = (async () => {
    try {
      const createClient = await loadSupabaseCreateClient();
      if (!createClient) return null;
      return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          lock: safeAuthLock,
        },
      });
    } catch (error) {
      _clientPromise = null;
      throw error;
    }
  })();
  return _clientPromise;
}
