# 🎯 START HERE - Fourdoor AI Growth Engine

## What You Have

A complete, production-ready SaaS platform that:
- Generates AI content daily
- Qualifies leads automatically  
- Tracks analytics in real-time
- Handles PayPal billing
- Has a full-featured dashboard

**Total build:** 50 files, 7,400+ lines, ready to deploy.

---

## 🚀 Option 1: Docker (Easiest - 1 Command)

```bash
docker-compose up --build
```

Then visit:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Database: PostgreSQL on :5432

Demo login:
```
Email: demo@fourdoor.ai
Password: demo@password123
```

---

## 🔧 Option 2: Local Development (5 Minutes)

### Prerequisites
- Node.js 18+
- PostgreSQL 15+

### Step 1: Install & Setup
```bash
./setup.sh
```

### Step 2: Configure Credentials
```bash
# Edit .env file with:
# - OPENAI_API_KEY (from OpenAI)
# - PAYPAL_CLIENT_ID (from PayPal developer)
# - PAYPAL_CLIENT_SECRET (from PayPal developer)
# - JWT_SECRET (random string)
```

### Step 3: Initialize Database
```bash
cd backend
npm run migrate      # Create tables
npm run seed        # Add demo user
```

### Step 4: Start Services
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

### Step 5: Access App
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

---

## 🧪 Try These Features

### 1. Generate Content (30 seconds)
1. Go to http://localhost:3000/onboarding
2. Fill in: SaaS, Startup founders, Lead generation
3. Click "Generate Content"
4. See 3 AI-generated posts

### 2. Create Leads (1 minute)
1. Go to /leads
2. Add lead: Name "John Doe", Email "john@example.com"
3. Watch AI score it automatically
4. See recommended actions

### 3. Check Analytics (1 minute)
1. Go to /analytics
2. See KPIs: Engagement rate, CTR, conversion rate
3. Get AI suggestions for improvement
4. See all metrics in one place

### 4. Explore Dashboard (1 minute)
1. Go to /dashboard
2. See overview of all metrics
3. Check recent activities
4. Review AI suggestions

---

## 📊 API Quick Test

### Generate Content
```bash
TOKEN="your-jwt-token-from-login"

curl -X POST http://localhost:5000/api/content/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "niche": "SaaS",
    "audience": "CTOs",
    "goal": "Increase MRR"
  }'
```

### Create Lead
```bash
curl -X POST http://localhost:5000/api/leads/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@company.com",
    "message": "Looking for marketing automation"
  }'
```

### Get Analytics
```bash
curl http://localhost:5000/api/analytics/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📁 Project Structure

```
fourdoor-ai-growth-engine/
├── backend/              # Node.js + Express API
│   ├── src/
│   │   ├── services/    # Business logic (AI, billing, etc.)
│   │   ├── routes/      # API endpoints (23 total)
│   │   └── db/          # Database migrations
│   └── package.json
├── frontend/            # Next.js + React UI
│   ├── pages/           # 9 pages (login, dashboard, etc.)
│   ├── components/      # Reusable components
│   ├── lib/             # API client + state management
│   └── package.json
├── docker-compose.yml   # Docker setup
├── .env.example         # Environment template
└── README.md            # Full documentation
```

---

## 🔑 Required Credentials

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Add to `.env` as `OPENAI_API_KEY=sk-...`

### PayPal Sandbox
1. Go to https://developer.paypal.com
2. Create sandbox app
3. Add to `.env`:
   ```
   PAYPAL_CLIENT_ID=your_id
   PAYPAL_CLIENT_SECRET=your_secret
   ```

### JWT Secret
```bash
# Generate random secret
openssl rand -hex 16
```

Add to `.env` as `JWT_SECRET=...`

---

## 🔄 Core Workflows

### Content Generation Flow
```
User sets niche/audience/goal 
→ AI generates content via OpenAI 
→ Saved to database 
→ User schedules post
→ Automation posts at scheduled time
```

### Lead Qualification Flow
```
Lead enters system (manual/DM/form)
→ AI analyzes message
→ Score assigned (0-100)
→ Score > 70 = auto-qualified
→ System recommends next action
```

### Billing Flow
```
User selects plan
→ PayPal payment processed
→ Webhook confirms payment
→ Subscription activated
→ Features unlocked based on plan
```

---

## 📞 Troubleshooting

### "Can't connect to database"
```bash
# Check PostgreSQL running
psql -h localhost -U postgres

# Or use Docker
docker-compose up postgres
```

### "Module not found errors"
```bash
# Reinstall dependencies
cd backend && npm install
cd ../frontend && npm install
```

### "OpenAI API error"
```bash
# Verify API key
echo $OPENAI_API_KEY

# Update in .env if needed
```

### "Port already in use"
```bash
# Change ports in .env or docker-compose.yml
# Or kill processes:
lsof -i :5000  # Check backend
lsof -i :3000  # Check frontend
```

---

## 🌐 Deployment (30 minutes)

### Option A: Docker Compose (Single Server)
```bash
docker-compose up -d
# Everything runs on your server
```

### Option B: Cloud Services (Recommended)

**Frontend → Vercel**
- Connect GitHub repo
- Auto-deploys on push
- Free tier included

**Backend → Railway**
- Connect GitHub repo
- Set env variables
- Auto-scales

**Database → Supabase**
- PostgreSQL managed
- Automatic backups
- Connection pooling

See DEPLOYMENT.md for full guide.

---

## 🎯 Success Checklist

- [ ] Run `./setup.sh` or `docker-compose up`
- [ ] Login with demo@fourdoor.ai / demo@password123
- [ ] Generate content (see 3 AI posts)
- [ ] Create a test lead (auto-scored)
- [ ] Check analytics dashboard
- [ ] Explore all 9 pages
- [ ] Try API endpoints
- [ ] Read ARCHITECTURE.md for deep dive
- [ ] Deploy to production
- [ ] Customize brand colors/text

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| README.md | Project overview |
| QUICKSTART.md | 5-minute setup |
| DEPLOYMENT.md | Production guide |
| ARCHITECTURE.md | System design |
| BUILD_SUMMARY.md | What's included |
| PROJECT_MANIFEST.md | File listing |
| START_HERE.md | This file |

---

## ⚡ Key Stats

- **50 files** total
- **7,400+ lines** of code
- **23 API endpoints**
- **7 database tables**
- **9 frontend pages**
- **4 AI agents**
- **3 billing tiers**
- **2 integrations** (OpenAI + PayPal)

---

## 🎉 You're Ready!

You have a complete, working SaaS platform:

✅ AI generates content
✅ Leads auto-qualified
✅ Analytics tracked
✅ Payments processed
✅ Dashboard functional
✅ API ready
✅ Fully documented
✅ Production deployable

**Start with Docker command above, then explore the app!**

Questions? See README.md or ARCHITECTURE.md.

---

**Happy coding! 🚀**
