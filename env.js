// Netlify can inject environment variables at build time.
// For a plain static site, easiest is to create a tiny env.js during deploy.
// In live mode, this file is used only if generated at deploy time.
//
// If you want to hardcode for quick testing (NOT recommended for production):
// window.__ENV = { APP_MODE: "real", SUPABASE_URL: "https://xyz.supabase.co", SUPABASE_ANON_KEY: "...", DEFAULT_RATE_CARD_NAME: "TDS 2026 Rates - NM" };
