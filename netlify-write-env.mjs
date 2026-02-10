import fs from "fs";
import path from "path";

const publishDir = process.env.PUBLISH_DIR || process.env.NETLIFY_PUBLISH_DIR || ".";
const outPath = path.join(publishDir, "env.generated.js");

const env = {
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
  APP_MODE: process.env.APP_MODE || "real",
  LIVE_MODE: process.env.LIVE_MODE || undefined,
};

Object.keys(env).forEach((key) => env[key] === undefined && delete env[key]);

const content = "window.__ENV = " + JSON.stringify(env, null, 2) + ";\n";

fs.writeFileSync(outPath, content, "utf8");
console.log(`[netlify-write-env] wrote ${outPath}`);
