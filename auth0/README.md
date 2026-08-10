# Auth0 Tenant Configuration

Manages the Auth0 tenant's configuration as code using the
[Auth0 Deploy CLI](https://github.com/auth0/auth0-deploy-cli) (`a0deploy`).

**This directory is ops tooling. It is not wired into the running application.** The app
authenticates users with locally signed JWTs plus optional WorkOS AuthKit SSO
(`backend/src/services/workosService.js`); no application code reads anything here.

---

## Read this first — two things that will trip you up

### 1. The Netlify extension's Auth0 application will not work here

The Netlify Auth0 extension created tenant `dev-sfv34zclvdf4noih` along with a regular
web/SPA application (e.g. "My App fourdoor"). That application exists so end users can log
in. It has **no grants on the Auth0 Management API**, and the Deploy CLI talks to nothing
else.

You must create a **separate Machine-to-Machine application** for this tooling. It is a
prerequisite, not an optional hardening step — without it every command below fails.

### 2. `AUTH0_DOMAIN` and `AUTH0_CLIENT_ID` mean two different things

The Netlify extension injects `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, and
`AUTH0_ISSUER_BASE_URL` into the **site build environment** for the runtime app. The Deploy
CLI reads env vars with two of those exact names, but expects the **M2M** application's
values.

Same names, different application. If you run `a0deploy` somewhere the Netlify values are
already set, it authenticates as the SPA client and fails with an authorization error that
gives no hint that this is the cause. When in doubt, print the client id you are actually
sending before debugging anything else.

---

## One-time setup

### Create the Machine-to-Machine application

1. **Auth0 Dashboard → Applications → Applications → + Create Application**
   - Name it something unmistakable, e.g. `Deploy CLI (fourdoor)`.
   - Application Type: **Machine to Machine Applications**.
2. Authorize it against the **Auth0 Management API**.
3. Grant scopes. The CLI operates within whatever it is given, so grant the minimum for what
   you intend to do.

   **Note that `read:*` is not a real permission.** The Auth0 Deploy CLI docs write scopes
   that way as shorthand, but the dashboard's permission list is resource-specific — there is
   no wildcard entry to tick, and searching for `read:*` finds nothing.

   **Do not grant every permission under a verb prefix either.** That sweeps in resources
   this tooling never touches — most importantly user data (`read:users`,
   `update:users`, `read:user_idp_tokens`) — and turns a tenant-config credential into a
   broadly privileged Management API credential. The client secret lives in CI, so its blast
   radius on exposure is exactly the scopes you grant it.

   **Narrow what the CLI manages first — then the scope list follows from it.** This is the
   practical lever, because the CLI touches far more resource types than you probably want to
   manage as code. Set `AUTH0_INCLUDED_ONLY` in `config.json` to the asset types you actually
   care about, and grant scopes only for those. Every type you exclude is a set of permissions
   you never have to grant.

   | Intent | Grant |
   |---|---|
   | Export only | `read:` for each included resource type |
   | Export + import | `read:`, `create:`, `update:` for each |
   | Deletion | additionally `delete:` — only alongside `AUTH0_ALLOW_DELETE=true`, which should not be your default. See the warning below. |

   Do **not** derive the list from memory or from a prose summary — both are how this
   document previously got it wrong, omitting `read:rules` while the CLI's `rules` handler was
   very much active. Enumerate the handlers in the version you have installed:

   ```bash
   ls node_modules/auth0-deploy-cli/lib/tools/auth0/handlers/*.js \
     | xargs -n1 basename | sed 's/\.js$//' | grep -v '^default$'
   ```

   At `auth0-deploy-cli@8.42.0` that is 47 handlers, including several a summary list tends to
   miss: `rules`, `rulesConfigs`, `hooks`, `flows`, `forms`, `networkACLs`, `attackProtection`,
   `triggers`, `eventStreams`, `scimHandler`, `selfServiceProfiles`, `tokenExchangeProfiles`,
   and `userAttributeProfiles`. Cross-check against the Deploy CLI's version-specific
   permissions documentation, and re-check after any upgrade.

   Whatever you include, leave out the scopes for things the CLI does not manage as config —
   above all **user data** (`read:users`, `update:users`, `read:user_idp_tokens`) and device
   credentials. If an export 403s naming a resource type, grant that single scope or exclude
   that type; do not widen to a whole verb prefix.

The Deploy CLI's own application is deliberately not manageable by the CLI, so it cannot
lock itself out.

### Local credentials

```bash
cp auth0/.env.auth0.example auth0/.env.auth0   # gitignored
```

Fill in `AUTH0_DOMAIN` (`dev-sfv34zclvdf4noih.auth0.com`), plus the **M2M** application's
`AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET`.

### CI credentials — order matters, and the type of secret matters

Create the environment **first**, then put the secrets inside it. Do all three steps; the
first two are what actually enforce anything.

1. **Create a repository environment named `auth0`** (Settings → Environments).
2. **Add a deployment branch restriction** limiting it to the default branch. This — not the
   check inside the workflow — is the real enforcement boundary for imports. See
   "Why the in-workflow branch guard is not the boundary" below.
3. **Add `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, and `AUTH0_CLIENT_SECRET` as *environment*
   secrets on `auth0`** — not as repository secrets. Optionally add required reviewers.

> **Do not use repository-level secrets here.** Repository secrets are readable by *any*
> workflow job in the repo, whether or not it declares `environment: auth0`. Storing the M2M
> credentials at repository level means the approval gate and branch restriction protect
> nothing: another workflow — including one added on an unmerged branch — could read the
> credentials and call the Management API directly. Environment secrets are only injected
> into jobs that declare that environment and satisfy its protection rules.
>
> `${{ secrets.AUTH0_CLIENT_SECRET }}` in the workflow resolves identically either way, so
> this is invisible in the YAML and easy to get wrong.

---

## Bootstrap order

`auth0/tenant/` is empty in a fresh clone. Nothing can be imported before something has been
exported, so run these in order:

1. Create the M2M app and set credentials (above).
2. **Export** the live tenant into `auth0/tenant/`.
3. **Review** the export and commit it. This is the step that makes tenant config
   reviewable — read the diff rather than committing it blind, and see the secrets note
   directly below before the first commit.
4. **Import** is only meaningful once step 3 has happened.

The CI workflow fails fast with an explanatory message if you ask it to import before
`auth0/tenant/tenant.yaml` exists.

### Secrets in the export — read before the first commit

Step 3 tells you to commit the export, so it is worth being precise about what ends up in Git.

`config.json` pins `AUTH0_EXPORT_SECRETS: false`. With that, the CLI replaces sensitive
values with `##KEYWORD##` placeholders rather than writing them out — covering email provider
credentials (`api_key`, SMTP/SES/Azure/MS365 credentials), connection
`options.client_secret`, and log stream sink secrets (`httpAuthorization`, `splunkToken`,
`datadogApiKey`, `mixpanelServiceAccountPassword`, `segmentWriteKey`), among others.

That default is what keeps credentials out of the repository, so:

- **Never set `AUTH0_EXPORT_SECRETS=true` (or pass `--export_secrets`) and then commit the
  result.** It writes the real values into `tenant.yaml`, and committing them puts them in
  Git history, where deleting the file later does not remove them.
- **The masking list is a fixed set, not a guarantee.** A resource type the list does not
  cover can still carry something sensitive. Skim the export for anything credential-shaped
  before the first commit, and treat that as part of the review in step 3.
### Keyword markers on import — what protects you, and what does not

Once an export contains `##SMTP_PASS##` and friends, an import needs a value for each marker.
The protection here is partial, and the boundary is worth knowing precisely.

**The CLI protects the common case.** `stripUnresolvedPlaceholders` (in `tools/utils.js`,
called from `handlers/default.js`) drops any field whose **entire** value matches
`/^(##[A-Z0-9_]+##|@@[A-Z0-9_]+@@)$/`, logs a warning, and leaves the existing tenant value
untouched. A bare `##SMTP_PASS##` is therefore safe — it is skipped, not written.

**Three shapes fall outside that regex,** because it is uppercase-only and anchored to the
whole value. These are *not* stripped, so they reach Auth0 as literal text and overwrite
whatever was there:

| Shape | Example |
|---|---|
| Punctuation in the key | `##tenant.url##` |
| Lowercase key | `##smtp_pass##` |
| Marker inside a longer string | `smtp.example.com:##PORT##` |

The workflow's **Reject unresolved keyword markers** step exists for exactly these. It matches
a deliberately broader shape than the CLI strips — both `##…##` and `@@…@@`, any key
characters — and fails the import listing every marker without a replacement.

**Keep mappings in the environment secret, not in `config.json`.** Supply them as a JSON
object in `AUTH0_KEYWORD_REPLACE_MAPPINGS` on the `auth0` environment. The environment value
replaces the file setting rather than merging with it, so mappings split across both sources
are a trap: the file's keys would look present locally while the CLI never sees them.
`config.json` ships with the mappings empty for that reason. Individual environment variables
also satisfy markers, since `commands/import.js` merges `process.env` into the mapping set.

---

## Usage

The CLI is pinned as a root devDependency, so use `npx` rather than a global install —
everyone and CI then run the same version.

**Node 20.19 or newer is required for this tooling specifically.** `auth0-deploy-cli@8.42.0`
declares `engines.node >= 20.19.0`. `START_HERE.md` says the project needs Node 18+, which is
true of the app but not of this CLI — npm will install it on Node 18 with nothing worse than
an engine warning, and `a0deploy` then fails at runtime. Check with `node --version` before
assuming a failure here is a credentials problem. The CI workflow pins `20.19` for the same
reason.

```bash
npm install                          # once, at the repo root
unset AUTH0_ALLOW_DELETE             # see below — do this before sourcing
set -a && . auth0/.env.auth0 && set +a
```

> **`unset` it, don't set it to `false`.** Sourcing `.env.auth0` cannot clear a variable your
> shell already exports, and the template deliberately leaves the assignment commented out.
> An inherited `AUTH0_ALLOW_DELETE=false` therefore survives into the import, where the raw
> truthy checks read the non-empty string `"false"` as **enabled**. `npm run auth0:import`
> refuses to run in that state rather than letting it through.

### Use the npm scripts, not `a0deploy` directly

```bash
npm run auth0:export     # read the tenant into auth0/tenant/
npm run auth0:import     # pre-flight checks, then write to the tenant
```

`auth0:import` runs `auth0/preflight.mjs` first — the same script CI runs — so the local and
CI paths get identical protection. Calling `npx a0deploy import` by hand skips it, which is
how a lowercase, punctuation-bearing, or embedded marker reaches the tenant as literal text.
Run `npm run auth0:preflight` on its own if you just want the checks.

### In CI

Actions → **Auth0 Tenant Config** → Run workflow, and pick `export` or `import`.

There is deliberately no `push:` trigger: this workflow can rewrite the tenant that governs
login, so an accidental merge must never fire it. `export` runs in CI upload the result as an
artifact rather than committing it — download it, review the diff, and commit it yourself.

Further constraints on CI runs:

- **Runs are serialized** through an `auth0-tenant` concurrency group with cancellation
  disabled, so two imports cannot interleave and an export cannot capture a half-applied
  import. Queued rather than cancelled, because a cancelled import is a partly-applied one.
- **Required reviewers** on the `auth0` environment, if you configure them, gate every run.
- **Imports are refused from any ref but the default branch** — with the important caveat
  below.

### Why the in-workflow branch guard is not the boundary

The workflow contains a step that fails an import dispatched from a non-default branch. That
step is a **fast, legible failure, not a security control**, and it should not be relied on
as one.

`workflow_dispatch` runs the workflow definition *from the ref the caller selects*. Anyone who
can push a branch can therefore edit or delete that guard on their branch and dispatch an
import from it, together with an unreviewed `auth0/tenant/tenant.yaml`. The check cannot
defend against a caller who controls the file containing the check.

What actually enforces it is configuration outside the repository, which is why steps 1–3
above are not optional:

- the **deployment branch restriction** on the `auth0` environment, which refuses to release
  the environment to a job running on any other ref; and
- keeping the credentials as **environment secrets**, so a job that never satisfies the
  environment's rules never receives them.

With both in place, a branch-dispatched import gets no credentials and fails regardless of
what the workflow file on that branch says.

**Consequence worth knowing: this restricts exports too.** `environment:` is evaluated per
*job*, before any step-level `if`, and export and import share one job. So once the branch
restriction is in place, an export dispatched from a feature branch is blocked as well, even
though it only reads. That is a deliberate trade — one credential set and one gate, rather
than two. If you need branch-flexible exports, split export and import into separate jobs
with separate environments and a read-only M2M application for the export side; run
`a0deploy export` locally in the meantime, which has no such restriction.

---

## ⚠️ `AUTH0_ALLOW_DELETE`

Defaults to `false` in `auth0/config.json`, and the CI workflow exposes it as an explicit,
default-off checkbox on each run.

When enabled, an import **deletes tenant resources that are absent from the committed
config**. On a tenant that has drifted — or against a partial export — that removes live
applications, connections, or rules. Turn it on only when you specifically intend a
destructive sync, and prefer proving the change on a development tenant first.

### Never set it to the string `false`

Counter-intuitive and worth stating explicitly: **`AUTH0_ALLOW_DELETE=false` in the
environment turns deletion ON** in some handlers.

Environment values are always strings, and the CLI reads this setting two different ways.
Some handlers compare strictly (`=== 'true' || === true`, e.g.
`handlers/default.js:295`), but others coerce the raw value:

- `!!config('AUTH0_ALLOW_DELETE')` — `handlers/default.js:224`, `handlers/rules.js:106`
- `if (!config('AUTH0_ALLOW_DELETE'))` — `handlers/themes.js:564`,
  `handlers/phoneProvider.js:183`

`!!'false'` is `true`, so those paths see the string `"false"` as permission to delete.

Leave the variable **unset** to stay safe. Unset, the CLI falls back to
`"AUTH0_ALLOW_DELETE": false` in `config.json`, which is a genuine boolean. Set it to
exactly `true` only when you mean it. The CI workflow already handles this: it emits
`'true'` or the empty string, never `'false'`.

---

## Files

| Path | Purpose |
|---|---|
| `config.json` | Non-secret CLI config: `AUTH0_ALLOW_DELETE`, keyword-replace mappings. No credentials. |
| `.env.auth0.example` | Template for local credentials. Copy to `.env.auth0` (gitignored). |
| `tenant/` | Exported tenant configuration. Populated by the first export. |

### Multiple environments

`AUTH0_KEYWORD_REPLACE_MAPPINGS` in `config.json` is empty because there is currently one
tenant. When a second (e.g. production) tenant appears, replace environment-specific values
in the exported YAML with `##KEYWORD##` markers and supply per-environment values either by
editing the mappings or by setting `AUTH0_KEYWORD_REPLACE_MAPPINGS` as a JSON string in the
environment, which overrides the file.
