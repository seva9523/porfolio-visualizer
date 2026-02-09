// Finnhub API - updated
const https = require('https');

// In-memory cache
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
  
  const apiKey = process.env.FINNHUB_API_KEY || 'cteder1r01qr14rsde8gcteder1r01qr14rsde90';
  
  // Finnhub uses Unix timestamps
  const today = Math.floor(Date.now() / 1000);
  const fromTimestamp = from ? Math.floor(new Date(from).getTime() / 1000) : today - (5 * 365 * 24 * 60 * 60);
  const toTimestamp = to ? Math.floor(new Date(to).getTime() / 1000) : today;
  
  // Finnhub stock candles endpoint
  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${fromTimestamp}&to=${toTimestamp}&token=${apiKey}`;
  
  console.log(`Fetching ${symbol} from Finnhub (${from || '5y ago'} to ${to || 'today'})`);
  
  https.get(url, (response) => {
    let data = '';
    
    response.on('data', (chunk) => {
      data += chunk;
    });
    
    response.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        
        // Check for errors
        if (jsonData.s === 'no_data') {
          console.error('Finnhub: No data available');
          return res.status(404).json({ 
            error: 'No data available',
            details: 'No historical data found for this symbol and date range'
          });
        }
        
        if (jsonData.s !== 'ok') {
          console.error('Finnhub error:', jsonData);
          return res.status(400).json({ 
            error: 'API error',
            details: 'Failed to fetch data from Finnhub'
          });
        }
        
        if (!jsonData.t || jsonData.t.length === 0) {
          console.error('Finnhub: Empty response');
          return res.status(404).json({ 
            error: 'No data available',
            details: 'Empty data returned'
          });
        }
        
        // Convert Finnhub format to our format
        const formattedData = {};
        
        for (let i = 0; i < jsonData.t.length; i++) {
          const date = new Date(jsonData.t[i] * 1000).toISOString().split('T')[0];
          
          formattedData[date] = {
            date: date,
            open: jsonData.o[i] || 0,
            high: jsonData.h[i] || 0,
            low: jsonData.l[i] || 0,
            close: jsonData.c[i] || 0,
            volume: jsonData.v[i] || 0
          };
        }
        
        console.log(`Returning ${Object.keys(formattedData).length} dates for ${symbol}`);
        
        const responseData = {
          symbol: symbol,
          data: formattedData,
          totalDates: jsonData.t.length,
          filteredDates: Object.keys(formattedData).length,
          cached: false,
          source: 'finnhub'
        };
        
        // Save to cache
        saveToCache(cacheKey, responseData);
        console.log(`Cached ${symbol}`);
        
        res.status(200).json(responseData);
        
      } catch (error) {
        console.error('Parse error:', error.message);
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
