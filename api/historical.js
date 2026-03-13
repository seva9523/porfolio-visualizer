const https = require('https');

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';

      res.on('data', chunk => data += chunk);

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });

    }).on('error', reject);
  });
}

module.exports = async (req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');

  const symbol = (req.query.symbol || '').toUpperCase();
  const from = req.query.from;
  const to = req.query.to;

  if (!symbol) {
    return res.status(400).json({ error: 'Missing symbol', data:{} });
  }

  try {

    const fromTs = Math.floor(new Date(from).getTime()/1000);
    const toTs = Math.floor(new Date().getTime()/1000);

    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}` +
      `?period1=${fromTs}&period2=${toTs}&interval=1d`;

    const json = await getJson(url);

    const result = json.chart.result?.[0];

    if (!result) {
      return res.status(200).json({ error:'No data available', data:{} });
    }

    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];

    const formatted = {};

    for (let i = 0; i < timestamps.length; i++) {

      const date = new Date(timestamps[i]*1000)
        .toISOString()
        .slice(0,10);

      formatted[date] = {
        date,
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i],
        volume: quote.volume[i]
      };

    }

    res.status(200).json({
      symbol,
      data: formatted,
      totalDates: Object.keys(formatted).length,
      source: 'yahoo_chart'
    });

  } catch(err) {

    res.status(500).json({
      error:'Historical API failed',
      details: err.message,
      data:{}
    });

  }

};
