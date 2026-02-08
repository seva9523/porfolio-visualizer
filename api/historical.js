const https = require('https');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { symbol, from, to } = req.query;
  
  if (!symbol) {
    return res.status(400).json({ error: 'Missing symbol parameter' });
  }
  
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Alpha Vantage API key not configured' });
  }
  
  // Alpha Vantage TIME_SERIES_DAILY endpoint
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=full&apikey=${apiKey}`;
  
  https.get(url, (response) => {
    let data = '';
    
    response.on('data', (chunk) => {
      data += chunk;
    });
    
    response.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        
        // Check for errors
        if (jsonData['Error Message']) {
          return res.status(404).json({ error: 'Symbol not found' });
        }
        
        if (jsonData['Note']) {
          return res.status(429).json({ error: 'API rate limit reached. Please try again in 1 minute.' });
        }
        
        const timeSeries = jsonData['Time Series (Daily)'];
        
        if (!timeSeries) {
          return res.status(500).json({ error: 'No data returned' });
        }
        
        // Filter by date range if provided
        let filteredData = {};
        
        for (let date in timeSeries) {
          const inRange = (!from || date >= from) && (!to || date <= to);
          if (inRange) {
            filteredData[date] = {
              date: date,
              open: parseFloat(timeSeries[date]['1. open']),
              high: parseFloat(timeSeries[date]['2. high']),
              low: parseFloat(timeSeries[date]['3. low']),
              close: parseFloat(timeSeries[date]['4. close']),
              volume: parseInt(timeSeries[date]['5. volume'])
            };
          }
        }
        
        res.status(200).json({
          symbol: symbol,
          data: filteredData
        });
        
      } catch (error) {
        console.error('Parse error:', error);
        res.status(500).json({ error: 'Failed to parse data' });
      }
    });
  }).on('error', (error) => {
    console.error('Request error:', error);
    res.status(500).json({ error: 'Request failed' });
  });
};
