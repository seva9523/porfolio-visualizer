const https = require('https');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { symbol, from, to } = req.query;
  
  console.log('Yahoo Finance API called:', { symbol, from, to });
  
  if (!symbol) {
    return res.status(400).json({ error: 'Missing symbol parameter' });
  }
  
  // Convert dates to Unix timestamps
  const fromDate = from ? new Date(from).getTime() / 1000 : Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60);
  const toDate = to ? new Date(to).getTime() / 1000 : Math.floor(Date.now() / 1000);
  
  // Yahoo Finance API endpoint
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${Math.floor(fromDate)}&period2=${Math.floor(toDate)}&interval=1d`;
  
  console.log('Fetching from Yahoo Finance:', url);
  
  https.get(url, (response) => {
    let data = '';
    
    response.on('data', (chunk) => {
      data += chunk;
    });
    
    response.on('end', () => {
      try {
        // Check if response is actually JSON
        if (!data.startsWith('{') && !data.startsWith('[')) {
          console.error('Non-JSON response received:', data.substring(0, 200));
          
          // Check for rate limiting messages
          if (data.includes('Too Many Requests') || data.includes('429')) {
            return res.status(429).json({ 
              error: 'Too many requests', 
              details: 'Rate limited by Yahoo Finance. Please wait a minute and try again.' 
            });
          }
          
          return res.status(500).json({ 
            error: 'Invalid response from Yahoo Finance', 
            details: data.substring(0, 200) 
          });
        }
        
        const jsonData = JSON.parse(data);
        
        console.log('Yahoo Finance response received');
        
        // Check for errors
        if (jsonData.chart && jsonData.chart.error) {
          console.error('Yahoo Finance error:', jsonData.chart.error);
          return res.status(404).json({ 
            error: 'Symbol not found or invalid', 
            details: jsonData.chart.error.description 
          });
        }
        
        if (!jsonData.chart || !jsonData.chart.result || jsonData.chart.result.length === 0) {
          console.error('No chart data in response');
          return res.status(500).json({ 
            error: 'No data returned',
            details: 'Chart data not found in response'
          });
        }
        
        const result = jsonData.chart.result[0];
        const timestamps = result.timestamp || [];
        const quotes = result.indicators.quote[0];
        
        if (!quotes) {
          console.error('No quote data found');
          return res.status(500).json({ error: 'No quote data available' });
        }
        
        // Convert to our expected format
        const formattedData = {};
        
        timestamps.forEach((timestamp, index) => {
          const date = new Date(timestamp * 1000).toISOString().split('T')[0];
          
          // Only include if we have valid close price
          if (quotes.close[index] !== null) {
            formattedData[date] = {
              date: date,
              open: quotes.open[index] || 0,
              high: quotes.high[index] || 0,
              low: quotes.low[index] || 0,
              close: quotes.close[index],
              volume: quotes.volume[index] || 0
            };
          }
        });
        
        console.log(`Returning ${Object.keys(formattedData).length} data points for ${symbol}`);
        
        res.status(200).json({
          symbol: symbol,
          data: formattedData,
          totalDates: timestamps.length,
          filteredDates: Object.keys(formattedData).length
        });
        
      } catch (error) {
        console.error('Parse error:', error.message);
        console.error('Raw data sample:', data.substring(0, 500));
        res.status(500).json({ 
          error: 'Failed to parse data', 
          details: error.message 
        });
      }
    });
  }).on('error', (error) => {
    console.error('Request error:', error.message);
    res.status(500).json({ 
      error: 'Request failed', 
      details: error.message 
    });
  });
};
