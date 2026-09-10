---
title: "The Toolkit: What Each Piece Is For"
description: A one-page map of Claude Code's mechanisms — which lever each pulls, where it lives in your repo, and which playbook recipes depend on it — so you know which reference page to open.
keywords:
  - claude code toolkit reference
  - what is the difference between claude.md skills subagents hooks
  - where does .claude/settings.json go
  - claude code settings precedence managed settings
  - what does .mcp.json do
  - claude code repo layout .claude folder
  - which claude code feature do i need
  - claude code mechanics explained once
sidebar:
  order: 1
---

This section is the reference the two playbooks lean on. Every mechanism Claude Code offers — the standing orders in `CLAUDE.md`, skills, subagents, hooks, MCP, headless mode and the Agent SDK, the GitHub Action, settings and permissions, the platform team's managed settings — is explained *once*, on one page, with its file or flag reference, one complete example from the cast, the playbook recipes that use it, and the two or three mistakes people make with it. The playbooks are about decisions and workflow; this section is about how the machine works. If you came here from a playbook page, the table below tells you which page to open; if you came here cold, read the table and then whichever page matches the thing you're about to build.

Every piece is described the same way throughout the site, using [the Three Levers](/start/the-three-levers/): **context** (what the model can see), **tools** (what it can do, and may do), **proof** (how you'll know it was right). A mechanism that pulls the wrong lever for your problem is the most common wasted afternoon, so the lever is the second column.

## The pieces

| Piece | Lever | Where it lives | What it's for | Used by |
|---|---|---|---|---|
| **`CLAUDE.md`** | Context | `./CLAUDE.md` (committed), `./CLAUDE.local.md` (gitignored), `~/.claude/CLAUDE.md` | The standing orders loaded into every session: what this repo is, how to work here, what not to do | [Day-1 Checklist](/start/day-1-checklist/) · [The 90-Minute Repo Map](/kt/quick-start/) · [The First Two Weeks](/kt/onboarding-track/) |
| **`.claude/rules/`** | Context | `.claude/rules/*.md`, optional `paths:` frontmatter | Instructions that load only when the model works on matching files — the way a large `CLAUDE.md` stays small | [Mapping One Repo](/kt/mapping-a-repo/) |
| **Skills** | Context (tools via `allowed-tools`) | `.claude/skills/<name>/SKILL.md` | A procedure you invoke by name — `/map-repo`, `/characterize` — with its own tool list and rules | [Mapping One Repo](/kt/mapping-a-repo/) · [Characterization Tests](/overnight-qa/characterization-tests/) · [Confluence](/kt/confluence/) |
| **Subagents** | Context (tools per agent) | `.claude/agents/<name>.md`; `--agents` inline | Delegation with a fresh context window; a summary comes back; how twenty-three repos fit | [Mapping the System](/kt/mapping-the-system/) · [Mapping One Repo](/kt/mapping-a-repo/) |
| **Hooks** | Tools | `.claude/settings.json` → `.claude/hooks/*.sh` | A script at a lifecycle event that can refuse or rewrite a tool call with a reason — the fence that doesn't rely on good behaviour | [Day-1 Checklist](/start/day-1-checklist/#7-the-destructive-command-hook) · [Blast Radius](/overnight-qa/blast-radius/) · [Characterization Tests](/overnight-qa/characterization-tests/) |
| **MCP** | Context (each server is also tools) | `.mcp.json` (project), `~/.claude.json` (user), `--mcp-config` for a run | A connection to something outside the repo — Confluence, GitHub, a browser — exposed as tools | [Confluence](/kt/confluence/) · [Exploratory & E2E](/overnight-qa/exploratory-and-e2e/) |
| **Headless `-p`** | Tools (the bounds) · Proof (the JSON) | Flags on `claude -p`; `scripts/run-claude.sh` | The same loop with nobody at the keyboard; every decision made in advance as a flag; evidence in JSON | [The First Night](/overnight-qa/quick-start/) · [Running Claude Unattended](/overnight-qa/running-unattended/) |
| **Agent SDK** | Tools · Proof | `claude-agent-sdk` (Python), `@anthropic-ai/claude-agent-sdk` (TypeScript) | The same loop driven from a program, for when a shell wrapper outgrows flags | [Running Claude Unattended](/overnight-qa/running-unattended/) |
| **GitHub Action** | Tools | `.github/workflows/*.yml` with `anthropics/claude-code-action@v1` | `@claude` mentions on issues and PRs, and PR-time automation with a `prompt` | [Keeping It True](/kt/living-docs/) · [Review & Security](/overnight-qa/review-and-security/) |
| **Settings & permissions** | Tools | `.claude/settings.json`, `.claude/settings.local.json`, `--settings` | The permission mode, allow and deny rules, and the hook wiring | [Day-1 Checklist](/start/day-1-checklist/) · [Blast Radius](/overnight-qa/blast-radius/) |
| **Managed settings** | Tools (theirs, not yours) | `/etc/claude-code/managed-settings.json` and the macOS and Windows equivalents | The platform team's fleet-wide policy; nothing below it can override it | [Working Within Policy](/start/working-within-policy/) · [Enterprise Setup](/toolkit/enterprise-and-cost/) |

Two things the table makes visible. Almost everything you own lives under `.claude/` in the repo and is reviewed like code. And the only rows that are purely *proof* mechanisms are the headless JSON and the schema — proof on this site is mostly a workflow habit (citations, stamps, tests that run), not a feature.

## The one-sequence rule

**Every mechanism is explained once, here, and the playbooks link to it and stop.** When a playbook page reaches "…and here's how `CLAUDE.md` loading works" or "the hook receives this JSON", it gives one sentence of definition and a link to the Toolkit page; it never explains the mechanics a second time. The rule exists so that a fact about Claude Code — a flag, a file path, a JSON field — lives in exactly one place and can be corrected in exactly one place when the vendor changes it. Every fact on these pages was verified against the vendor's documentation on the date in the site's research notes and is phrased "as of September 2026" where it can move.

The rule cuts both ways: these pages do not tell you *whether* to run the night read-only, or which repo to map first, or what a good morning report looks like. That's the playbooks' job.

## Settings precedence

Several files can carry permissions, hooks, and the other settings keys. When they disagree, the higher row wins — as of September 2026:

| Wins | Source | Who writes it |
|---|---|---|
| 1 | Managed settings — `managed-settings.json`, MDM, or the console | The platform team; you can read it, never override it |
| 2 | `--settings <file\|json>` on the command line | You, for one run — how `settings.night.json` reaches a job that writes |
| 3 | `.claude/settings.local.json` | You, uncommitted, for your laptop only |
| 4 | `.claude/settings.json` | You, committed — the repo's policy, reviewed like code |
| 5 | `~/.claude/settings.json` | You, for every repo on your machine |

`CLAUDE.md` has its own hierarchy (managed → user → project → local) and its own page, [CLAUDE.md: The Standing Orders](/toolkit/claude-md/); MCP servers have three scopes of their own on [the MCP page](/toolkit/mcp/). Don't assume the three orderings match.

## Where the artifacts live

A repo that runs both playbooks ends up with this shape. The letter codes are the site's canonical artifacts, each shown in full on the page that owns it; everything under `.claude/`, `prompts/`, and `scripts/` is committed and reviewed, and the two `local` files are in `.gitignore` from [day one](/start/day-1-checklist/):

```text
ledger-api/
├── CLAUDE.md                        the standing orders, three sections (A1)
├── CLAUDE.local.md                  your personal overlay — gitignored
├── .mcp.json                        project-scoped MCP servers: atlassian, playwright (A16)
├── .claude/
│   ├── settings.json                Day-1 permissions baseline + hook wiring (A3)
│   ├── settings.local.json          your personal permissions — gitignored
│   ├── settings.night.json          the policy for jobs that WRITE, passed with --settings (A6)
│   ├── rules/                       path-scoped instructions, optional
│   ├── skills/
│   │   ├── map-repo/SKILL.md        the repo-mapping skill (A2)
│   │   └── characterize/SKILL.md    the night's test-writing skill (A17)
│   ├── agents/
│   │   └── repo-question.md         the fan-out subagent
│   └── hooks/
│       ├── block-destructive.sh     PreToolUse guard on Bash (A4)
│       └── write-scope.sh           PreToolUse guard on Edit|Write (A5)
├── prompts/
│   ├── nightly-triage.md            the read-only triage prompt (A8)
│   └── report.schema.json           the machine-readable report shape (A10)
├── scripts/
│   ├── run-claude.sh                the unattended-run wrapper (A7)
│   └── check-citations.sh           the citation freshness check (A14)
├── docs/
│   ├── ARCHITECTURE.md              the map — DRAFT until a named expert stamps it
│   └── decisions/                   one record per "why", from the expert sessions
└── .github/workflows/
    ├── nightly-triage.yml           L1, read-only (A9)
    ├── nightly-characterize.yml     L2, writes under src/test/ only
    ├── nightly-e2e.yml              L3, self-hosted runner
    ├── nightly-review.yml           L3, the day's PRs
    └── nightly-freshness.yml        the KT bridge (A15)
```

`CLAUDE.md` is the only file the model reads without being asked. Everything else is either invoked (`/map-repo`), wired (`settings.json` → a hook), connected (`.mcp.json`), or run by a workflow. Keeping that distinction in your head prevents most "why didn't it read my prompt file" confusion.

## How to read these pages

Each page follows the same order: a one-paragraph plain-language definition, the lever it pulls, the file or flag reference as a table, one complete example from the cast, the playbook recipes that use it, the mistakes people make (each with its fix), and one link to the vendor's documentation. Read the definition and the mistakes if you're in a hurry; the tables are for when you're typing.

The vendor's own reference is [code.claude.com/docs](https://code.claude.com/docs) — the source every fact here was checked against.
