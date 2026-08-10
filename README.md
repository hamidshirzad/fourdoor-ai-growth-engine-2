# Fourdoor AI Growth Engine

Fourdoor AI Growth Engine is a production-oriented SaaS MVP for autonomous marketing and lead generation. It generates social content, schedules distribution, replies to inbound intent, qualifies leads, drafts outreach, routes hot prospects to Calendly, tracks analytics, and manages PayPal subscriptions.

## Stack

- Frontend: Next.js, React, TailwindCSS, Zustand, Recharts
- Backend: Node.js, Express, PostgreSQL
- AI: OpenAI Responses API with structured JSON outputs
- Automation: internal cron scheduler for daily content, publishing, and optimization
- Billing: Stripe Checkout and Billing Portal, plus PayPal subscriptions, with verified webhooks
- Deployment: Vercel frontend, Railway/Render backend, Supabase or managed PostgreSQL

## Quick Start

```bash
cd ~/fourdoor-ai-growth-engine

cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

cd backend
npm install
npm run migrate
npm run seed
npm run dev

cd ../frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

Demo login after seeding:

```text
demo@fourdoor.ai
demo@password123
```

## Core API

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/profile`
- `POST /api/content/generate`
- `POST /api/content/schedule`
- `POST /api/leads/engage`
- `POST /api/leads/qualify`
- `POST /api/billing/subscribe`
- `POST /api/billing/portal`
- `POST /api/billing/stripe/webhook`
- `POST /api/billing/webhook`
- `GET /api/analytics`

Brief-compatible aliases are also available:

- `POST /generate-content`
- `POST /schedule-post`
- `POST /engage`
- `POST /qualify-lead`
- `GET /analytics`

## Dashboard Modules

- Content Calendar
- Analytics Dashboard
- Lead Inbox
- Outreach Dashboard
- Billing Page
- Settings Page
- Agent Activity Logs
- Onboarding funnel with instant first-post generation

## Production Notes

External actions are implemented against real provider APIs, but require credentials and provider-side setup:

- OpenAI API key for live model output
- Stripe secret key, recurring Price IDs, webhook signing secret, and an enabled Billing Portal
- PayPal product plan IDs and webhook ID when PayPal fallback is required
- Calendly booking URL and optional API token
- LinkedIn, X, and Instagram access tokens for distribution

See [DEPLOYMENT.md](/Users/hamidshirzad/fourdoor-ai-growth-engine/DEPLOYMENT.md) for full environment and hosting instructions.
