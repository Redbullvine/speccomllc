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

function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

function isPrivilegedRole(role) {
  return ["ROOT", "OWNER", "ADMIN", "OFFICE", "SUPPORT", "PRIME"].includes(normalizeRole(role));
}

function isFieldRole(role) {
  return ["TDS", "SUB", "SUBCONTRACTOR", "SPLICER", "TECHNICIAN"].includes(normalizeRole(role));
}

function isProjectMarkedInactive(project) {
  if (project?.active === false) return true;
  return String(project?.active || "").trim().toLowerCase() === "false";
}

function isLikelyTestProject(project) {
  if (project?.is_demo) return true;
  const blob = [
    project?.name,
    project?.description,
    project?.job_number,
    project?.location,
  ].map((value) => String(value || "").toLowerCase()).join(" ");
  return /\b(test|testing|demo|dev|sample|sandbox|training)\b/.test(blob);
}

function isProjectActiveForField(project) {
  return Boolean(project && !isProjectMarkedInactive(project) && !isLikelyTestProject(project));
}

async function fetchUserProfile(client, userId) {
  if (!userId) return null;
  const attempts = [
    "role, current_project_id, org_id",
    "current_project_id, org_id",
    "role, org_id",
    "org_id",
  ];
  for (const select of attempts) {
    const { data, error } = await client
      .from("profiles")
      .select(select)
      .eq("id", userId)
      .maybeSingle();
    if (!error) return data || {};
    const message = String(error.message || "").toLowerCase();
    if (!message.includes("does not exist")) {
      return null;
    }
  }
  return null;
}

async function fetchProjectMembershipIds(client, userId) {
  const ids = new Set();
  if (!userId) return ids;
  try {
    const { data, error } = await client
      .from("project_members")
      .select("project_id")
      .eq("user_id", userId);
    if (error) return ids;
    (data || []).forEach((row) => {
      const id = String(row?.project_id || "").trim();
      if (id) ids.add(id);
    });
  } catch (_) {
    return ids;
  }
  return ids;
}

function filterProjectsForUser(projects, profile, membershipIds) {
  const list = Array.isArray(projects) ? projects : [];
  const role = normalizeRole(profile?.role);
  if (isPrivilegedRole(role)) return list;

  const currentProjectId = String(profile?.current_project_id || "").trim();
  const assignedIds = currentProjectId
    ? new Set([currentProjectId])
    : new Set(
      Array.from(membershipIds || [])
        .map((id) => String(id || "").trim())
        .filter(Boolean)
    );

  const shouldScope = isFieldRole(role) || assignedIds.size > 0;
  if (!shouldScope) return list;

  const assignedProjects = assignedIds.size
    ? list.filter((project) => assignedIds.has(String(project?.id || "")))
    : [];
  const source = assignedProjects.length ? assignedProjects : list;
  const activeSource = source.filter(isProjectActiveForField);
  if (activeSource.length) return activeSource;
  return assignedProjects.length ? assignedProjects : list.filter(isProjectActiveForField);
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
  if (!supabaseUrl || !supabaseAnonKey) return json(500, { error: "Supabase not configured" });

  const clientOptions = token
    ? { global: { headers: { Authorization: `Bearer ${token}` } } }
    : {};
  const authClient = createClient(supabaseUrl, supabaseAnonKey, clientOptions);
  const projectClient = serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    : authClient;

  let userId = null;
  if (token) {
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    const user = userData?.user || null;
    if (userError || !user) return json(401, { error: "Invalid auth token" });
    userId = user.id;
  }

  const { data, error } = await fetchProjects(projectClient);
  if (error) return json(500, { error: error.message || "Failed to load projects" });
  const profile = userId ? await fetchUserProfile(projectClient, userId) : null;
  const membershipIds = userId ? await fetchProjectMembershipIds(projectClient, userId) : new Set();
  const projects = filterProjectsForUser(data, profile, membershipIds);

  return json(200, {
    ok: true,
    user_id: userId,
    project_scope: profile ? "profile" : "public",
    memberships: membershipIds.size,
    data: projects,
  });
};
