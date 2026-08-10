#!/usr/bin/env node
//
// Pre-flight checks for `a0deploy import`. Run by CI and by the local
// `npm run auth0:import` wrapper, so both paths get the same protection —
// previously the guard existed only in the workflow, which left the documented
// local command unprotected.
//
// Two checks, both about ways an import can quietly destroy tenant data:
//
//   1. AUTH0_ALLOW_DELETE inherited as a string. Several CLI handlers read it
//      with a raw truthy test (`!!config(...)` in handlers/default.js and
//      handlers/rules.js; `if (!config(...))` in handlers/themes.js and
//      handlers/phoneProvider.js). `!!"false"` is true, so an inherited
//      AUTH0_ALLOW_DELETE=false ENABLES deletion.
//
//   2. Keyword markers the CLI will not strip. stripUnresolvedPlaceholders
//      (tools/utils.js) drops any field whose ENTIRE value matches
//      /^(##[A-Z0-9_]+##|@@[A-Z0-9_]+@@)$/ and preserves the tenant's value, so
//      those are safe and are deliberately NOT flagged here — flagging them
//      would block the ordinary bootstrap, where a secrets-masked export is
//      full of them. Anything outside that shape (lowercase, punctuation in the
//      key, or a marker embedded in a longer string) is sent to Auth0 as
//      literal text and overwrites the real value.

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const TENANT_DIR = process.argv[2] || 'auth0/tenant';

// Exactly the shape the CLI strips for you.
const CLI_STRIPS = /^(##[A-Z0-9_]+##|@@[A-Z0-9_]+@@)$/;
// Any marker at all, either delimiter form, any key characters.
const ANY_MARKER = /(##[^#\r\n]+?##|@@[^@\r\n]+?@@)/g;

export function normalizeAllowDelete(raw) {
  if (raw === undefined || raw === null) return { value: undefined, wasCoerced: false };
  const v = String(raw).trim().toLowerCase();
  const off = v === '' || v === 'false' || v === '0' || v === 'no';
  return { value: off ? undefined : String(raw), wasCoerced: off && v !== '' };
}

// Markers in a scalar that the CLI will NOT strip.
export function riskyMarkers(value) {
  if (typeof value !== 'string') return [];
  if (CLI_STRIPS.test(value)) return [];
  return [...value.matchAll(ANY_MARKER)].map((m) => m[1]);
}

function walkValues(node, visit) {
  if (node === null || node === undefined) return;
  if (typeof node === 'string') return visit(node);
  if (Array.isArray(node)) return node.forEach((n) => walkValues(n, visit));
  if (typeof node === 'object') return Object.values(node).forEach((n) => walkValues(n, visit));
}

function listFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    entry.isDirectory() ? listFiles(full, out) : out.push(full);
  }
  return out;
}

export function scanTenantDir(dir) {
  const risky = new Map(); // marker -> Set(file)
  const safe = new Set();
  const note = (marker, file) => {
    if (!risky.has(marker)) risky.set(marker, new Set());
    risky.get(marker).add(file);
  };

  for (const file of listFiles(dir)) {
    const text = fs.readFileSync(file, 'utf8');

    if (/\.ya?ml$/i.test(file)) {
      // Parsing lets us tell a whole-value marker (safe) from an embedded one.
      let doc;
      try {
        doc = yaml.load(text);
      } catch {
        // Unparseable YAML: fall back to treating every marker as risky.
        for (const m of text.matchAll(ANY_MARKER)) note(m[1], file);
        continue;
      }
      walkValues(doc, (value) => {
        if (CLI_STRIPS.test(value)) {
          safe.add(value);
          return;
        }
        for (const m of riskyMarkers(value)) note(m, file);
      });
    } else {
      // Raw assets (page HTML, rule scripts): a marker here is always embedded.
      for (const m of text.matchAll(ANY_MARKER)) note(m[1], file);
    }
  }

  return { risky, safe };
}

export function loadMappings(env = process.env) {
  // Mirrors commands/import.js: the AUTH0_KEYWORD_REPLACE_MAPPINGS value, with
  // process.env merged in. config.json is not consulted — the environment value
  // replaces the file setting rather than merging with it.
  const mappings = {};
  const raw = (env.AUTH0_KEYWORD_REPLACE_MAPPINGS || '').trim();
  if (raw) {
    try {
      Object.assign(mappings, JSON.parse(raw));
    } catch {
      throw new Error('AUTH0_KEYWORD_REPLACE_MAPPINGS is not valid JSON.');
    }
  }
  return Object.assign(mappings, env);
}

function main() {
  if (!fs.existsSync(path.join(TENANT_DIR, 'tenant.yaml'))) {
    console.error(`${TENANT_DIR}/tenant.yaml not found.`);
    console.error('Run an export first, then review and commit the result.');
    process.exit(1);
  }

  const { value: allowDelete, wasCoerced } = normalizeAllowDelete(process.env.AUTH0_ALLOW_DELETE);
  if (wasCoerced) {
    console.error('AUTH0_ALLOW_DELETE is set to a falsy-looking string in this environment.');
    console.error('Parts of the CLI read it with a raw truthy test, so the string "false"');
    console.error('would ENABLE deletion. Unset it instead:\n');
    console.error('  unset AUTH0_ALLOW_DELETE\n');
    console.error('Set it to exactly "true" only when you intend a destructive sync.');
    process.exit(1);
  }
  if (allowDelete !== undefined) {
    console.warn(`AUTH0_ALLOW_DELETE=${allowDelete} — deletion is ENABLED for this import.`);
  }

  let mappings;
  try {
    mappings = loadMappings();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const { risky, safe } = scanTenantDir(TENANT_DIR);
  if (safe.size) {
    console.log(
      `${safe.size} standalone marker(s) present; the CLI strips these and preserves the ` +
        'existing tenant values.'
    );
  }

  const missing = [...risky.entries()]
    .filter(([marker]) => !(marker.replace(/^(##|@@)|(##|@@)$/g, '') in mappings))
    .sort(([a], [b]) => a.localeCompare(b));

  if (missing.length) {
    console.error(`\nRefusing to import: ${missing.length} marker(s) the CLI cannot strip have no value.`);
    console.error('These are written to Auth0 as literal text, overwriting the real value.\n');
    for (const [marker, files] of missing) {
      console.error(`  ${marker}  (${[...files].join(', ')})`);
    }
    console.error('\nProvide them as a JSON object in AUTH0_KEYWORD_REPLACE_MAPPINGS.');
    process.exit(1);
  }

  console.log('Pre-flight checks passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
