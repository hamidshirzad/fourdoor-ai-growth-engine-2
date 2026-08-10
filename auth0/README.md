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
   no wildcard entry to tick. Searching the permissions list for `read:*` finds nothing.
   Filter by the verb prefix and select every entry, or select the specific resources you
   intend to manage:

   | Intent | Grant |
   |---|---|
   | Export only | every `read:` permission |
   | Export + import | every `read:`, `create:`, and `update:` permission |
   | Deletion | additionally every `delete:` permission — only alongside `AUTH0_ALLOW_DELETE=true`, which should not be your default. See the warning below. |

   Concretely, "every `read:` permission" means entries like `read:clients`,
   `read:client_grants`, `read:connections`, `read:resource_servers`, `read:rules`,
   `read:roles`, `read:organizations`, `read:tenant_settings`, `read:custom_domains`,
   `read:email_templates`, `read:actions`, `read:log_streams`, `read:prompts`, and so on —
   one per resource type the CLI handles.

   The authoritative, version-specific list is in the Deploy CLI's own documentation; because
   the required set changes as the tool adds resource types, prefer selecting the whole verb
   prefix over hand-picking, and re-check it after a major CLI upgrade.

The Deploy CLI's own application is deliberately not manageable by the CLI, so it cannot
lock itself out.

### Local credentials

```bash
cp auth0/.env.auth0.example auth0/.env.auth0   # gitignored
```

Fill in `AUTH0_DOMAIN` (`dev-sfv34zclvdf4noih.auth0.com`), plus the **M2M** application's
`AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET`.

### CI credentials

Add the same three values as GitHub Actions secrets: `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`,
`AUTH0_CLIENT_SECRET`. Then create a repository environment named `auth0` and add required
reviewers to it — that is what gates tenant writes behind a human approval.

---

## Bootstrap order

`auth0/tenant/` is empty in a fresh clone. Nothing can be imported before something has been
exported, so run these in order:

1. Create the M2M app and set credentials (above).
2. **Export** the live tenant into `auth0/tenant/`.
3. **Review** the export and commit it. This is the step that makes tenant config
   reviewable — read the diff rather than committing it blind.
4. **Import** is only meaningful once step 3 has happened.

The CI workflow fails fast with an explanatory message if you ask it to import before
`auth0/tenant/tenant.yaml` exists.

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
set -a && . auth0/.env.auth0 && set +a
```

### Export — read the tenant into the repo

```bash
npx a0deploy export \
  --config_file auth0/config.json \
  --format yaml \
  --output_folder auth0/tenant
```

### Import — write the repo config to the tenant

```bash
npx a0deploy import \
  --config_file auth0/config.json \
  --input_file auth0/tenant/tenant.yaml
```

### In CI

Actions → **Auth0 Tenant Config** → Run workflow, and pick `export` or `import`.

There is deliberately no `push:` trigger: this workflow can rewrite the tenant that governs
login, so an accidental merge must never fire it. `export` runs in CI upload the result as an
artifact rather than committing it — download it, review the diff, and commit it yourself.

Three further constraints on CI runs:

- **Imports only run from the default branch.** `workflow_dispatch` lets you choose any ref
  and `actions/checkout` honours it, so without a guard you could import an unmerged
  `tenant.yaml` straight to the live tenant and skip review entirely. The workflow refuses
  that. Exports are read-only and may run from any branch. For defence in depth, also set a
  **deployment branch restriction** on the `auth0` environment in repository settings, which
  enforces the same rule outside the workflow file.
- **Runs are serialized** through a `auth0-tenant` concurrency group with cancellation
  disabled, so two imports cannot interleave and an export cannot capture a half-applied
  import. Queued rather than cancelled, because a cancelled import is a partly-applied one.
- **Required reviewers** on the `auth0` environment, if you configure them, gate every run.

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
