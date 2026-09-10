---
title: Overnight QA on One Page (+ FAQ)
description: The whole playbook condensed — the anatomy, the bounds and their flags, exit codes, the JSON fields, the four workflow skeletons, the report template, the deny list, the review checklist, the metrics — plus the questions everyone asks, answered in three sentences each.
keywords:
  - overnight qa cheat sheet
  - claude -p exit code 2 meaning
  - claude code json output total_cost_usd num_turns permission_denials
  - nightly job pr review checklist
  - can the ai fix things overnight
  - how do we stop the nightly ai job
  - what does a nightly ai run cost
  - run claude code on kubernetes cronjob instead of github actions
  - github action vs claude -p for scheduled jobs
  - who reads the morning report
sidebar:
  order: 12
---

Everything condensed; every cell links to the page that earns it. Top half: the tables and the copyable artifacts. Bottom half: the FAQ.

## The three questions, one line

```text
what question should the night answer? → what evidence would prove it? → what's the blast radius if it's wrong?
```

One question per job; evidence is a test, a diff, a screenshot, a SARIF row, a `path:line` — never a paragraph; the blast radius picks the permission mode and who has to approve. [The overview](/overnight-qa/overview/#the-three-questions-before-any-nightly-job) states them; every page serves one.

## The anatomy

| Stage | Seat | The bound | The evidence it leaves |
|---|---|---|---|
| **Trigger** | team | Odd-minute cron in UTC; `concurrency` group; finishes before 03:00 America/New_York | The run itself, on the default branch's HEAD |
| **Environment** | team; platform for a self-hosted label | `ubuntu-latest` unless the job needs the Oracle test DB or the staging URL; rebuilt from scratch every night | The step log's cache and service lines |
| **Deterministic phase** | team | The real suite, `continue-on-error: true`; the agent never replaces it | `target/surefire-reports/*.xml` |
| **Agent phase** | team — needs the CI credential | Mode + allowlist, `--max-turns`, `--max-budget-usd`, `timeout-minutes` | `night.json` |
| **Evidence** | team | `upload-artifact@v7`, `retention-days: 30`; last night's report via `gh run download` | `report.md`, `night.json`, XML, screenshots |
| **Report** | team — needs the webhook | The contract; `if: ${{ !cancelled() }}`; model text never through `${{ }}` | Job summary, Slack, issue, Confluence page |
| **Human** | team | Ten minutes at standup; labels; a named owner per item | Closed night issue; the actioned rate |

Stage by stage with failure modes and the timing budget: [Anatomy of a Night Shift](/overnight-qa/anatomy-of-a-night/).

## The bounds and their flags

| Bound | Read-only jobs (triage, review, e2e) | Writing jobs (characterize) | Why |
|---|---|---|---|
| **What it may do** | `--permission-mode dontAsk` + `--allowedTools "Read,Grep,Glob"`; anything else is denied and logged | `--permission-mode acceptEdits` + an allowlist that adds `Edit`, `Write`, and `Bash(./mvnw *)` + `--settings .claude/settings.night.json` (denies `git push`/`commit`/`checkout`/`reset` and `rm`; the write-scope hook allows `src/test/**` only) | Never `bypassPermissions` on a runner; a prompt saying "please don't" is a request |
| **How long** | `--max-turns 25` and `timeout-minutes: 45` | `--max-turns 60` and `timeout-minutes: 45` | A cheap loop slips under any budget; a hang slips past any turn cap; the default job timeout is 360 minutes |
| **How much** | `--max-budget-usd 3` | `--max-budget-usd 8` | Exit code 2 when hit; the JSON still carries the partial `result` and the cost |
| **Where it writes** | Nowhere: `permissions: contents: read` | A branch `nightly/characterize-<date>`, one draft PR: `contents: write`, `pull-requests: write` | `permissions:` naming any key sets every other key to `none` |
| **What it sees** | `--bare` (no `CLAUDE.md`, hooks, or skills) + the prompt file + files it reads | No `--bare` — the standing orders help when writing tests; `--mcp-config` + `--strict-mcp-config` for the browser | Context is the first lever; what's not in the window can't be reasoned about |

The flags, in prose with their reasons: [Running Claude Unattended](/overnight-qa/running-unattended/#bound-one-what-it-may-do). The defaults per job are in the skeleton table below.

## Exit codes

| Code | Meaning | Do |
|---|---|---|
| `0` | Success — a result was produced within every bound | Publish; read `permission_denials` anyway |
| `1` | Failure — bad flags, a run error, the wrapper found no credential path | Read the step log; retry once by hand; never auto-retry more |
| `2` | Partial — the cost ceiling was hit, or auth failed before the first turn | Read `result` and `total_cost_usd`; rerun with `-f budget_usd=<n>` only if the work deserved it; never retry a `2` automatically |
| `130` / `143` | SIGINT / SIGTERM — something stopped the process | On a runner: a cancellation or the `timeout-minutes` backstop; check the run's step list |

Full rules, including the "once on 1, never on 2" retry policy: [exit codes](/overnight-qa/running-unattended/#exit-codes-and-what-to-do-about-each).

## The JSON fields worth reading

`--output-format json` writes one object; these six fields are the night's audit trail (`jq '{is_error, num_turns, total_cost_usd, duration_ms, denials: (.permission_denials | length)}' night.json`):

| Field | It means | If you see… | Then |
|---|---|---|---|
| `is_error` | The run failed | `true` | Read `error` and the step log before the report |
| `num_turns` | Agentic turns used | At the cap every night | The prompt asks two questions, or the model is looping — narrow it |
| `total_cost_usd` | What this run cost — read it, never estimate it | Climbing week over week with the same inputs | Check `num_turns` and the input sizes; the ledger line |
| `duration_ms` | Wall time of the agent phase | Approaching the 15-minute budget line | Tighten the question before the flag |
| `permission_denials` | Tools the agent tried that weren't allowed | Non-empty on a read-only job | The fence working; if the tool was needed, add it deliberately and re-review |
| `structured_output` | The validated object when `--json-schema` was given | `null` with a schema set | The output didn't validate; the markdown `result` is your fallback |

Field by field, with the full example: [reading the JSON](/overnight-qa/running-unattended/#reading-the-json-field-by-field).

## The four workflow skeletons

| Workflow | Cron (UTC) | `permissions:` | Key flags | Runner · budget |
|---|---|---|---|---|
| `nightly-triage.yml` (L1) | `17 6 * * 1-5` | `contents: read`, `actions: read` | `--bare --permission-mode dontAsk --allowedTools "Read,Grep,Glob" --model sonnet` | `ubuntu-latest` · $3 / 25 turns |
| `nightly-characterize.yml` (L2) | `27 6 * * 1-5` | `contents: write`, `pull-requests: write` | No `--bare`; `--permission-mode acceptEdits --settings .claude/settings.night.json --allowedTools "Read,Grep,Glob,Edit,Write,Bash(./mvnw *),Bash(git diff *),Bash(git status *)" --model sonnet`; `fetch-depth: 2`; the workflow, not the agent, creates `nightly/characterize-<date>` and opens the draft PR | `ubuntu-latest` · $8 / 60 turns |
| `nightly-e2e.yml` (L3) | `07 6 * * 1-5` | `contents: read`, `issues: write` (one issue per night, filed by the workflow) | `--permission-mode dontAsk --mcp-config .mcp.json --strict-mcp-config --model sonnet`; `--allowedTools` is `Read,Glob` plus the named `mcp__playwright__browser_*` tools; the server is fenced with `--allowed-origins https://ledger-staging.internal`; `timeout-minutes: 40` | `[self-hosted, linux, payments]` · $6 / 40 turns |
| `nightly-review.yml` (L3) | `37 6 * * 1-5` | `contents: read`, `pull-requests: write` | `--permission-mode dontAsk --allowedTools "Read,Grep,Glob,Bash(gh pr diff *)" --model opus`; one review comment per PR, never approve or request changes | `ubuntu-latest` · $5 per PR / 30 turns |

Every skeleton shares the same header: `workflow_dispatch` with a `budget_usd` input, a `concurrency` group with `cancel-in-progress: false`, `timeout-minutes: 45` (40 for e2e, so it's off staging by 02:47), and the agent step through `scripts/run-claude.sh`. The fifth job, `nightly-freshness.yml` at `47 6 * * 1-5`, is the KT bridge and lives in [Living Docs](/kt/living-docs/). Full workflows: [triage](/overnight-qa/quick-start/#the-recipe), [characterize](/overnight-qa/characterization-tests/#the-workflow), [e2e](/overnight-qa/exploratory-and-e2e/#the-workflow), [review](/overnight-qa/review-and-security/).

## The report, short form

```markdown
# Morning report — <service> — <YYYY-MM-DD>
**Verdict:** GREEN | AMBER | RED — <the one number that matters>

## New since yesterday
<the whole reason to read this; "nothing new" is a valid and good line>

## What failed, by cause
### <cause> — <n> tests — NEW | UNCHANGED
- evidence: `path:line` | <link to log/screenshot/diff/SARIF row>
- cause: <one sentence> (verified | inference)

## Needs a human
- [ ] <item> — proposed owner: @<name>

## What the night did on its own
- opened draft PR #… · filed issue #…

## What ran
- <job>: <duration> · <tests run/failed> · cost $<total_cost_usd> · turns <num_turns> · exit <code>
```

The full contract, the `--json-schema` twin, and where it lands (summary, Slack or Teams, GitHub issue, Confluence): [The Morning Report](/overnight-qa/the-morning-report/).

## The deny list, short form

| The night may never… | Enforced by |
|---|---|
| Touch production | No credential for it exists on the runner; `environment:` protection rules on anything that does |
| Push to `main` | `permissions: contents: read` on read-only jobs; on writing jobs the agent has no git tool (`settings.night.json` denies `git push` and `git commit`) — the workflow pushes a per-night branch and opens a draft PR; branch protection on `main` is the backstop |
| Read secrets other than its own | One credential per job; nothing echoed; `::add-mask::` for ad-hoc values |
| Send anything anywhere except the report endpoints | No `Bash` on read-only jobs; `--allowed-origins` for the browser; `--strict-mcp-config` |
| Delete or weaken a test | The write-scope hook; the characterization skill's rule; a human reads the diff |
| Modify `src/main` in a test job | `.claude/hooks/write-scope.sh` — `src/test/**` only |
| Open more than N issues | One issue per night; a fingerprint in the body; `nightly:flaky` |
| Spend more than the ceiling | `--max-budget-usd` and `--max-turns` and `timeout-minutes` — all three |
| Keep running when someone says stop | `gh workflow disable <file>` — tested once before the first real night |

Each line with its reasoning and the evidence pack for InfoSec: [Blast Radius](/overnight-qa/blast-radius/).

## The nightly-job PR review checklist

Paste it into the PR. Every unchecked box is a conversation:

```markdown
## Nightly-job review — <workflow file>
- [ ] One question. The job answers exactly one, and it's stated in the prompt's first lines.
- [ ] Trigger. Odd-minute cron; UTC (or `timezone:` stated); finishes before 03:00 America/New_York; `workflow_dispatch` with `budget_usd`; `concurrency` group, `cancel-in-progress: false`.
- [ ] Permissions. `permissions:` present and minimal — read-only: `contents: read`; writing: `contents: write` + `pull-requests: write`, nothing more.
- [ ] Bounds, all three. `--max-turns`, `--max-budget-usd`, `timeout-minutes` at the site defaults or with a stated reason.
- [ ] Mode. `dontAsk` + explicit `--allowedTools` for read-only; `acceptEdits` + `--settings .claude/settings.night.json` for writing; never `bypassPermissions`.
- [ ] Fence proven. A deliberate violation ran once and its denial is in `permission_denials` — link the run.
- [ ] Writes. Branch `nightly/<job>-<date>`; one draft PR; labels `nightly`, `needs-human`; never `main`.
- [ ] Evidence. Every finding in the report carries `path:line` or a link, or is marked (inference).
- [ ] Report. Follows the contract: verdict, new-since-yesterday, needs-a-human with an owner, what ran with cost.
- [ ] Owner. A named person reads it at standup; the actioned rate is counted from night one.
- [ ] Kill switch. `gh workflow disable <file>` tested; the on-call person knows the command.
- [ ] Secrets. Only the credential this job needs; model output never passes through `${{ }}`.
```

The reasoning behind each line: [the review checklist](/overnight-qa/cost-and-governance/#the-nightly-job-pr-review-checklist).

## The metrics

| Metric | Definition | Observe | Decide |
|---|---|---|---|
| **Report-actioned rate** | Findings a human did something with ÷ findings reported | Labels on the night's issues, `gh issue list --label nightly` | Target ≥50%; **below 20% for two weeks → turn the job off and redesign it, not tune it** |
| **Minutes to triage** | Report posted → decision at standup | The standup clock | Target ≤10; longer means the report isn't leading with what's new |
| **Cost per actioned finding** | Σ `total_cost_usd` ÷ actioned findings | The ledger `jq` over `night.json` artifacts | Rising with a flat actioned count → the job is reading more and finding less |
| **Signal : noise** | NEW groups ÷ all groups, week over week | The report's own sections | Falling → de-dup, `nightly:flaky`, a narrower question |

Baseline honesty applies: a measured baseline, or a proxy marked PROVISIONAL, or "we'll count for two weeks" with a TODO — the level is stated. Definitions and the ledger: [Cost and Governance](/overnight-qa/cost-and-governance/).

## The files

| File | What it is | Page |
|---|---|---|
| `scripts/run-claude.sh` | The wrapper: credential check, bounds, JSON always written, exit code propagated | [Running Unattended](/overnight-qa/running-unattended/#take-this-with-you-scriptsrun-claudesh) |
| `prompts/nightly-triage.md` | The read-only triage prompt; line 1 says READ-ONLY and that `CLAUDE.md` is not loaded | [The First Night](/overnight-qa/quick-start/#the-recipe) |
| `prompts/report.schema.json` | The machine-readable report, via `--json-schema "$(cat prompts/report.schema.json)"` | [Running Unattended](/overnight-qa/running-unattended/) |
| `.claude/skills/characterize/SKILL.md` | The night's test-writing skill | [Characterization Tests](/overnight-qa/characterization-tests/#the-skill) |
| `.claude/hooks/write-scope.sh` · `.claude/settings.night.json` | The fence for writing jobs | [Blast Radius](/overnight-qa/blast-radius/) |
| `.mcp.json` · `e2e/scenarios.md` | The Playwright server and the plain-language scenarios | [Exploratory & E2E](/overnight-qa/exploratory-and-e2e/#the-scenarios-and-the-prompt) |

## FAQ

### Can the night fix things?

It can *propose* a fix — a draft PR on a per-night branch, labelled `needs-human`, that a person merges. Nothing on this site lets an unattended agent change `main`, and [the Field Note](/blog/the-night-the-agent-fixed-the-test-by-deleting-it/) is the reason. Start with [characterization tests](/overnight-qa/characterization-tests/), the writing job with the smallest blast radius.

### Why not use the GitHub Action for everything?

The Action is built for PR-time work — `@claude` mentions, review comments, `claude_args` passthrough — and it installs its own CLI. The night wants full control of flags, any runner, and a JSON file it can read: that's raw `claude -p` through the wrapper. The site's rule and the tradeoff table: [the Action, the CLI, or the SDK](/overnight-qa/running-unattended/#the-action-the-cli-or-the-sdk).

### What if the suite is already red?

Then you have exactly the input the first night needs. `continue-on-error: true` on the test step keeps the job alive, and the agent's job is to turn the red into causes with `path:line` and an owner — fourteen red tests became three causes on this site's cast. [The First Night](/overnight-qa/quick-start/) assumes red.

### How do we stop it?

`gh workflow disable nightly-e2e.yml` — no code, no PR, no meeting; test it once before the first real night so the on-call person has run it. A run in progress is bounded by its budget, its turn cap, and `timeout-minutes` whether or not anyone is awake. [Blast Radius](/overnight-qa/blast-radius/) has the kill switch and the audit trail.

### What does a night cost?

Read `total_cost_usd` from `night.json`; never estimate. The canonical first triage night cost $0.41 in 14 turns against a $3 ceiling; the site's default ceilings are $3 triage, $8 characterize, $6 e2e, $5 per reviewed PR. The arithmetic with placeholders, model choice per job, and the weekly ledger: [Cost and Governance](/overnight-qa/cost-and-governance/).

### Can it run on our Kubernetes cluster instead?

Yes — the anatomy and the bounds don't change, only the trigger and the runner do. This site builds on scheduled GitHub Actions because the repos, secrets, PRs, and issues are already there; if your platform team points you at the cluster, the sister site's [Jobs and CronJobs](https://jamiegunn.github.io/k8s_soup_to_nuts/workloads/jobs-and-cronjobs/) page owns the mechanics.

### What if it opens 40 issues?

That's a job with no cap and no memory. One issue per night, findings as children only when NEW, a fingerprint in each body so a rerun de-duplicates, and `nightly:flaky` for anything that flips state twice. [Review & Security](/overnight-qa/review-and-security/) has the script; [The Morning Report](/overnight-qa/the-morning-report/) has the ritual that closes them.

### Does it need the self-hosted runner?

Only when the job needs something on the internal network: the Oracle test database at `ledger-test-db.internal` or the staging URL. Everything self-contained runs on `ubuntu-latest`, and a `services:` container covers Postgres or a fresh `gvenzl/oracle-free` — empty of the legacy schema, which is the trade. [Environment](/overnight-qa/anatomy-of-a-night/#environment) has both shapes.

### Can we use Copilot or another vendor?

The principles are portable and stated once per page: one question, deterministic tests first, a bounded agent, evidence not opinions, a report with a diff and an owner. What changes is the flag for each bound and the shape of the JSON; what doesn't is the anatomy, the deny list, and the metrics. [The Three Levers](/start/the-three-levers/) is the vendor-neutral statement.

### Who reads the report?

Dana, at standup, for ten minutes: headline → new → needs-a-human → assign → close the night's issue. The owner named on each item owns the follow-up; the report-actioned rate decides whether the job lives. [The Morning Report](/overnight-qa/the-morning-report/) has the ritual, [The Morning Report Nobody Read](/blog/the-morning-report-nobody-read/) has the alternative.

### Why both a budget and a turn cap?

Because each misses what the other catches: a loop of cheap `Read` calls can run a thousand turns under a small budget, and a single expensive turn can blow a budget in three. `timeout-minutes` is the third, for the hang neither flag sees. [Bound three](/overnight-qa/running-unattended/#bound-one-what-it-may-do) has the reasoning.

### Does `CLAUDE.md` apply at night?

Not under `--bare`, which skips `CLAUDE.md`, hooks, and skills for fast CI start-up — right for triage, which should judge the code and not the team's conventions. The characterization job drops `--bare` because it *wants* the standing orders while writing tests. The `--settings` file still applies either way. [Running Unattended](/overnight-qa/running-unattended/) has when not to use it.

:::tip[Take the whole thing]
`run-claude.sh`, `prompts/nightly-triage.md`, `nightly-triage.yml`, the report schema and template, both hooks, and both settings files are in the repository's [`starter-kit/`](https://github.com/jamiegunn/ai_enablement_playbook/tree/main/starter-kit) directory as real files, extracted from the same canonical source these pages quote — so the directory and the pages cannot drift. The writing workflows (characterize, e2e, review) are deliberately page-only: a job that opens PRs or drives a browser should be assembled by someone who has read why each bound is there.
:::

## Where next

- **Next in the journey:** [The First Night](/overnight-qa/quick-start/) — every table above is a decision that page makes for you, once, in a workflow you can run tonight.
- **The lateral jump:** [KT on One Page](/kt/cheat-sheet/) — the other playbook's cheat sheet; `nightly-freshness.yml` is where the two meet.
