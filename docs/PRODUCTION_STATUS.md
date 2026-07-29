# Production status — login and payments

Snapshot of the production launch work: what shipped, what was verified, and what is still
blocking a working login. Written 2026-07-29.

This document contains **no credentials, connection strings or passwords**. The Vercel project
and deployment ids below are identifiers, not secrets, and already appear in the Vercel bot's
comments on the pull requests.

---

## TL;DR

Logging in at fourdoorai.com fails with a generic `API error`. Two independent causes:

1. **The site is serving pre-fix code.** The fix is merged to `master`, but the production
   deploy fails, so the old bundle is still live.
2. **No backend is deployed.** Nothing can authenticate until the Express API runs somewhere.

Both remaining blockers are infrastructure/dashboard work, not code.

---

## Shipped

### PR #2 — merged to `master` (`f744ac4`)

**Login**

- `frontend/lib/api.js` — removed the silent fallback to an empty API base URL. The API is a
  separate service and never same-origin, so an unset `NEXT_PUBLIC_API_URL` used to send
  `/api/auth/login` to the Vercel deployment itself and 404. It is now a named configuration
  error.
- `frontend/pages/login.js` — states the misconfiguration and disables the form instead of
  posting credentials into a void.
- `frontend/pages/signup.js` — fixed `const handleDemoLogin = async (fourdoorai.com) => {`,
  a syntax error on `master` that failed **every** build on its own. Same commit (`36956a5`)
  also introduced a demo email absent from the seed and a relative
  `router.push('fourdoorai.com/dashboard')`; both reverted.

**Payments** — the checkout ran scripted "Verifying card credentials with Stripe…" delays,
invented a transaction id, and marked the user active, while **no server-side Stripe
integration existed** (no secret key, no PaymentIntent, no `confirmPayment`). Users typed real
card numbers into a form that could not charge them.

- `backend/src/services/stripeService.js` (new) — hosted Stripe Checkout, so no card data
  reaches this app. Signature-verified webhooks, a `processed_webhook_events` table for
  idempotency, plan derived from the price id on the subscription, price ids never sent to the
  browser.
- `frontend/pages/billing.js` — fake card form, scripted delays and fabricated transaction id
  removed; redirects to the provider's hosted checkout.
  `frontend/components/PaymentForm.js` deleted (carried a hardcoded `pk_live_` key).

Ways a paid plan could previously be obtained for free, all closed:

| Issue | Before | After |
|---|---|---|
| `createSubscription`, provider unconfigured | wrote `subscription_status='active'` | throws; plan untouched |
| Provider API call throws | swallowed; still `active` | propagates; plan untouched |
| `PAYPAL_WEBHOOK_ID` unset | `verifyWebhook` returned `{skipped:true}` and the route proceeded — an unauthenticated endpoint that could move any account onto a paid plan | rejected with 400 |
| `BILLING.SUBSCRIPTION.CREATED` | counted as paid | only `ACTIVATED` counts |
| Hardcoded `buy.stripe.com` link | in source | removed |

**Infrastructure correctness**

- `backend/src/db/pool.js` — silently swapped in an in-memory `pg-mem` database whenever
  Postgres was unreachable, *including in production*, turning a connection blip into lost
  signups and lost subscription state while the API kept answering. Now dev-only behind
  `ALLOW_IN_MEMORY_DB`, refused under `NODE_ENV=production`; an unreachable database is a hard
  failure and `/health/ready` reports it.
- `backend/src/app.js` — `express.raw` for the Stripe webhook *before* `express.json` (the
  signature covers unparsed bytes); CORS pinned to `CORS_ORIGIN` instead of reflecting any
  Origin; added the missing Express error handler, without which rejected handlers returned an
  HTML stack trace that the frontend could not parse — every fault became "API error".
- Declared dependencies that were imported but only present in the root workspace manifest:
  `firebase` and `motion` (frontend); `pg-mem`, `nodemailer`, `@google/genai`, `firebase` and
  `stripe` (backend). The backend set would have crashed a standalone deploy on startup.
- Deleted the root `vercel.json`.

### PR #3 — open (branch `claude/production-payment-launch-fa1z7s`, `be2b81f`)

`render.yaml` for the backend, `engines.node >= 20`, and a concrete Neon + Render walkthrough
in `DEPLOYMENT.md`.

---

## Verified against a real PostgreSQL 16 instance

Not mocks — a live database, with the actual HTTP endpoints:

- migrations (including the new ones) and seed apply cleanly
- `POST /api/auth/login` → **200** with a valid JWT
- forged PayPal webhook granting `agency` → **400**, no plan change
- forged Stripe webhook → **400**
- `/subscribe` with no provider configured → **503**, no plan change (previously granted
  `agency` + `active`)
- correctly signed Stripe `customer.subscription.updated` → **200**, plan activated; replaying
  the identical event → `DUPLICATE_IGNORED`
- database confirms no privilege escalation from any rejected attempt
- `npm run migrate` exits **1** on a missing or unreachable `DATABASE_URL`, so
  `&& npm start` aborts and a bad connection string cannot slip through
- 40/40 backend tests pass; frontend builds standalone from `frontend/` (41 pages)

---

## Blocked

### 1. The Vercel project cannot build

Project `prj_QZ1VFB9I3JpTFH4JdQR2ZyxFzmDF`. The production deploy from the merge
(`dpl_4zWH2DsnA54NBgswrR5sDeG1v8o4`) is `BUILD_FAILED` / "Resource provisioning failed" — dead
**529 ms** in with **zero build log events**.

Removing the root `vercel.json` was necessary but not sufficient: the repo now contains **no
Vercel configuration at all** and provisioning still fails identically, so the conflicting
settings live in the project itself. Preview builds are separately cancelled by an **Ignored
Build Step**. The project reports `live: false`, which is also consistent with it being paused
or disabled.

Fix, in the dashboard:

| Where | Change |
|---|---|
| Settings → Build & Deployment | Root Directory → `frontend` |
| Settings → Build & Deployment | Output Directory → clear the override |
| Settings → Build & Deployment | Build + Install Command → clear overrides |
| Settings → Git | Ignored Build Step → **Automatic** |
| Settings → General | Resume the project if paused |
| Settings → Environment Variables | `NEXT_PUBLIC_API_URL` (Production + Preview) |

`frontend/package.json` is self-contained, so a build rooted at `frontend/` has everything it
needs. If this does not fix it, the fallback is a fresh project with `fourdoorai.com` moved
onto it.

### 2. No backend is deployed

Nothing can log in until `backend/` runs somewhere and `NEXT_PUBLIC_API_URL` points at it,
**followed by a frontend rebuild** — the value is inlined at build time, so setting it without
redeploying changes nothing.

Chosen stack: **Render** (blueprint in `render.yaml`) with **Neon** Postgres. See
`DEPLOYMENT.md`.

---

## Current live state

`https://www.fourdoorai.com` still serves build `BcXSwXFIcMPIYgF5d1ht7` — the pre-fix bundle
from before this work began. `POST /api/auth/login` against that origin returns **404**
(`x-matched-path: /404`), which the old code renders as "API error".

The clearest tell: the merged code shows an amber *"Sign-in is unavailable: this deployment has
no API server configured"* banner. Its absence on the live page proves the fix has not shipped.

---

## Next steps

1. Apply the Vercel settings above; redeploy `master`.
2. Create the Neon database (pooled `-pooler` endpoint,
   `sslmode=verify-full&channel_binding=require`, `DATABASE_POOL_MIN=0`).
3. Deploy `render.yaml`; set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `FRONTEND_URL`.
4. Set `NEXT_PUBLIC_API_URL` to the Render URL and **redeploy the frontend**.
5. Stripe: one recurring Price per plan, plus a webhook at
   `/api/billing/stripe/webhook` and its signing secret in `STRIPE_WEBHOOK_SECRET`. Without
   that secret no subscription can activate — deliberately, since the alternative is trusting
   unauthenticated input about who has paid.
6. Verify: `GET /health` → healthy, `POST /api/auth/login` → 200, served build id changed, and
   the amber banner absent.

### Operational notes

- **Seeding is not automatic.** `npm run seed` creates the demo account whose password is
  published in this repo's docs; putting that on a production database is a deliberate choice.
  The login page pre-fills those credentials, so run the seed once if "Try Demo Mode" should
  work.
- **Render free tier**: the instance sleeps when idle, so the three `node-cron` schedulers will
  not fire on schedule (use a paid instance or `DISABLE_SCHEDULERS=true`), and cold starts of
  ~30–60 s will look like a hung login form.
- **A failing migration *statement* exits 0.** `runMigrations()` rolls back and logs without
  rethrowing, so the service can start against an incomplete schema. Check the deploy log for
  `All migrations completed successfully` rather than trusting the green status alone. A failed
  *connection* does exit non-zero.
