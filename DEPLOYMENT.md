# Fourdoor AI Growth Engine Deployment

## Deployment Options

This application can be deployed to:
1. **AWS (Elastic Beanstalk + Aurora PostgreSQL)** - See [AWS Deployment Guide](./aws/README.md)
2. **Railway/Render + Supabase** - See instructions below
3. **Vercel (Frontend) + Railway/Render (Backend)**

---

## AWS Deployment (Recommended for Production)

For full AWS deployment with Aurora PostgreSQL, Elastic Beanstalk, and S3:

```bash
# Quick deploy
source aws/.env.aws
./aws/scripts/deploy.sh all
```

See the complete [AWS Deployment Guide](./aws/README.md) for:
- CloudFormation infrastructure setup
- Elastic Beanstalk configuration
- S3 file storage integration
- Security and monitoring setup

---

## Local Production Check

```bash
cd ~/fourdoor-ai-growth-engine
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
docker compose up -d postgres
cd backend && npm install && npm run migrate && npm run seed && npm start
cd ../frontend && npm install && npm run build && npm start
```

Frontend: `http://localhost:3000`
Backend health: `http://localhost:5000/health`
Demo login after seeding: `demo@fourdoor.ai` / `demo@password123`

## Required Production Environment

Backend:

```bash
DATABASE_URL=postgres://...
DATABASE_SSL=true
JWT_SECRET=<32+ random chars>
CORS_ORIGIN=https://your-vercel-domain.com
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
PAYPAL_MODE=live
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_STARTER_PLAN_ID=...
PAYPAL_PRO_PLAN_ID=...
PAYPAL_AGENCY_PLAN_ID=...
PAYPAL_WEBHOOK_ID=...
CALENDLY_BOOKING_URL=https://calendly.com/your-team/growth-call
CALENDLY_API_TOKEN=...
CALENDLY_USER_URI=...
```

Frontend:

```bash
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

## Database on Supabase

1. Create a Supabase project.
2. Copy the pooled PostgreSQL connection string into `DATABASE_URL`.
3. Set `DATABASE_SSL=true`.
4. Run migrations from the backend service shell:

```bash
cd backend
npm ci
npm run migrate
```

## Backend on Railway or Render

1. Create a Node.js service with root directory `backend`.
2. Use build command `npm ci`.
3. Use start command `npm start`.
4. Add the backend environment variables above.
5. After deploy, run `npm run migrate` once from the service shell.
6. Set the public backend URL as the PayPal webhook target: `/api/billing/webhook`.

## Frontend on Vercel

1. Import the repository.
2. Set root directory to `frontend`.
3. Use build command `npm run build`.
4. Set `NEXT_PUBLIC_API_URL` to the deployed backend URL.
5. Deploy.

**Troubleshooting:** builds failing with `Could not read package.json` or
`No Next.js version detected`, or the deployed site serving `404: NOT_FOUND`,
mean the build is running from the repo root instead of `frontend/`.
Auto-imports (Vercel Git integration, bolt.new/StackBlitz) default to the repo
root. Two repo files exist solely to make repo-root builds work: the root
`vercel.json` redirects install/build into `frontend/`, and the root
`package.json` is a stub that declares `next` so Vercel's framework detection
passes (nothing is ever installed at the root). Setting Root Directory to
`frontend` in the dashboard (Settings → Build & Deployment) is the cleaner fix
and makes Vercel ignore both files. Also confirm `NEXT_PUBLIC_API_URL` is set
for Production and Preview; without it the UI builds fine but calls
`http://localhost:5000` at runtime.

## WorkOS Setup

The app uses the server-side `@workos-inc/node` SDK (`backend/src/services/workosService.js`) for
AuthKit SSO and Audit Log streaming. The session token remains the app's own JWT — the
`@workos-inc/authkit-nextjs` SDK is intentionally not used because the frontend is
pages-router and the API is a separate Express service. Env vars are listed in
`backend/.env.example`; all WorkOS features degrade to no-ops when unset.

1. In the [WorkOS dashboard](https://dashboard.workos.com) → **Redirects**, add the Redirect URI
   `http://localhost:5000/api/auth/sso/callback` for local dev, plus your deployed backend's
   `/api/auth/sso/callback` for production. Each must exactly match `WORKOS_REDIRECT_URI`.
2. In the same **Redirects** section, set the app's sign-in endpoint to the frontend `/login`
   page (handles users who bookmark the hosted AuthKit page).
3. Put the API key and client ID into `WORKOS_API_KEY` and `WORKOS_CLIENT_ID` — SSO login is
   active once these are set.
4. For Audit Logs: create or select an Organization, put its `org_...` id into
   `WORKOS_ORGANIZATION_ID`, and configure Audit Log event schemas for the emitted actions —
   `agent.<action>` names with `user`/`system` actor types and an `agent` target type
   (see `buildAuditLogEvent` in `workosService.js`).

## PayPal Setup

1. In the PayPal developer dashboard, create one product for Fourdoor AI.
2. Create three monthly subscription plans:
   - Starter: EUR 29
   - Pro: EUR 79
   - Agency: EUR 199
3. Put the PayPal plan IDs into `PAYPAL_STARTER_PLAN_ID`, `PAYPAL_PRO_PLAN_ID`, and `PAYPAL_AGENCY_PLAN_ID`.
4. Create a webhook for subscription activation, cancellation, suspension, expiration, and payment failure events.
5. Put the webhook ID into `PAYPAL_WEBHOOK_ID`.

## Social Distribution Setup

Connect each account from Settings:

- LinkedIn requires an access token and an author URN in `accountId`.
- X requires a bearer token that can create tweets.
- Instagram requires a Meta Graph access token, Instagram business account ID, and posts must include `media_url`.

Scheduled posts are published by the backend scheduler every five minutes by default.

## Security Checklist

- Use a strong `JWT_SECRET`.
- Restrict `CORS_ORIGIN` to the Vercel domain.
- Keep PayPal, OpenAI, social, and Calendly credentials in platform secret stores.
- Keep `DATABASE_SSL=true` for managed PostgreSQL.
- Confirm `npm audit` is clean for both `backend` and `frontend`.
