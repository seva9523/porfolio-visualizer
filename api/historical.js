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
  
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'YHDG7S07STQI9RPC';
  
  // ALWAYS use full outputsize to get all historical data
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=full&apikey=${apiKey}`;
  
  console.log(`Fetching ${symbol} from Alpha Vantage (full history)`);
  
  https.get(url, (response) => {
    let data = '';
    
    response.on('data', (chunk) => {
      data += chunk;
    });
    
    response.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        
        // Check for rate limit
        if (jsonData['Information']) {
          console.error('Alpha Vantage rate limit');
          return res.status(429).json({ 
            error: 'Rate limit reached',
            details: 'API call frequency limit reached. Data will be cached once fetched.'
          });
        }
        
        // Check for error
        if (jsonData['Error Message']) {
          console.error('Alpha Vantage error:', jsonData['Error Message']);
          return res.status(404).json({ 
            error: 'Invalid symbol',
            details: jsonData['Error Message']
          });
        }
        
        const timeSeries = jsonData['Time Series (Daily)'];
        
        if (!timeSeries) {
          console.error('No time series data');
          return res.status(404).json({ 
            error: 'No data available',
            details: 'No historical data found'
          });
        }
        
        // Convert to our format and filter by date range
        const formattedData = {};
        const allDates = Object.keys(timeSeries);
        
        allDates.forEach(date => {
          // Apply date filter if provided
          if (from && date < from) return;
          if (to && date > to) return;
          
          const dayData = timeSeries[date];
          formattedData[date] = {
            date: date,
            open: parseFloat(dayData['1. open']),
            high: parseFloat(dayData['2. high']),
            low: parseFloat(dayData['3. low']),
            close: parseFloat(dayData['4. close']),
            volume: parseInt(dayData['5. volume'])
          };
        });
        
        console.log(`Returning ${Object.keys(formattedData).length} dates for ${symbol}`);
        
        const responseData = {
          symbol: symbol,
          data: formattedData,
          totalDates: allDates.length,
          filteredDates: Object.keys(formattedData).length,
          cached: false,
          source: 'alphavantage'
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
