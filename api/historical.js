const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { symbol } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Missing symbol', data: {} });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=10y`;

    https.get(url, (response) => {
      let data = '';

      response.on('data', chunk => data += chunk);

      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);

          const result = parsed.chart.result[0];
          const timestamps = result.timestamp;
          const closes = result.indicators.quote[0].close;

          const formatted = {};

          timestamps.forEach((t, i) => {
            if (closes[i] == null) return;

            const date = new Date(t * 1000).toISOString().slice(0,10);

            formatted[date] = {
              date,
              close: closes[i]
            };
          });

          res.status(200).json({
            symbol,
            data: formatted,
            totalDates: Object.keys(formatted).length,
            source: "yahoo_chart_api"
          });

        } catch (err) {
          res.status(500).json({ error: 'Parse error', data:{} });
        }
      });

    }).on('error', () => {
      res.status(500).json({ error: 'Request failed', data:{} });
    });

  } catch (err) {
    res.status(500).json({ error: 'Server error', data:{} });
  }
};
