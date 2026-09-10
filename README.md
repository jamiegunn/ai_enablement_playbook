# AI Enablement Playbook

A static field guide + blog for engineering teams putting AI (Claude Code
first, principles portable) to work on two problems that actually hurt:

1. **Knowledge transfer on legacy code** — onboarding new developers onto a
   large, multi-repo estate whose architecture lives in two people's heads and
   a Confluence space nobody trusts.
2. **Overnight QA** — scheduled, unattended agent jobs that test code and
   applications while the team sleeps and leave a morning report worth reading.

Sister site to [K8s Soup to Nuts](https://github.com/jamiegunn/k8s_soup_to_nuts):
same bones, same voice, same reader seat ("you own the team's workflow, not
the enterprise AI platform").

Built with [Astro](https://astro.build) + [Starlight](https://starlight.astro.build),
with full-text search via Pagefind (built in — works offline, no external service)
and a blog via [starlight-blog](https://github.com/HiDeoo/starlight-blog).

## Local development

```bash
npm install
npm run dev        # http://localhost:4321/ai_enablement_playbook
```

Note: search (Pagefind) only works on a production build:

```bash
npm run build
npm run preview
```

Before pushing, run the content lint (every internal link must resolve, every
page needs `title` + `description`, fences must balance, and nothing may
teach a retired flag or endpoint):

```bash
npm run lint
```

## Writing content

All content is markdown under `src/content/docs/`:

| Directory          | Sidebar section              |
| ------------------ | ---------------------------- |
| `start/`           | Start Here                   |
| `kt/`              | Knowledge Transfer Playbook  |
| `overnight-qa/`    | Overnight QA Playbook        |
| `toolkit/`         | Claude Code Toolkit          |
| `troubleshooting/` | Troubleshooting              |
| `blog/`            | Field Notes (dated posts)    |

Docs article frontmatter:

```yaml
---
title: Article Title
description: One sentence used by search and SEO.
keywords:            # optional: search-only synonyms, symptoms, error strings
  - the agent made up an api
sidebar:
  order: 3 # position within its section
---
```

Blog post frontmatter:

```yaml
---
title: Post Title
description: One sentence.
date: 2026-09-01
authors: editor
tags: [kt, confluence]
excerpt: Hook shown on the blog index.
---
```

Cross-link between articles with root-relative links and a trailing slash:
`/kt/quick-start/`, `/toolkit/headless-and-sdk/#exit-codes`. The base path is
applied at build time (`src/plugins/rehype-base-links.mjs`), so content never
hardcodes the repo name.

The site plan — reader seat, contracts, cast, page inventories — is in
[SITE-PLAN.md](SITE-PLAN.md). Verified vendor facts the pages were written
against are in `docs/research/`; re-verify those before publishing changes to
any command or endpoint.

Every prompt, workflow, hook, template and config the site teaches lives once in
[docs/CANONICAL-ARTIFACTS.md](docs/CANONICAL-ARTIFACTS.md) and is extracted to
[`starter-kit/`](starter-kit/) as real, runnable files. Pages quote the canonical
version verbatim — if an artifact changes, change it there first, then every page
that quotes it, then re-extract.

## Deployment (GitHub Pages)

Pushing to `main` triggers `.github/workflows/deploy.yml`, which lints, builds
the site, and publishes it to GitHub Pages.

One-time setup in the GitHub repo: **Settings → Pages → Source: GitHub Actions**.

If the repo name or owner changes, update `site` and `base` in
`astro.config.mjs` (and the hero action links in `src/content/docs/index.mdx`).
