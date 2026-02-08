const https = require('https');
const fs = require('fs');
const path = require('path');

// In-memory cache (persists during function warm starts)
const cache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Pre-loaded stocks list
const PRELOADED_STOCKS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'BRK_B', 'JPM', 'V', 'JNJ', 'WMT', 'PG', 'MA', 'DIS', 'PYPL', 'ADBE', 'CRM', 'INTC'];

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

function loadPreloadedData(symbol, from, to) {
  try {
    const filename = symbol.replace('.', '_');
    const filepath = path.join(__dirname, 'data', `${filename}.json`);
    
    if (!fs.existsSync(filepath)) {
      return null;
    }
    
    const fileData = fs.readFileSync(filepath, 'utf8');
    const stockData = JSON.parse(fileData);
    
    // Filter by date range
    const filteredData = {};
    for (let date in stockData.data) {
      const inRange = (!from || date >= from) && (!to || date <= to);
      if (inRange) {
        filteredData[date] = stockData.data[date];
      }
    }
    
    return {
      symbol: symbol,
      data: filteredData,
      totalDates: Object.keys(stockData.data).length,
      filteredDates: Object.keys(filteredData).length,
      cached: true,
      source: 'preloaded'
    };
  } catch (error) {
    console.error(`Error loading preloaded data for ${symbol}:`, error.message);
    return null;
  }
}

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
  
  // 1. Check preloaded data first (fastest)
  const preloadedData = loadPreloadedData(symbol, from, to);
  if (preloadedData) {
    console.log(`✓ PRELOADED data for ${symbol} (${preloadedData.filteredDates} dates)`);
    return res.status(200).json(preloadedData);
  }
  
  // 2. Check in-memory cache
  const cacheKey = getCacheKey(symbol, from || '', to || '');
  const cachedData = getFromCache(cacheKey);
  
  if (cachedData) {
    console.log(`Cache HIT for ${symbol} (serving from memory)`);
    return res.status(200).json(cachedData);
  }
  
  console.log(`Cache MISS for ${symbol} (fetching from Yahoo Finance)`);
  
  // Convert dates to Unix timestamps
  const fromDate = from ? new Date(from).getTime() / 1000 : Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60);
  const toDate = to ? new Date(to).getTime() / 1000 : Math.floor(Date.now() / 1000);
  
  // Yahoo Finance API endpoint
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${Math.floor(fromDate)}&period2=${Math.floor(toDate)}&interval=1d`;
  
  console.log('Fetching from Yahoo Finance');
  
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
              details: 'Rate limited by Yahoo Finance. Using cached data if available.' 
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
        
        const responseData = {
          symbol: symbol,
          data: formattedData,
          totalDates: timestamps.length,
          filteredDates: Object.keys(formattedData).length,
          cached: false
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
