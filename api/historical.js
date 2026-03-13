const https = require('https');

function getJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } },
        (response) => {
          let data = '';
          response.on('data', (chunk) => {
            data += chunk;
          });
          response.on('end', () => {
            try {
              resolve({
                status: response.statusCode || 500,
                json: JSON.parse(data),
                raw: data
              });
            } catch (err) {
              reject(
                new Error(
                  `Upstream parse failed: ${String(err.message || err)} | body: ${data.slice(0, 300)}`
                )
              );
            }
          });
        }
      )
      .on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const symbol = (req.query.symbol || '').toUpperCase().trim();
  const from = req.query.from;
  const to = req.query.to;

  if (!symbol) {
    return res.status(400).json({ error: 'Missing symbol', data: {} });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured', data: {} });
  }

  try {
    let fromTs;
    let toTs;

    // FROM date
    if (from) {
      fromTs = Math.floor(new Date(`${from}T00:00:00Z`).getTime() / 1000);
    } else {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 10);
      fromTs = Math.floor(d.getTime() / 1000);
    }

    // TO date (never allow future dates)
    const today = new Date();
    const todayTs = Math.floor(today.getTime() / 1000);

    if (to) {
      toTs = Math.floor(new Date(`${to}T23:59:59Z`).getTime() / 1000);
      if (toTs > todayTs) {
        toTs = todayTs;
      }
    } else {
      toTs = todayTs;
    }

    if (!Number.isFinite(fromTs) || !Number.isFinite(toTs) || fromTs <= 0 || toTs <= 0 || fromTs >= toTs) {
      return res.status(400).json({ error: 'Invalid date range', data: {} });
    }

    const url =
      `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}` +
      `&resolution=D&from=${fromTs}&to=${toTs}&token=${encodeURIComponent(apiKey)}`;

    const { status, json, raw } = await getJson(url);

    if (status !== 200) {
      return res.status(status).json({
        error: `Finnhub request failed: ${status}`,
        details: raw.slice(0, 500),
        data: {}
      });
    }

    if (!json || json.s !== 'ok' || !Array.isArray(json.t) || !json.t.length) {
      return res.status(200).json({
        error: 'No data available',
        details: json && typeof json === 'object' ? json : raw.slice(0, 300),
        data: {}
      });
    }

    const formatted = {};
    for (let i = 0; i < json.t.length; i += 1) {
      const ts = json.t[i];
      const close = json.c?.[i];

      if (!ts || close == null || !Number.isFinite(Number(close))) continue;

      const date = new Date(ts * 1000).toISOString().slice(0, 10);
      formatted[date] = {
        date,
        open: Number(json.o?.[i] ?? close),
        high: Number(json.h?.[i] ?? close),
        low: Number(json.l?.[i] ?? close),
        close: Number(close),
        volume: Number(json.v?.[i] ?? 0)
      };
    }

    return res.status(200).json({
      symbol,
      data: formatted,
      totalDates: Object.keys(formatted).length,
      source: 'finnhub_candles'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Historical API failed',
      details: error?.message || String(error),
      data: {}
    });
  }
};
