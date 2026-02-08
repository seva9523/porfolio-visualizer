const https = require('https');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { symbol, from, to } = req.query;
  
  console.log('Historical API called:', { symbol, from, to });
  
  if (!symbol) {
    return res.status(400).json({ error: 'Missing symbol parameter' });
  }
  
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  
  if (!apiKey) {
    console.error('Alpha Vantage API key not configured');
    return res.status(500).json({ error: 'Alpha Vantage API key not configured' });
  }
  
  // Always use full outputsize when date parameters are provided
  // Compact only gives ~100 recent days, full gives 20+ years
  const outputSize = (from || to) ? 'full' : 'compact';
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=${outputSize}&apikey=${apiKey}`;
  
  console.log('Fetching from Alpha Vantage with outputsize:', outputSize, 'for date range:', from, 'to', to);
  
  https.get(url, (response) => {
    let data = '';
    
    response.on('data', (chunk) => {
      data += chunk;
    });
    
    response.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        
        // Log the response structure (without full data)
        console.log('Response keys:', Object.keys(jsonData));
        
        // Check for errors
        if (jsonData['Error Message']) {
          console.error('Alpha Vantage error:', jsonData['Error Message']);
          return res.status(404).json({ error: 'Symbol not found', details: jsonData['Error Message'] });
        }
        
        if (jsonData['Note']) {
          console.error('Alpha Vantage rate limit:', jsonData['Note']);
          return res.status(429).json({ error: 'API rate limit reached. Please try again in 1 minute.', details: jsonData['Note'] });
        }
        
        if (jsonData['Information']) {
          console.error('Alpha Vantage info message:', jsonData['Information']);
          return res.status(429).json({ error: 'API call frequency limit', details: jsonData['Information'] });
        }
        
        const timeSeries = jsonData['Time Series (Daily)'];
        
        if (!timeSeries) {
          console.error('No time series data in response. Keys:', Object.keys(jsonData));
          return res.status(500).json({ 
            error: 'No data returned', 
            details: 'Time Series (Daily) not found in response',
            availableKeys: Object.keys(jsonData)
          });
        }
        
        console.log('Time series data found with', Object.keys(timeSeries).length, 'dates');
        
        // Filter by date range if provided
        let filteredData = {};
        let count = 0;
        
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
            count++;
          }
        }
        
        console.log(`Returning ${count} data points for ${symbol} (filtered from ${Object.keys(timeSeries).length})`);
        
        if (count === 0) {
          console.warn('No data points match the date range', { from, to });
        }
        
        res.status(200).json({
          symbol: symbol,
          data: filteredData,
          totalDates: Object.keys(timeSeries).length,
          filteredDates: count
        });
        
      } catch (error) {
        console.error('Parse error:', error.message);
        console.error('Stack:', error.stack);
        console.error('Raw data sample:', data.substring(0, 500));
        res.status(500).json({ error: 'Failed to parse data', details: error.message });
      }
    });
  }).on('error', (error) => {
    console.error('Request error:', error.message);
    res.status(500).json({ error: 'Request failed', details: error.message });
  });
};
