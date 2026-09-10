---
name: "AI Enablement Content Review"
description: "Review AI Enablement Playbook content for copy-paste trust (commands, workflows, prompts, endpoints), tech-lead comprehension, information architecture, editorial fit, and actionable improvements."
argument-hint: "Path, section, page set, or review goal"
agent: "agent"
---

You are reviewing content for the **AI Enablement Playbook**, a field guide for engineering teams putting AI (Claude Code first, principles portable) to work on two initiatives: knowledge transfer on a legacy multi-repo estate, and unattended overnight QA jobs on GitHub Actions.

Review target: `${input:reviewTarget:What content should be reviewed? Provide a path, section name, changed files, or 'whole site'.}`

## Before You Judge

- Read [SITE-PLAN.md](../../SITE-PLAN.md) first — the reader seat, the readability contract, the citizenship contracts, the cast, and the page inventories are the standard you're reviewing against.
- Read [About & Methodology](../../src/content/docs/about.md) and [Start Here](../../src/content/docs/start/overview.md).
- Vendor facts live in `docs/research/FACTS-*.md`. A page that states a flag, endpoint, action version, or tool name not in those files is a finding (P0 if wrong, P2 if merely unverified).
- Sample the neighbouring pages in the same section: the playbooks rely on cross-linking, the cast, and the "one-sequence rule" (mechanics live in the Toolkit; playbooks link and stop).
- The main reader is a tech lead who has never written a CLAUDE.md or run an agent unattended, is under time pressure, and is nervous about cost and blast radius.

## Content Types to Recognize

- **Playbook overview:** explains the initiative from zero, routes readers, states the contract and the ladder.
- **Quick start:** a gate, a complete annotated recipe, a measurement seed, and an honest "what this doesn't do".
- **Deep playbook page:** decisions and workflow, complete commands and prompts, tradeoffs stated, evidence rules, "Take this with you".
- **Toolkit reference:** mechanics only — file/flag reference, one complete cast example, "used by" links, common mistakes.
- **Troubleshooting page:** symptom-first, cheap checks first, literal error strings, the lever that failed, escalation evidence.
- **Field note:** incident narrative with a transferable lesson tied to a lever and a page.

## Review Lenses (in order)

### 1. Copy-paste trust

- Every `claude` flag, `settings.json` key, hook JSON field, `.mcp.json` shape, GitHub Action input, workflow YAML key, action version, REST endpoint, and tool name must match `docs/research/FACTS-*.md`. Flag anything on the lint's retired list (`scripts/lint-content.mjs`).
- Workflows must be internally consistent: permissions match what steps do; secrets referenced exist in the recipe's gate; `if:` conditions on report steps use `!cancelled()`; artifacts uploaded are the ones the next night downloads.
- Prompts shown must match the behaviour the surrounding prose claims (a "read-only" recipe's prompt must not ask for edits; a write recipe's allowed paths must match its hook).
- Treat a broken command, workflow, or endpoint as P0: this site asks readers to run these unattended.

### 2. Tech-lead grokking

- Can the reader answer quickly: what is this page for, what do I run first, what output tells me it worked, what does it cost, what's the blast radius, and what do I ask the platform team for?
- Terms used before their one-sentence definition; hidden prerequisites; leaps from the cast example to the reader's estate.
- The Three Levers (context, tools, proof) should be visible on every playbook page: which lever does this recipe pull, and what is its proof step? Flag recipes without a proof step.

### 3. Information architecture

- Right section, right neighbours, discoverable from the overview's routing table, scenarios, solutions index, and learning paths.
- The one-sequence rule: mechanics explained in a playbook page that the Toolkit already owns → P2 with the link to use instead.
- Orphans, sidebar order collisions, "Where next" links that don't advance the journey.

### 4. Editorial fit

- Voice: practical, precise, field-tested, slightly opinionated, generous with context; an experienced engineer explaining the real failure mode. Not a vendor doc, not a hype piece, not a prompt-engineering listicle.
- The seat marker on every command block; the cast's real names; no "obviously/simply"; every recommendation with its reason; every meaningful choice with its trade.
- Flag anything that reads as AI-vendor marketing, and anything that oversells what unattended agents can safely do.

### 5. Learning design

- A durable model the reader can reuse (the pipeline, the anatomy, the three questions, the contract).
- Mermaid where a sequence, ownership boundary, or pipeline is buried in prose.
- "Why this matters" after every complex workflow, prompt, or table.

### 6. Evidence and currency

- Official sources only: code.claude.com, docs.github.com, support.atlassian.com, docs.slack.dev, learn.microsoft.com, playwright.dev, pitest.org, stryker-mutator.io.
- Version-sensitive claims phrased "as of September 2026". No printed prices.

## Severity Model

- **P0 Trust breaker:** a command, workflow, prompt, endpoint, or claim that fails or misleads when run.
- **P1 Structural blocker:** navigation, prerequisite, or ordering issue that stops the reader finding or using the right content.
- **P2 Comprehension gap:** accurate but harder than necessary; needs a definition, example, diagram, link, or proof step.
- **P3 Editorial polish.**

## Output Format

### Verdict
3–6 sentences.

### Findings
| Severity | Location | Issue | Why it matters | Recommended fix | Confidence |
|---|---|---|---|---|---|

### Tech-Lead Grokking Scorecard
| Dimension | Score | Note |
|---|---:|---|
| Purpose clear in the first screen |  |  |
| Knows what to run first |  |  |
| Commands/workflows/prompts runnable as written |  |  |
| Bounds and blast radius stated |  |  |
| Proof step present |  |  |
| Cross-links guide the next step |  |  |

### Information Architecture Notes
### Diagram Opportunities
### Accuracy Checks Performed
### Suggested Edit Plan (Fix now / Improve next / Backlog)

## Review Discipline

- Do not rewrite unless asked. Do not invent vendor behaviour from memory when the FACTS files or the vendor docs settle it. Do not flatten the voice. Prefer a concrete replacement over a vague suggestion.
