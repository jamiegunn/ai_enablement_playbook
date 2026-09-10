---
title: Start Here
description: What this playbook covers, who it's for, and how to navigate it when you own your team's workflow but not the enterprise AI platform.
keywords:
  - tech lead told to make ai work for the team
  - who owns what ai platform team security
  - getting started with claude code for a team
  - two-minute access check claude code
  - claude code vocabulary glossary
  - suggested first week ai enablement
  - how this guide is organized
  - we have claude code now what
  - ai adoption for engineering teams
sidebar:
  order: 1
---

You've been told to make AI work for your team. You did not set up the AI. That distinction shapes every page of this site.

Somewhere in your organization there's a platform team (maybe called developer experience, AI enablement, or "the people who own the Anthropic contract") that decided which models are approved, whether your API calls go to Anthropic directly or through Bedrock or Vertex, what managed settings land on every laptop, which MCP servers you may connect to, and what the GitHub org allows. Security wrote the policy about which source code and which documents may be sent where. You got Claude Code on your laptop, a credential someone else issued, a GitHub org with Actions enabled, a Confluence space, and a Slack channel. That's the deal, and it's a good deal. But most material about AI-assisted engineering assumes you're the one holding the keys, and it will happily tell you to paste production credentials into an agent's environment.

This guide doesn't do that. Everything here works from the seat you actually sit in.

## The operating model

The split of responsibilities looks roughly like this in most organizations:

| You own | Platform team owns | Security owns |
|---|---|---|
| Your repos' `CLAUDE.md`, skills, hooks, `.mcp.json` | Managed settings pushed to every laptop | The data-boundary policy: what may leave the building, to which deployment |
| Your CI workflows, including the overnight jobs | The Claude deployment (API direct, Bedrock, Vertex) and the credentials | Approval of unattended jobs and their blast radius |
| Which repos get mapped, in what order | The GitHub org: Actions policy, runners, org secrets | Secrets handling and audit retention |
| Your team's onboarding track and its artifacts | The allowlist of MCP servers | Which Confluence spaces are `restricted` |
| The morning report and who reads it | Spend limits and the monthly bill | — |
| Prompts, report templates, review checklists | Shared plugins and the marketplace | — |

When something is blocked, the first question is *which column does it live in?* An agent that can't read a file because your `.claude/settings.json` denies it is your problem. An agent that can't reach `mcp.atlassian.com` because the managed settings don't allow it is theirs — but you'll be the one who notices, and you need to bring them a request, not a complaint. [Working Within Policy](/start/working-within-policy/) has the four asks written out with the evidence to attach.

:::note[The one rule of this site]
If a technique requires org-admin, a security exception, a budget decision, or a managed-settings change, we say so explicitly and tell you what to ask for. Every command block starts with a `# seat:` comment naming whose laptop, runner, or approval it runs from. If you see advice elsewhere that starts with "just give the agent your prod credentials", that's your cue that the article wasn't written for you.
:::

## Who this is for

- **Tech leads and senior engineers** who've been handed the AI mandate for a team and want two things done properly rather than ten done as demos.
- **Developers onboarding onto a legacy estate** — there's a whole track for the new hire, because the first two weeks on a fourteen-year-old codebase with two experts and a Confluence graveyard is a rite of passage nobody should improvise.
- **The platform or security reviewer** reading to decide whether to approve the overnight jobs — [Blast Radius](/overnight-qa/blast-radius/) was written to be the evidence pack.

You should be comfortable with a terminal and git, and have Claude Code installed with a working credential (the two-minute check below confirms it). You do not need to have written a `CLAUDE.md`, run an agent unattended, or connected an MCP server; the next three articles build the mental model, and the Toolkit explains every mechanism once.

## How the site is organized

Each section stands alone and opens with its own overview:

- **Start** (you are here) — the mental model and the daily toolkit. Begin with [How Agentic Coding Actually Works](/start/how-agentic-coding-works/) for the loop that pays for everything else, then [The Three Levers](/start/the-three-levers/) for the model that fits any technique on this site — what the model can see, what it can do, how you'll know it was right.
- **[Knowledge Transfer Playbook](/kt/overview/)** — inventory the estate, map every repo with citations an expert can stamp, mine Confluence for what's still true, capture the "why" from the people who know it, build the onboarding track, keep it true in CI.
- **[Overnight QA Playbook](/overnight-qa/overview/)** — the first read-only night, the anatomy of a nightly job, running Claude unattended with bounds, characterization tests as draft PRs, a browser agent through staging, nightly review and security triage, the morning report, blast radius, cost.
- **[Claude Code Toolkit](/toolkit/overview/)** — reference for `CLAUDE.md`, skills, subagents, hooks, MCP, headless mode and the Agent SDK, the GitHub Action, enterprise setup. Mechanics only; the playbooks link here and stop.
- **[Troubleshooting](/troubleshooting/overview/)** — symptom-first: it made things up, the session forgot, it edited the wrong repo, the night failed, MCP won't connect.
- **[Field Notes](/blog/)** — incidents written up with the lever that failed and the page that would have prevented them.

## Where to go for common needs

| You need to... | Go to |
|---|---|
| Understand what the model can and can't see | [How Agentic Coding Actually Works](/start/how-agentic-coding-works/) |
| Think about *any* AI technique — and diagnose one that failed | [The Three Levers](/start/the-three-levers/) |
| Find out what may leave the building, and ask for what you need | [Working Within Policy](/start/working-within-policy/) |
| Get a working `CLAUDE.md` and a safe permissions baseline today | [Day-1 Checklist](/start/day-1-checklist/) |
| Find the right article for any task | [How Do I…? Solutions Index](/start/solutions-index/) |
| Follow a curated reading track | [Learning Paths](/learning-paths/) |
| Produce one verified artifact for a new hire who starts Monday | [The 90-Minute Repo Map](/kt/quick-start/) |
| Run one overnight job that can't hurt anyone | [The First Night](/overnight-qa/quick-start/) |
| Know what a nightly job may never do, and prove it to security | [Blast Radius](/overnight-qa/blast-radius/) |
| Connect Claude to Confluence | [Confluence: Mining a Graveyard for the Living](/kt/confluence/) |
| Understand what an unattended `claude -p` run returns and how it exits | [Running Claude Unattended](/overnight-qa/running-unattended/) |
| Fix a session that's making things up | [It Made Things Up](/troubleshooting/it-made-things-up/) |

## Before you start: a two-minute access check

Everything in this guide assumes a working Claude Code with a credential that reaches your organization's approved deployment, plus GitHub CLI access to your repos. Verify both now so the first time you test them isn't during a rollout:

```bash
# seat: team
claude --version                                   # installed, and which version
claude -p "Reply with the single word: ready" --max-turns 1 --bare   # the credential works end to end
gh auth status                                     # GitHub CLI can see your org
```

Expected output looks something like:

```console
$ claude --version
2.1.230 (Claude Code)
$ claude -p "Reply with the single word: ready" --max-turns 1 --bare
ready
$ gh auth status
github.com
  ✓ Logged in to github.com account dana-payments (keyring)
  - Active account: true
  - Token scopes: 'gist', 'read:org', 'repo', 'workflow'
```

`--bare` skips loading `CLAUDE.md`, hooks, and skills so the check tests only the credential path; `--max-turns 1` means the run can't wander. If the second command fails with an authentication error, your credential isn't reaching the deployment — [Working Within Policy](/start/working-within-policy/) explains the three paths (Anthropic API, Bedrock, Vertex) and what each one needs set. If `gh auth status` shows no `workflow` scope, the overnight recipes will fail at `gh workflow run`; re-authenticate with `gh auth refresh -s workflow`.

## How to read it

If you're new to agentic coding: work through this Start section in order — it's six articles and half a day, and [Learning Paths Track 1](/learning-paths/#1-new-to-agentic-coding) sequences them for you. [How Agentic Coding Actually Works](/start/how-agentic-coding-works/) gives you the loop, [The Three Levers](/start/the-three-levers/) gives you the model for any technique, and the [Day-1 Checklist](/start/day-1-checklist/) leaves you with a `CLAUDE.md` and a permissions baseline you'll keep forever. After that, read whichever playbook overview matches the initiative you were handed.

If you've been using Claude Code for a while: skim the [Toolkit overview](/toolkit/overview/) for the mechanisms you may not have used (hooks, `.claude/rules/`, `--json-schema`), then jump straight to a playbook. Every playbook page is written to be entered cold: "you are here if" at the top, a complete recipe in the middle, "where next" at the bottom.

One habit to build from day one: when the model's output surprises you, ask *what could it see?* before you form a theory about the model. Open `/context`, look at which files it read, check whether the `CLAUDE.md` says what you think it says. Most bad output is a context failure wearing a confident face, and the fix is a file, not a better adjective in the prompt.

## The vocabulary you'll see everywhere

Eleven terms carry most conversations about agentic coding. Skim now; the linked articles make each one concrete:

| Term | One-line meaning |
|---|---|
| **Context window** | The model's working memory for one session: everything it can currently see, measured in tokens. When it's full, older material is summarized away. |
| **Token** | The unit text is metered in — roughly three-quarters of an English word, or a few characters of code. Cost and context are both counted in tokens. |
| **Agent loop** | Prompt → model → tool call → result → model, repeated until the model decides it's done or a bound stops it. |
| **Tool** | Something the model can *do*: read a file, search, run a command, edit, call an MCP server, drive a browser. |
| **Permission mode** | The rule for which tools run without asking: `plan` (read-only), `default` (ask), `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions` (never on a runner). |
| **`CLAUDE.md`** | The standing orders loaded into every session in a repo: what this is, how to work here, what not to do. |
| **Skill** | A procedure you can invoke by name (`/map-repo`), stored as a markdown file with a description the model can match on. |
| **Subagent** | A delegated worker with a fresh context window that does one job and returns a summary — how you fan out over twenty-three repos without drowning one session. |
| **Hook** | A script that runs at a lifecycle event (before a tool call, after, on stop) and can block or modify it — a guardrail that doesn't rely on good behaviour. |
| **MCP** | Model Context Protocol — the standard way to give the model a connection to something outside the repo: Confluence, GitHub, a browser. |
| **Headless mode** | `claude -p`: the same loop with nobody at the keyboard, which is why every decision the keyboard would have made has to be made in advance with flags. |

If half of those are fuzzy, that's expected — it's what the next few articles are for.

## Conventions used throughout

- **Every command block starts with a seat.** `# seat: team` means your laptop or your repo's CI, nothing to ask for. `# seat: team — needs <thing>` names the one thing you must obtain first, and links to the ask. `# seat: platform — shown so you can read THEIR config` marks something you won't run. `# seat: security — their approval, your evidence` marks a step that waits on a human.
- **Prompts are files.** When a page shows a prompt, the first line is a comment with the path it lives under in your repo (`# .claude/skills/map-repo/SKILL.md`). Nothing on this site is meant to be typed into a terminal from memory.
- **Names are placeholders with a pattern.** `payments-api` is the modern service, `ledger-core` is the legacy engine, Priya and Marcus are the experts, Sam is the new hire, `#payments-nightly` is the channel — yours will differ, the shape won't.
- **Console and JSON blocks show realistic output**, sometimes trimmed with `…` outside a command. If your output differs wildly from the example, that difference is usually the clue.
- **Asides carry the hard-won stuff.** `:::tip` is a shortcut, `:::caution` is a way people get burned, `:::danger` is a way people cause incidents, and `:::tip[Good citizen]` marks a place where a knob could spend someone else's hours or money. Don't skip them.
- **"Ask your platform team" is a real instruction**, not a shrug. When you see it, the page tells you what to ask for and what evidence to attach.

## A suggested first week

If you've just been handed the mandate, this sequence turns it from a vague objective into two running things:

1. **Day 1** — run the access check above; read this section through [Working Within Policy](/start/working-within-policy/); do the [Day-1 Checklist](/start/day-1-checklist/) in the repo new hires touch first, so you end the day with a `CLAUDE.md` and a deny list.
2. **Day 2** — [The 90-Minute Repo Map](/kt/quick-start/) on that same repo. Book the expert's thirty minutes *before* you start; the map is only done when it's stamped.
3. **Day 3** — [The First Night](/overnight-qa/quick-start/) on the service with the best test suite. Read-only, budgeted, reporting to the job summary and the channel. Let it run tonight.
4. **Day 4** — send the asks from the policy page that Days 2 and 3 surfaced (a CI credential with a spend cap, the Atlassian MCP allowlisted, a runner label if you need the internal network). Attach the evidence the page lists.
5. **Day 5** — read this morning's report at standup, then pick your first real scenario from each playbook's [Start From Your Situation](/kt/scenarios/) page and schedule it.

A week of this beats a quarter of pilot-planning meetings.

## What this guide is not

- **Not a prompt-engineering course.** The prompts here are shown because they're load-bearing, not because wording is the point. The point is what the model can see, what it may do, and how you check.
- **Not a vendor comparison.** Recipes are Claude Code; the principle behind each is stated once so it survives a tool change. Where another tool does the same job, one sentence says so.
- **Not an enterprise rollout plan.** There's a governance page in each playbook for taking a working initiative to five teams; taking it to four hundred is a different book.

## Next

Start with [How Agentic Coding Actually Works](/start/how-agentic-coding-works/). It's one article, one diagram, and one mental model — the loop and its working memory — and twenty minutes there saves you hours everywhere else on this site. Then read [The Three Levers](/start/the-three-levers/): where the loop explains how the machine *works*, the Levers explain how to *think* about any technique you put on it — what it can see, what it can do, how you'll know.

If you're reading this because something is already wrong — a session inventing classes, a nightly job that burned money and produced nothing — skip ahead to the [Troubleshooting overview](/troubleshooting/overview/), work through the levers in order, and come back for the fundamentals when the fire's out. The guide will still be here.
