const Busboy = require("busboy");
const XLSX = require("xlsx");
const { parse } = require("csv-parse/sync");
const { createClient } = require("@supabase/supabase-js");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TABLE_SCHEMAS = {
  sites: {
    required: ["project_id", "name", "gps_lat", "gps_lng"],
    defaults: { },
    columns: {
      project_id: { type: "uuid", aliases: ["project", "projectid", "project_id"] },
      name: { type: "text", aliases: ["location", "location_name", "site", "site_name", "drop", "node"] },
      notes: { type: "text", aliases: ["comment", "remarks", "description"] },
      gps_lat: { type: "float", aliases: ["lat", "latitude", "gpslat", "gps_lat"] },
      gps_lng: { type: "float", aliases: ["lng", "lon", "longitude", "gpslng", "gps_lng"] },
      gps_accuracy_m: { type: "float", aliases: ["gps_accuracy", "accuracy", "accuracy_m"] },
      drop_number: { type: "text", aliases: ["dropnumber", "drop_number", "drop_no"] },
      work_type: { type: "text", aliases: ["worktype", "type_of_work"] },
      billing_code_default: { type: "text", aliases: ["billingcode", "billing_code", "default_billing_code"] },
      created_by: { type: "uuid", aliases: ["createdby", "created_by"] },
    },
  },
  work_orders: {
    required: ["project_id", "type"],
    defaults: { external_source: "CSV" },
    columns: {
      project_id: { type: "uuid", aliases: ["project", "projectid", "project_id"] },
      external_source: { type: "text", aliases: ["source", "externalsource", "external_source"] },
      external_id: { type: "text", aliases: ["workorderid", "work_order_id", "work_orderid", "externalid", "external_id"] },
      type: { type: "text", aliases: ["workordertype", "work_order_type", "order_type"] },
      status: { type: "text", aliases: ["workorderstatus", "work_order_status"] },
      scheduled_start: { type: "timestamptz", aliases: ["scheduledstart", "scheduled_start", "start_at"] },
      scheduled_end: { type: "timestamptz", aliases: ["scheduledend", "scheduled_end", "end_at"] },
      address: { type: "text", aliases: ["service_address", "location_address"] },
      lat: { type: "float", aliases: ["latitude", "gps_lat"] },
      lng: { type: "float", aliases: ["longitude", "gps_lng"] },
      customer_label: { type: "text", aliases: ["customer", "customer_name"] },
      contact_phone: { type: "text", aliases: ["phone", "contact"] },
      notes: { type: "text", aliases: ["comment", "remarks"] },
      priority: { type: "int", aliases: ["prio"] },
      sla_due_at: { type: "timestamptz", aliases: ["sla_due", "due_at"] },
      assigned_to_user_id: { type: "uuid", aliases: ["assigned_to", "technician_user_id"] },
      created_by: { type: "uuid", aliases: ["createdby", "created_by"] },
    },
    enums: {
      type: new Set(["INSTALL", "TROUBLE_TICKET", "MAINTENANCE", "SURVEY"]),
      status: new Set(["NEW", "ASSIGNED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS", "BLOCKED", "COMPLETE", "CANCELED"]),
    },
  },
  work_order_events: {
    required: ["work_order_id", "event_type"],
    defaults: {},
    columns: {
      work_order_id: { type: "uuid", aliases: ["workorderid", "work_order_id"] },
      actor_user_id: { type: "uuid", aliases: ["actor", "actor_user_id", "user_id"] },
      event_type: { type: "text", aliases: ["event", "type"] },
      payload: { type: "json", aliases: ["data", "json", "payload"] },
    },
  },
};

function makeHeaders(contentType){
  return {
    ...CORS_HEADERS,
    "Content-Type": contentType,
  };
}

function response(statusCode, payload){
  return {
    statusCode,
    headers: makeHeaders("application/json"),
    body: JSON.stringify(payload),
  };
}

function normalizeHeader(value){
  return String(value || "")
    .trim()
    .replace(/([a-z\d])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseMultipart(event){
  return new Promise((resolve, reject) => {
    const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
    if (!contentType.includes("multipart/form-data")){
      reject(new Error("Expected multipart/form-data upload."));
      return;
    }

    const busboy = Busboy({ headers: { "content-type": contentType } });
    const fields = {};
    const fileChunks = [];
    let fileInfo = { filename: "", mimeType: "" };

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });

    busboy.on("file", (fieldName, file, info, encoding, mimetype) => {
      void fieldName;
      void encoding;
      let filename = info;
      let mimeType = mimetype;
      if (info && typeof info === "object"){
        filename = info.filename;
        mimeType = info.mimeType;
      }
      fileInfo = { filename: filename || "", mimeType: mimeType || "" };
      file.on("data", (chunk) => fileChunks.push(chunk));
    });

    busboy.on("error", reject);
    busboy.on("finish", () => {
      const buffer = fileChunks.length ? Buffer.concat(fileChunks) : null;
      resolve({ fields, file: { ...fileInfo, buffer } });
    });

    const bodyBuffer = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64")
      : Buffer.from(event.body || "", "utf8");
    busboy.end(bodyBuffer);
  });
}

function parseGridRowsFromFile(buffer, filename){
  const lower = String(filename || "").toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")){
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
  }
  if (lower.endsWith(".csv")){
    return parse(buffer.toString("utf8"), { relax_column_count: true, skip_empty_lines: true });
  }
  throw new Error("Unsupported file type. Upload .csv, .xls, or .xlsx.");
}

function detectTable(input){
  const key = normalizeHeader(input);
  if (TABLE_SCHEMAS[key]) return key;
  throw new Error(`Unsupported table '${input}'. Supported tables: ${Object.keys(TABLE_SCHEMAS).join(", ")}.`);
}

function buildHeaderMap(rawHeaders, schema){
  const mapped = [];
  const unknownHeaders = [];
  const canonicalByAlias = new Map();

  Object.entries(schema.columns).forEach(([column, meta]) => {
    canonicalByAlias.set(normalizeHeader(column), column);
    (meta.aliases || []).forEach((alias) => canonicalByAlias.set(normalizeHeader(alias), column));
  });

  rawHeaders.forEach((headerCell, idx) => {
    const normalized = normalizeHeader(headerCell);
    const mappedColumn = canonicalByAlias.get(normalized) || null;
    mapped[idx] = mappedColumn;
    if (!mappedColumn && normalized){
      unknownHeaders.push({ header: String(headerCell || "").trim(), normalized, index: idx });
    }
  });

  return { mapped, unknownHeaders };
}

function toNullIfBlank(value){
  if (value == null) return null;
  const str = String(value).trim();
  return str === "" ? null : str;
}

function coerceValue(value, type){
  const raw = toNullIfBlank(value);
  if (raw == null) return null;

  if (type === "text") return String(raw);
  if (type === "uuid") return String(raw);
  if (type === "int"){
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new Error(`Expected integer, got '${raw}'`);
    return Math.trunc(n);
  }
  if (type === "float"){
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new Error(`Expected number, got '${raw}'`);
    return n;
  }
  if (type === "timestamptz"){
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) throw new Error(`Expected timestamp, got '${raw}'`);
    return d.toISOString();
  }
  if (type === "json"){
    if (typeof raw === "object") return raw;
    try {
      return JSON.parse(String(raw));
    } catch {
      return { raw: String(raw) };
    }
  }

  return raw;
}

function normalizeRow(row, rowNumber, mappedHeaders, schema, context){
  const record = {};
  const errors = [];

  row.forEach((value, idx) => {
    const column = mappedHeaders[idx];
    if (!column) return;
    const meta = schema.columns[column];
    if (!meta) return;
    try {
      const coerced = coerceValue(value, meta.type);
      if (coerced == null) return;
      if (record[column] == null || record[column] === ""){
        record[column] = coerced;
      }
    } catch (error){
      errors.push(`column '${column}': ${error.message}`);
    }
  });

  if (schema.columns.project_id && !record.project_id && context.projectId){
    record.project_id = context.projectId;
  }
  if (schema.columns.created_by && !record.created_by && context.userId){
    record.created_by = context.userId;
  }
  if (schema.columns.actor_user_id && !record.actor_user_id && context.userId){
    record.actor_user_id = context.userId;
  }

  Object.entries(schema.defaults || {}).forEach(([key, value]) => {
    if (record[key] == null || record[key] === ""){
      record[key] = value;
    }
  });

  (schema.required || []).forEach((requiredColumn) => {
    if (record[requiredColumn] == null || record[requiredColumn] === ""){
      errors.push(`missing required column '${requiredColumn}'`);
    }
  });

  if (record.gps_lat != null && (record.gps_lat < -90 || record.gps_lat > 90)){
    errors.push("gps_lat out of range (-90..90)");
  }
  if (record.gps_lng != null && (record.gps_lng < -180 || record.gps_lng > 180)){
    errors.push("gps_lng out of range (-180..180)");
  }

  if (schema.enums){
    Object.entries(schema.enums).forEach(([key, allowedSet]) => {
      if (record[key] == null) return;
      const asText = String(record[key]).trim().toUpperCase();
      if (!allowedSet.has(asText)){
        errors.push(`${key} must be one of: ${Array.from(allowedSet).join(", ")}`);
        return;
      }
      record[key] = asText;
    });
  }

  return {
    rowNumber,
    record,
    errors,
  };
}

function isLikelyAuthError(message){
  return /permission|rls|not authorized|forbidden|jwt|auth/i.test(String(message || ""));
}

async function parseInput(event){
  const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
  if (contentType.includes("multipart/form-data")){
    return parseMultipart(event);
  }

  if (!event.body) return { fields: {}, file: null };

  let body;
  try {
    body = event.isBase64Encoded
      ? JSON.parse(Buffer.from(event.body, "base64").toString("utf8"))
      : JSON.parse(event.body);
  } catch {
    throw new Error("Invalid JSON body");
  }

  const rows = Array.isArray(body.rows) ? body.rows : [];
  const headers = Array.isArray(body.headers) ? body.headers : [];
  const gridRows = headers.length ? [headers, ...rows] : rows;

  return {
    fields: body,
    file: null,
    gridRows,
  };
}

exports.handler = async function handler(event){
  if (event.httpMethod === "OPTIONS"){
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST"){
    return response(405, { error: "Method not allowed" });
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token){
    return response(401, { error: "Missing auth token" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !supabaseAnonKey){
    return response(500, { error: "Supabase not configured" });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user?.id){
    return response(401, { error: "Invalid auth token" });
  }

  let parsed;
  try {
    parsed = await parseInput(event);
  } catch (error){
    return response(400, { error: error.message || "Invalid request body" });
  }

  const tableInput = String(parsed.fields.table || parsed.fields.target_table || "sites").trim();
  let table;
  try {
    table = detectTable(tableInput);
  } catch (error){
    return response(400, { error: error.message });
  }

  const schema = TABLE_SCHEMAS[table];
  const projectId = String(parsed.fields.project_id || "").trim() || null;

  let gridRows = parsed.gridRows;
  if (!gridRows){
    if (!parsed.file?.buffer){
      return response(400, { error: "File is required" });
    }

    try {
      gridRows = parseGridRowsFromFile(parsed.file.buffer, parsed.file.filename);
    } catch (error){
      return response(400, { error: error.message || "Unable to parse file" });
    }
  }

  if (!Array.isArray(gridRows) || !gridRows.length){
    return response(200, {
      ok: true,
      table,
      total_rows: 0,
      inserted_rows: 0,
      failed_rows: 0,
      errors: [],
    });
  }

  const rawHeaders = Array.isArray(gridRows[0]) ? gridRows[0] : [];
  const { mapped, unknownHeaders } = buildHeaderMap(rawHeaders, schema);
  const dataRows = gridRows
    .slice(1)
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell || "").trim().length));

  if (!dataRows.length){
    return response(200, {
      ok: true,
      table,
      total_rows: 0,
      inserted_rows: 0,
      failed_rows: 0,
      unknown_headers: unknownHeaders,
      errors: [],
    });
  }

  const context = {
    projectId,
    userId: authData.user.id,
  };

  const validRows = [];
  const errors = [];

  dataRows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const result = normalizeRow(row, rowNumber, mapped, schema, context);
    if (result.errors.length){
      errors.push({ row: rowNumber, stage: "validation", message: result.errors.join("; ") });
      return;
    }
    validRows.push(result);
  });

  let inserted = 0;
  for (const row of validRows){
    const { error } = await supabase.from(table).insert(row.record);
    if (error){
      errors.push({ row: row.rowNumber, stage: "database", message: error.message || "Insert failed" });
      continue;
    }
    inserted += 1;
  }

  const failed = errors.length;
  const authRelatedFailure = failed > 0 && errors.every((item) => isLikelyAuthError(item.message));

  const statusCode = inserted > 0
    ? 200
    : (authRelatedFailure ? 403 : 422);

  return response(statusCode, {
    ok: inserted > 0 && failed === 0,
    table,
    total_rows: dataRows.length,
    inserted_rows: inserted,
    failed_rows: failed,
    unknown_headers: unknownHeaders,
    errors,
  });
};
