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
const CONFIG_FILE = process.argv[3] || 'auth0/config.json';

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

// Markers a YAML parser will swallow: those sitting where a value belongs, so
// the key ends up null. Returns one entry per occurrence — never deduplicated by
// name, since the same marker can appear quoted in one place and unquoted in
// another, and the unquoted one is the dangerous one.
export function unquotedMarkersInLine(line) {
  if (/^\s*#/.test(line)) return []; // a whole-line comment harms nothing

  const start = line.match(/(^|\s)#/); // where an inline comment begins
  if (!start) return [];

  const at = start.index + start[0].length - 1;
  const before = line.slice(0, at);

  // Only a value position matters: `key:` or a bare list dash with nothing after
  // it. `key: value  # note ##FOO##` keeps its value and is fine.
  if (!/:\s*$/.test(before) && !/^\s*-\s*$/.test(before)) return [];

  return [...line.slice(at).matchAll(ANY_MARKER)].map((m) => m[1]);
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
  const unquoted = []; // { marker, file, line } per occurrence, not per name
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

      // Unquoted `key: ##FOO##` is a YAML comment, so the value parses as null
      // and an import writes that null over the credential. Parsed values cannot
      // reveal this, so inspect the raw lines — per occurrence, and only where a
      // value should have been. An earlier version compared marker *names*
      // against the parsed set, which both masked an unquoted marker whenever
      // the same name appeared quoted elsewhere, and flagged ordinary comments
      // like `# preserve ##FOO## during bootstrap` that harm nothing.
      text.split(/\r?\n/).forEach((line, i) => {
        for (const marker of unquotedMarkersInLine(line)) {
          unquoted.push({ marker, file, line: i + 1 });
        }
      });
    } else {
      // Raw assets (page HTML, rule scripts): a marker here is always embedded.
      for (const m of text.matchAll(ANY_MARKER)) note(m[1], file);
    }
  }

  return { risky, safe, unquoted };
}

export function loadMappings(env = process.env) {
  // One environment variable per marker — nothing else resolves.
  //
  // commands/import.js does:
  //   const mappings = nconf.get('AUTH0_KEYWORD_REPLACE_MAPPINGS') || {};
  //   nconf.set('AUTH0_KEYWORD_REPLACE_MAPPINGS', Object.assign(mappings, process.env));
  //
  // nconf returns that variable as a raw *string*, and Object.assign never
  // parses it, so a JSON object in AUTH0_KEYWORD_REPLACE_MAPPINGS supplies no
  // keys at all. Verified: a blob of {"SMTP_PASS":"…"} yields undefined for
  // SMTP_PASS, while an env var named SMTP_PASS resolves.
  //
  // This used to parse that JSON, which meant pre-flight approved imports the
  // CLI could not resolve — the guard clearing exactly the failure it exists to
  // catch. Validate only what the CLI can actually see.
  return { ...env };
}

function main() {
  if (!fs.existsSync(path.join(TENANT_DIR, 'tenant.yaml'))) {
    console.error(`${TENANT_DIR}/tenant.yaml not found.`);
    console.error('Run an export first, then review and commit the result.');
    process.exit(1);
  }

  // Check BOTH sources the CLI reads. Checking only the environment missed the
  // one place the switch is version-controlled: `"AUTH0_ALLOW_DELETE": true` in
  // config.json would sail through here and then delete during the import that
  // runs seconds later.
  let fileConfig = {};
  try {
    fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (err) {
    console.error(`Could not read ${CONFIG_FILE}: ${err.message}`);
    process.exit(1);
  }

  for (const [source, raw] of [
    ['environment', process.env.AUTH0_ALLOW_DELETE],
    [CONFIG_FILE, fileConfig.AUTH0_ALLOW_DELETE],
  ]) {
    // A real boolean false in the config file is the safe, intended default —
    // only a *string* is dangerous, because that is what the raw truthy checks
    // misread. Skip the boolean case.
    if (raw === false || raw === undefined || raw === null) continue;

    const { value, wasCoerced } = normalizeAllowDelete(raw);
    if (wasCoerced) {
      console.error(`AUTH0_ALLOW_DELETE is a falsy-looking string in ${source}.`);
      console.error('Parts of the CLI read it with a raw truthy test, so the string "false"');
      console.error('would ENABLE deletion — the opposite of how it reads.\n');
      console.error(
        source === 'environment'
          ? '  unset AUTH0_ALLOW_DELETE\n'
          : `  set it to the boolean false (not "false") in ${source}\n`
      );
      console.error('Use exactly true only when you intend a destructive sync.');
      process.exit(1);
    }
    if (value !== undefined) {
      console.warn(`AUTH0_ALLOW_DELETE=${value} (from ${source}) — deletion is ENABLED for this import.`);
    }
  }

  const mappings = loadMappings();

  if ((process.env.AUTH0_KEYWORD_REPLACE_MAPPINGS || '').trim()) {
    console.error('AUTH0_KEYWORD_REPLACE_MAPPINGS is set, but the CLI never parses it.');
    console.error('nconf hands it to Object.assign as a raw string, so a JSON object here');
    console.error('supplies no keys. Set one variable per marker instead:\n');
    console.error('  ##SMTP_PASS##  ->  a secret named SMTP_PASS\n');
    console.error('See auth0/README.md, "Supplying marker values".');
    process.exit(1);
  }

  const { risky, safe, unquoted } = scanTenantDir(TENANT_DIR);

  if (unquoted.length) {
    console.error(`\nRefusing to import: ${unquoted.length} marker occurrence(s) are not quoted.`);
    console.error('YAML reads an unquoted ## as a comment, so the value parses as null and');
    console.error('the import writes null over the real credential.\n');
    for (const { marker, file, line } of unquoted) {
      console.error(`  ${marker}  (${file}:${line})`);
    }
    console.error('\nQuote them, e.g.  client_secret: "##SMTP_PASS##"');
    process.exit(1);
  }

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
