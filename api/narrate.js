// WealthView — Portfolio Narrator (API)
// Vercel Serverless Function (Node)
//
// POST /api/narrate
// Body: { metrics: {...}, context?: {...} }
// Returns: { title, paragraphs: string[], disclaimer }
//
// Requires env var:
//   OPENAI_API_KEY
// Optional:
//   OPENAI_MODEL (default: gpt-4o-mini)

export default async function handler(req, res) {
  // Basic CORS (safe default for same-origin use)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'OPENAI_API_KEY is not set on the server. Add it to Vercel Environment Variables and redeploy.'
    });
  }

  // Vercel may deliver body as string depending on config
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }

  const metrics = (body && body.metrics) || {};
  const context = (body && body.context) || {};

  // Keep prompt tight, descriptive, and explicitly non-advisory.
  const instructions = [
    'You are WealthView, an educational portfolio analytics narrator.',
    'Write a short plain-English summary of the portfolio using ONLY the provided metrics.',
    'Do NOT give financial advice. Do NOT recommend buying/selling/holding specific assets.',
    'Do NOT predict the future. Avoid words like "should", "must", "recommend".',
    'Use neutral descriptive language, focusing on concentration, volatility, drawdowns, and risk-adjusted performance.',
    'Keep it concise: 2–4 short paragraphs, each 1–2 sentences.',
    'Output must follow the JSON schema exactly.'
  ].join(' ');

  const input = {
    page: context.page || 'visualizer',
    window: context.window || null,
    metrics
  };

  // Structured output schema via Responses API text.format
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: { type: 'string', minLength: 3, maxLength: 80 },
      paragraphs: {
        type: 'array',
        minItems: 2,
        maxItems: 4,
        items: { type: 'string', minLength: 10, maxLength: 260 }
      },
      disclaimer: { type: 'string', minLength: 10, maxLength: 220 }
    },
    required: ['title', 'paragraphs', 'disclaimer']
  };

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  // Node runtime compatibility: some Vercel runtimes may not expose fetch globally.
  let fetchFn = globalThis.fetch;
  if (!fetchFn) {
    try {
      const mod = await import('node-fetch');
      fetchFn = mod.default;
    } catch (e) {
      return res.status(500).json({
        error: 'Server runtime missing fetch(), and node-fetch is not available.',
        details: String(e && e.message ? e.message : e)
      });
    }
  }

  try {
    const resp = await fetchFn('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        instructions,
        input: JSON.stringify(input),
        text: {
          format: {
            type: 'json_schema',
            strict: true,
            schema
          }
        }
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(502).json({
        error: 'OpenAI request failed',
        status: resp.status,
        details: errText?.slice(0, 2000)
      });
    }

    const data = await resp.json();

    // Responses API may return structured output as output_text (JSON string)
    // and some SDKs expose output_parsed. We handle both.
    let parsed = null;
    if (data && typeof data.output_parsed === 'object' && data.output_parsed) {
      parsed = data.output_parsed;
    } else if (typeof data.output_text === 'string' && data.output_text.trim().startsWith('{')) {
      try { parsed = JSON.parse(data.output_text); } catch (_) {}
    } else {
      // Fallback: scan output items
      try {
        const out = Array.isArray(data.output) ? data.output : [];
        const textItem = out.flatMap(o => o.content || []).find(c => c.type === 'output_text' && c.text);
        if (textItem && textItem.text) parsed = JSON.parse(textItem.text);
      } catch (_) {}
    }

    if (!parsed || !parsed.title || !Array.isArray(parsed.paragraphs)) {
      return res.status(502).json({
        error: 'Could not parse model output',
        raw: (data && (data.output_text || null))
      });
    }

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({
      error: 'Server error',
      details: String(e && e.message ? e.message : e)
    });
  }
}
