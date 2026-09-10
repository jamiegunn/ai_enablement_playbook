---
title: "Working Within Policy: What Can Leave the Building"
description: Find out what your security policy actually allows, know which deployment path your credential takes, keep secrets out of the model's reach, and send the four asks — with evidence — that unblock everything else on this site.
keywords:
  - can we send source code to claude
  - infosec policy ai coding tools
  - anthropic api vs bedrock vs vertex which are we on
  - CLAUDE_CODE_USE_BEDROCK
  - how to ask platform team for an api key for ci
  - allowlist mcp server managed settings
  - self-hosted runner request
  - security review unattended ai job
  - secrets in prompts gitleaks pre-push
  - data boundary confluence restricted label
sidebar:
  order: 4
---

You didn't write the data-boundary policy, you probably haven't read it, and you'll be the one who breaks it — because every technique on this site puts something in front of a model, and the policy is about what may be put in front of a model. This page is the ten minutes that turns "I think we're allowed" into a sentence you could repeat to an auditor, and then the four requests you'll need to send before the playbooks get past their first page.

## What the policy usually says

Most organizations' rules for AI coding tools reduce to four lines. Yours will have more words and the same shape:

| What | Usually | What it means for the way you work |
|---|---|---|
| **Source code** | Yes — to the *approved* deployment only, not to a personal account or a free tier | Everything on this site assumes this line is true for your repos. If it isn't for some of them, that's a list to keep, and a session in one of those repos is a policy breach before it does anything |
| **Customer PII** | Never, anywhere — including test data copied from production, screenshots of staging with real names, and logs that contain account numbers | The browser agent uses a dedicated test operator; the night's test data is synthetic; a stack trace with a customer name in it is a finding, not a feature |
| **Confluence pages labelled `restricted`** | Never leave Atlassian | A page fetched over MCP lands in the context window and is sent to the model, so `restricted` pages are excluded from every query the site runs, not just from the results you read |
| **Secrets** | Never — not in prompts, not in files the agent reads, not in generated documents or reports | The deny rules on `.env`, the gitignored local files, and the push-time secret scan below |

Two lines that usually aren't written down but are always asked at review: *what does the vendor retain, and for how long?* and *who inside the company can read the sessions?* The platform team answers the first for the deployment they chose; the [audit and retention](#audit-and-retention) section below answers the second for the artifacts you create.

## How to find out what yours says

Three sources, in order of authority, and you want all three to agree.

**The document.** Ask InfoSec for the policy by its name — it's usually filed under data classification or acceptable use, with a section on AI or "generative tools" added in the last two years — and read the four lines above out of it. If it has no AI section, the source-code line is the one to get answered in writing: "may source code from repositories X, Y, Z be sent to the Claude deployment the platform team operates?" A Slack "yeah should be fine" is not an answer; a ticket with a yes on it is.

**The managed settings on your laptop.** The platform team's policy arrives as a file Claude Code loads first and that you can't override. Read it; it tells you which deployment path you're on and what's been denied fleet-wide:

```bash
# seat: platform — shown so you can read THEIR config, you won't run it
cat /etc/claude-code/managed-settings.json                                   # Linux / WSL
cat "/Library/Application Support/ClaudeCode/managed-settings.json"          # macOS
```

(The seat is the platform's because the file is theirs and you can't change it; reading it is yours, and you should.)

```json
{
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "AWS_REGION": "us-east-1"
  },
  "permissions": {
    "deny": ["WebFetch", "WebSearch", "Bash(curl *)"]
  }
}
```

The `env` block is the deployment path — this shop routes every call through Bedrock in `us-east-1`, which is what makes the "approved deployment" line concrete. The `deny` list is fleet policy: no session on any laptop may fetch from the web, whatever a repo's own settings say. If the file doesn't exist, nothing is managed, and "which deployment are we on" becomes a question for the platform team rather than a file you can read. Managed settings also carry a fleet-wide `CLAUDE.md` (`/etc/claude-code/CLAUDE.md` on Linux) and win over every other settings file; [Enterprise Setup, Models, and Cost Arithmetic](/toolkit/enterprise-and-cost/) has the precedence and the paths for every platform.

**Your own environment.** Confirm which path your credential actually takes, and that it reaches the deployment. Never print the key itself:

```bash
# seat: team
env | grep -E '^(CLAUDE_CODE_USE_BEDROCK|CLAUDE_CODE_USE_VERTEX|AWS_REGION)='
[ -n "${ANTHROPIC_API_KEY:-}" ] && echo "ANTHROPIC_API_KEY is set (value not shown)" || echo "ANTHROPIC_API_KEY is not set"
claude -p "Reply with the single word: ready" --max-turns 1 --bare
```

```console
$ env | grep -E '^(CLAUDE_CODE_USE_BEDROCK|CLAUDE_CODE_USE_VERTEX|AWS_REGION)='
CLAUDE_CODE_USE_BEDROCK=1
AWS_REGION=us-east-1
$ [ -n "${ANTHROPIC_API_KEY:-}" ] && echo "ANTHROPIC_API_KEY is set (value not shown)" || echo "ANTHROPIC_API_KEY is not set"
ANTHROPIC_API_KEY is not set
$ claude -p "Reply with the single word: ready" --max-turns 1 --bare
ready
```

That's the state you want on a Bedrock shop: the provider switch and region set, no direct API key lying around, and `ready` coming back from the approved endpoint. An API key *and* a provider switch both set is worth a question — which one wins is a mechanics detail on the enterprise page, but the policy question is why there are two.

## The three deployment paths

As of September 2026 there are three common ways a Claude Code session reaches a model, and the policy line "approved deployment" means exactly one of them. The table is the whole difference from your seat:

| Path | Who holds the credential | Where the request goes | What you set (laptop or CI) |
|---|---|---|---|
| **Anthropic API, direct** | The platform team issues API keys from the organization's Anthropic Console; you hold one per person, and CI gets its own | Anthropic's API | `ANTHROPIC_API_KEY` in the environment (or `apiKeyHelper` in settings to fetch it from a vault) |
| **Amazon Bedrock** | Your organization's AWS account: IAM. On a laptop, an AWS profile; on a runner, an OIDC role rather than a long-lived key | The Bedrock endpoint in your AWS region — inside your organization's AWS account | `CLAUDE_CODE_USE_BEDROCK=1` and `AWS_REGION=us-east-1`, plus AWS credentials the way any AWS call gets them |
| **Google Vertex AI** | Your organization's Google Cloud project: IAM | Vertex in your GCP project | `CLAUDE_CODE_USE_VERTEX=1`, plus the project and region variables your platform team specifies |

The GitHub Action has the same switch as inputs (`use_bedrock`, `use_vertex`), and the site's `run-claude.sh` wrapper refuses to start unless one of the three is configured. Everything else — model pinning per provider with `ANTHROPIC_DEFAULT_*`, the settings precedence, the cost arithmetic — is mechanics and lives in [Enterprise Setup, Models, and Cost Arithmetic](/toolkit/enterprise-and-cost/).

**The trade** you don't get to make but should understand: the direct API path is the simplest to set up and the fastest to get new models on; the cloud-provider paths keep the traffic inside an account your organization already audits, which is usually what made the deployment "approved" in the first place. When the policy says "approved deployment," it's the row, not the vendor.

## Secrets hygiene

Four habits, each closing a way a secret reaches the model or the repo.

**Never in prompts, never in files the agent reads.** A prompt is sent to the model; so is every file the model reads, and so is the model's output when your workflow posts it to Slack and Confluence. A database password pasted "just to test the connection" is now in a session transcript, a run artifact, and possibly a morning report. The unattended wrapper on this site never echoes the credential, and GitHub masks registered secrets in logs; `::add-mask::` covers values you compute during a job.

**Local files stay local.** `CLAUDE.local.md` is the gitignored personal overlay on the repo's standing orders — the place for "I'm working on the FX branch this week" and, if you're careless, for the test database password. `.claude/settings.local.json` is the same for permissions. Both go in `.gitignore` on day one; the [Day-1 Checklist](/start/day-1-checklist/) does it.

**The model may not read secret files.** The Day-1 permissions baseline denies the reads outright — an excerpt from `.claude/settings.json` (shown in full on the checklist):

```json
"deny": ["Bash(rm -rf *)", "Bash(git push --force*)", "Bash(git push -f*)", "Bash(git reset --hard*)", "Read(./.env)", "Read(./.env.*)", "Read(./**/secrets/**)"]
```

The last three are the secrets lines. They stop a well-meaning "let me check your database config" from putting `.env` into the context window, and they stop it whatever the prompt says.

**Nothing pushes that contains a secret.** The push is the moment a secret leaves your laptop, so that's where the scan runs. Scan the history once, today — the 2021 migration squashed everything older into one commit, and nobody has looked inside it:

```bash
# seat: team — needs gitleaks installed (brew install gitleaks, or the release binary)
cd ~/ledger/ledger-core
gitleaks git --report-format json --report-path gitleaks.json .
jq 'length' gitleaks.json
```

```console
$ gitleaks git --report-format json --report-path gitleaks.json .
2:14PM INF 2410 commits scanned.
2:14PM INF scan completed in 3.1s
2:14PM WRN leaks found: 2
$ jq 'length' gitleaks.json
2
```

`leaks found: 2` and a non-zero exit is the line to act on; `gitleaks.json` names the commit, the file, and the rule for each. A leak in a squashed 2021 commit is still a leak — rotate it, then decide with InfoSec whether history gets rewritten. Then install the push-time guard so it can't happen again:

```bash
#!/usr/bin/env bash
# .githooks/pre-push — refuse to push history that contains a secret.
# Install once per clone:  git config core.hooksPath .githooks
set -uo pipefail
if ! gitleaks git --report-format json --report-path /tmp/gitleaks-prepush.json . >/dev/null 2>&1; then
  echo "pre-push: gitleaks found something (or failed to run) — see /tmp/gitleaks-prepush.json. Nothing was pushed." >&2
  exit 1
fi
```

```bash
# seat: team
chmod +x .githooks/pre-push
git config core.hooksPath .githooks
git push
```

```console
$ git push
pre-push: gitleaks found something (or failed to run) — see /tmp/gitleaks-prepush.json. Nothing was pushed.
error: failed to push some refs to 'github.com:payments/ledger-core.git'
```

That's the guard doing its job: the push stopped, the secret is still on your laptop and nowhere else. The trade of scanning history at push time rather than the staged files at commit time is a slower hook on a big repo and a secret that sits in a local commit until you push; the gain is one scan that also covers the commits you rebased in. The night shift runs the same scan on its own output before publishing — [Review and Security](/overnight-qa/review-and-security/) — because a generated report can quote a config file.

:::danger[The one that gets everyone]
The agent asks to run `cat .env` to "check the database URL". In `default` mode you'll see the prompt, be mid-thought, and press yes. With the deny rule it's refused whether you're paying attention or not. Secrets hygiene that depends on you noticing is not hygiene; the checklist's baseline exists so that the safe answer is the one that happens when you're not looking.
:::

## The four asks

Everything else on this site works from your seat. These four don't: each needs someone in the platform or security column to do something once. Send them early — the [suggested first week](/start/overview/#a-suggested-first-week) has them on Day 4 — as tickets, not chat messages, with the evidence attached, because a request with evidence gets approved and a request without it gets a meeting. Copy the template, fill the angle brackets, attach the files.

### Ask 1: a CI credential with a spend cap

**When you need it:** the moment a job runs on a runner instead of your laptop — [The First Night](/overnight-qa/quick-start/) and the headless form of the repo map. **Who:** the platform team.

```markdown
# Request: CI credential for Claude Code, payments team — with a spend cap

**What:** a credential the `payments` GitHub repositories' Actions workflows can use to call the
approved Claude deployment (Bedrock, us-east-1) — as a repository or organization secret, or an
OIDC role if that is how the platform issues Bedrock access to runners. Not a personal key.

**Cap:** a monthly spend limit on this credential of $<cap>. Our per-run ceilings sum to well
under it (table below). Please set the cap on your side as well as ours — a cap only we control
is not a cap.

**Scope:** `payments-api` now; `ledger-api` and `ledger-core` for the read-only mapping jobs.
The job that writes (characterization tests, draft PRs only) is a separate ask — see the
security review request.

**Per-run bounds, enforced in the workflow, not the prompt:**
| Job | Budget | Turns | Timeout | Workflow permissions | Schedule (UTC) |
|---|---|---|---|---|---|
| nightly-triage.yml | --max-budget-usd 3 | --max-turns 25 | 45 min | contents: read, actions: read | 17 6 * * 1-5 |

**Attached (evidence):**
- `.github/workflows/nightly-triage.yml` — the bounds above, `--permission-mode dontAsk`,
  `--allowedTools "Read,Grep,Glob"`
- `scripts/run-claude.sh` — refuses to start without a credential path, never echoes it,
  writes cost / turns / exit code to the job summary on every run
- Retention: `night.json` and `report.md` kept 30 days as run artifacts
- Who reads the cost ledger weekly: Dana (tech lead, payments)
```

### Ask 2: allowlist the Atlassian MCP server

**When you need it:** before [Confluence: Mining a Graveyard for the Living](/kt/confluence/). **Who:** the platform team for the allowlist; InfoSec sees it because it's a data flow.

```markdown
# Request: allowlist the Atlassian MCP server for the payments team

**What:** permit Claude Code sessions on our laptops to connect to
`https://mcp.atlassian.com/v2/mcp` (transport: http). This is Atlassian's hosted MCP server for
Confluence Cloud. Authentication is OAuth 2.1 in the browser, per user — no shared token is
created and every read is attributed to the person who made it.

**Why:** the Ledger knowledge-transfer work needs to read Confluence space `LEDGER` (940 pages)
to triage which pages still describe the code. Reads only. Writes to Confluence (the nightly
report to space `PAY`) go through a CI token scoped to that space, not through MCP.

**Boundary:** pages labelled `restricted` are excluded by CQL in every query we run; the query
is attached. Everything a session reads over MCP enters the model context and is sent to the
approved deployment — we have confirmed with InfoSec that non-restricted Confluence content is
permitted on that path (ticket <id>).

**If we are on Data Center rather than Cloud:** the hosted server is Cloud-only. We would run the
community `ghcr.io/sooperset/mcp-atlassian` container instead, with `READ_ONLY_MODE=true`,
`CONFLUENCE_SPACES_FILTER=LEDGER`, and a personal access token for a service account with read
on `LEDGER` only. Please tell us which applies.

**Attached (evidence):**
- The `.mcp.json` entry (`{"type": "http", "url": "https://mcp.atlassian.com/v2/mcp"}`)
- The CQL with the `restricted` exclusion
- The read-only triage procedure: /kt/confluence/
```

### Ask 3: a self-hosted runner label

**When you need it:** the first job that must reach the internal network — the Oracle test database or the staging URL. `ubuntu-latest` can't. **Who:** the platform team, who own the runner pool.

```markdown
# Request: self-hosted runner label `[self-hosted, linux, payments]`

**What:** a runner (or pool) our scheduled workflows can target with
`runs-on: [self-hosted, linux, payments]`, on the internal network, able to reach:
- `ledger-test-db.internal:1521/FREEPDB1` — the Oracle test database, for characterization runs
- `https://ledger-staging.internal` — for the browser-agent end-to-end job
It must NOT be able to reach production, and we would like that to be a network rule, not a promise.

**When:** weekdays, 06:07–06:47 UTC (02:07–02:47 New York). All jobs finish before the 03:00
settlement batch; nothing runs during it.

**Requirements:** an ephemeral runner, or one cleaned between jobs — the night rebuilds from a
fresh checkout and must not find yesterday's; no long-lived credentials on the box (jobs use the
credential path from ask 1); every job carries `timeout-minutes`.

**Attached (evidence):**
- `.github/workflows/nightly-e2e.yml` and `nightly-characterize.yml`, with their `permissions:` blocks
- The cron table (all five nightly jobs, UTC and New York)
- The environment stage of the night, which states what the runner is for: /overnight-qa/anatomy-of-a-night/
```

### Ask 4: a security review of the night shift

**When you need it:** before the first job that writes anything — a branch, a draft PR, an issue. The read-only first night usually needs only ask 1, but sending this early buys goodwill. **Who:** InfoSec.

```markdown
# Request: security review — payments team's unattended Claude Code jobs ("the night shift")

**What we are asking you to approve:** scheduled GitHub Actions workflows that run Claude Code with
no human in the loop against `payments-api` (first) and the `ledger-*` repositories (later),
bounded as below. Read-only jobs now; one writing job (characterization tests, to a branch and a
draft PR, never `main`) when you are satisfied.

**What it may never do, and what enforces each line:** the table at
/overnight-qa/blast-radius/#the-security-review-evidence-pack — every row names the flag, setting,
hook, or workflow permission that enforces it, and the one row where the enforcement is a human.

**Attached (evidence):**
- The workflows with their `permissions:` blocks (`nightly-triage.yml` now; `nightly-characterize.yml`
  for the write approval)
- `.claude/settings.json` and `.claude/settings.night.json` — the deny lists
- `.claude/hooks/block-destructive.sh` and `.claude/hooks/write-scope.sh` — the guards, with a run's
  `permission_denials` showing each one refusing a deliberate violation
- The runner setup (ask 3) and the credential path (ask 1)
- Retention: `night.json`, `report.md`, and test reports kept 30 days as run artifacts; who can read them
- The kill switch: `gh workflow disable nightly-triage.yml`, tested on <date> by <name>

**What we would like back:** approval for the read-only jobs; the list of conditions for the writing job.
```

:::tip[Good citizen]
Ask for the cap. A credential with a spend limit is easier to approve than one without, costs you nothing on a job that already carries `--max-budget-usd`, and is the difference between "the night burned $400 last Tuesday" being a story about a bug and a story about a budget meeting. [Cost and Governance](/overnight-qa/cost-and-governance/) has the ledger that makes the cap a number you can defend at renewal.
:::

## Audit and retention

Two kinds of record exist, and security will ask about both.

**The unattended run's evidence.** Every night on this site saves the `-p` JSON (`night.json`), the report it produced (`report.md`), and the deterministic phase's output (`target/surefire-reports/`) as a run artifact with a thirty-day retention — the `actions/upload-artifact@v7` step with `retention-days: 30` in the triage workflow. The JSON is the audit record: what the model concluded, what it cost, how many turns, whether it was refused anything, and how it exited. The first time you read one:

```bash
# seat: team
jq '{is_error, num_turns, total_cost_usd, duration_ms, denials: (.permission_denials | length)}' night.json
```

```console
$ jq '{is_error, num_turns, total_cost_usd, duration_ms, denials: (.permission_denials | length)}' night.json
{
  "is_error": false,
  "num_turns": 14,
  "total_cost_usd": 0.41,
  "duration_ms": 212873,
  "denials": 0
}
```

`denials: 0` on a night is the line security will want to see trend, and `permission_denials` is where a deliberate violation shows up when you prove a fence. Note what the JSON does *not* contain: the full transcript of every tool call. The `result` is the model's final text; if the review wants tool-by-tool detail, that's a different output format and a bigger artifact, and it's a conversation to have before the first night rather than after an incident. Anyone who can read the repository's Actions runs can download its artifacts, so the retention question is also an access question — bring it to security as one.

**Your laptop's sessions.** Claude Code keeps session data locally; the `cleanupPeriodDays` setting governs how long, and a managed settings file can pin it fleet-wide. If the policy has a retention number for "AI interaction logs," that's the setting to point at, and it's the platform team's to set rather than yours.

One more thing the reviewer will notice if you don't: **the model's output is untrusted input to your own scripts.** The triage workflow reads the report's headline into the Slack payload with `jq --arg` from a file, never through `${{ }}` expression expansion, because a model-written string interpolated into a shell step on a runner is a script-injection vector. Treat every `result` the way you'd treat a form field.

## Who owns what

The boundary table for this page, so the four asks land in the right column:

| Concern | YOU | PLATFORM | SECURITY |
|---|---|---|---|
| The policy text and its interpretation | Read it; cite it in every ask | — | Writes it, answers the source-code question in writing |
| Which deployment path, which region, which models | Use what's set; confirm with the env check | Decides; ships it in managed settings | Approves the path as "the deployment" |
| The credential on your laptop | Keep it out of prompts, files, and screenshots | Issues and rotates it | Audits its use |
| The CI credential and its spend cap | Ask 1, with the job list; read the ledger weekly | Issues it, sets the cap | Approves unattended use |
| The MCP allowlist | Ask 2, with the endpoint and the spaces | Managed settings | Approves the data flow; defines `restricted` |
| The `restricted` label | Honour it in every query, every recipe | — | Owns it |
| Secrets hygiene in your repos | Deny rules, gitignored local files, the push-time scan | Organization-level secret scanning, if any | Policy and incident response |
| Retention of run artifacts and session data | `retention-days` on every upload; know the number | `cleanupPeriodDays` in managed settings | Sets the number |
| The self-hosted runner and what it can reach | Ask 3, with the hosts and the window | Provisions it; the network rule | Approves the reach |
| Whether the night may write | Ask 4, with the evidence pack | — | Decides, with conditions |

If something is blocked and you can't say which column it's in, that's the first thing to find out; a complaint sent to the wrong column is a week lost.

## Where next

- **Next in the journey:** [Day-1 Checklist](/start/day-1-checklist/) — install, authenticate against the path you just confirmed, and leave the day with a `CLAUDE.md`, the permissions baseline, and the hook that makes the deny rules above real.
- **The lateral jump:** reading this as the reviewer rather than the requester? [Blast Radius](/overnight-qa/blast-radius/) was written as your evidence pack, and [the reviewer's track](/learning-paths/#5-the-reviewers-seat) sequences the rest.
