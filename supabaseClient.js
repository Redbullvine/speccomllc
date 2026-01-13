// Supabase client loader.
// APP_MODE controls demo vs real; missing keys show a warning in the UI.

export const config = {
  url: (window.__ENV && window.__ENV.SUPABASE_URL)
    || (window.ENV && window.ENV.SUPABASE_URL)
    || (window.process && window.process.env && window.process.env.SUPABASE_URL)
    || "",
  anonKey: (window.__ENV && window.__ENV.SUPABASE_ANON_KEY)
    || (window.ENV && window.ENV.SUPABASE_ANON_KEY)
    || (window.process && window.process.env && window.process.env.SUPABASE_ANON_KEY)
    || "",
  appMode: String(
    (window.__ENV && window.__ENV.APP_MODE)
    || (window.ENV && window.ENV.APP_MODE)
    || (window.process && window.process.env && window.process.env.APP_MODE)
    || "real"
  ).toLowerCase(),
};

export const appMode = "real";
export const hasSupabaseConfig = Boolean(config.url && config.anonKey);
export const isDemo = false;

export function getSupabase(){
  if (!hasSupabaseConfig) return null;

  // Load supabase-js from CDN (keeps the starter zip simple).
  // Note: You can switch to bundling later.
  return window.supabase;
}

export async function ensureSupabaseLoaded(){
  if (!hasSupabaseConfig) return;

  if (window.supabase) return;

  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export async function makeClient(){
  if (!hasSupabaseConfig) return null;
  await ensureSupabaseLoaded();
  return window.supabase.createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  });
}
