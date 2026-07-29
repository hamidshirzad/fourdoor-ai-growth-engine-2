# Fourdoor AI - Quick Start Guide

## 🎯 What You're Getting

A production-ready SaaS platform with:
- ✅ AI-powered content generation (OpenAI GPT-4)
- ✅ Auto-scheduling and distribution
- ✅ Lead qualification and scoring
- ✅ Analytics dashboard with AI suggestions
- ✅ PayPal billing integration (3 tiers)
- ✅ Fully functional API + Frontend
- ✅ Database with 7 optimized tables
- ✅ JWT authentication
- ✅ Docker deployment ready

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
cd fourdoor-ai-growth-engine
chmod +x setup.sh
./setup.sh
```

### Step 2: Configure Environment
```bash
# Create .env file
cp .env.example .env

# Edit with your credentials:
# - OPENAI_API_KEY (from OpenAI dashboard)
# - PAYPAL_CLIENT_ID (from PayPal developer)
# - PAYPAL_CLIENT_SECRET (from PayPal developer)
# - JWT_SECRET (generate random: openssl rand -hex 16)
```

### Step 3: Start Local Server
```bash
# Terminal 1 - Start backend
cd backend
npm run migrate      # Create database tables
npm run seed        # Add demo user
npm run dev         # Start server on :5000

# Terminal 2 - Start frontend
cd frontend
npm run dev         # Start Next.js on :3000
```

### Step 4: Access the App
```
Frontend: http://localhost:3000
Backend API: http://localhost:5000/api
```

### Step 5: Demo Login
```
Email: demo@fourdoor.ai
Password: demo@password123
```

## 📱 Key Features to Try

### 1. Content Generation
1. Go to `/onboarding` (auto-redirected on signup)
2. Enter niche, audience, and goal
3. AI generates 3 posts (LinkedIn, X, Instagram)
4. View in `/content` page

### 2. Lead Management
1. Go to `/leads`
2. Add leads manually or bulk upload CSV
3. AI scores each lead (0-100)
4. Send personalized messages

### 3. Analytics
1. View `/analytics` dashboard
2. See engagement rate, CTR, conversion rate
3. Get AI-powered suggestions for improvement

### 4. Billing
1. Go to `/settings`
2. Choose plan (Starter €29, Pro €79, Agency €199)
3. PayPal checkout (sandbox mode in development)

## 🐳 Docker Deployment (Single Command)

```bash
docker-compose up --build
```

This starts:
- PostgreSQL database on :5432
- Backend API on :5000
- Frontend on :3000

## 📊 API Examples

### Generate Content
```bash
curl -X POST http://localhost:5000/api/content/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "niche": "SaaS",
    "audience": "Startup founders",
    "goal": "Generate leads for my product"
  }'
```

### Create Lead
```bash
curl -X POST http://localhost:5000/api/leads/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "message": "I need help with marketing"
  }'
```

### Get Analytics
```bash
curl http://localhost:5000/api/analytics/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔑 Key Credentials to Set Up

1. **OpenAI API Key**
   - Go to https://platform.openai.com/api-keys
   - Create new secret key
   - Add to `.env` as `OPENAI_API_KEY`

2. **PayPal Sandbox Credentials**
   - Go to https://developer.paypal.com
   - Create sandbox app
   - Get Client ID and Secret
   - Add to `.env` as `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`

3. **JWT Secret**
   - Generate: `openssl rand -hex 16`
   - Add to `.env` as `JWT_SECRET`

## 📁 Project Structure

```
fourdoor-ai-growth-engine/
├── backend/                    # Node.js API
│   ├── src/
│   │   ├── services/          # Business logic (AI, billing, etc.)
│   │   ├── routes/            # API endpoints
│   │   ├── middleware/        # Auth, CORS, etc.
│   │   ├── db/                # Database migrations & seed
│   │   └── index.js           # Express app
│   └── package.json
├── frontend/                   # Next.js app
│   ├── pages/                 # Routes (login, dashboard, etc.)
│   ├── components/            # Reusable UI components
│   ├── lib/                   # API client & Zustand store
│   └── package.json
├── docker-compose.yml         # Docker services
├── .env.example              # Environment template
├── README.md                 # Full documentation
├── DEPLOYMENT.md             # Production deployment guide
└── ARCHITECTURE.md           # System design details
```

## 🎓 Core Concepts

### Authentication
- User signs up → hashed password stored
- Login generates JWT token (7-day expiry)
- All protected endpoints require token in header:
  ```
  Authorization: Bearer eyJhbGciOi...
  ```

### Content Generation
- User inputs niche, audience, goal
- Backend calls OpenAI GPT-4 API
- Gets back: caption, hashtags, CTA
- Saves to database in draft status
- User can schedule or edit

### Lead Qualification
- Lead message arrives (manual, DM, form, etc.)
- AI analyzes message and scores it
- Score > 70 = automatically qualified
- System suggests next actions

### Analytics
- System calculates: engagement rate, CTR, conversion rate
- Tracks: total posts, leads, booked calls
- AI provides suggestions based on metrics
- Updates daily via scheduler

## ⚙️ How It Works End-to-End

1. **User signs up** → Account created, plan = "starter"
2. **Onboarding** → User defines niche, audience, goal
3. **Content generated** → AI creates 3 posts for platforms
4. **Posts scheduled** → User picks date/time for auto-posting
5. **Leads arrive** → Via form, DM, import, etc.
6. **AI qualifies** → Scores lead based on message
7. **Analytics tracked** → Engagement, conversions, performance
8. **Insights provided** → AI suggests improvements
9. **User upgrades** → Pays via PayPal, features unlock
10. **Growth repeats** → Content → Leads → Sales → Repeat

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check database
psql -h localhost -U postgres -d fourdoor_ai

# Run migrations
cd backend && npm run migrate

# Check ports
lsof -i :5000
```

### Can't login
```bash
# Verify demo user exists
psql -h localhost -U postgres -d fourdoor_ai
SELECT * FROM users WHERE email = 'demo@fourdoor.ai';

# Recreate if needed
cd backend && npm run seed
```

### API errors
```bash
# Check logs
cd backend && npm run dev  # See console output

# Verify OpenAI key
echo $OPENAI_API_KEY
```

## 📞 Next Steps

1. **Customize**: Edit brand colors, text, features
2. **Connect APIs**: Link to Instagram, LinkedIn, X
3. **Add storage**: S3/CDN for media uploads
4. **Scale database**: Move to Supabase/AWS RDS
5. **Deploy**: Use docker-compose or deploy to Railway/Vercel

---

**You now have a fully functional AI marketing SaaS!** 🎉

Questions? Check ARCHITECTURE.md for deep dive into system design.
