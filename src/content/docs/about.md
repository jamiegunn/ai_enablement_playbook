---
title: About & Methodology
description: What this site is, who it's for, how its recipes are written and verified, which tool versions it assumes, and how to report an error.
keywords:
  - what is this site about
  - who this ai enablement guide is for
  - how the recipes are written and verified
  - which claude code version is assumed
  - how to report an error or mistake
  - license and content reuse
  - the ledger running example
  - written for tech leads not platform admins
  - how this guide is organized
  - sister site k8s soup to nuts
---

## What this site is

The AI Enablement Playbook is a field guide for engineering teams who want AI to do real work — Claude Code first, principles portable — and who own their team's workflow but **not** the enterprise AI platform. A platform team owns the Claude deployment, the managed settings, the GitHub org policy, and the allowlist of MCP servers; security owns what may leave the building; you own the repos, the CI, the tests, and the onboarding. Every page is written from that seat, and anything that crosses the boundary says so with a seat marker on the command block.

It covers two initiatives end to end, because two done properly beat ten done as demos:

- **Knowledge transfer on a legacy estate** — getting a large, old, multi-repo system out of two engineers' heads and a stale Confluence space, into artifacts a new hire can query and CI can keep true.
- **Overnight QA** — scheduled, bounded, unattended agent jobs on GitHub Actions that test code and applications and leave a morning report worth reading.

It is the sister of [K8s Soup to Nuts](https://jamiegunn.github.io/k8s_soup_to_nuts/): same bones, same voice, same reader seat, same recurring team. Where this site reaches Kubernetes, CI mechanics, or observability, it links there and stops.

## How content is written and verified

- **Vendor facts are checked, dated, and kept in the repo.** Every flag, endpoint, action version, and tool name on this site was verified against the vendor's current documentation on the date recorded in [`docs/research/`](https://github.com/jamiegunn/ai_enablement_playbook/tree/main/docs/research), and the pages cite that file rather than memory. When a vendor retires something the site used, the retired pattern goes into the [content lint](https://github.com/jamiegunn/ai_enablement_playbook/blob/main/scripts/lint-content.mjs), which then finds every page that still says it.
- **Commands and workflows are complete.** Real cast names, explicit paths, every flag, a `console` block of representative output, and — because most of this site's commands cross an ownership boundary — a `# seat:` comment on line one saying whose laptop, runner, or approval it runs from.
- **Prompts are artifacts, not incantations.** Every prompt the site relies on is shown in full with the filename it lives under in your repo, and reappears in a "Take this with you" block.
- **Every AI claim on this site carries evidence, and so must yours.** Generated documentation cites `path:line`; findings in a report link a log, a test, a screenshot, or a diff. Where a page shows model output that is inference rather than evidence, it is labelled as such. That rule is the site's answer to "how do we trust it" — you don't; you check the pointer.
- **Internal links are machine-checked.** Every build runs the content lint: all internal links resolve, every page has a title and description, code fences balance, and nothing on the retired list is taught. A broken link is a failed build.
- **One running example.** The fictional `payments` team, its modern `payments-api`, the fourteen-year-old `Ledger` estate (twenty-three repos, an Oracle schema, IBM MQ, a Confluence space with 940 pages), and its people — Dana the tech lead, Priya and Marcus the experts, Sam the new hire — thread through every page so names, numbers, and workflows stay consistent.
- **External review.** The site is periodically reviewed with the [content review prompt](https://github.com/jamiegunn/ai_enablement_playbook/blob/main/.github/prompts/content-review.prompt.md) (copy-paste trust first, then comprehension, architecture, voice), and findings are fixed rather than filed.

None of this makes the site error-free. When you find a mistake, please [report it](#reporting-an-error) — errors in an unattended recipe are treated as the highest-priority class of bug, because nobody is watching when they fire.

## Version policy

- **Claude Code** claims are phrased "as of September 2026" and were verified against [code.claude.com/docs](https://code.claude.com/docs) on 2026-09-10. Model names use the aliases (`sonnet`, `opus`, `haiku`) except on the enterprise page, where pinning by ID is the point. Prices are never printed; the arithmetic is taught with placeholders and the vendor's pricing page is linked.
- **GitHub Actions, Slack, Teams, Atlassian, Playwright** — action majors, endpoints, and tool names are the ones current on the same date. The [integrations fact sheet](https://github.com/jamiegunn/ai_enablement_playbook/blob/main/docs/research/FACTS-integrations-2026-09-10.md) records what was checked and what could not be.
- **Third-party tools move faster than the platforms.** Where a recipe names a version (`@playwright/mcp`, `slack-github-action@v4`, PIT, Stryker), it is the version the recipe was written against; if a flag is rejected, check the tool's current release notes first.
- Each page shows a **last-updated date** derived from its git history.

## Reporting an error

Found something wrong — a flag that's rejected, a workflow that fails, a prompt that doesn't produce what the page claims, an endpoint that's moved?

- **Open an issue:** [github.com/jamiegunn/ai_enablement_playbook/issues](https://github.com/jamiegunn/ai_enablement_playbook/issues) — there's a template for content errors.
- **Or edit directly:** every page has an "Edit page" link that opens the markdown source on GitHub.

Please include the page URL, what the page claims, what you observed (the exact error string), and your `claude --version`.

## License and reuse

Content is licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) and the code snippets, workflows, prompts, and scripts are additionally offered under the [MIT License](https://opensource.org/license/mit) — copy them into your own repos, pipelines, and runbooks freely, with attribution appreciated for prose reuse. See the [LICENSE file](https://github.com/jamiegunn/ai_enablement_playbook/blob/main/LICENSE) for the exact terms.

## Colophon

Built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build); full-text search by Pagefind; diagrams by Mermaid, self-hosted; hosted on GitHub Pages. The site is a static build — no analytics, no cookies, no accounts. Yes, an AI helped write a site about using AI; every command was still run, and every fact was still checked against its source.
