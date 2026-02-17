const { createClient } = require("@supabase/supabase-js");

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

const STATUS_WHITELIST = new Set([
  "NEW",
  "ASSIGNED",
  "EN_ROUTE",
  "ON_SITE",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETE",
  "CANCELED",
]);

const FILTER_CONFIG = {
  status: { column: "status", type: "enum_status" },
  technician_id: { column: "assigned_to_user_id", type: "uuid" },
  site_id: { column: null, type: "unsupported" }, // Schema limitation
};

const SELECT_ADMIN = "id, project_id, external_source, external_id, type, status, scheduled_start, scheduled_end, address, lat, lng, customer_label, contact_phone, notes, priority, sla_due_at, assigned_to_user_id, created_by, created_at, updated_at";
const SELECT_VIEWER = "id, project_id, external_source, external_id, type, status, scheduled_start, scheduled_end, address, lat, lng, customer_label, contact_phone, priority, sla_due_at, assigned_to_user_id, created_by, created_at, updated_at";

function json(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  };
}

function getCacheHeaders(role) {
  if (role === "admin") {
    return {
      "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=120",
      "Netlify-CDN-Cache-Control": "public, max-age=30, stale-while-revalidate=120",
    };
  }
  return {
    "Cache-Control": "private, max-age=0, s-maxage=15, stale-while-revalidate=60",
    "Netlify-CDN-Cache-Control": "max-age=15, stale-while-revalidate=60",
  };
}

function normalizeRoleCode(roleCode) {
  const role = String(roleCode || "").trim().toUpperCase();
  if (["ROOT", "OWNER", "ADMIN", "PROJECT_MANAGER", "SUPPORT"].includes(role)) return "admin";
  if (["TECHNICIAN", "USER_LEVEL_I", "USER_LEVEL_1", "USER1"].includes(role)) return "technician";
  return "viewer";
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}

function parseCursor(rawCursor) {
  if (!rawCursor) return null;
  try {
    const decoded = Buffer.from(String(rawCursor), "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    if (!parsed?.created_at || !parsed?.id || !isUuid(parsed.id)) throw new Error("Invalid cursor");
    const created = new Date(parsed.created_at);
    if (Number.isNaN(created.getTime())) throw new Error("Invalid cursor");
    return { created_at: created.toISOString(), id: parsed.id };
  } catch {
    throw new Error("Invalid cursor");
  }
}

function encodeCursor(row) {
  if (!row?.created_at || !row?.id) return null;
  return Buffer.from(JSON.stringify({ created_at: row.created_at, id: row.id }), "utf8").toString("base64");
}

function parsePageSize(raw) {
  const n = Number.parseInt(String(raw || DEFAULT_PAGE_SIZE), 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(n, MAX_PAGE_SIZE);
}

function applySafeFilters(query, params) {
  const errors = [];
  Object.keys(FILTER_CONFIG).forEach((key) => {
    const rawValue = params[key];
    if (rawValue == null || String(rawValue).trim() === "") return;

    const config = FILTER_CONFIG[key];
    if (!config?.column) {
      errors.push(`Filter '${key}' is not supported.`);
      return;
    }

    const value = String(rawValue).trim();

    if (config.type === "uuid" && !isUuid(value)) {
      errors.push(`Filter '${key}' must be a valid UUID.`);
      return;
    }

    if (config.type === "enum_status") {
      const normalized = value.toUpperCase();
      if (!STATUS_WHITELIST.has(normalized)) {
        errors.push(`Invalid status value. Allowed: ${Array.from(STATUS_WHITELIST).join(", ")}.`);
        return;
      }
      query.eq(config.column, normalized);
      return;
    }

    query.eq(config.column, value);
  });
  return { query, errors };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return json(401, { error: "Missing auth token" });

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !supabaseAnonKey) {
    return json(500, { error: "Supabase not configured" });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // Single auth call; supabase validates token.
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user || null;
  if (error || !user) return json(401, { error: "Invalid auth token" });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role_code, role, org_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile) {
    return json(403, { error: "Profile not found or inaccessible" });
  }

  const roleCode = String(profile.role_code || profile.role || "").trim().toUpperCase();
  const role = normalizeRoleCode(roleCode);
  const isRoot = roleCode === "ROOT";
  const orgId = profile.org_id || null;

  const qs = event.queryStringParameters || {};
  const pageSize = parsePageSize(qs.page_size);

  let cursor;
  try {
    cursor = parseCursor(qs.cursor);
  } catch (err) {
    return json(400, { error: err.message });
  }

  const selectColumns = role === "viewer" ? SELECT_VIEWER : SELECT_ADMIN;
  let query = supabase
    .from("work_orders")
    .select(selectColumns)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (!isRoot) {
    if (!orgId) return json(403, { error: "Missing org context" });
    const { data: projectRows, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("org_id", orgId);
    if (projectError) {
      const status = /permission|rls|forbidden|not authorized/i.test(String(projectError.message || "")) ? 403 : 500;
      return json(status, { error: projectError.message || "Failed to resolve org projects" });
    }
    const projectIds = (projectRows || []).map((row) => row.id).filter(Boolean);
    if (!projectIds.length) {
      return json(200, {
        ok: true,
        role,
        role_code: roleCode,
        org_id: orgId,
        page_size: pageSize,
        has_more: false,
        next_cursor: null,
        data: [],
      }, getCacheHeaders(role));
    }
    query = query.in("project_id", projectIds);
  }

  const filtered = applySafeFilters(query, qs);
  query = filtered.query;
  if (filtered.errors.length) return json(400, { error: "Invalid filters", details: filtered.errors });

  if (cursor) {
    query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
  }

  if (role === "technician") {
    query = query.eq("assigned_to_user_id", user.id);
  } else if (qs.technician_id && role !== "admin") {
    return json(403, { error: "Forbidden" });
  }

  const { data: rowsData, error: fetchError } = await query;
  if (fetchError) {
    const status = /permission|rls|forbidden|not authorized/i.test(String(fetchError.message || "")) ? 403 : 500;
    return json(status, { error: fetchError.message || "Failed to fetch records" });
  }

  const allRows = Array.isArray(rowsData) ? rowsData : [];
  const hasMore = allRows.length > pageSize;
  const rows = hasMore ? allRows.slice(0, pageSize) : allRows;

  return json(200, {
    ok: true,
    role,
    role_code: roleCode,
    org_id: orgId,
    page_size: pageSize,
    has_more: hasMore,
    next_cursor: hasMore ? encodeCursor(rows[rows.length - 1]) : null,
    data: rows,
  }, getCacheHeaders(role));
};
