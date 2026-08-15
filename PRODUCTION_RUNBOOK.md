# Fourdoor AI Production Runbook

## Canonical path

- Repository: `hamidshirzad/fourdoor-ai-growth-engine-2`
- Production branch: `master`
- Canonical production Vercel project/domain: `fourdoorai.com`
- Feature work must reach production through a pull request into `master`.

## Required merge gate

The `Production Gate` workflow must pass before a production merge:

1. Backend syntax/static checks.
2. Backend tests with schedulers disabled.
3. Frontend production build.
4. Production safety contract.
5. Vercel preview deployment/check.

Configure GitHub branch protection/rulesets for `master` to require the final `Production Gate` status and the canonical Vercel production-project preview check. Do not require duplicate/legacy Vercel project checks.

## Environment isolation

### Production

- `NODE_ENV=production`
- `DATABASE_URL` points only to the production database.
- `JWT_SECRET` is unique to production and at least 32 random characters.
- `CORS_ORIGIN` contains only approved production origins.
- Stripe uses live credentials only in production.
- Schedulers are enabled only on the single backend process designated to run them.

### Preview / staging

- Use a non-production database and provider test credentials.
- Set `DISABLE_SCHEDULERS=true` unless the environment is specifically designated as a staging worker.
- Never put Stripe live secret keys or production-only service credentials in Preview environment variables.

## Pre-merge checklist

- Production Gate is green.
- Canonical Vercel preview is green.
- Database changes are backward-compatible with the currently deployed application.
- New background work is idempotent and has an explicit kill switch.
- Authenticated queries are scoped from server-side identity, not a caller-supplied user id.
- Webhooks verify provider signatures and tolerate retries.
- No new secret or credential is committed to Git.

## Deployment

1. Merge the reviewed PR into `master`.
2. Wait for the canonical Vercel production deployment and backend deployment to finish.
3. Verify `/health/live`.
4. Verify `/health/ready` and database connectivity.
5. Exercise one authenticated read-only user flow.
6. Exercise the changed feature with the smallest safe production action.
7. Inspect runtime/application logs for new errors.

## Rollback

If a critical smoke test fails:

1. Disable schedulers/background automation first if relevant.
2. Roll back/redeploy the last known-good application revision.
3. Do not reverse a database migration blindly. Prefer forward-compatible corrective migrations.
4. Verify `/health/live` and `/health/ready` after rollback.
5. Record the failure and remediation in the PR/issue before retrying production.

## Automation safety

Automation workers must eventually use an atomic database claim/lease rather than selecting a pending job and updating it later. A safe job lifecycle is:

`pending -> running -> completed | failed | cancelled`

Recommended execution metadata: `attempt_count`, `max_attempts`, `locked_at`, `locked_by`, `started_at`, `completed_at`, `last_error`, and an idempotency key where an external side effect is possible.

## Current known follow-up

PR #17 creates/scopes/displays/cancels campaign automation jobs but explicitly does not contain the job runner. Do not treat the queue as autonomous production automation until the worker, retry/lease semantics, real database test, and Firestore integration/index verification are completed.
