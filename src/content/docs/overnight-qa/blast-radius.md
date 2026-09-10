---
title: "Blast Radius: Sandboxing, Secrets, and What the Night Must Never Do"
description: The deny list you write before the prompt — nine things an unattended agent may never do, the mechanism that enforces each one, the ones enforced only by a person, and the evidence pack that gets the night approved.
keywords:
  - is it safe to run an ai agent unattended
  - what can the agent touch at 2am
  - claude code permissions in github actions
  - deny list for an ai agent
  - the agent deleted a test
  - github actions workflow permissions least privilege
  - kill switch for a scheduled workflow
  - gh workflow disable
  - secrets on a github runner
  - security review of an ai coding agent
sidebar:
  order: 10
---

**You are here if:** you are about to let an agent run with nobody watching, and someone — InfoSec, your platform team, or your own nervous system at 2 a.m. — needs a precise answer to "what exactly can it touch?"

The answer is not a paragraph in the prompt. It is a list, written before the prompt, of the things the night may never do, with a *mechanism* next to each line. That's the whole discipline of this page.

## The deny list is the thing you write first

Most people design a nightly job in this order: pick the task, write the prompt, run it, then bolt on safety when something scary happens. Reverse it. Write the deny list first, because the deny list is what makes the prompt safe to iterate on — once the fences are in place you can rewrite the prompt fifty times without a security conversation each time, and a bad prompt costs you a useless report instead of an incident.

The reason is mechanical rather than philosophical. In an interactive session *you* are the last fence: you see the agent about to delete the wrong directory and you say no. In headless mode there is no screen, so a tool that hasn't been pre-approved isn't prompted for — it is refused automatically, and the refusal is written into the run's `permission_denials`. Every fence you don't build in advance is simply absent. **A sentence in a prompt is a request; a permission mode, a deny rule, a hook, a workflow `permissions:` block, and a cron are the only things that are enforcement.** The Field Note [The Night the Agent Fixed the Test by Deleting It](/blog/the-night-the-agent-fixed-the-test-by-deleting-it/) is what a request is worth at 02:41.

And a list with mechanisms is a document a security reviewer can read in ten minutes; a prompt is not. The last section turns the table below into the pack you send them.

## The deny list

This is the night shift's list for the cast in this playbook — `payments-api` and the `ledger-*` repos, jobs `nightly-triage.yml`, `nightly-characterize.yml`, `nightly-e2e.yml`, `nightly-review.yml`. Copy it, change the numbers, keep the shape. The **enforced by** column is the point of the table: if a row's mechanism is a sentence, that row isn't enforced.

| The night may never… | Enforced by | Where it lives |
|---|---|---|
| Touch production — any prod host, database, queue, or credential | No production secret exists in the job's `env:`; `environment:` protection rules gate anything that isn't staging; the browser is fenced to the staging origin | the workflow's `env:` and `environment:` keys; `--allowed-origins` in `.mcp.json` |
| Push to `main` (or any branch a human didn't ask for) | `permissions: contents: read` on read-only jobs; on the writing job `Bash(git push*)`, `Bash(git commit*)` and `Bash(git checkout*)` are in the settings `deny` list, and the **workflow** pushes to `nightly/characterize-<date>` and opens a *draft* PR | `permissions:` block; `.claude/settings.night.json` |
| Read a secret other than the one credential its own step needs | `deny` rules on `Read(./.env)`, `Read(./.env.*)`, `Read(./**/secrets/**)`; one credential per job in `env:`; GitHub masks secret values in logs | `.claude/settings.json` (Day-1 baseline); the workflow's `env:` |
| POST anywhere except the report endpoints | The agent has no network tool at all: no `Bash(curl *)` in any allow list, `WebFetch` and `WebSearch` in `deny`; only the servers passed to `--mcp-config` load, because of `--strict-mcp-config`; Slack and Confluence are **separate workflow steps** the agent never runs | settings `allow`/`deny`; `--strict-mcp-config`; the workflow's step list |
| Delete or weaken an existing test ⚠ | `Bash(rm *)` denied and the agent cannot push — but a test *inside* `src/test/` can still be edited, so the real fence is the draft PR, the human reviewer, and the mutation score | the PR review + [the mutation gate](/overnight-qa/characterization-tests/#mutation-testing-the-quality-gate) |
| Modify `src/main` in a test-writing job | The write-scope hook: a `PreToolUse` guard on `Edit\|Write` that denies any path outside `src/test/` and writes the reason into `permission_denials` | `.claude/hooks/write-scope.sh` |
| Open more than ten issues in one night ⚠ | A capped loop in the workflow that files the first ten findings and summarises the rest in the report — the agent doesn't hold `gh` at all | `scripts/file-findings.sh`, called by `nightly-review.yml` |
| Spend more than the job's budget | `--max-budget-usd` (exit code 2 when hit), `--max-turns` for the cheap loop the budget can't catch, `timeout-minutes: 45` as the backstop | the agent step; the job's `timeout-minutes` |
| Run inside the 03:00–03:40 settlement batch window | The cron: `17 6 * * 1-5` UTC is 02:17 New York, and the timing budget adds up to 35 minutes of a 45-minute timeout; `concurrency` stops a manual rerun overlapping the scheduled one | `on: schedule:` and `concurrency:` in every nightly workflow |

⚠ marks the two rows where the mechanism is a person or a script rather than the runtime. Read the caution below before you show this table to anyone.

The bounds themselves — what each flag does, why both a turn cap and a budget, how to read the exit codes — are [Running Claude Unattended](/overnight-qa/running-unattended/). This page is about what the bounds are *for*.

## What the workflow enforces before the agent starts

Three of those rows are settled before `claude` is ever installed on the runner, which is why they're the cheapest fences you own.

**`permissions:` is a whitelist, and specifying one key sets every other key to `none`.** That's the single most useful fact about GitHub Actions security: a job that declares `contents: read` cannot write code, open issues, comment on PRs, or push, no matter what runs inside it. The triage job's block is two lines, and both have reasons:

```yaml
permissions:
  contents: read             # checkout only
  actions: read              # to download last night's report artifact
```

Everything else — `issues`, `pull-requests`, `packages`, `id-token`, `security-events` — is `none` by omission. The characterization job needs `contents: write` and `pull-requests: write` to push a branch and open a draft PR, so it declares those and nothing more; in `nightly-review.yml` the review job needs `pull-requests: write` for its one comment and the impact job needs `issues: write` and `actions: read`, declared per job so neither holds the other's power. Write the smallest set, and let the reviewer see it in the diff.

**`environment:` is where an approval gate goes.** If a job must reach something that matters — the internal staging URL, the Oracle test database — put it behind a GitHub environment with protection rules, so the credential is scoped to that environment and the platform team controls who and what may use it. This is the row a security reviewer will care about most, because it's the one enforced by *their* system rather than yours. GitHub's own reference is [Using environments for deployment](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).

**The cron is a safety mechanism, not a convenience.** `17 6 * * 1-5` is UTC, weekdays, and 02:17 in New York on purpose: GitHub delays jobs queued at the top of the hour and may drop queued jobs under load, so an odd minute is both more reliable and more polite; and the whole night has to be finished before the 03:00 settlement batch, which is a *production* job that an e2e agent still clicking through settlement screens would corrupt. The timing table that makes 35 minutes fit inside 45 is in [Anatomy of a Night Shift](/overnight-qa/anatomy-of-a-night/).

## What the permission mode and the deny rules enforce

Every repo on this site gets the same Day-1 `.claude/settings.json`, and its `deny` array is the part that matters at 2 a.m.:

```json
{
  "permissions": {
    "defaultMode": "default",
    "allow": ["Read", "Grep", "Glob", "Bash(./mvnw *)", "Bash(git status*)", "Bash(git diff*)", "Bash(git log*)"],
    "deny": ["Bash(rm -rf *)", "Bash(git push --force*)", "Bash(git push -f*)", "Bash(git reset --hard*)", "Read(./.env)", "Read(./.env.*)", "Read(./**/secrets/**)"]
  }
}
```

`deny` wins over `allow` and over anything the prompt says, which is the property you're buying. Jobs that write get a second file, `.claude/settings.night.json`, passed with `--settings`; it swaps the mode to `acceptEdits`, adds `Edit` and `Write` to the allow list, and denies every `git` write plus `WebFetch` and `WebSearch` — [Running Claude Unattended](/overnight-qa/running-unattended/#bound-one-what-it-may-do) reads it line by line, and [Headless mode and the SDK](/toolkit/headless-and-sdk/) owns the settings precedence rules. One consequence deserves repeating here because it's the answer to half the questions InfoSec will ask: **the agent never holds the power to push.** The workflow does the `git add src/test && git commit && git push`, in a step the agent cannot invoke, after the hook has already refused anything outside the fence.

## The write-scope hook, in full

A hook is a shell script Claude Code runs at a defined point in the loop, whose output can allow or deny the tool call that was about to happen ([Hooks](/toolkit/hooks/) owns the mechanism). This is the one hook the night shift cannot do without, quoted whole:

```bash
#!/bin/bash
# .claude/hooks/write-scope.sh — PreToolUse guard on Edit|Write.
# The characterization job may create or change files under src/test/ only.
# Anything else is denied with a reason that lands in the run's permission_denials.
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"
case "$FILE" in
  "")                                exit 0 ;;   # not a file write; nothing to judge
  "$ROOT"/src/test/*|src/test/*)     exit 0 ;;   # inside the fence
  *)
    jq -n --arg f "$FILE" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:("write outside src/test/ blocked by policy (.claude/hooks/write-scope.sh): " + $f)}}'
    exit 0 ;;
esac
```

Three design choices worth stating. It reads the tool call from stdin as JSON and pulls `.tool_input.file_path`, so it judges the *intended* write before it happens rather than cleaning up after. It defaults to allowing when there's no file path (`exit 0` on the empty case), because a hook that denies things it doesn't understand blocks the run for reasons nobody can debug at 08:05. And it anchors on `CLAUDE_PROJECT_DIR` so it behaves identically on your laptop and on a runner whose checkout lives at `/home/runner/work/payments-api/payments-api`.

When it denies, this is the exact JSON it prints on stdout:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "write outside src/test/ blocked by policy (.claude/hooks/write-scope.sh): /home/runner/work/payments-api/payments-api/src/main/java/com/payments/settlement/SettlementCalculator.java"
  }
}
```

Read it field by field, because this is the shape every permission-deciding hook uses:

- **`hookSpecificOutput`** — the envelope. Hooks can return other top-level keys for other purposes; the permission decision always lives inside this object.
- **`hookEventName`** — which event this decision answers. `PreToolUse` means the decision is made *before* the tool runs, so a `deny` prevents the write rather than reporting it. A `PostToolUse` hook would be a fire alarm, not a lock.
- **`permissionDecision`** — one of `allow`, `deny`, or `ask`. A night hook only ever says `allow` or `deny`: `ask` means "prompt the human", and at 02:17 there is no human, so `ask` in an unattended job is a hang or an automatic refusal depending on the mode. Decide in the script.
- **`permissionDecisionReason`** — a free-text string that goes back to the model *and* into the run's `permission_denials`. Name the policy and the file, as this one does, because in the morning this string is the difference between "something was denied" and "the agent tried to patch `SettlementCalculator.java` and was stopped".

The script exits `0` even when denying. That's deliberate: exit code 0 plus the JSON *is* the decision protocol, and a non-zero exit would look like a broken hook rather than an enforced policy.

In the morning you read the denials out of the run's JSON result:

```bash
# seat: team — after a nightly-characterize run, from the downloaded artifact
jq '.permission_denials' night.json
```

```console
[
  {
    "tool_name": "Edit",
    "reason": "write outside src/test/ blocked by policy (.claude/hooks/write-scope.sh): /home/runner/work/payments-api/payments-api/src/main/java/com/payments/settlement/SettlementCalculator.java"
  }
]
```

The entry fields aren't documented (as of September 2026), so read them with `jq` and don't hardcode key names in a script. What matters is the count and the reasons: **an empty `permission_denials` on a writing job means either a well-behaved night or a fence that isn't wired up, and you can't tell which without testing it.** That's why both this playbook's writing pages end with a deliberate violation — [prove the fence before the first night](/overnight-qa/characterization-tests/#prove-the-fence-before-the-first-night).

:::caution[Two rows in that table are not enforced by the runtime]
Be honest about this in writing, before someone else discovers it.

**"Open no more than ten issues" is a script, not a fence.** It lives in [`scripts/file-findings.sh`](/overnight-qa/review-and-security/#findings-become-issues-once), called by `nightly-review.yml`, and it works only because the agent has no `gh` and the *workflow* holds `issues: write` — the workflow reads the findings the agent wrote to disk and creates the issues itself, stopping at the cap. These are the three lines doing the work:

```bash
# seat: team — the cap, inside scripts/file-findings.sh (quoted in full on the review page)
MAX_ISSUES="${MAX_ISSUES:-10}"; filed=0
# …per finding, after the fingerprint de-dup:
if [ "$filed" -ge "$MAX_ISSUES" ]; then echo "$key" >> night/unfiled.txt; continue; fi  # the cap: report only
```

If someone later hands the agent `Bash(gh *)` to "simplify the workflow", the cap silently disappears while this table still claims it exists. That is the shape of every ⚠ row: the control is real, and it lives somewhere a refactor can delete without failing a build.

**"Never delete or weaken a test" is a reviewer plus a number.** The write-scope hook fences the job to `src/test/`, which is exactly where the existing tests live, so the hook cannot tell "wrote a new characterization test" from "loosened an assertion until it passed". Three things catch it instead: the PR is a *draft* and a human approves it; the diff is reviewed for weakened assertions specifically; and the mutation score has to hold — a test that kills no mutants is deleted before the PR is opened. That is a real control, but it is a control made of attention, so it belongs on this table with a warning triangle rather than in the column that says "the runtime refuses".
:::

## The kill switch

Every job needs a way to stop it that a person can use without reading any code, and it has to be tested *before* the first real night, not during the incident:

```bash
# seat: team — the kill switch. Stops all future scheduled runs of this workflow immediately.
gh workflow disable nightly-e2e.yml
gh workflow list --all
```

```console
✓ Disabled nightly-e2e.yml

Nightly triage (read-only)        active              128374912
Nightly characterize              active              128374913
Nightly e2e (staging)             disabled_manually   128374914
Nightly review                    active              128374915
```

`disabled_manually` in that listing is the state you want to see. Disabling stops future schedule fires; it does *not* stop a run already in flight, so the full stop is two commands — disable, then cancel what's running:

```bash
# seat: team — during an incident: stop the schedule, then kill the run that's mid-flight
gh workflow disable nightly-e2e.yml
gh run cancel "$(gh run list --workflow nightly-e2e.yml --status in_progress --limit 1 --json databaseId -q '.[0].databaseId')"
```

And the half people forget:

```bash
# seat: team — turning it back on after the fix is merged
gh workflow enable nightly-e2e.yml
```

Do the disable/enable cycle once, deliberately, the week before you go live, and paste the console output into the evidence pack. It costs two minutes and it converts "there's a kill switch" from a claim into a demonstrated fact. Write the two commands into the workflow's own description or the team's runbook so the person who needs them at 03:15 isn't grepping this site for them; [The Night Failed](/troubleshooting/the-night-failed/) is the incident page that assumes they exist.

## Runner isolation

**GitHub-hosted runners are ephemeral, and that's a security feature you get for free.** `ubuntu-latest` gives every run a fresh VM that is destroyed afterwards, so yesterday's checkout, yesterday's `~/.claude` state, and yesterday's stray `auth.json` are simply gone. Prefer them for anything that doesn't strictly need the internal network.

A self-hosted runner is different in a way that matters more than people expect: **it keeps state between runs.** The `[self-hosted, linux, payments]` runner exists because the e2e job needs `https://ledger-staging.internal` and the Oracle test DB at `ledger-test-db.internal:1521/FREEPDB1`, and those aren't reachable from GitHub's cloud. The cost is that the workspace, the tool caches, the browser profile, and anything the previous job wrote are all still there when tonight's job starts — including whatever another team's workflow left behind. So a self-hosted nightly job cleans up explicitly, at the start (not the end, because the run that crashed didn't reach its cleanup step):

```yaml
      - name: Clean the workspace before anything else runs
        run: |
          git clean -xdff                       # everything untracked, including ignored files
          rm -rf pw-out auth.json night.json    # last night's screenshots, session state, and JSON result
```

Ask the platform team whether the runner is ephemeral (recreated per job) or persistent, and put the answer in the evidence pack — it changes what a reviewer has to believe about it.

**Credentials on the runner are the other half.** The API-key path (`ANTHROPIC_API_KEY` in a repository secret) is the simplest and the one this playbook shows, but a long-lived key in a secret store is what turns a compromised workflow into a durable problem. On Bedrock — the deployment this shop uses, in `us-east-1` — the better shape is OIDC: the workflow requests a short-lived token from GitHub with `permissions: id-token: write`, exchanges it for a role in the cloud account, and no long-lived key exists anywhere. It is a **platform ask**, and a good one to make early, because it removes a secret from your repo rather than adding a permission. The request, with the evidence to attach, is on [Working Within Policy](/start/working-within-policy/).

## Secrets

Four rules, in the order they bite.

**Use `GITHUB_TOKEN`, not a PAT, unless you can say why.** The automatic `${{ github.token }}` is scoped to the repository, expires when the job ends, and is constrained by the `permissions:` block you already wrote. A personal access token is scoped to a *person*, usually lives longer, usually carries more repos than you meant, and survives the person leaving. The only common reason to need one is cross-repository work — a night that files an issue in another repo — and that's the moment to ask the platform team for a GitHub App installation token instead.

**Scope every other token to the smallest place it can do its job.** The Confluence credential the report job uses is scoped to space `PAY` — the team's own space, where the "Nightly QA" parent page lives — and specifically *not* to `LEDGER`, the 940-page legacy space the KT playbook reads. The night publishes; it has no business writing anywhere else, and a token that can only reach `PAY` makes that structural.

**Never put a secret in a prompt.** Not in `prompts/nightly-triage.md`, not in an `--append-system-prompt`, not as "the token is X, use it to call Y". Prompt text is context: it gets sent to the model, it lands in the session transcript, it can be echoed back in the result, and the result is what you publish to Slack and Confluence. Credentials belong in the workflow's `env:`, used by workflow steps the agent does not control.

**Scan the night's own output before you publish it.** This is the rule people don't think of, and it's the one that has teeth: the agent reads log files and test output, and a log line can contain a token. If it quotes that line into the morning report as evidence — doing exactly what you asked it to do — you are about to post a live credential into a Slack channel and a Confluence page. So the last thing before publishing is a scan of the night's own artifacts:

```bash
# seat: team — runs after the agent step, before Slack/Confluence publish. Scans what the night WROTE.
gitleaks dir night/ --report-format json --report-path night/leaks.json || true
LEAKS=$(jq 'length' night/leaks.json)
if [ "$LEAKS" -gt 0 ]; then
  echo "::error::the night's output contains $LEAKS potential secret(s); publishing blocked"
  jq -r '.[] | "\(.File):\(.StartLine)  \(.RuleID)"' night/leaks.json
  exit 1
fi
echo "no secrets in the night's output ($LEAKS findings)"
```

```console
Finding:     ANTHROPIC_API_KEY=sk-ant-****************************
Secret:      sk-ant-****************************
RuleID:      anthropic-api-key
File:        night/report.md
Line:        48

11:04PM WRN leaks found: 1
::error::the night's output contains 1 potential secret(s); publishing blocked
night/report.md:48  anthropic-api-key
```

The `|| true` is there because the scan's own exit status shouldn't decide the outcome — the report file does, and reading `jq 'length'` gives you a number you can log. A blocked publish with a red run is a good morning; a token in `#payments-nightly` is a bad quarter. (`gitleaks dir` scans a directory tree; `gitleaks git` scans history — the older `detect` subcommand is deprecated.)

## Audit: what survives the night

A night that can't prove it ran is a night that didn't. Three artifacts, one retention rule:

| Artifact | What it proves | Retention |
|---|---|---|
| `night.json` — the `-p` JSON result | What it cost, how many turns, whether it errored, **what was denied** | `retention-days: 30` on the `morning-report` artifact |
| `report.md` and the surefire XML | What the night claimed and the raw evidence behind it | same artifact, 30 days |
| The run log and job summary | Which commit, which runner, which flags, who triggered a manual rerun | GitHub's own log retention |

Thirty days is a deliberate middle: long enough to answer "what did the night do on the 12th?" in a post-incident review, short enough that you aren't archiving your test output forever. GitHub allows 1–90.

**Who can read them matters as much as how long they live.** Artifacts are readable by anyone with read access to the repository — in most orgs a much wider group than the people who can see the secrets. That's usually fine and occasionally not: a report quoting a stack trace from a fixture with realistic customer data is a data-boundary question, not a testing question. If your test data isn't synthetic, say so in the evidence pack and let InfoSec decide.

## A night gone wrong

Five real shapes of failure, each traced to the bound that wasn't there. This is the table to read *before* the incident, and the one to bring to the retro after.

| Symptom | Which bound was missing | The fix |
|---|---|---|
| A test that had been failing for a week is gone from `src/test/` and the suite is green — [the Field Note](/blog/the-night-the-agent-fixed-the-test-by-deleting-it/) | Nothing structural: the job ran with a permissive mode and "please don't change existing tests" in the prompt. The prompt was the fence | Write-scope hook + `deny` on `Bash(rm *)` + `Bash(git*)` writes; draft PR only; the mutation gate; and a review that reads deletions first |
| The month's budget gone by 06:00 on a Tuesday | `--max-budget-usd` was raised for a rerun and never lowered; no turn cap, so a cheap loop ran for the full timeout | Both caps in `scripts/run-claude.sh` defaults; the budget as a `workflow_dispatch` input, not an edit; the ledger read weekly ([Cost and Governance](/overnight-qa/cost-and-governance/)) |
| The `catalog` team's staging tests all failed at 01:40 and the browser agent's screenshots show their data | No origin fence and no schedule coordination — two teams' nights in the same environment at the same time | `--allowed-origins https://ledger-staging.internal`; a dedicated `e2e-operator` account ([test data and auth](/overnight-qa/exploratory-and-e2e/#test-data-and-auth)); crons staggered by agreement |
| 41 issues opened overnight, one per flaky test, all assigned to nobody | No issue cap and no de-duplication; the agent had `gh` | The cap script above; a fingerprint in the issue body so the same finding never opens twice ([findings become issues, once](/overnight-qa/review-and-security/#findings-become-issues-once)) |
| A report that says the settlement module "appears fragile" and links nothing | The evidence rule wasn't enforced by the schema, so prose passed | `--json-schema` with `evidence` required per group and a `confidence` field of `verified` or `inference` ([the report contract](/overnight-qa/the-morning-report/#the-contract-in-seven-parts)) |

## The security review evidence pack

When you ask InfoSec or the platform team to approve the night shift, send this. It is deliberately short, entirely made of artifacts that already exist, and it answers the four questions a reviewer actually has: what can it reach, what stops it, how do we know, and how do we turn it off.

```markdown
# Night shift — security review pack (payments, <date>)

## What this is
- 4 scheduled GitHub Actions workflows running a bounded Claude Code agent on
  `payments-api` and `ledger-*`, weeknights 02:07–02:47 America/New_York.
- One question per job. Output is a report; two jobs also open a draft PR or an issue.

## 1. The deny list
- [ ] The deny-list table (9 rows, each with the mechanism that enforces it),
      including the 2 rows marked as enforced by a person or a script.

## 2. The code that enforces it
- [ ] `.github/workflows/nightly-{triage,characterize,e2e,review}.yml` — read the
      `permissions:`, `environment:`, `concurrency:`, `timeout-minutes:` and cron lines.
- [ ] `.claude/settings.json` (Day-1 baseline) and `.claude/settings.night.json` (writing jobs).
- [ ] `.claude/hooks/write-scope.sh` and `.claude/hooks/block-destructive.sh`.
- [ ] `.mcp.json` — the only MCP servers that load, with `--allowed-origins` on the browser.

## 3. Runner and credentials
- [ ] Which jobs run on `ubuntu-latest` (ephemeral) and which on `[self-hosted, linux, payments]`.
- [ ] For the self-hosted runner: who owns it, is it ephemeral or persistent, and the
      `git clean -xdff` step that runs first.
- [ ] Credential path: API key in a repo secret today; OIDC to Bedrock requested (ticket ___).
- [ ] Token scopes: `GITHUB_TOKEN` least-privilege per job; Confluence token scoped to space `PAY`.
- [ ] `gitleaks dir night/` runs over the night's own output before anything is published.

## 4. Evidence and retention
- [ ] `morning-report` artifact (report.md, night.json, surefire XML), `retention-days: 30`.
- [ ] `permission_denials` from the fence test — proof the hook denies, with the reason string.
- [ ] Who can read the artifacts (anyone with repo read access) and whether test data is synthetic.

## 5. Stopping it
- [ ] Kill-switch test output: `gh workflow disable` / `gh workflow enable`, dated.
- [ ] Named owner per job, and the 20%-actioned-rate rule that retires a job.

## 6. Cost
- [ ] Per-run budget per job (`--max-budget-usd`) and the turn cap.
- [ ] The monthly ledger script and last month's total.
```

Two notes on using it. Send the *files*, not descriptions of the files — a reviewer who can read `permissions: contents: read` in your workflow needs nothing else for that row, and a reviewer reading your summary of it needs to trust you. And leave the two ⚠ rows in: a pack that admits which controls are made of human attention is the one that gets approved, because the alternative is a reviewer finding the gap themselves and wondering what else you smoothed over.

## Where next

- **Next in the journey:** [Cost, Budgets, and Rolling the Night Shift Out to Teams](/overnight-qa/cost-and-governance/) — the money bound in detail, the ledger, the PR review checklist that keeps every new job inside this page's fences.
- **The lateral jump:** [Working Within Policy](/start/working-within-policy/) — the same asks written as requests to send, with the evidence to attach to each.
