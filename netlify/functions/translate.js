const allowedTargets = new Set(["en", "es"]);

export async function handler(event){
  if (event.httpMethod !== "POST"){
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let payload = {};
  try{
    payload = JSON.parse(event.body || "{}");
  } catch {
    payload = {};
  }

  const text = String(payload.text || "").trim();
  const targetLang = String(payload.target_lang || "").toLowerCase();
  if (!text || !allowedTargets.has(targetLang)){
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid text or target_lang" }),
    };
  }

  const provider = String(process.env.TRANSLATE_PROVIDER || "libretranslate").toLowerCase();
  if (provider !== "libretranslate"){
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unsupported translate provider" }),
    };
  }

  const apiUrl = String(process.env.TRANSLATE_API_URL || "").trim();
  if (!apiUrl){
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "TRANSLATE_API_URL not configured" }),
    };
  }

  const body = {
    q: text,
    source: "auto",
    target: targetLang,
    format: "text",
  };
  if (process.env.TRANSLATE_API_KEY){
    body.api_key = process.env.TRANSLATE_API_KEY;
  }

  try{
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const translatedText = data?.translatedText || data?.translated_text || "";
    if (!res.ok || !translatedText){
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Translation failed" }),
      };
    }
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ translated_text: translatedText }),
    };
  } catch (err){
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err?.message || "Translate error" }),
    };
  }
}
