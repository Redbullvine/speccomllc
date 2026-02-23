export let SUPABASE_URL = "";
export let SUPABASE_ANON_KEY = "";
export let APP_MODE = "real";
let _clientPromise = null;

// Some browser states can throw AbortError from the default Web Locks flow.
// Use a simple in-process lock to keep auth initialization stable.
async function safeAuthLock(_name, _acquireTimeout, fn) {
  return await fn();
}

function getProjectRefFromUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    const host = String(parsed.hostname || "").trim().toLowerCase();
    const ref = host.split(".")[0] || "";
    return ref;
  } catch {
    return "";
  }
}

function getAuthStorageKey() {
  const ref = getProjectRefFromUrl(SUPABASE_URL);
  if (!ref) return "";
  return `sb-${ref}-auth-token`;
}

export function clearSupabaseAuthStorage() {
  if (typeof window === "undefined") return;
  const key = getAuthStorageKey();
  const clearFrom = (store) => {
    if (!store) return;
    try {
      if (key) store.removeItem(key);
      const toDelete = [];
      for (let i = 0; i < store.length; i += 1) {
        const k = store.key(i) || "";
        if (/^sb-.*-auth-token$/i.test(k)) toDelete.push(k);
      }
      toDelete.forEach((k) => store.removeItem(k));
    } catch {}
  };
  clearFrom(window.localStorage);
  clearFrom(window.sessionStorage);
}

export function isInvalidRefreshError(error) {
  const msg = String(error?.message || error || "").toLowerCase();
  return msg.includes("invalid refresh token")
    || msg.includes("refresh token not found");
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
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          lock: safeAuthLock,
        },
      });
      return client;
    } catch (error) {
      _clientPromise = null;
      throw error;
    }
  })();
  return _clientPromise;
}
