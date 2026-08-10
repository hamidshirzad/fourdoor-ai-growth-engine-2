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
FRONTEND_URL=https://your-vercel-domain.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_AGENCY_PRICE_ID=price_...
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

## Database on Neon

1. Create a Neon project and copy the **pooled** connection string — the host
   contains `-pooler`. The direct endpoint holds a connection open and keeps the
   compute awake.
2. Ask for `sslmode=verify-full&channel_binding=require`. Neon serves a
   publicly-trusted certificate on a real hostname, and plain `sslmode=require`
   makes `pg` print a deprecation warning on every connection.
3. Set `DATABASE_POOL_MIN=0` so the compute can scale to zero. A non-zero idle
   floor pins a connection open forever.

```
DATABASE_URL=postgresql://<role>:<password>@ep-<id>-pooler.<region>.aws.neon.tech/<db>?sslmode=verify-full&channel_binding=require
DATABASE_POOL_MIN=0
```

`DATABASE_SSL` is ignored when the connection string carries its own `sslmode=`
— `pg` lets the parsed connection string win over the pool's `ssl` config.

## Backend on Render

The repo ships a blueprint at `render.yaml`. Render → **New → Blueprint**, point
it at this repository, and it creates the service with the right root directory,
health check and start command. Fill in the values it prompts for
(`DATABASE_URL`, the Stripe keys); `JWT_SECRET` is generated for you.

To configure it by hand instead:

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm ci` |
| Start Command | `npm run migrate && npm start` |
| Health Check Path | `/health/ready` |

Notes on the choices:

- **Migrations run on every boot.** They are idempotent (`CREATE TABLE IF NOT
  EXISTS`, `ADD COLUMN IF NOT EXISTS`), and the free tier has no shell to run
  them from by hand. **Any** migration failure now exits non-zero, so
  `&& npm start` is skipped and Render fails the deploy — the API can never
  start against a half-applied schema. That covers a missing or unreachable
  `DATABASE_URL` *and* a failing SQL statement; the whole run is one
  transaction, so a failed statement is rolled back before the process exits.
- **`/health/ready` fails when the database is unreachable**, so a bad
  `DATABASE_URL` surfaces as a failed deploy instead of a service that answers
  every request against an empty database.
- **`DATABASE_URL` and `JWT_SECRET` are mandatory.** The service refuses to
  start without a reachable PostgreSQL rather than silently falling back to an
  in-memory database whose contents vanish on the next restart.
- **Set `CORS_ORIGIN`** to the frontend origins, comma-separated
  (`https://www.fourdoorai.com,https://fourdoorai.com`). Unset means the API
  reflects any Origin back, which is an allow-all for credentialed requests.
- **Seeding is not automatic.** `npm run seed` creates the demo account
  (`demo@fourdoor.ai`) whose password is published in this repo. Run it once by
  hand if you want the login page's "Try Demo Mode" button to work.
- **Schedulers and the free tier don't mix.** The three `node-cron` jobs start
  with the process, and a free instance sleeps when idle, so they will not fire
  on schedule. Use a paid instance or set `DISABLE_SCHEDULERS=true` and trigger
  the work externally. Free instances also cold-start for ~30–60 s, which looks
  like a hung login form on the first request.

After the service is live:

1. Register the webhook endpoints against its public URL:
   - Stripe: `/api/billing/stripe/webhook`
   - PayPal: `/api/billing/webhook`
2. Copy the service URL into the frontend's `NEXT_PUBLIC_API_URL` **and redeploy
   the frontend** — the value is inlined at build time, so setting it without a
   rebuild changes nothing.

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
4. Enable and configure the Stripe Customer Portal. The app creates portal
   sessions for existing customers so they can update payment methods, download
   invoices, change plans according to your portal policy, or cancel.
5. Keep `FRONTEND_URL` and `CORS_ORIGIN` aligned with every frontend hostname
   that may initiate checkout. Checkout and portal return URLs are rejected
   unless their origin is on this server-side allowlist.

**A subscription only becomes active through a signature-verified webhook.**
Starting checkout does not change anyone's plan, and an unsigned or unverifiable
webhook is rejected with a 400. Events are recorded in
`processed_webhook_events` so Stripe's retries are idempotent. If
`STRIPE_WEBHOOK_SECRET` is missing, no subscription can ever activate — that is
deliberate, because the alternative is trusting unauthenticated input about who
has paid.

Before accepting live traffic, exercise the complete flow in Stripe test mode:

```bash
# In one terminal, forward signed test events to the deployed/local API.
stripe listen --forward-to http://localhost:5000/api/billing/stripe/webhook

# Put the printed whsec_... value in STRIPE_WEBHOOK_SECRET, restart the API,
# then sign in and buy a plan from /billing with Stripe's test card:
# 4242 4242 4242 4242, any future expiry, any CVC.
```

Confirm that Checkout returns to `/billing`, the profile changes to `active`,
and **Manage billing** opens the Customer Portal. Repeat with a declined test
card and cancel Checkout once; neither attempt may activate the subscription.
This live-provider smoke test cannot be replaced by unit tests because it also
proves the deployed Price IDs, webhook endpoint, signing secret, and Portal
configuration belong to the same Stripe account and mode.

## Frontend hosting

The frontend is configured on **two** hosts. Vercel serves `fourdoorai.com`;
Netlify is intended as a standby that can take the domain over if Vercel fails
again.

**The standby is not currently warm.** Netlify's `production` context has
produced exactly one serving build, on 2026-08-02 (`9c5d63d`). Every production
deploy since has errored, and the two most recent were skipped outright —
`skipped: true`, no `commit_ref`, no build time, meaning no build ran. Only
branch and deploy-preview contexts are green, and only on branches carrying the
`@netlify/blobs` fix. Treat "Netlify can take over" as a task to finish, not a
property the site already has: get the `master` production context building
before relying on it.

The consequence to internalise: `NEXT_PUBLIC_API_URL` is inlined into the client
bundle at **build** time, so it must be set on **both** hosts, and each one
rebuilt after any change. Setting it on only the standby is exactly how
production ends up serving a login page that reports no API server configured
while the dashboard shows the variable present.

### Netlify

`netlify.toml` at the repo root carries the build config, so the site needs
almost no dashboard setup.

1. Netlify → Add new site → Import from GitHub, pick this repository.
2. Accept the settings it reads from `netlify.toml` — base `frontend`, command
   `npm run build`, publish `frontend/.next`, plus the `@netlify/plugin-nextjs`
   runtime. **Do not** override the base directory in the UI; a UI value wins
   over the file and building from the repo root produces a 404 site.
3. Site configuration → Environment variables → add `NEXT_PUBLIC_API_URL` set to
   the Render service URL, scoped to **all** deploy contexts.
4. Deploy. Leave the custom domain on Vercel unless you are promoting Netlify
   from standby — only then point `fourdoorai.com` / `www` here via Domain
   management. The site stays reachable at its `*.netlify.app` address either
   way, which is what makes it a usable fallback.

`NEXT_PUBLIC_API_URL` must exist *before* the build. Next.js inlines
`NEXT_PUBLIC_*` into the client bundle, so setting it afterwards changes nothing
until the site is rebuilt — use "Clear cache and deploy site". When it is
missing, the login page says so and disables itself rather than posting to the
Netlify site, where `/api/auth/login` does not exist.

### Vercel

Vercel currently serves `fourdoorai.com` from a Next.js project built out of
`frontend/`. There is no `vercel.json` in this repository — the root directory is
set in the project's dashboard settings, and it should stay there (see the dead
ends below).

1. Settings → Environment Variables → add `NEXT_PUBLIC_API_URL` set to the Render
   service URL, for **all** environments.
2. Redeploy. As on Netlify, the value only reaches the bundle through a build.
3. Check both hostnames after deploying. `www` and the apex are separate aliases
   and can point at entirely different projects.

**`www.fourdoorai.com` does not serve this application.** It now returns Vercel's
`NOT_FOUND` page on every route — `/`, `/login`, `/pricing` alike. The hostname
resolves to Vercel but is not attached to a deployment, so there is nothing
behind it. The apex is the only hostname serving the real frontend. Point `www`
at the same project as the apex, or redirect it there.

This replaced an earlier failure mode, worth recording because the symptom
changed while the conclusion did not. `www` previously served an unrelated Vite
single-page app titled "My Google AI Studio App", with no source anywhere in this
repository: `/` answered 200 with that app while every other route 404'd, because
that SPA had no such route. That deployment has since been detached, leaving the
hostname empty rather than wrong.

Either way `www` has never served this frontend, which is why `FRONTEND_URL` in
`render.yaml` points at the apex. Re-check what `www` actually returns before
relying on it — it has changed once already.

Two Vercel projects exist for this repository, which is worth knowing before
changing settings:

| Project | Root directory | Role |
|---|---|---|
| `fourdoorai.com` | repo root | Serves the apex domain. Skips PR branch builds. |
| `fourdoor-ai-growth-engine-2-frontend` | `frontend/pages/api` | Builds PR previews. |

That second root directory is wrong — `frontend/pages/api` holds a single
`health.js` route, not an app root — and its previews serve a Vercel placeholder
instead of the site. Either repoint it at `frontend/` or delete the project; as
configured its preview URLs mean nothing.

#### History: the plan-limit outage

For a period, every Vercel build failed during **resource provisioning** —
`BUILD_FAILED` / "Resource provisioning failed", dead in ~500 ms with zero
build-log events. No repository change could fix it, because Vercel was refusing
to allocate build containers at the account level; the frontend built clean
locally and on Netlify throughout. That is why Netlify was set up, and why it is
kept as a standby now that Vercel deploys again.

Two dead ends, recorded so they are not retried: a root `vercel.json` setting
`framework: nextjs` alongside `outputDirectory: frontend/.next` does break the
Next.js builder in exactly the way described above, but removing it did not fix
these deploys; and changing project settings does not retroactively rebuild —
a redeploy has to be triggered explicitly.

### Monorepo layout

`frontend/package.json` declares everything the frontend imports, so it builds
standalone from that directory. Dependencies the frontend imports that were only
declared in the root workspace manifest (`firebase`, `motion`) have been moved
into it. If you add an import, declare it in `frontend/package.json` — a
root-only dependency will not be installed.

**Troubleshooting:** a build failing with `Could not read package.json` or
`No Next.js version detected`, or a deployed site serving 404s for every route,
means the build ran from the repo root instead of `frontend/`. Check that no UI
setting is overriding `base` in `netlify.toml`.

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
