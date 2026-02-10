// Polygon.io API v2.0 - Free tier with 2 years of historical data
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
    console.log(`✅ Cache HIT for ${symbol}`);
    return res.status(200).json(cachedData);
  }
  
  console.log(`⏳ Cache MISS for ${symbol} - fetching from Polygon.io`);
  
  // TEMPORARY: Hardcode your Polygon API key here for testing
  // Replace YOUR_POLYGON_KEY with your actual key from polygon.io
  const apiKey = process.env.POLYGON_API_KEY || 'uw2CD11Ybqs2hjGvP9B_yRai40Up9e_R';
  
  // Calculate date range (default to 2 years if not specified)
  const today = new Date().toISOString().split('T')[0];
  const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const fromDate = from || twoYearsAgo;
  const toDate = to || today;
  
  // Polygon.io aggregates endpoint (bars)
  const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=asc&apiKey=${apiKey}`;
  
  console.log(`📊 Fetching ${symbol} from Polygon.io (${fromDate} to ${toDate})`);
  
  https.get(url, (response) => {
    let data = '';
    
    response.on('data', (chunk) => {
      data += chunk;
    });
    
    response.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        
        console.log('Polygon.io response status:', jsonData.status);
        
        // Check for errors
        if (jsonData.status === 'ERROR') {
          console.error('❌ Polygon.io error:', jsonData.error);
          return res.status(400).json({ 
            error: 'API error',
            details: jsonData.error || 'Failed to fetch data from Polygon.io'
          });
        }
        
        if (jsonData.status === 'NOT_AUTHORIZED') {
          console.error('❌ Polygon.io: Not authorized');
          return res.status(401).json({ 
            error: 'Not authorized',
            details: 'Invalid API key or not authorized for this endpoint'
          });
        }
        
        if (!jsonData.results || jsonData.results.length === 0) {
          console.error('❌ No data returned from Polygon.io');
          return res.status(404).json({ 
            error: 'No data available',
            details: 'No historical data found for this symbol and date range'
          });
        }
        
        // Convert Polygon.io format to our format
        const formattedData = {};
        
        jsonData.results.forEach(bar => {
          // Polygon returns timestamp in milliseconds
          const date = new Date(bar.t).toISOString().split('T')[0];
          
          formattedData[date] = {
            date: date,
            open: bar.o || 0,
            high: bar.h || 0,
            low: bar.l || 0,
            close: bar.c || 0,
            volume: bar.v || 0
          };
        });
        
        console.log(`✅ Returning ${Object.keys(formattedData).length} dates for ${symbol}`);
        
        const responseData = {
          symbol: symbol,
          data: formattedData,
          totalDates: jsonData.results.length,
          filteredDates: Object.keys(formattedData).length,
          cached: false,
          source: 'polygon'
        };
        
        // Save to cache
        saveToCache(cacheKey, responseData);
        console.log(`💾 Cached ${symbol} - will be instant next time!`);
        
        res.status(200).json(responseData);
        
      } catch (error) {
        console.error('❌ Parse error:', error.message);
        res.status(500).json({ 
          error: 'Failed to parse data', 
          details: error.message 
        });
      }
    });
  }).on('error', (error) => {
    console.error('❌ Request error:', error.message);
    res.status(500).json({ 
      error: 'Request failed', 
      details: error.message 
    });
  });
};
