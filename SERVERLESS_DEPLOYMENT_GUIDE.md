# 🚀 Deploy Your Serverless Portfolio Visualizer

Your portfolio visualizer now uses a **serverless backend** - visitors can use it immediately without entering any API key!

## 📦 What You Have

1. **index.html** - Your portfolio app (frontend)
2. **api/search.js** - Serverless function (backend)
3. **vercel.json** - Deployment configuration

## ⚡ Quick Deploy (5 Minutes)

### Step 1: Get Your Finnhub API Key

1. Go to: https://finnhub.io/register
2. Sign up (free, no credit card)
3. Confirm your email
4. **Copy your API key** (looks like: `ct1abc123def456`)
5. **Save it** - you'll need it in Step 3

---

### Step 2: Upload to GitHub

**Option A: Upload via Website (Easiest)**

1. Go to https://github.com and sign up (if needed)
2. Click "+" → "New repository"
3. Name it: `portfolio-visualizer`
4. Make it **Public**
5. Click "Create repository"
6. Click "uploading an existing file"
7. **Drag all 3 files into GitHub:**
   - `index.html`
   - `vercel.json`
   - The entire `api` folder with `search.js` inside
8. Click "Commit changes"

**Option B: Use Git (Advanced)**

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/portfolio-visualizer.git
git push -u origin main
```

---

### Step 3: Deploy to Vercel

1. Go to: https://vercel.com
2. Click "Sign Up" → Choose "Continue with GitHub"
3. Authorize Vercel to access GitHub
4. Click "New Project"
5. Select your `portfolio-visualizer` repository
6. **IMPORTANT:** Before clicking Deploy, add your API key:
   - Click "Environment Variables"
   - Name: `FINNHUB_API_KEY`
   - Value: Paste your Finnhub API key from Step 1
   - Click "Add"
7. Click "Deploy"
8. Wait 30 seconds... **You're live!** 🎉

---

### Step 4: Share Your Website!

Vercel will give you a URL like:
```
https://portfolio-visualizer.vercel.app
```

**Share this URL with anyone!** They can:
- ✅ Use it immediately (no setup)
- ✅ Search all global securities
- ✅ Track their portfolio
- ✅ Access from any device

---

## 🎨 Optional: Custom Domain

Want `yourname.com` instead of `yourname.vercel.app`?

1. Buy a domain from Namecheap, GoDaddy, etc. (~$10/year)
2. In Vercel dashboard → Settings → Domains
3. Add your domain
4. Update DNS records (Vercel gives you instructions)
5. Done!

---

## 🔐 How It Works (Behind the Scenes)

**Old way (required API key):**
- User enters API key → User searches → Goes directly to Finnhub

**New way (serverless):**
- User searches → Your Vercel function → Finnhub → Back to user
- Your API key is hidden on the server
- Users never see or need the API key!

**Limits:**
- Free Finnhub: 60 API calls/minute for ALL users combined
- For most personal use, this is plenty
- If you get popular, upgrade Finnhub plan or rate-limit users

---

## 📊 Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| **Vercel Hosting** | FREE | Serverless functions included |
| **Finnhub API** | FREE | 60 calls/min free tier |
| **GitHub** | FREE | Code storage |
| **TOTAL** | **$0/month** | Zero! |

**Upgrade if needed:**
- Finnhub Premium: ~$30-90/month for more calls
- Custom domain: ~$10-15/year
- Vercel Pro: $20/month (only if you need more)

---

## 🔄 Update Your Website

Whenever you want to change something:

1. Edit the files on your computer
2. Upload to GitHub (replace the old files)
3. Vercel **automatically redeploys** in 30 seconds!

OR use git:
```bash
git add .
git commit -m "Updated design"
git push
```

---

## 🆘 Troubleshooting

### "Search temporarily unavailable"
- Check that you added `FINNHUB_API_KEY` in Vercel
- Make sure the key is correct (no extra spaces)
- Wait a few minutes after signup for API to activate

### Serverless function not working
- Make sure the `api` folder and `search.js` are uploaded correctly
- Check Vercel dashboard → Functions tab for errors
- Verify environment variable is set

### API rate limit exceeded
- Free plan: 60 searches/minute for all users
- If you exceed this, searches will fail temporarily
- Solution: Upgrade to Finnhub paid plan or implement rate limiting

### Changes not showing up
- Vercel caches aggressively - try hard refresh (Ctrl+Shift+R)
- Check Vercel dashboard to see if deployment succeeded
- May take 30-60 seconds to propagate globally

---

## 🎯 What Your Users Get

✅ **Instant access** - No setup, no API keys  
✅ **Global securities** - Millions of stocks, ETFs, funds  
✅ **Beautiful charts** - Pie charts, bar charts, tables  
✅ **Mobile friendly** - Works perfectly on phone  
✅ **Auto-save** - Portfolio data persists  
✅ **Private** - Data stays in their browser  

---

## 🔒 Security Notes

- ✅ Your API key is stored as an **environment variable** in Vercel
- ✅ It's **never** sent to users' browsers
- ✅ Users can't see or steal your key
- ✅ The serverless function runs on Vercel's servers, not in browsers
- ✅ HTTPS encryption included automatically

**Important:** Never commit your API key to GitHub! Always use Vercel environment variables.

---

## 📱 Mobile App Experience

Your site works great as a mobile app!

**iPhone:**
1. Open in Safari
2. Tap share → "Add to Home Screen"
3. Works like a native app!

**Android:**
1. Open in Chrome
2. Menu → "Add to Home Screen"
3. Launch from home screen!

---

## 🎉 You're All Set!

Your portfolio visualizer is now:
- ✅ Live on the internet
- ✅ Free to use
- ✅ No API keys needed for visitors
- ✅ Accessible globally
- ✅ Searchable with millions of securities
- ✅ Ready to share!

**Your live URL:**
```
https://portfolio-visualizer.vercel.app
(or your custom domain)
```

Share it with friends, family, or anyone who wants to track their investments! 📊

---

## 🚨 Important Reminders

1. **Never share your Finnhub API key publicly**
2. **Keep it in Vercel environment variables only**
3. **Don't commit it to GitHub**
4. **Monitor your usage** in Finnhub dashboard

If you accidentally expose your API key, regenerate it immediately in Finnhub dashboard!

---

## 💡 Pro Tips

- Monitor API usage in Finnhub dashboard
- Check Vercel analytics to see how many people use your site
- Star your GitHub repo so you don't lose it
- Back up your Finnhub API key in a password manager
- Consider adding basic analytics (Vercel Analytics is free)

---

**Need help?** Check Vercel docs at https://vercel.com/docs

Enjoy your live portfolio visualizer! 🎊
