import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type AlertEventRow = {
  id: string;
  company_id: string;
  project_id: string;
  item_key: string;
  alert_type: string;
  message: string;
  last_sent_at: string | null;
  is_open: boolean;
};

type AlertSubscriptionRow = {
  user_id: string;
  phone_e164: string;
  sms_enabled: boolean;
  cooldown_minutes: number | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getRoleCode(profile: { role_code?: string | null; role?: string | null } | null) {
  const roleCode = String(profile?.role_code || profile?.role || "").trim().toUpperCase();
  return roleCode;
}

async function sendTwilioSms(params: {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  toNumber: string;
  body: string;
}) {
  const { accountSid, authToken, fromNumber, toNumber, body } = params;
  const auth = btoa(`${accountSid}:${authToken}`);
  const payload = new URLSearchParams({
    To: toNumber,
    From: fromNumber,
    Body: body,
  });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio send failed (${response.status}): ${text}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
  const twilioFromNumber = Deno.env.get("TWILIO_FROM_NUMBER") || "";

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse(500, { error: "Supabase environment is not configured." });
  }

  if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
    return jsonResponse(500, { error: "Twilio environment is not configured." });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON payload." });
  }

  const companyId = String(payload.company_id || "").trim();
  const projectId = String(payload.project_id || "").trim();
  const alerts = Array.isArray(payload.alerts) ? payload.alerts : [];

  if (!companyId || !projectId) {
    return jsonResponse(400, { error: "company_id and project_id are required." });
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) {
    return jsonResponse(401, { error: "Missing authorization header." });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData?.user) {
    return jsonResponse(401, { error: "Unauthorized." });
  }
  const userId = authData.user.id;

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role_code, role, org_id")
    .eq("id", userId)
    .maybeSingle();
  if (profileError || !profile) {
    return jsonResponse(403, { error: "Profile not found for caller." });
  }
  const roleCode = getRoleCode(profile);
  if (roleCode !== "ROOT" && String(profile.org_id || "") !== companyId) {
    return jsonResponse(403, { error: "Not authorized for company." });
  }

  const alertIds = Array.from(
    new Set(
      alerts
        .map((alert) => String((alert as Record<string, unknown>)?.id || "").trim())
        .filter(Boolean),
    ),
  );

  if (!alertIds.length) {
    return jsonResponse(200, { ok: true, sent: false, reason: "No alert ids provided." });
  }

  const { data: eventRows, error: eventError } = await adminClient
    .from("alert_events")
    .select("id, company_id, project_id, item_key, alert_type, message, last_sent_at, is_open")
    .eq("company_id", companyId)
    .eq("project_id", projectId)
    .in("id", alertIds);
  if (eventError) {
    return jsonResponse(500, { error: eventError.message || "Failed to load alerts." });
  }
  const openEvents = (eventRows || []).filter((row) => row.is_open) as AlertEventRow[];
  if (!openEvents.length) {
    return jsonResponse(200, { ok: true, sent: false, reason: "No open alerts to notify." });
  }

  const { data: projectRow } = await adminClient
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .maybeSingle();
  const projectName = String(projectRow?.name || "").trim();

  const { data: subscriptions, error: subError } = await adminClient
    .from("alert_subscriptions")
    .select("user_id, phone_e164, sms_enabled, cooldown_minutes")
    .eq("company_id", companyId)
    .eq("sms_enabled", true);
  if (subError) {
    return jsonResponse(500, { error: subError.message || "Failed to load subscriptions." });
  }
  const subs = (subscriptions || []) as AlertSubscriptionRow[];
  if (!subs.length) {
    return jsonResponse(200, { ok: true, sent: false, reason: "No SMS subscribers enabled." });
  }

  const nowMs = Date.now();
  const sentEventIds = new Set<string>();
  const sentPhones: string[] = [];
  const errors: string[] = [];

  for (const sub of subs) {
    const cooldownMs = Math.max(1, Number(sub.cooldown_minutes || 30)) * 60 * 1000;
    const eligible = openEvents.filter((event) => {
      if (!event.last_sent_at) return true;
      const sentAtMs = Date.parse(event.last_sent_at);
      if (!Number.isFinite(sentAtMs)) return true;
      return nowMs - sentAtMs >= cooldownMs;
    });
    if (!eligible.length) continue;

    const alertLines = eligible.slice(0, 6).map((event) => `- ${event.message}`);
    if (eligible.length > 6) {
      alertLines.push(`- +${eligible.length - 6} more alerts`);
    }
    const header = projectName ? `SpecCom alerts (${projectName})` : "SpecCom alerts";
    const smsBody = `${header}\n${alertLines.join("\n")}`;

    try {
      await sendTwilioSms({
        accountSid: twilioAccountSid,
        authToken: twilioAuthToken,
        fromNumber: twilioFromNumber,
        toNumber: sub.phone_e164,
        body: smsBody,
      });
      sentPhones.push(sub.phone_e164);
      eligible.forEach((event) => sentEventIds.add(event.id));
    } catch (error) {
      errors.push(String(error));
    }
  }

  if (sentEventIds.size) {
    const sentAt = new Date().toISOString();
    const { error: updateError } = await adminClient
      .from("alert_events")
      .update({ last_sent_at: sentAt })
      .in("id", Array.from(sentEventIds));
    if (updateError) {
      errors.push(`Failed to update last_sent_at: ${updateError.message || "unknown error"}`);
    }
  }

  return jsonResponse(200, {
    ok: true,
    sent: sentPhones.length > 0,
    sent_to: sentPhones,
    sent_alert_count: sentEventIds.size,
    errors,
  });
});
