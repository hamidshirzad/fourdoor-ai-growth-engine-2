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
4. Add the backend environment variables above. `DATABASE_URL` and `JWT_SECRET`
   are mandatory — the service now fails fast if it cannot reach PostgreSQL
   rather than quietly serving from an in-memory database whose contents vanish
   on the next restart.
5. Set `CORS_ORIGIN` to the frontend origins, comma-separated
   (`https://www.fourdoorai.com,https://fourdoorai.com`). Without it the API
   reflects any Origin back, which is an allow-all for credentialed requests.
6. After deploy, run `npm run migrate` once from the service shell.
7. Register the webhook endpoints against the public backend URL:
   - Stripe: `/api/billing/stripe/webhook`
   - PayPal: `/api/billing/webhook`
8. Copy the deployed URL into the frontend's `NEXT_PUBLIC_API_URL` and redeploy
   the frontend — it is baked in at build time.

## Stripe subscriptions

Checkout runs on Stripe's hosted page; card details never reach this
application, and no publishable key is needed in the browser.

1. Create one recurring Price per plan in the Stripe dashboard and put the
   price ids in `STRIPE_STARTER_PRICE_ID`, `STRIPE_PRO_PRICE_ID` and
   `STRIPE_AGENCY_PRICE_ID`. A plan with no price id is shown as unavailable
   rather than being silently granted.
2. Set `STRIPE_SECRET_KEY`.
3. Add a webhook endpoint pointing at `<backend-url>/api/billing/stripe/webhook`
   subscribed to `checkout.session.completed`,
   `customer.subscription.created/updated/deleted` and
   `invoice.payment_failed`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.

**A subscription only becomes active through a signature-verified webhook.**
Starting checkout does not change anyone's plan, and an unsigned or unverifiable
webhook is rejected with a 400. Events are recorded in
`processed_webhook_events` so Stripe's retries are idempotent. If
`STRIPE_WEBHOOK_SECRET` is missing, no subscription can ever activate — that is
deliberate, because the alternative is trusting unauthenticated input about who
has paid.

## Frontend on Vercel

1. Import the repository.
2. **Set Root Directory to `frontend`** (Settings → Build & Deployment). This is
   required, not optional — see below.
3. Leave the build command as the default `npm run build`.
4. Set `NEXT_PUBLIC_API_URL` to the deployed backend URL, for Production *and*
   Preview.
5. Deploy.

### Root Directory must be `frontend`

The repo root previously carried a `vercel.json` that set `framework: nextjs`
alongside `outputDirectory: frontend/.next`. That combination makes the Next.js
builder fail **during resource provisioning**, before a single line of build
output is produced — the deployment shows `BUILD_FAILED` /
"Resource provisioning failed" with completely empty build logs. The file has
been removed; do not reintroduce it. Point Vercel at `frontend/` instead.

`frontend/package.json` declares everything the frontend imports, so it builds
standalone from that directory. Dependencies that the frontend imports but that
were only declared in the root workspace manifest (`firebase`, `motion`) have
been moved into it. If you add an import, declare it in `frontend/package.json`
— a root-only dependency will not be installed.

**Troubleshooting:** a build failing with `Could not read package.json` or
`No Next.js version detected`, or the deployed site serving `404: NOT_FOUND`,
means the build is running from the repo root instead of `frontend/`. Fix the
Root Directory setting rather than adding a root `vercel.json`.

**If login fails in production with a generic "API error":** confirm
`NEXT_PUBLIC_API_URL` is set. It is inlined at build time, so it must be present
*before* the build and the frontend must be redeployed after changing it. When
it is missing the login page now says so directly and disables the form instead
of sending requests to the Vercel deployment itself, where `/api/auth/login`
does not exist.

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
