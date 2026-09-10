---
title: "How Do I…? Solutions Index"
description: Route from what you're trying to do to the page that covers it — getting started, knowledge transfer, overnight QA, the mechanics, and what to read when it's already gone wrong.
keywords:
  - which page covers my problem
  - claude code how do i
  - index of all articles
  - ai enablement task to page map
  - what page do i need
  - onboarding legacy code overnight testing index
  - find the right guide by task
  - solutions index
sidebar:
  order: 6
---

Every page on this site, indexed by what you're trying to do rather than where it sits in the sidebar. Find your task and click through; where a page has a section that answers the row exactly, the link goes straight to it. If something is on fire right now, skip the tables and start with the box. For incidents written up end to end, browse [Field Notes](/blog/).

:::tip[On fire right now?]
Go to [Troubleshooting: Which Lever Failed?](/troubleshooting/overview/) for the symptom table, or straight to [The Night Failed](/troubleshooting/the-night-failed/) if it's 08:05 and the report is empty. The first sixty seconds, one command per lever:

```bash
# seat: team
pwd && ls CLAUDE.md docs/ARCHITECTURE.md 2>&1      # could it see? — right repo, files it should have loaded
jq '.permission_denials | length' night.json       # could it do? — what it was refused (or wasn't)
scripts/check-citations.sh                         # did anyone check? — do the pointers still resolve
```

Inside a live session, `/context` answers the first question from the model's side. The order matters: [which lever failed](/start/the-three-levers/#which-lever-failed) explains why.
:::

## Getting started

| I want to… | Read |
|---|---|
| Understand what the model can and can't see in a session | [The context window is the working memory](/start/how-agentic-coding-works/#the-context-window-is-the-working-memory) |
| Explain to a colleague why it invented a class name — and make "not found" the default | [Why it makes things up](/start/how-agentic-coding-works/#why-it-makes-things-up) |
| Understand what a session or a job will cost, without a price list | [Tokens and the cost shape](/start/how-agentic-coding-works/#tokens-and-the-cost-shape) |
| Know what a tool call is and why the permission prompt exists | [What a tool call is, and why permissions exist](/start/how-agentic-coding-works/#what-a-tool-call-is-and-why-permissions-exist) |
| Judge any AI technique before adopting it — what it sees, what it may do, how I'll know | [The Three Levers](/start/the-three-levers/#using-the-levers-to-design-a-recipe) |
| See every technique on this site placed against the three levers | [The techniques and the levers they pull](/start/the-three-levers/#the-techniques-and-the-levers-they-pull) |
| Find out whether our source code may go to the model at all | [What the policy usually says](/start/working-within-policy/#what-the-policy-usually-says) |
| Tell which deployment path we're on (API key, Bedrock, Vertex) and what each one needs set | [The three deployment paths](/start/working-within-policy/#the-three-deployment-paths) |
| Ask the platform team for a CI credential with a spend cap | [Ask 1](/start/working-within-policy/#ask-1-a-ci-credential-with-a-spend-cap) |
| Get the Atlassian MCP server allowlisted (or the Data Center alternative approved) | [Ask 2](/start/working-within-policy/#ask-2-allowlist-the-atlassian-mcp-server) |
| Get a self-hosted runner label for jobs that need the internal network | [Ask 3](/start/working-within-policy/#ask-3-a-self-hosted-runner-label) |
| Get security to review the night shift, with the evidence they'll want | [Ask 4](/start/working-within-policy/#ask-4-a-security-review-of-the-night-shift), then [the evidence pack](/overnight-qa/blast-radius/#the-security-review-evidence-pack) |
| Keep secrets out of prompts, out of the model's reach, and out of pushes | [Secrets hygiene](/start/working-within-policy/#secrets-hygiene) |
| Know how long run artifacts and session data are kept, and who can read them | [Audit and retention](/start/working-within-policy/#audit-and-retention) |
| Install Claude Code, sign in against the approved path, and confirm it works | [Day-1 Checklist](/start/day-1-checklist/) |
| Write my first `CLAUDE.md` today — the three sections | [Day-1 Checklist](/start/day-1-checklist/), then [CLAUDE.md: The Standing Orders](/toolkit/claude-md/) |
| Stop the agent running `rm -rf`, force-pushing, or reading `.env` — and prove the fence works | [The destructive-command hook](/start/day-1-checklist/#7-the-destructive-command-hook) |
| Run the two-minute access check | [Before you start](/start/overview/#before-you-start-a-two-minute-access-check) |
| Know what my team owns versus the platform team versus security | [The operating model](/start/overview/#the-operating-model) |
| Look up a term — context window, token, hook, MCP, headless | [The vocabulary you'll see everywhere](/start/overview/#the-vocabulary-youll-see-everywhere) |
| Follow a reading track instead of browsing fifty pages | [Learning Paths](/learning-paths/) |

## Knowledge transfer

| I want to… | Read |
|---|---|
| Understand what knowledge transfer actually is, and why it fails without AI | [Knowledge Transfer, Explained From Zero](/kt/overview/) |
| Get one verified artifact before a new hire starts Monday | [The 90-Minute Repo Map](/kt/quick-start/) |
| Decide which of twenty-three repos to map first | [Inventory the Estate](/kt/inventory-the-estate/) |
| Measure bus factor honestly when the git history was squashed | [Inventory the Estate](/kt/inventory-the-estate/) |
| Map one repo into an `ARCHITECTURE.md` an expert can stamp in thirty minutes | [Mapping One Repo](/kt/mapping-a-repo/) |
| Review an AI-generated architecture doc without reading forty pages | [The review gate](/kt/mapping-a-repo/#the-review-gate) |
| Know where generated docs live in the repo, and what goes in `CLAUDE.md` versus `ARCHITECTURE.md` | [Output layout](/kt/mapping-a-repo/#output-layout) |
| Draw the system across repos — the queues, the schema, the calls between services | [Mapping the System](/kt/mapping-the-system/) |
| Connect Claude to Confluence — the hosted Cloud server, or Data Center | [Confluence: Mining a Graveyard for the Living](/kt/confluence/) |
| Work out which of 940 Confluence pages are still true, and what to do with the rest | [Confluence: Mining a Graveyard for the Living](/kt/confluence/) |
| Get the "why" out of an expert who's retiring, without burning their week | [Getting It Out of Their Heads](/kt/expert-interviews/) |
| Build the new hire's first two weeks from the map | [The First Two Weeks](/kt/onboarding-track/) |
| I'm the new hire — what do I actually do on Monday? | [The First Two Weeks](/kt/onboarding-track/), sequenced by [Track 4](/learning-paths/#4-the-new-hires-first-two-weeks) |
| Keep the docs true after they're written — the nightly citation check, PR-time updates | [Keeping It True](/kt/living-docs/) |
| Measure whether KT is working, and roll it out to five teams | [Measuring KT and Rolling It Out](/kt/measurement-and-governance/) |
| Start from my situation rather than the front of the playbook | [Start From Your Situation](/kt/scenarios/) |
| Get the pipeline, the eight questions, the skills, and the FAQ on one page | [KT on One Page](/kt/cheat-sheet/) |

## Overnight QA

| I want to… | Read |
|---|---|
| Understand what overnight QA actually is, and what "bounded" means | [Overnight QA, Explained From Zero](/overnight-qa/overview/) |
| Run one overnight job tonight that can't hurt anyone | [The First Night](/overnight-qa/quick-start/) |
| Understand the seven stages of a night and where each one fails | [Anatomy of a Night Shift](/overnight-qa/anatomy-of-a-night/) |
| Bound an unattended run — permission mode, turns, budget, time — and know why all three | [Running Claude Unattended](/overnight-qa/running-unattended/) |
| Read the JSON a `claude -p` run returns, and what its exit code means | [Running Claude Unattended](/overnight-qa/running-unattended/) |
| Get tests onto legacy code before I change it | [Characterization Tests](/overnight-qa/characterization-tests/) |
| Check that generated tests actually test something (mutation score) | [Characterization Tests](/overnight-qa/characterization-tests/) |
| Click through staging with a browser agent, leaving screenshots as evidence | [Exploratory and End-to-End Testing](/overnight-qa/exploratory-and-e2e/) |
| Review the day's PRs overnight; get a security scan with *impact*, not a CVE list | [The Night Reviews the Day](/overnight-qa/review-and-security/) |
| Write a morning report people read — and deliver it to Slack, Teams, GitHub, and Confluence | [The Morning Report](/overnight-qa/the-morning-report/) |
| Know what the night may never do, and how each line is enforced | [Blast Radius](/overnight-qa/blast-radius/) |
| Prepare the evidence pack for security | [The security review evidence pack](/overnight-qa/blast-radius/#the-security-review-evidence-pack) |
| Turn the night off in under a minute | [Blast Radius](/overnight-qa/blast-radius/) — the kill switch |
| Set budgets per run, per month, and per team — and pick the model per job | [Cost, Budgets, and Rolling the Night Shift Out](/overnight-qa/cost-and-governance/) |
| Review another team's first nightly-job PR | [The nightly-job PR review checklist](/overnight-qa/cost-and-governance/#the-nightly-job-pr-review-checklist) |
| Start from my situation rather than the front of the playbook | [Start From Your Situation](/overnight-qa/scenarios/) |
| Get the workflow skeletons, the report template, the deny list, and the FAQ on one page | [Overnight QA on One Page](/overnight-qa/cheat-sheet/) |

## Mechanics

| I want to… | Read |
|---|---|
| See what each piece of Claude Code is for, and which lever it pulls | [The Toolkit: What Each Piece Is For](/toolkit/overview/) |
| Write and organize `CLAUDE.md` — one file versus `.claude/rules/`, imports, the local overlay | [CLAUDE.md: The Standing Orders](/toolkit/claude-md/) |
| Turn a prompt I keep pasting into a skill I can invoke by name | [Skills: Procedures You Can Invoke](/toolkit/skills/) |
| Fan work out over many repos without one session drowning | [Subagents: Delegation With a Fresh Context](/toolkit/subagents/) |
| Block a command structurally, whatever the prompt says | [Hooks: Guardrails That Don't Rely on Good Behaviour](/toolkit/hooks/) |
| Give the model eyes on Confluence, GitHub, or a browser | [MCP](/toolkit/mcp/) |
| Run Claude from a script or CI — the headless flags, the JSON, the Agent SDK | [Headless Mode and the Agent SDK](/toolkit/headless-and-sdk/) |
| Use the GitHub Action for `@claude` mentions and PR-time jobs | [The Claude Code GitHub Action](/toolkit/github-action/) |
| Set up Bedrock or Vertex, pin models, and do the cost arithmetic | [Enterprise Setup, Models, and Cost Arithmetic](/toolkit/enterprise-and-cost/) |

## When it goes wrong

| I want to… | Read |
|---|---|
| Work out which lever failed before I touch the prompt | [Troubleshooting: Which Lever Failed?](/troubleshooting/overview/), and [the diagnostic](/start/the-three-levers/#which-lever-failed) |
| Fix a session that invented a class, a table, a queue, or an endpoint | [It Made Things Up](/troubleshooting/it-made-things-up/) |
| Recover a session that forgot what it was doing, or contradicts itself | [Context Exhausted](/troubleshooting/context-exhausted/) |
| Find out why it edited the wrong repo, branch, or file | [Wrong Repo, Wrong Branch, Wrong File](/troubleshooting/wrong-target/) |
| Diagnose a night that timed out, hit the budget (exit 2), or left an empty report | [The Night Failed](/troubleshooting/the-night-failed/) |
| Get MCP to connect — Atlassian, GitHub, Playwright | [MCP Won't Connect](/troubleshooting/mcp-wont-connect/) |
| Look up an exact error message or exit code | [Error Message Index](/troubleshooting/error-index/) |
| Read how it went wrong for someone else, and which lever would have caught it | [The Architecture Doc That Was Confidently Wrong](/blog/the-architecture-doc-that-was-confidently-wrong/) · [The Night the Agent Fixed the Test by Deleting It](/blog/the-night-the-agent-fixed-the-test-by-deleting-it/) · [The Morning Report Nobody Read](/blog/the-morning-report-nobody-read/) |

Can't find your task? Each section's overview has its own "find your way in" table — [Knowledge Transfer](/kt/overview/) and [Overnight QA](/overnight-qa/overview/) — and the two [Start From Your Situation](/kt/scenarios/) pages ([overnight edition](/overnight-qa/scenarios/)) are written in the words people actually use to describe the problem. For anything broken, [Troubleshooting](/troubleshooting/overview/) starts from the symptom.
