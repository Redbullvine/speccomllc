#!/usr/bin/env node
// Query site_media for a given site UUID using @supabase/supabase-js
// Usage:
//   set SUPABASE_URL=https://your-project.supabase.co
//   set SUPABASE_ANON_KEY=your_anon_key
//   node scripts/query_site_media.js <SITE_UUID>

const siteId = process.argv[2];
if (!siteId){
  console.error("Usage: node scripts/query_site_media.js <SITE_UUID>");
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_ANON_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "";
if (!SUPABASE_URL || !SUPABASE_ANON_KEY){
  console.error("Please set SUPABASE_URL and SUPABASE_ANON_KEY in your environment.");
  process.exit(1);
}

(async () => {
  try {
    const mod = await import('@supabase/supabase-js');
    const { createClient } = mod;
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data, error } = await client
      .from('site_media')
      .select('id, site_id, media_path, gps_lat, gps_lng, created_at')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false });

    if (error){
      console.error('Query error:', error);
      process.exit(1);
    }

    if (!data || !data.length){
      console.log('No rows found for site_id', siteId);
      return;
    }

    console.table(data.map((r) => ({
      id: r.id,
      site_id: r.site_id,
      media_path: r.media_path,
      gps_lat: r.gps_lat,
      gps_lng: r.gps_lng,
      created_at: r.created_at,
    })));
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
})();
