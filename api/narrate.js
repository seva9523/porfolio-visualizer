/**
 * /api/narrate (Vercel Serverless Function)
 *
 * Uses OpenAI Responses API + Structured Outputs (JSON Schema) to return:
 *   { title: string, paragraphs: string[], disclaimer: string }
 *
 * Env:
 *   OPENAI_API_KEY (required)
 *   OPENAI_MODEL   (optional, default gpt-4o-mini)
 */

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

function getApiKey() {
  const v = process.env.OPENAI_API_KEY;
  return (typeof v === "string" && v.trim()) ? v.trim() : "";
}

function safeParseJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function coercePayload(body) {
  const b = (body && typeof body === "object") ? body : {};
  return {
    metrics: (b.metrics && typeof b.metrics === "object") ? b.metrics : {},
    holdings: Array.isArray(b.holdings) ? b.holdings.slice(0, 200) : [],
    context: (b.context && typeof b.context === "object") ? b.context : {},
  };
}

async function getFetch() {
  if (typeof globalThis.fetch === "function") return globalThis.fetch.bind(globalThis);
  const mod = await import("node-fetch");
  return mod.default;
}

async function callOpenAI({ apiKey, model, payload }) {
  const fetchFn = await getFetch();

  const system = [
    "You are WealthView's educational portfolio narrator.",
    "Write in plain English.",
    "Be descriptive, not prescriptive: no recommendations, no 'you should buy/sell'.",
    "Avoid certainty; describe what the historical metrics show.",
    "Keep it concise (3–6 short paragraphs).",
    "Return ONLY valid JSON matching the required schema."
  ].join(" ");

  // Structured Outputs schema
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      paragraphs: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 8 },
      disclaimer: { type: "string" }
    },
    required: ["title", "paragraphs", "disclaimer"]
  };

  const reqBody = {
    model,
    input: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(payload) }
    ],
    // IMPORTANT: Responses API uses text.format, and name is REQUIRED.
    // See Structured Outputs + Responses migration docs.
    text: {
      format: {
        type: "json_schema",
        name: "portfolio_story",
        schema,
        strict: true
      }
    }
  };

  const resp = await fetchFn("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(reqBody)
  });

  const raw = await resp.text();
  const parsed = safeParseJson(raw);

  if (!resp.ok) {
    const err = parsed?.error || { message: raw?.slice(0, 500) || "OpenAI request failed" };
    return { ok: false, status: resp.status, error: err };
  }

  // Extract the model's structured JSON.
  // Most reliably, Responses returns a top-level `output_text` helper (SDK),
  // but raw HTTP often returns content blocks. We'll handle both.
  let text = "";
  if (typeof parsed?.output_text === "string") {
    text = parsed.output_text;
  } else if (Array.isArray(parsed?.output)) {
    for (const item of parsed.output) {
      if (Array.isArray(item?.content)) {
        for (const c of item.content) {
          if (typeof c?.text === "string") { text = c.text; break; }
        }
      }
      if (text) break;
    }
  }

  const jsonOut = safeParseJson(text);
  if (!jsonOut || typeof jsonOut !== "object") {
    return {
      ok: false,
      status: 502,
      error: { message: "Could not parse structured JSON from OpenAI response.", raw_preview: String(text).slice(0, 300) }
    };
  }

  return { ok: true, data: jsonOut };
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.end();

  if (req.method === "GET") {
    const hasKey = Boolean(getApiKey());
    return sendJson(res, 200, {
      ok: true,
      hasOpenAIKey: hasKey,
      vercelEnv: process.env.VERCEL_ENV || "",
      vercelRegion: process.env.VERCEL_REGION || ""
    });
  }

  if (req.method !== "POST") return sendJson(res, 405, { error: "Method Not Allowed" });

  const apiKey = getApiKey();
  if (!apiKey) {
    return sendJson(res, 500, {
      error: "OPENAI_API_KEY is not set on the server. Add it to Vercel Environment Variables and redeploy."
    });
  }

  let body = req.body;
  // In some Vercel setups, req.body may be a string.
  if (typeof body === "string") body = safeParseJson(body) || {};
  const payload = coercePayload(body);

  const model = (typeof process.env.OPENAI_MODEL === "string" && process.env.OPENAI_MODEL.trim())
    ? process.env.OPENAI_MODEL.trim()
    : "gpt-4o-mini";

  const result = await callOpenAI({ apiKey, model, payload });

  if (!result.ok) {
    // pass through OpenAI status for debugging
    return sendJson(res, 502, {
      error: "OpenAI request failed",
      status: result.status,
      details: result.error
    });
  }

  return sendJson(res, 200, result.data);
};
