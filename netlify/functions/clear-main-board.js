const { createClient } = require("@supabase/supabase-js");

const ADMIN_ROLES = new Set(["ROOT", "OWNER", "ADMIN", "OFFICE", "SUPPORT", "PROJECT_MANAGER", "PM"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{3,4}-[0-9a-f]{3,4}-[0-9a-f]{12}$/i;

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

function normalizeRole(profile) {
  return String(profile?.role_code || profile?.role || "").trim().toUpperCase();
}

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    return {};
  }
}

function cleanUuidList(values) {
  return Array.from(new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim())
    .filter((value) => UUID_RE.test(value))));
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return json(401, { error: "Missing auth token" });

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
  if (!supabaseUrl || !supabaseAnonKey) return json(500, { error: "Supabase not configured" });
  if (!serviceRoleKey) return json(501, { error: "Server cleanup is not configured" });

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  const user = userData?.user || null;
  if (userError || !user) return json(401, { error: "Invalid auth token" });

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, org_id, role, role_code")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile) return json(403, { error: "Profile not found" });

  const role = normalizeRole(profile);
  if (!ADMIN_ROLES.has(role)) return json(403, { error: "Not authorized to clear Main Board messages" });

  const body = parseBody(event);
  const ids = cleanUuidList(body.ids);
  if (!ids.length) return json(400, { error: "No message IDs supplied" });

  let query = adminClient
    .from("messages")
    .delete()
    .in("id", ids)
    .eq("channel", "BOARD");

  if (role !== "ROOT") {
    if (!profile.org_id) return json(403, { error: "Missing organization context" });
    query = query.eq("org_id", profile.org_id);
  }

  const { data, error } = await query.select("id");
  if (error) return json(500, { error: error.message || "Delete failed" });

  return json(200, {
    ok: true,
    deleted: Array.isArray(data) ? data.length : 0,
  });
};
