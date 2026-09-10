---
title: "Cost, Budgets, and Rolling the Night Shift Out to Teams"
description: What a night actually costs and how to measure it rather than guess, which model each job deserves, three levels of spending cap including a ledger script you can run today, and the review checklist that keeps every new team's job inside the fences.
keywords:
  - how much does an ai agent cost per run
  - the night burned the budget last tuesday
  - total_cost_usd claude code
  - claude code cost per github actions run
  - haiku vs sonnet vs opus for ci jobs
  - max-budget-usd
  - reusable workflow for nightly ai jobs
  - ai spend ledger github actions artifacts
  - nightly job pr review checklist
  - report actioned rate
sidebar:
  order: 11
---

**You are here if:** someone asked what this costs, or the night cost more than someone expected, or a second team wants a night of their own and you're the person who has to make that safe.

The good news first: at the sizes in this playbook, an unattended night is one of the cheaper things your CI does. The bad news is that "cheap" is a property of the bounds, not of the technology, and the difference between a job that costs pocket change and one that eats a month's budget by 06:00 is usually a single flag nobody set.

## What you're buying, in one line

Every agent run is billed on tokens — the units of text the model reads and writes. The shape never changes:

```text
cost ≈ (input tokens × input rate) + (output tokens × output rate)
       …with cache reads billed at a fraction of the input rate
```

Three things follow from that shape. **Input usually dominates**, because an agent reads far more than it writes: a triage run reads a whole surefire directory and writes one report. **Prompt caching matters more than model choice on repeated runs** — caching is on by default, and the repeated prefix of each turn (the system prompt, `CLAUDE.md`, the files already read) is billed at a fraction of the input rate, which is why turn ten costs much less than turn one. And **output tokens are the expensive ones per unit**, so a job that writes eighty characterization tests costs meaningfully more per turn than one that writes a report.

Rates change, differ per model, and differ per deployment path (Anthropic API, Bedrock, Vertex), so this site never prints them. Get the current numbers from [Anthropic's pricing page](https://claude.com/pricing), and if you're on Bedrock ask the platform team for the account's effective rates — they may not be the list ones.

**Read `total_cost_usd`; don't estimate.** Every `claude -p --output-format json` run reports what it actually cost, and that number is already sitting in the `night.json` you upload as an artifact every morning:

```bash
# seat: team — what last night actually cost, from the downloaded morning-report artifact
jq '{total_cost_usd, num_turns, duration_ms, usage}' night.json
```

```console
{
  "total_cost_usd": 0.41,
  "num_turns": 14,
  "duration_ms": 212873,
  "usage": {
    "input_tokens": 1200,
    "output_tokens": 5300,
    "cache_creation_input_tokens": 50000,
    "cache_read_input_tokens": 940000
  }
}
```

Read the `usage` block once and the arithmetic stops being abstract: 940,000 cache-read tokens against 1,200 fresh input tokens is the caching effect made visible — almost everything this run "read" it had already paid to read on an earlier turn, at a fraction of the rate. Estimating from token counts is a useful *design* tool, for deciding whether a job is a two-cent job or a two-dollar job before you write it. It is a terrible *reporting* tool, because the estimate ignores caching, retries, thinking tokens, and the run that read three enormous files you forgot about. The estimate sets the budget flag; the measurement sets the ledger.

## The arithmetic per job type

Here's what dominates each of the four nightly jobs, in placeholders. Fill in your own numbers before you write the prompt — it's how you find out that a job is badly shaped while it's still free to change.

```text
triage        INPUT  ≈ SYSTEM + prompts/nightly-triage.md
                     + (FAILURES × ~40 lines of surefire text)
                     + (READS × source file size)
              OUTPUT ≈ one report — a few hundred to ~1,200 tokens

characterize  INPUT  ≈ SYSTEM + CLAUDE.md + the characterize skill
                     + (CHANGED_FILES × file size)
                     + (TEST_RUNS × suite output)          ← the flake gate runs the suite 3×
              OUTPUT ≈ (TESTS_WRITTEN × ~80 lines of Java) + the report

e2e           INPUT  ≈ SYSTEM + e2e/scenarios.md
                     + (STEPS × accessibility snapshot)
              OUTPUT ≈ small: a step log and the report
              STORAGE: screenshots and traces — an artifact-size cost, not a token cost

review        INPUT  ≈ PRS × (diff tokens + files opened for context)
              OUTPUT ≈ PRS × one review comment
```

**Triage is the cheapest thing here and stays cheap** as long as the agent reads *reports*, not the codebase. Fourteen failures at forty lines of stack trace each is a few thousand tokens; the risk is a prompt that says "investigate the root cause", which invites the agent to read half of `src/main`. Cap the reads in the prompt ("read at most the first frame inside `src/` for each group") and the cost stops depending on repo size.

**Characterization is dominated by the test runs, not the writing.** Each `./mvnw test` produces output the agent reads to decide what passed, and the flake gate runs the suite three times. Two levers: scope the targets to files changed in the last 24 hours instead of "the module", and make the suite output quiet (`-q`) so the agent reads results rather than build chatter. [Cost shape](/overnight-qa/characterization-tests/#cost-shape) on that page has the per-run numbers.

**The browser job's surprise is that it's cheap in tokens.** An accessibility snapshot — the structured tree `browser_snapshot` returns — is a few hundred to a few thousand tokens per step, and it's what the model should be reading anyway. Screenshots are for *humans reading the report*, and their cost is artifact storage and upload time, not tokens. So the e2e job's budget is small and its `timeout-minutes` is the bound that actually bites.

**Review is the one job whose cost scales with someone else's day.** Cost = PRs × diff size, and neither factor is yours. A Tuesday after a quiet Monday is three PRs; the day before a release is nineteen, one of them a 4,000-line dependency bump. So the review job's budget is stated *per PR* (`$5` per PR, 30 turns) with a cap on how many PRs one night reviews, and the workflow skips diffs above a size threshold with a line in the report saying it did. A job that silently truncates is worse than one that says "PR #492 is 4,100 lines — needs a human, not a night".

## Which model for which job

The model is the biggest single cost lever and the easiest one to get wrong in both directions. As of September 2026 the aliases are `haiku`, `sonnet`, and `opus`; pin exact IDs only where the platform team's Bedrock config requires it ([Enterprise and cost](/toolkit/enterprise-and-cost/) owns that).

| Job | Model | What you gain | What you pay |
|---|---|---|---|
| Labelling and classification passes — "is this failure new or unchanged?", "which label does this issue get?", "is this file a test or a fixture?" | `haiku` | The lowest rate and the fastest turns; a pass over forty short strings is a rounding error, and it keeps the expensive model out of bookkeeping | Shallow reasoning. It will *label*, not *diagnose*. Only safe when the choices are a closed set and the evidence has already been extracted for it |
| Triage, characterization, e2e, freshness — the default for everything that reads evidence and writes a report | `sonnet` | The right balance for structured work with clear evidence; every default in this playbook (`$3`/25 turns for triage, `$8`/60 for characterization) is sized around it | On a genuinely hard cross-file question it will produce a confident answer with thinner reasoning than `opus` — which the evidence rule catches, because a weak inference cites nothing |
| Nightly PR review and cross-repo system synthesis | `opus` | Noticeably better at the two jobs that need judgment across files: "does this diff break an invariant three files away?" and "how do these 23 repos actually fit together?" | The highest rate and slower turns — and on the review job the cost multiplies by the number of PRs, so it's the one place where a busy day and an expensive model compound |

The rule of thumb underneath the table: **spend the model on judgment, not on transcription.** If the job's hard part is deciding, use the better model; if the hard part is reading a lot of structured text and reformatting it, the cheap model plus a good prompt beats the expensive model plus a vague one. And a job whose findings are wrong is expensive at any rate, because the cost you're actually optimising is [cost per actioned finding](/overnight-qa/the-morning-report/#the-report-actioned-metric), not cost per run.

## Three levels of cap

One flag isn't governance. Three levels are, because each catches what the others miss.

### Level 1 — the per-run ceiling

`--max-budget-usd` on every agent step, always, with `--max-turns` next to it because a budget alone doesn't stop a cheap loop. When the budget is hit, `claude` exits with code 2 and the JSON still carries `result` and `total_cost_usd`, so a budget-stopped night still publishes what it had. The defaults this playbook uses:

| Job | Budget | Turns | Why that number |
|---|---|---|---|
| `nightly-triage` | `$3` | 25 | A triage that hasn't converged in 25 turns is looping, not working |
| `nightly-characterize` | `$8` | 60 | Writing and running tests three times legitimately needs turns |
| `nightly-e2e` | `$6` | 40 | Cheap in tokens; the wall is `timeout-minutes`, not the budget |
| `nightly-review` | `$5` per PR | 30 | Per PR, because the workload is someone else's diff |

Raise one for a rerun with a `workflow_dispatch` input, never with an edit — `gh workflow run nightly-triage.yml -f budget_usd=5` leaves a record, and an edit at 08:10 that nobody lowers again is exactly how "the night burned $400 last Tuesday" begins.

### Level 2 — the monthly ledger

Per-run caps bound the worst night. They tell you nothing about the month, because twenty nights at the ceiling is a number no single run will ever show you. So sum the artifacts. This script runs against any of the nightly workflows and needs nothing but `gh` and `jq`:

```bash
#!/usr/bin/env bash
# scripts/night-ledger.sh — what one nightly workflow cost over its last 30 successful runs.
# Usage: scripts/night-ledger.sh [workflow-file]      (default: nightly-triage.yml)
# Reads the morning-report artifact from each run. Changes nothing.
set -uo pipefail
WORKFLOW="${1:-nightly-triage.yml}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

IDS="$(gh run list --workflow "$WORKFLOW" --status success --limit 30 --json databaseId -q '.[].databaseId')"
[ -n "$IDS" ] || { echo "no successful runs of $WORKFLOW"; exit 0; }

for ID in $IDS; do
  # A run older than the artifact — or past its 30-day retention — has nothing to download.
  gh run download "$ID" -n morning-report -D "$TMP/$ID" >/dev/null 2>&1 || continue
done

mapfile -t FILES < <(find "$TMP" -name night.json)
[ "${#FILES[@]}" -gt 0 ] || { echo "no night.json in any artifact — did the artifact name change?"; exit 0; }

echo "$WORKFLOW · ${#FILES[@]} of the last 30 successful runs carry a cost record"
jq -s 'map(.total_cost_usd // 0) | {runs: length, total_usd: (add*100|round/100), worst_night_usd: max}' "${FILES[@]}"
jq -s 'sort_by(-(.total_cost_usd // 0)) | .[0:3] | map({session_id, total_cost_usd, num_turns, is_error})' "${FILES[@]}"
```

```console
$ scripts/night-ledger.sh nightly-characterize.yml
nightly-characterize.yml · 28 of the last 30 successful runs carry a cost record
{
  "runs": 28,
  "total_usd": 47.13,
  "worst_night_usd": 7.94
}
[
  {"session_id": "0f3a…", "total_cost_usd": 7.94, "num_turns": 60, "is_error": false},
  {"session_id": "b21c…", "total_cost_usd": 6.10, "num_turns": 54, "is_error": false},
  {"session_id": "9d47…", "total_cost_usd": 3.02, "num_turns": 31, "is_error": false}
]
```

Three things to read. The **runs** count against 30 tells you whether your evidence is intact — 28 of 30 usually means two runs aged past retention, but a sudden drop means the artifact stopped being uploaded and your ledger is quietly going blind. The **total** is the number you take to the platform team. And the **top three** are the diagnosis: a night at exactly the ceiling with `num_turns` at exactly the cap (7.94 at 60 turns, above) is a run that was *stopped*, not a run that finished — which means the report that morning was partial, and the fix is a narrower question, not a bigger budget.

Run it monthly, or wire it into a `workflow_dispatch` job so anyone can get the number without a laptop.

### Level 3 — the platform's spend limit

The two levels above are yours and they are both bypassable by a well-meaning edit. The third isn't: a hard spend limit on the credential itself, set by whoever owns the deployment — an API key with a monthly cap, or an AWS budget on the Bedrock account. Ask for it explicitly, and ask for it *at the same time as the credential*, because it's a much easier conversation before there's a bill than after:

> We're running four scheduled agent jobs on weeknights, with per-run ceilings of $3–$8 and a measured average of about $X per night across all four (ledger attached). Please issue the CI credential with a hard monthly cap of $Y — roughly 3× the measured monthly total, so a bad week fails safely instead of quietly succeeding. We'd rather the jobs stop than overspend, and we'd like to be notified at 50%.

That number — 3× measured, not 10× hoped — is the whole trick. A cap you'll never legitimately hit is a cap that only fires during an incident, which is exactly when you want it. The full request, with the evidence pack to attach, is on [Working Within Policy](/start/working-within-policy/).

## The nightly-job PR review checklist

Every nightly job arrives as a pull request — a workflow file, a prompt file, maybe a hook. This is what a reviewer checks, and it is deliberately shorter than a security review because most of it is visible in the diff. Paste it into the PR template for `.github/workflows/nightly-*.yml`:

```markdown
## Nightly-job review checklist

- [ ] **One question.** The job answers a single question, stated in the workflow's `name:`
      or its top comment. Not "test everything".
- [ ] **Three bounds set.** `--permission-mode`, `--max-turns`, and `--max-budget-usd` are all
      present on the agent step (or inherited from `scripts/run-claude.sh` defaults).
- [ ] **Permission mode named and read-only** — `dontAsk` plus an explicit `--allowedTools`
      list — unless this job's playbook page says it writes, in which case `acceptEdits`
      plus `--settings .claude/settings.night.json`.
- [ ] **Deny list present.** The settings `deny` array covers `git` writes, `rm`, and the
      secret paths; the workflow's `permissions:` block is minimal (any key set ⇒ the rest
      are `none`).
- [ ] **Write-scope hook present if the job writes**, and the fence has been proven with a
      deliberate violation (`permission_denials` from that test pasted in the PR).
- [ ] **Report contract followed** — headline verdict, what's new since yesterday, findings
      grouped by cause, cost line.
- [ ] **Every finding carries evidence** (`path:line`, a failing test, a screenshot, a SARIF
      row) or is explicitly labelled as inference.
- [ ] **An owner is named** — a person, not a team, who reads this job's output at standup.
- [ ] **Kill switch tested.** `gh workflow disable` / `gh workflow enable` output pasted in
      the PR description.
- [ ] **Cron is outside the 03:00–03:40 batch window and not on the hour** — an odd minute,
      and not a minute another team's night already uses.
- [ ] **Secrets least-privilege.** `GITHUB_TOKEN` via `permissions:` rather than a PAT; any
      other token scoped to one space, one repo, one environment.
- [ ] **Cost per run estimated here, measured after week one** — write the estimate in this
      PR, then edit the real number in once the ledger has seven nights of data.
```

The last item is the one people skip and the one that pays. An estimate written down is a prediction someone can be wrong about in public, which is how a team learns the shape of its own costs in a fortnight instead of a year.

## Rolling out to other teams

Once your night works, the second and third teams will want one, and the failure mode is predictable: each team copies your workflow, edits it, and within a quarter there are five subtly different sets of bounds and nobody can answer "what can the night do?" for the org.

**Put the bounds in a reusable workflow and let each team own only the question.** GitHub's `workflow_call` trigger makes one workflow callable from another repo; the sister site's [Reusable workflows](https://jamiegunn.github.io/k8s_soup_to_nuts/ci/reusable-workflows/) page owns the mechanics. The split that works:

```yaml
# .github/workflows/nightly-agent.yml in the org's shared-ci repo — the reusable night.
# It owns the BOUNDS. Callers own the QUESTION.
on:
  workflow_call:
    inputs:
      prompt_file:     { type: string, required: true }             # the caller's question
      budget_usd:      { type: string, required: false, default: "3" }
      max_turns:       { type: string, required: false, default: "25" }
      allowed_tools:   { type: string, required: false, default: "Read,Grep,Glob" }
      permission_mode: { type: string, required: false, default: "dontAsk" }
      runs_on:         { type: string, required: false, default: "ubuntu-latest" }
    secrets:
      ANTHROPIC_API_KEY: { required: true }
      SLACK_WEBHOOK_URL: { required: true }
```

```yaml
# .github/workflows/nightly-triage.yml in ledger-api — the calling side, nine lines of policy
name: Nightly triage — did yesterday's changes break the API facade?
on:
  schedule:
    - cron: "23 6 * * 1-5"      # 02:23 New York. NOT :17 — that minute belongs to payments-api
permissions:
  contents: read
  actions: read
jobs:
  triage:
    uses: your-org/shared-ci/.github/workflows/nightly-agent.yml@v1   # pin a tag, not a branch
    with:
      prompt_file: prompts/nightly-triage.md
      budget_usd: "3"
    secrets: inherit
```

Two details that decide whether this works in practice. **Pin the reusable workflow to a tag**, not `@main` — otherwise a change to the shared bounds ships to five teams' 2 a.m. runs with no review in any of their repos. And **the reusable workflow runs against the caller's checkout**, so `prompts/nightly-triage.md` must exist in the calling repo. That's a feature: the shared workflow enforces the bounds and the report contract; each team writes its own question, in its own repo, reviewed by its own people with the checklist above.

For the prompts themselves, a shared `prompts/` repo works better than copy-paste once three teams are running: the good triage prompt improves over months, and you want that improvement to reach everyone. Vendor it with a second checkout step (`actions/checkout@v7` with `repository:` and a pinned `ref:`) so each team's run still names the exact version it used, and a team that needs a variant keeps a local file that shadows it.

Two things belong to the platform team at this point, and asking for both together is one conversation instead of five:

- **Org-level secrets** — one `ANTHROPIC_API_KEY` (or one OIDC role) with the spend cap, available to a named set of repos, instead of a copy in every repository's settings. Fewer copies is fewer places to rotate and fewer places to leak.
- **A shared runner pool** — the `[self-hosted, linux, payments]` label doesn't scale to five teams as five separate machines. Ask for a pool with the label, and ask whether its runners are ephemeral (see [Blast Radius](/overnight-qa/blast-radius/)).

:::tip[Good citizen]
Do not schedule five teams' nights at the same minute. Scheduled workflows are the lowest-priority thing GitHub runs: they get delayed under load, and **queued jobs can be dropped entirely** — the run simply never happens, and nobody notices until someone asks why there was no report on Thursday. Stagger them. This playbook's own four jobs sit at `:07`, `:17`, `:27` and `:37` past the hour for exactly this reason, and the reusable workflow's docs should carry a table of which minutes are already taken. The same politeness applies to shared environments: two teams' browser agents in the same staging instance at 02:00 produce two useless reports and one confusing incident.
:::

## The weekly line, and the metric that retires a job

Cost belongs in the report, not in a spreadsheet only you read. The morning report's "what ran" section carries the night's own cost, and once a week the Monday report carries the running total — one line, from the ledger:

```markdown
**Cost:** this run $0.41 · week to date $2.18 · 30-day total $47.13 across 4 jobs
```

That line does two jobs. It keeps the number honest, because it's published to the same channel as the findings. And it makes the real question askable at standup: not "is this expensive?" but **"is this worth it?"** — which is a comparison between the cost line and the [report-actioned rate](/overnight-qa/the-morning-report/#the-report-actioned-metric), the share of findings a human actually did something with.

That comparison has one hard rule attached, and it's the governance decision this whole page exists to make possible:

**A job whose report-actioned rate stays below 20% for two consecutive weeks is turned off and redesigned — not tuned.** Turn it off with `gh workflow disable`, without a meeting. The temptation at that point is always to rewrite the prose: make the headline sharper, add emoji to the Slack message, put "ACTION REQUIRED" on the top finding. That fixes nothing, because a report nobody acts on is answering a question nobody has. Go back to the three questions — what question should the night answer, what evidence would prove it, what's the blast radius — and if the honest answer to the first one is "we're not sure", the job shouldn't run at all. A night that doesn't run costs nothing and misleads nobody, and the credibility you keep is what lets you schedule the *next* job.

## Where next

- **Next in the journey:** [Overnight QA on One Page](/overnight-qa/cheat-sheet/) — every table on this playbook condensed, plus the FAQ in the phrasing people actually search for.
- **The lateral jump:** [Enterprise and Cost](/toolkit/enterprise-and-cost/) — the mechanics under this page: provider routing, pinned model IDs, and where the org's spend controls actually live.
