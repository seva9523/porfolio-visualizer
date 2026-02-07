const https = require('https');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }
  
  const apiKey = process.env.FINNHUB_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }
  
  const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${apiKey}`;
  
  https.get(url, (response) => {
    let data = '';
    
    response.on('data', (chunk) => {
      data += chunk;
    });
    
    response.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        res.status(200).json(jsonData);
      } catch (error) {
        res.status(500).json({ error: 'Parse error' });
      }
    });
  }).on('error', (error) => {
    console.error('Request error:', error);
    res.status(500).json({ error: 'Request failed' });
  });
};
