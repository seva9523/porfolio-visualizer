const https = require('https');

// In-memory cache (persists during function warm starts)
const cache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(symbol, from, to) {
  return `${symbol}_${from}_${to}`;
}

function getFromCache(key) {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const age = Date.now() - cached.timestamp;
  if (age > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

function saveToCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { symbol, from, to } = req.query;
  
  console.log('Twelve Data API called:', { symbol, from, to });
  
  if (!symbol) {
    return res.status(400).json({ error: 'Missing symbol parameter' });
  }
  
  // Check cache first
  const cacheKey = getCacheKey(symbol, from || '', to || '');
  const cachedData = getFromCache(cacheKey);
  
  if (cachedData) {
    console.log(`Cache HIT for ${symbol}`);
    return res.status(200).json(cachedData);
  }
  
  console.log(`Cache MISS for ${symbol} - fetching from Twelve Data`);
  
  // Twelve Data API - free tier: 800 requests/day
  const apiKey = 'f15e001ae049463384e462fa2906d8ff';
  
  // Calculate date range
  const today = new Date().toISOString().split('T')[0];
  const fromDate = from || new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const toDate = to || today;
  
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&start_date=${fromDate}&end_date=${toDate}&apikey=${apiKey}&format=JSON`;
  
  console.log('Fetching from Twelve Data');
  
  https.get(url, (response) => {
    let data = '';
    
    response.on('data', (chunk) => {
      data += chunk;
    });
    
    response.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        
        console.log('Twelve Data response received');
        
        // Check for errors
        if (jsonData.status === 'error') {
          console.error('Twelve Data error:', jsonData.message);
          return res.status(400).json({ 
            error: jsonData.message,
            details: 'API returned an error'
          });
        }
        
        if (!jsonData.values || jsonData.values.length === 0) {
          console.error('No data returned from Twelve Data');
          return res.status(404).json({ 
            error: 'No data available',
            details: 'No historical data found for this symbol and date range'
          });
        }
        
        // Convert Twelve Data format to our format
        const formattedData = {};
        
        jsonData.values.forEach(item => {
          const date = item.datetime.split(' ')[0]; // Extract date part
          
          formattedData[date] = {
            date: date,
            open: parseFloat(item.open) || 0,
            high: parseFloat(item.high) || 0,
            low: parseFloat(item.low) || 0,
            close: parseFloat(item.close) || 0,
            volume: parseInt(item.volume) || 0
          };
        });
        
        console.log(`Returning ${Object.keys(formattedData).length} data points for ${symbol}`);
        
        const responseData = {
          symbol: symbol,
          data: formattedData,
          totalDates: jsonData.values.length,
          filteredDates: Object.keys(formattedData).length,
          cached: false,
          source: 'twelvedata'
        };
        
        // Save to cache
        saveToCache(cacheKey, responseData);
        console.log(`Saved ${symbol} to cache`);
        
        res.status(200).json(responseData);
        
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
