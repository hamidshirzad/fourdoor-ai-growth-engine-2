# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fourdoor AI Growth Engine is a SaaS MVP for autonomous marketing and lead generation. It generates platform-specific social content via AI agents, qualifies inbound leads, drafts personalized outreach, routes hot prospects to Calendly, and manages subscriptions through Stripe (with legacy PayPal support).

## Repository Layout

```
fourdoor-ai-growth-engine/
├── backend/          # Node.js + Express API (ESM, runs on port 5000)
│   └── src/
│       ├── db/       # pool.js, migrations.js, seed.js
│       ├── middleware/   # auth.js (JWT + role guards)
│       ├── routes/   # one file per domain (auth, content, leads, analytics, billing, distribution, activity, upload)
│       ├── services/ # business logic (aiService, contentService, billingService, …)
│       └── utils/    # asyncHandler.js, validate.js (Zod)
└── frontend/         # Next.js 16 + React 19 + TailwindCSS (port 3000)
    ├── components/   # AppShell, Navigation, ProtectedRoute, StatCard
    ├── lib/          # api.js (fetch wrapper + token helpers), store.js (Zustand)
    └── pages/        # one file per route
```

## Development Commands

### Local Setup (first time)

```bash
cp backend/.env.example backend/.env    # fill in JWT_SECRET at minimum
cp frontend/.env.local.example frontend/.env.local

# Option A: Docker (starts postgres + backend + frontend)
docker compose up

# Option B: Manual (requires local PostgreSQL)
cd backend && npm install && npm run migrate && npm run seed && npm run dev
cd frontend && npm install && npm run dev
```

Demo login after seeding: `demo@fourdoor.ai` / `demo@password123`

### Backend

```bash
cd backend
npm run dev       # nodemon (watch mode)
npm start         # production
npm run migrate   # create/update DB schema (runs migrations.js)
npm run seed      # insert demo user + campaign
npm run check     # syntax-check key files (node --check)
```

### Frontend

```bash
cd frontend
npm run dev       # Next.js dev server (Turbopack)
npm run build     # production build
npm run lint      # ESLint via next lint
```

## Architecture

### Request Flow

All protected API calls follow this path:

1. Frontend `apiCall()` in `lib/api.js` — sends `Authorization: Bearer <token>` stored in `localStorage`
2. Express middleware `authenticateToken` in `backend/src/middleware/auth.js` — verifies JWT and attaches full `req.user` from the DB
3. Route handler validates the body with Zod via the `validate()` util and delegates to a service
4. Service calls `aiService.js` when AI output is needed, writes to PostgreSQL via `pool.js`

### AI Agents (`backend/src/services/aiService.js`)

All agents use a single `structuredResponse()` helper that calls the OpenAI **Responses API** (`openai.responses.create`) with a strict JSON schema. Every agent has a deterministic **fallback** so the app is functional without an `OPENAI_API_KEY`. The model defaults to `gpt-4o-mini` (override via `OPENAI_MODEL`).

| Agent | Function | Key Output Fields |
|---|---|---|
| `contentAgent` | Platform-specific post copy | `caption`, `hashtags`, `hook`, `cta`, `variants`, `predictedScore` |
| `engagementAgent` | Classify + reply to inbound comments | `intent`, `reply`, `shouldEscalate` |
| `salesAgent` | Score and qualify leads 0–100 | `score`, `qualified`, `intent`, `questions` |
| `analyticsAgent` | Content optimization suggestions | `insights`, `recommendations`, `nextExperiments` |
| `outreachAgent` | Personalized cold outreach copy | `subject`, `body` |

### Automated Schedulers (`backend/src/services/scheduler.js`)

Three `node-cron` jobs start on boot (unless `DISABLE_SCHEDULERS=true`):

- **9 AM daily** (`CONTENT_CRON`) — generates posts for every active campaign
- **Every 5 min** (`PUBLISH_CRON`) — publishes scheduled posts via `distributionService`
- **6 PM daily** (`OPTIMIZATION_CRON`) — runs `analyticsAgent` for every user

### Frontend State (`frontend/lib/store.js`)

Four Zustand stores manage all global state. They call `apiCall()` directly — there is no React Query or SWR layer.

- `useAuthStore` — user session; `hydrate()` restores from `localStorage` token on page load
- `useContentStore` — generated posts
- `useLeadsStore` — CRM leads
- `useSecurityStore` — security scans and vulnerability results

`ProtectedRoute` wraps every authenticated page; it calls `hydrate()` and redirects to `/login` when no token is present.

### Security Scanning (`backend/src/services/aikidoService.js`)

Aikido Security API integration scans AI-generated content and code for vulnerabilities and hardcoded secrets. The service follows the same pattern as PayPal/Calendly integrations: axios client with Bearer token auth, graceful fallback when `AIKIDO_API_KEY` is missing.

**Endpoints:**
- `POST /api/security/scan` — scan content on-demand; accepts `content` (string ≤50KB), `type` (content/code/dependency), optional `postId`, `campaignId`
- `GET /api/security/scans?limit=50&offset=0` — list user's past scans (paginated)
- `GET /api/security/scans/:id` — retrieve detailed scan result
- Brief-compatible alias: `POST /scan`

**Database Schema (`security_scans` table):**
- `id` (UUID) — primary key
- `user_id` (UUID) — scan owner
- `post_id`, `campaign_id` (nullable UUID) — if scan is linked to content
- `scanned_content` (text) — the content that was scanned
- `scan_type` (enum: content/code/dependency)
- `vulnerabilities` (JSONB) — Aikido API response with findings
- `severity_count` (JSONB) — { critical, high, medium, low } counts
- `secrets_found` (integer) — count of detected secrets
- `passed` (boolean) — true if no critical/high severity vulnerabilities
- `created_at`, `updated_at` (timestamp)

**Frontend Components:**
- `SecurityScanner` — displays scan results with severity indicators, color-coded badges, secrets warning, and vulnerability list
- `/security` page — full audit dashboard with scan history, filtering (all/with issues/critical/high), and detailed result view
- Navigation integration — Shield icon in main menu links to security page

**Integration Points:**
- Post-generation — `contentService.generateDailyContent()` calls `aikidoService.scanContent()` after generating posts
- Optional pre-publish — can block publishing if critical vulnerabilities detected (currently warns instead)
- Optional scheduled scans — can add `SECURITY_SCAN_CRON` to `scheduler.js` for periodic audits

### WorkOS (`backend/src/services/workosService.js`)

Optional WorkOS integration following the same graceful-fallback pattern as S3/Aikido/DynamoDB — every function is a no-op when `WORKOS_API_KEY` is unset:

- **Audit Logs** — `logAgent()` mirrors each agent activity event to WorkOS Audit Logs (event identity + status only; full payloads stay in Postgres/DynamoDB). Requires `WORKOS_ORGANIZATION_ID`.
- **AuthKit SSO** — `GET /api/auth/sso/authorize` redirects to WorkOS AuthKit; `GET /api/auth/sso/callback` exchanges the code, upserts a local user (matched by `workos_id`, then email), and redirects to the frontend `/sso-callback` page with a **locally signed JWT** in the URL fragment. The local JWT remains the session token, so all existing middleware and protected routes work unchanged. SSO-only users have `password_hash = NULL` and cannot password-login.

### Billing (`stripeService.js`, `billingService.js`)

Stripe is the active provider; `billingService.js` keeps PayPal working for
accounts already subscribed through it. `POST /api/billing/subscribe` picks
Stripe whenever `STRIPE_SECRET_KEY` is set and returns a provider-agnostic
`{ subscription: { approveUrl } }` that the frontend simply redirects to.

Three rules hold this together, and each one exists because the previous
implementation broke it:

1. **Starting checkout never grants a plan.** `createCheckoutSession` and the
   PayPal `createSubscription` only ever write `pending`. Activation happens in
   `handleWebhook()` against a signature-verified event. The old code marked
   users `active` whenever the provider was unconfigured *or* the API call
   threw — handing out paid plans to anyone who clicked Subscribe.
2. **Unverified webhooks are rejected.** Both webhook routes return 400 unless
   the signature verifies. `verifyWebhook()` previously returned
   `{ skipped: true }` when `PAYPAL_WEBHOOK_ID` was unset and the route treated
   that as permission to proceed, leaving an unauthenticated endpoint that
   could move any account onto a paid plan. There is no skip path now.
3. **Checkout is hosted by the provider.** No card fields exist in this app.
   `/billing` redirects to Stripe Checkout and reads plan state back from the
   server; it does not optimistically set `active`.

Stripe's webhook is mounted with `express.raw` in `app.js` *before*
`express.json`, because the signature is computed over the unparsed bytes.
Events are deduplicated through `processed_webhook_events`, so Stripe's retries
are idempotent. Plan/price mapping is derived from the price id on the
subscription, never from anything the client sends. `getPlans()` strips price
ids and exposes a `configured` boolean instead.

### Database connection (`db/pool.js`)

`pg-mem` is a **local development convenience only**, gated behind
`ALLOW_IN_MEMORY_DB=true` and refused under `NODE_ENV=production`. It used to
engage automatically whenever Postgres was unreachable — including in
production, where it turned a connection blip into silent data loss: the API
kept answering while signups and subscription changes were written to memory
and lost on restart. A missing or unreachable `DATABASE_URL` is now a hard
startup failure, and `checkDatabaseHealth()` reports an in-memory database as
unhealthy so `/health/ready` fails honestly.

### Plan Limits

Enforced server-side in `contentService.js`:

| Plan | Posts/month | Social accounts |
|---|---|---|
| starter | 30 | 2 |
| pro | 180 | 6 |
| agency | 1000 | 25 |

### Route Aliases

The backend exposes two sets of routes for the same handlers:

- **Canonical** — `/api/content/generate`, `/api/leads/engage`, etc.
- **Brief-compatible aliases** — `/generate-content`, `/schedule-post`, `/engage`, `/qualify-lead`, `/analytics`

### Database

Migrations run sequentially from a plain array in `migrations.js` (no migration table / version tracking). Re-running `npm run migrate` is idempotent (`CREATE TABLE IF NOT EXISTS`). All primary keys are UUIDs (`gen_random_uuid()`). The `users.onboarding` column is a JSONB blob storing `{ niche, audience, goal }` from onboarding.

### Key Environment Variables

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Full connection string; takes priority over individual `DB_*` vars |
| `DATABASE_SSL` | Set to `true` in production; auto-enabled if `NODE_ENV=production` or `AWS_REGION` is set |
| `JWT_SECRET` | Must be ≥ 32 chars; tokens expire per `JWT_EXPIRES_IN` (default `7d`) |
| `OPENAI_API_KEY` | Optional; agents use deterministic fallbacks when absent |
| `OPENAI_MODEL` | Default `gpt-4o-mini` |
| `AIKIDO_API_KEY` | Optional; security scanning disabled gracefully if absent |
| `AIKIDO_API_BASE_URL` | Aikido Security API endpoint (default `https://api.aikido.io`) |
| `DYNAMODB_AGENT_LOGS_TABLE` | Optional; when set, agent activity logs are mirrored to this DynamoDB table via `dynamoService.js` (Postgres stays the source of truth) |
| `AGENT_LOGS_RETENTION_DAYS` | TTL for mirrored DynamoDB agent-log items (default `90`) |
| `WORKOS_API_KEY` | Optional; enables WorkOS (`workosService.js`) — Audit Log streaming and AuthKit SSO |
| `WORKOS_CLIENT_ID` | WorkOS client id; required for AuthKit SSO login |
| `WORKOS_ORGANIZATION_ID` | WorkOS organization (`org_...`) that Audit Log events are recorded against; audit streaming is off without it |
| `WORKOS_REDIRECT_URI` | AuthKit callback URL (default `http://localhost:5000/api/auth/sso/callback`); must be registered in the WorkOS dashboard |
| `FRONTEND_URL` | Where the SSO callback redirects with the session token (falls back to first `CORS_ORIGIN` entry) |
| `DISABLE_SCHEDULERS` | Set to `true` to suppress cron jobs (useful in test/CI) |
| `CORS_ORIGIN` | Comma-separated list of allowed origins. Unset means "reflect any Origin", which is an allow-all for credentialed requests — always set it in production |
| `NEXT_PUBLIC_API_URL` | Frontend → backend origin. **Required in production.** Inlined at build time, so the frontend must be rebuilt after changing it. Unset means the login page disables itself and says so, rather than calling the Vercel deployment where `/api/auth/login` 404s |
| `ALLOW_IN_MEMORY_DB` | Dev/test only; opts into the `pg-mem` fallback. Ignored under `NODE_ENV=production` |
| `STRIPE_SECRET_KEY` | Enables Stripe Checkout; when set it is preferred over PayPal |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `/api/billing/stripe/webhook`. Without it no subscription can activate |
| `STRIPE_STARTER_PRICE_ID` / `STRIPE_PRO_PRICE_ID` / `STRIPE_AGENCY_PRICE_ID` | Recurring price ids; a plan without one is shown as unavailable |

### Supabase (optional)

The production database can be hosted on Supabase — set the backend `DATABASE_URL` to the project's **IPv4 connection pooler** URI (session mode, port 5432), not the IPv6-only direct `db.*.supabase.co` host. The frontend also ships a browser client in `frontend/lib/supabase.js` (created from `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `null` when unset) reserved for future realtime/storage features. App authentication stays on the Express backend (JWT + WorkOS SSO) — Supabase Auth is not used.

### Deployment Targets

- **Frontend** — Vercel or AWS Elastic Beanstalk (`frontend/.elasticbeanstalk/`)
- **Backend** — Railway, Render, or AWS Elastic Beanstalk (`backend/.elasticbeanstalk/`)
- **Database** — Supabase or AWS Aurora PostgreSQL; `pool.js` auto-configures SSL for AWS environments
- **Files** — AWS S3 via `s3Service.js` and `upload` route
- **Agent logs** — optional AWS DynamoDB mirror via `dynamoService.js` (table + IAM policy provisioned in `aws/cloudformation/main-stack.yaml`); TTL-expired per `AGENT_LOGS_RETENTION_DAYS`

Health check endpoints: `GET /health`, `GET /health/live`, `GET /health/ready` (used by AWS ALB).
