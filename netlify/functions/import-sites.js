const Busboy = require("busboy");
const XLSX = require("xlsx");
const { parse } = require("csv-parse/sync");
const { createClient } = require("@supabase/supabase-js");

const LAT_HEADERS = ["lat", "latitude", "gps_lat"];
const LNG_HEADERS = ["lng", "lon", "longitude", "gps_lng"];
const NAME_HEADERS = ["name", "site", "location", "drop", "node"];
const NOTES_HEADERS = ["notes", "comment", "remarks"];

function json(statusCode, payload){
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

function normalizeHeader(value){
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function findHeaderIndex(headers, candidates){
  const lookup = new Set(candidates.map(normalizeHeader));
  return headers.findIndex((h) => lookup.has(h));
}

function parseMultipart(event){
  return new Promise((resolve, reject) => {
    const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
    if (!contentType.includes("multipart/form-data")){
      reject(new Error("Expected multipart/form-data upload."));
      return;
    }

    const busboy = new Busboy({ headers: { "content-type": contentType } });
    const fields = {};
    const fileChunks = [];
    let fileInfo = { filename: "", mime: "" };

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });

    busboy.on("file", (fieldname, file, info, encoding, mimetype) => {
      let filename = info;
      let mime = mimetype;
      if (info && typeof info === "object"){
        filename = info.filename;
        mime = info.mimeType;
      }
      fileInfo = { filename: filename || "", mime: mime || "" };
      file.on("data", (data) => fileChunks.push(data));
    });

    busboy.on("finish", () => {
      const buffer = fileChunks.length ? Buffer.concat(fileChunks) : null;
      resolve({ fields, file: { ...fileInfo, buffer } });
    });

    busboy.on("error", reject);

    const body = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64")
      : Buffer.from(event.body || "", "utf8");
    busboy.end(body);
  });
}

function parseRowsFromFile(buffer, filename){
  const lower = String(filename || "").toLowerCase();
  if (lower.endsWith(".xlsx")){
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  }
  if (lower.endsWith(".csv")){
    const text = buffer.toString("utf8");
    return parse(text, { relax_column_count: true, skip_empty_lines: true });
  }
  throw new Error("Unsupported file type. Upload .csv or .xlsx.");
}

exports.handler = async function handler(event){
  if (event.httpMethod !== "POST"){
    return json(405, { error: "Method not allowed" });
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token){
    return json(401, { error: "Missing auth token" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !supabaseAnonKey){
    return json(500, { error: "Supabase not configured" });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user){
    return json(401, { error: "Invalid auth token" });
  }

  let parsed;
  try{
    parsed = await parseMultipart(event);
  } catch (err){
    return json(400, { error: err?.message || "Invalid upload" });
  }

  const projectId = String(parsed.fields.project_id || "").trim();
  if (!projectId){
    return json(400, { error: "project_id is required" });
  }
  if (!parsed.file?.buffer){
    return json(400, { error: "File is required" });
  }

  let rows = [];
  try{
    rows = parseRowsFromFile(parsed.file.buffer, parsed.file.filename);
  } catch (err){
    return json(400, { error: err?.message || "Unable to parse file" });
  }

  if (!rows.length){
    return json(200, { ok: true, total_rows: 0, inserted_rows: 0, skipped_rows: 0 });
  }

  const headers = rows[0].map(normalizeHeader);
  const latIdx = findHeaderIndex(headers, LAT_HEADERS);
  const lngIdx = findHeaderIndex(headers, LNG_HEADERS);
  const nameIdx = findHeaderIndex(headers, NAME_HEADERS);
  const notesIdx = findHeaderIndex(headers, NOTES_HEADERS);

  if (latIdx < 0 || lngIdx < 0){
    return json(400, { error: "Missing latitude/longitude columns" });
  }

  const dataRows = rows
    .slice(1)
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell || "").trim().length));

  const payloads = [];
  let skipped = 0;
  dataRows.forEach((row) => {
    const lat = Number(String(row[latIdx] ?? "").trim());
    const lng = Number(String(row[lngIdx] ?? "").trim());
    if (!Number.isFinite(lat) || !Number.isFinite(lng)){
      skipped += 1;
      return;
    }
    const rawName = nameIdx >= 0 ? String(row[nameIdx] ?? "").trim() : "";
    const name = rawName || "Imported Site";
    const notes = notesIdx >= 0 ? String(row[notesIdx] ?? "").trim() : "";
    const payload = {
      project_id: projectId,
      gps_lat: lat,
      gps_lng: lng,
      lat,
      lng,
      name,
      created_by: userData.user.id,
    };
    if (notes) payload.notes = notes;
    payloads.push(payload);
  });

  if (!payloads.length){
    return json(200, { ok: true, total_rows: dataRows.length, inserted_rows: 0, skipped_rows: skipped });
  }

  let inserted = 0;
  const chunkSize = 500;
  for (let i = 0; i < payloads.length; i += chunkSize){
    const chunk = payloads.slice(i, i + chunkSize);
    const { error } = await supabase.from("sites").insert(chunk);
    if (error){
      const status = /permission|rls|not allowed|forbidden/i.test(error.message || "") ? 403 : 500;
      return json(status, { error: error.message || "Insert failed" });
    }
    inserted += chunk.length;
  }

  return json(200, {
    ok: true,
    total_rows: dataRows.length,
    inserted_rows: inserted,
    skipped_rows: skipped,
  });
};
