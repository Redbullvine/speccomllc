export async function handler() {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      LIVE_MODE: true,
      DEMO_BOOTSTRAP_ENABLED: process.env.DEMO_BOOTSTRAP_ENABLED,
      DEMO_ADMIN_EMAIL: process.env.DEMO_ADMIN_EMAIL,
      DEMO_PASSWORD: process.env.DEMO_PASSWORD
    })
  };
}
