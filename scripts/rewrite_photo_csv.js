#!/usr/bin/env node
// rewrite_photo_csv.js
// Usage (recommended):
//   set SUPABASE_URL=https://your.supabase.co
//   set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
//   set PROJECT_ID=your_project_uuid
//   node scripts/rewrite_photo_csv.js <input.csv> [output.csv]
// Or via env vars: INPUT_CSV and OUTPUT_CSV

const fs = require('fs');
const path = require('path');

const inputArg = process.argv[2] || process.env.INPUT_CSV;
const outputArg = process.argv[3] || process.env.OUTPUT_CSV;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const PROJECT_ID = process.env.PROJECT_ID || '';

if (!inputArg){
  console.error('Usage: node scripts/rewrite_photo_csv.js <input.csv> [output.csv]');
  process.exit(1);
}
const inputPath = path.resolve(inputArg);
const outputPath = outputArg ? path.resolve(outputArg) : inputPath.replace(/\.csv$/i, '_REWRITTEN.csv');

if (!fs.existsSync(inputPath)){
  console.error('Input file not found:', inputPath);
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY || !PROJECT_ID){
  console.error('Please set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), and PROJECT_ID env vars.');
  process.exit(1);
}

function parseCsvText(text){
  const lines = text.split(/\r?\n/);
  const rows = [];
  for (const line of lines){
    if (!line) continue;
    rows.push(parseCsvLine(line));
  }
  return rows;
}

function parseCsvLine(line){
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++){
    const ch = line[i];
    if (ch === '"'){
      if (inQuotes && line[i+1] === '"'){
        cur += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes){
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function csvCell(v) {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function normKey(v){
  return String(v || '').toLowerCase().trim().replace(/\s+/g, '').replace(/[-_()\[\]]/g, '');
}

function extractEnclosureToken(raw){
  const text = String(raw || '').trim();
  if (!text) return '';
  const numericTokens = (text.match(/\d+(?:\/@[\w.]+)?/g) || []);
  if (numericTokens.length > 1 && /(node\s*\d+|1635\s*ca)/i.test(text)){
    const candidates = numericTokens.filter((token) => {
      const base = String(token).split('/@')[0] || token;
      const num = Number.parseInt(base, 10);
      return Number.isFinite(num) && (num >= 100 || base.length >= 3);
    });
    if (candidates.length) return candidates[candidates.length - 1];
    return numericTokens[numericTokens.length - 1];
  }
  const direct = text.match(/^\d+(?:\/@[\w.]+)?$/);
  if (direct) return direct[0];
  const token = text.match(/\b(\d+(?:\/@[\w.]+)?)\b/);
  return token ? token[1] : '';
}

function matchSiteFromSegment(segmentRaw, sitesByName, sites){
  const seg = String(segmentRaw || '').trim();
  if (!seg) return null;
  // exact
  if (sitesByName.has(seg)) return sitesByName.get(seg);
  const segNorm = normKey(seg);
  // normalized equality
  for (const s of sites){ if (normKey(s.name) === segNorm) return s; }
  // extract core/suffix
  const m = seg.match(/^([a-z0-9]+)[_\-]?(\d+)?$/i);
  const core = (m && m[1]) ? m[1] : seg;
  const suffix = (m && m[2]) ? m[2] : '';
  const coreNorm = normKey(core);
  // contains core and optional suffix
  for (const s of sites){
    const n = normKey(s.name || '');
    if (n.includes(coreNorm) && (!suffix || n.includes(normKey(suffix)))) return s;
  }
  // contains full segment norm
  for (const s of sites){ if (normKey(s.name || '').includes(segNorm)) return s; }
  // enclosure token match
  const encl = extractEnclosureToken(seg);
  if (encl){
    for (const s of sites){ if ((s.name || '').includes(encl)) return s; }
  }
  return null;
}

(async () => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: sites, error: sitesErr } = await client
      .from('sites')
      .select('id,name')
      .eq('project_id', PROJECT_ID);
    if (sitesErr) throw sitesErr;
    if (!sites || !sites.length){
      console.error('No sites found for project', PROJECT_ID);
      process.exit(1);
    }

    const sitesByName = new Map();
    sites.forEach((s) => { if (s && s.name) sitesByName.set(String(s.name).trim(), s); });

    const raw = fs.readFileSync(inputPath, 'utf8');
    const rows = parseCsvText(raw);
    if (!rows.length){ console.error('No CSV rows'); process.exit(1); }

    const headerRaw = rows[0].map((h) => String(h || '').trim());
    const header = headerRaw.map((h) => normKey(h));
    const headerSet = new Set(header);
    const hasPhotoUrlColumn = headerSet.has('photourl');
    const hasUrlColumn = headerSet.has('url');
    if (!hasPhotoUrlColumn && !hasUrlColumn){
      console.error('Could not detect photo URL column (photo_url or url). Header:', rows[0]);
      process.exit(1);
    }
    const getRowValue = (rowObj, key) => String(rowObj[key] || '').trim();
    const toRowObject = (cells) => {
      const out = {};
      for (let i = 0; i < header.length; i += 1){
        out[header[i]] = cells[i] ?? '';
      }
      return out;
    };

    const outLines = [];
    outLines.push('location_name,url');
    const skipped = [];
    const matchedSamples = [];
    let processed = 0;
    for (let i = 1; i < rows.length; i++){
      const row = rows[i];
      if (!row) continue;
      processed += 1;
      const rowObj = toRowObject(row);
      let locRaw = '';
      let photoUrl = '';
      if (hasPhotoUrlColumn){
        locRaw = getRowValue(rowObj, 'loc');
        photoUrl = getRowValue(rowObj, 'photourl');
      } else {
        locRaw = getRowValue(rowObj, 'segment')
          || getRowValue(rowObj, 'loc')
          || getRowValue(rowObj, 'location')
          || getRowValue(rowObj, 'locationname');
        photoUrl = getRowValue(rowObj, 'url') || getRowValue(rowObj, 'photourl');
      }
      if (!photoUrl || !/^https?:\/\//i.test(photoUrl)) continue;

      const match = matchSiteFromSegment(locRaw, sitesByName, sites);
      if (match){
        const locationName = match.name;
        outLines.push(`${csvCell(locationName)},${csvCell(photoUrl)}`);
        matchedSamples.push({ segment: locRaw, site: match.name, url: photoUrl });
      } else {
        skipped.push({ segment: locRaw, url: photoUrl });
      }
    }

    fs.writeFileSync(outputPath, outLines.join('\n'), 'utf8');

    console.log(`total=${processed}`);
    console.log(`matched=${matchedSamples.length}`);
    console.log(`skipped=${skipped.length}`);
    console.log(`output=${outputPath}`);
    if (skipped.length){
      console.log('First 20 skipped segments:');
      skipped.slice(0,20).forEach((s,idx)=> console.log(idx+1, s.segment, s.url));
    }
  } catch (err){
    console.error('Error:', err);
    process.exit(1);
  }
})();
