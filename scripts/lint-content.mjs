#!/usr/bin/env node
// Content lint for the AI Enablement Playbook.
// Enforces the invariants that keep the pages from rotting:
//   1. Internal links resolve to a real page (root-relative, trailing slash).
//   2. Every doc has title + description frontmatter.
//   3. Code fences are balanced.
//   4. (warning) Prose and code don't reference things that have been retired
//      or renamed — see DEPRECATED below. AI tooling moves faster than
//      Kubernetes does; this list is the single place to record "that flag is
//      gone now" so a rename becomes one edit instead of an audit.
//
// Errors (1-3) fail the build (exit 1). Deprecation hits (4) print as warnings.
// Run: `npm run lint`  (or `node scripts/lint-content.mjs`)
//
// MAINTENANCE: when a vendor retires an endpoint, flag, action version, or tool
// name that this site used, add a row to DEPRECATED with the replacement. The
// lint then finds every page that still says the old thing.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DOCS = fileURLToPath(new URL('../src/content/docs/', import.meta.url));

// Retired or renamed things this site must not teach. Verified 2026-09-10.
const DEPRECATED = [
  {
    pattern: /mcp\.atlassian\.com\/v1\/sse/,
    say: 'Atlassian retired the /v1/sse endpoint (30 Jun 2026); use https://mcp.atlassian.com/v2/mcp with --transport http',
  },
  {
    pattern: /claude mcp add --transport sse\b/,
    say: '`--transport sse` is deprecated in Claude Code; use `--transport http`',
  },
  {
    pattern: /getConfluencePage|createConfluencePage|updateConfluencePage|searchConfluenceUsingCql/,
    say: 'Rovo MCP v2 renamed the Confluence tools: getConfluenceContent, createConfluenceContent, updateConfluenceContent, searchConfluence',
  },
  {
    pattern: /slack-github-action@v[123]\b/,
    say: 'slackapi/slack-github-action is at v4; v3 changed the Node runtime and v4 made YAML parsing stricter',
  },
  {
    pattern: /claude-code-action@beta/,
    say: 'anthropics/claude-code-action@beta is deprecated; use @v1',
  },
  {
    pattern: /@playwright\/mcp[^\n]*--save-trace/,
    say: 'Playwright MCP dropped --save-trace; tracing is browser_start_tracing/browser_stop_tracing under --caps devtools',
  },
  {
    pattern: /gitleaks (detect|protect)\b/,
    say: '`gitleaks detect/protect` are deprecated since 8.19; use `gitleaks git` or `gitleaks dir`',
  },
  {
    pattern: /Office 365 Connector|Incoming Webhook connector/i,
    say: 'Teams Office 365 Connectors were fully retired (May 2026); use the Workflows app webhook trigger',
  },
  {
    pattern: /\bactions\/checkout@v[1-5]\b/,
    say: 'actions/checkout is at v7 (v6 is fine); older majors run on retired Node versions',
  },
];

// --- collect all markdown files ------------------------------------------
async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (['.md', '.mdx'].includes(extname(e.name))) out.push(p);
  }
  return out;
}

function routeOf(absPath) {
  let rel = relative(DOCS, absPath).replace(/\\/g, '/').replace(/\.(md|mdx)$/, '');
  if (rel === 'index') return '/';
  if (rel.endsWith('/index')) rel = rel.slice(0, -'/index'.length);
  return '/' + rel + '/';
}

const files = await walk(DOCS);
const routes = new Set(files.map(routeOf));
routes.add('/blog/'); // starlight-blog index (plugin-generated, no file)
const sectionRoots = new Set(
  [...routes].map((r) => '/' + r.split('/').filter(Boolean)[0] + '/'),
);

const LINK = /\]\((\/[^)\s]+)\)/g;
const FM = /^---\n([\s\S]*?)\n---\n/;

let errors = 0;
let warnings = 0;
const report = (level, file, msg) => {
  console.log(`  ${level === 'err' ? 'ERROR' : 'warn '}  ${file}: ${msg}`);
  if (level === 'err') errors++;
  else warnings++;
};

for (const f of files) {
  const rel = relative(DOCS, f).replace(/\\/g, '/');
  const text = await readFile(f, 'utf8');

  // 2. frontmatter
  const m = text.match(FM);
  const fm = m ? m[1] : '';
  if (!/^title:/m.test(fm) || !/^description:/m.test(fm))
    report('err', rel, 'missing title/description frontmatter');

  // 3. fence balance
  if (((text.match(/^```/gm) || []).length) % 2 !== 0)
    report('err', rel, 'unbalanced code fences');

  // 1. internal links
  for (const [, link] of text.matchAll(LINK)) {
    let base = link.split('#')[0];
    if (!base.endsWith('/')) {
      report('err', rel, `internal link missing trailing slash: ${link}`);
      base += '/';
    }
    if (!routes.has(base) && !sectionRoots.has(base))
      report('err', rel, `broken internal link target: ${link}`);
  }

  // 4. deprecated patterns (warning). The lint script itself and the
  // troubleshooting pages may legitimately *name* a retired thing in order to
  // say "don't"; an `<!-- lint: allow-deprecated -->` comment anywhere in the
  // page opts it out.
  if (!/<!--\s*lint:\s*allow-deprecated\s*-->/.test(text)) {
    for (const { pattern, say } of DEPRECATED) {
      const hit = text.match(pattern);
      if (hit) report('warn', rel, `deprecated reference "${hit[0]}" — ${say}`);
    }
  }
}

console.log(
  `\ncontent-lint: ${files.length} pages, ${routes.size} routes — ${errors} error(s), ${warnings} warning(s).`,
);
process.exit(errors > 0 ? 1 : 0);
