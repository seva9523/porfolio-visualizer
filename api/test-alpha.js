const https = require('https');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  
  // Return diagnostic info
  const diagnostics = {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiKeyPreview: apiKey ? apiKey.substring(0, 4) + '...' : 'NOT SET',
    nodeVersion: process.version,
    env: process.env.NODE_ENV || 'not set'
  };
  
  // If no API key, return early
  if (!apiKey) {
    return res.status(500).json({
      error: 'API key not configured',
      diagnostics
    });
  }
  
  // Try a simple API call
  const testSymbol = 'AAPL';
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${testSymbol}&outputsize=compact&apikey=${apiKey}`;
  
  https.get(url, (response) => {
    let data = '';
    
    response.on('data', (chunk) => {
      data += chunk;
    });
    
    response.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        
        res.status(200).json({
          success: true,
          diagnostics,
          apiResponse: {
            hasTimeSeries: !!jsonData['Time Series (Daily)'],
            hasError: !!jsonData['Error Message'],
            hasNote: !!jsonData['Note'],
            keys: Object.keys(jsonData),
            sampleData: jsonData['Note'] || jsonData['Error Message'] || 'Data retrieved successfully'
          }
        });
      } catch (error) {
        res.status(500).json({
          error: 'Parse error',
          message: error.message,
          diagnostics,
          rawDataSample: data.substring(0, 200)
        });
      }
    });
  }).on('error', (error) => {
    res.status(500).json({
      error: 'Request failed',
      message: error.message,
      diagnostics
    });
  });
};
