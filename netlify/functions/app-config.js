export async function handler() {
  const demoEnabled = String(process.env.DEMO_BOOTSTRAP_ENABLED || "").trim().toLowerCase();
  const demoBootstrapOn = ["1", "true", "yes", "on"].includes(demoEnabled);
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      LIVE_MODE: true,
      DEMO_BOOTSTRAP_ENABLED: demoBootstrapOn ? "true" : undefined,
      DEMO_BOOTSTRAP_ALLOW_WITH_LIVE_AUTH: demoBootstrapOn ? process.env.DEMO_BOOTSTRAP_ALLOW_WITH_LIVE_AUTH : undefined,
      DEMO_ADMIN_EMAIL: demoBootstrapOn ? process.env.DEMO_ADMIN_EMAIL : undefined,
      DEMO_PASSWORD: demoBootstrapOn ? process.env.DEMO_PASSWORD : undefined
    })
  };
}
