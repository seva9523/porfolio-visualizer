module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }
  
  const apiKey = process.env.FINNHUB_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }
  
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Failed to search securities' });
  }
};
```

4. Click **"Commit changes"**

---

### **Step 3: Verify vercel.json is deleted**

1. Go to: https://github.com/seva9523/porfolio-visualizer
2. **Make sure there is NO `vercel.json` file**
3. If you see it, **delete it**

---

### **Step 4: Wait for Deployment**

1. Go to Vercel dashboard → Deployments
2. Wait for the new deployment to finish (~1 minute)
3. Check if it says "Ready" with green checkmark

---

### **Step 5: Check Deployment Summary**

1. Click on the latest "Ready" deployment
2. Click **"Deployment Summary"**
3. **You should NOW see:**
   - ✅ **Serverless Functions** (not just "Static Assets")
   - ✅ `api/search` listed

---

### **Step 6: Test**

Open in a new incognito window:
```
https://porfolio-visualizer-taca.vercel.app/api/search?q=AAPL
