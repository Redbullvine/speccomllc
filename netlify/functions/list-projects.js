const { createClient } = require("@supabase/supabase-js");

const PROJECT_COLUMNS = "id, org_id, name, description, created_at, location, job_number, is_demo, created_by, active";

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

async function fetchProjects(adminClient) {
  const result = await adminClient
    .from("projects")
    .select(PROJECT_COLUMNS)
    .order("name", { ascending: true });
  if (!result.error) return result;

  const message = String(result.error.message || "").toLowerCase();
  if (!message.includes("active") || !message.includes("does not exist")) return result;

  return adminClient
    .from("projects")
    .select(PROJECT_COLUMNS.replace(", active", ""))
    .order("name", { ascending: true });
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return json(401, { error: "Missing auth token" });

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
  if (!supabaseUrl || !supabaseAnonKey) return json(500, { error: "Supabase not configured" });
  if (!serviceRoleKey) return json(501, { error: "Project list service is not configured" });

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  const user = userData?.user || null;
  if (userError || !user) return json(401, { error: "Invalid auth token" });

  const { data, error } = await fetchProjects(adminClient);
  if (error) return json(500, { error: error.message || "Failed to load projects" });

  return json(200, {
    ok: true,
    user_id: user.id,
    data: Array.isArray(data) ? data : [],
  });
};
