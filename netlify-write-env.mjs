import fs from "fs";
import path from "path";

const publishDir = process.env.PUBLISH_DIR || process.env.NETLIFY_PUBLISH_DIR || ".";
const outPath = path.join(publishDir, "env.generated.js");
const demoBootstrapEnabled = String(process.env.DEMO_BOOTSTRAP_ENABLED || "").trim().toLowerCase();
const demoBootstrapOn = ["1", "true", "yes", "on"].includes(demoBootstrapEnabled);
const showcaseEmails = String(process.env.LIVE_SHOWCASE_EMAILS || process.env.DEMO_SHOWCASE_EMAILS || "").trim();

const env = {
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
  APP_MODE: process.env.APP_MODE || "real",
  LIVE_MODE: process.env.LIVE_MODE || undefined,
  DEMO_SHOWCASE_ENABLED: process.env.DEMO_SHOWCASE_ENABLED || undefined,
  DEMO_SHOWCASE_ALLOW_GLOBAL_REAL: process.env.DEMO_SHOWCASE_ALLOW_GLOBAL_REAL || undefined,
  DEMO_SHOWCASE_ACCOUNT_ENABLED: process.env.DEMO_SHOWCASE_ACCOUNT_ENABLED || undefined,
  LIVE_SHOWCASE_EMAILS: showcaseEmails || undefined,
  DEMO_BOOTSTRAP_ENABLED: demoBootstrapOn ? "true" : undefined,
  DEMO_BOOTSTRAP_ALLOW_WITH_LIVE_AUTH: demoBootstrapOn ? (process.env.DEMO_BOOTSTRAP_ALLOW_WITH_LIVE_AUTH || undefined) : undefined,
  DEMO_ADMIN_EMAIL: demoBootstrapOn ? (process.env.DEMO_ADMIN_EMAIL || undefined) : undefined,
};

Object.keys(env).forEach((key) => env[key] === undefined && delete env[key]);

const content = "window.__ENV = " + JSON.stringify(env, null, 2) + ";\n";

fs.writeFileSync(outPath, content, "utf8");
console.log(`[netlify-write-env] wrote ${outPath}`);
