---
title: "The Night Failed: Timeouts, Budget Hits, Empty Reports"
description: Read a red overnight run in two commands — exit codes, budget hits, timeouts, empty reports, missing artifacts, a failed Slack step, a schedule that never fired — and fix the bound that was actually wrong.
keywords:
  - claude code exit code 2 budget
  - claude code exit code 1 in ci
  - max-budget-usd exit 2
  - the operation was canceled timeout-minutes
  - empty morning report overnight job
  - no previous run artifact download
  - gh http 403 actions read permission
  - slack github action invalid_payload
  - scheduled workflow did not run github actions
  - overnight agent job failed what to check
sidebar:
  order: 5
---

**Symptom:** it's 08:05. The run is red, or the channel message is wrong, or there is no run at all.

Every failure below is a bound doing what it was told. The job is to find which bound fired and whether it was the right one — four minutes with two commands. Guessing takes an hour and usually ends with a raised budget and the same failure tomorrow.

## Two commands before any theory

The first says which step went red; the second says what the agent was doing when it stopped:

```bash
# seat: team — 18234567890 is the red run's ID from `gh run list --workflow nightly-triage.yml`
cd ~/payments/payments-api
gh run view 18234567890 --log-failed
gh run download 18234567890 -n morning-report -D night/
jq '{is_error, error, num_turns, total_cost_usd, permission_denials}' night/night.json
```

```console
$ gh run view 18234567890 --log-failed
triage	Agent phase — read-only triage	run-claude: exit=2
triage	Agent phase — read-only triage	run-claude: cost_usd=3 turns=17 is_error=true denials=0 duration_ms=402118
triage	Re-raise the agent's failure so the run shows red	agent exited 2 (0 ok · 1 error · 2 budget/auth partial)
$ jq '{is_error, error, num_turns, total_cost_usd, permission_denials}' night/night.json
{
  "is_error": true,
  "error": "budget exceeded",
  "num_turns": 17,
  "total_cost_usd": 3,
  "permission_denials": []
}
```

Four fields carry the diagnosis: `error` says whether the agent itself failed; `num_turns` against your turn cap says whether it was converging or circling; `total_cost_usd` against your budget cap says whether money was the wall; `permission_denials` says whether a fence refused it something. The wording of `error` varies by version — read the *pair* (exit code, plus which cap the number sits on), never the sentence ([field by field](/overnight-qa/quick-start/#reading-nightjson-the-first-time)). No artifact at all means the run died before the upload step: start at [`timeout-minutes`](#the-job-hit-timeout-minutes).

## Route by what you saw

| What you're looking at | Likely cause | Go to |
|---|---|---|
| `exit=2`, report stops mid-sentence | the cost ceiling fired — or auth did | [Exit 2, partial report](#exit-2-and-there-is-a-partial-report) |
| `exit=1`, no JSON | no credential path, or a missing prompt file | [Exit 1, no report](#exit-1-and-there-is-no-report-at-all) |
| Red on the job, not the step | the deterministic phase ate the clock | [`timeout-minutes`](#the-job-hit-timeout-minutes) |
| `report.md` is two lines, says RED | the `jq` fallback fired: no `result` | [The fallback line](#the-report-is-the-fallback-line) |
| "New since last night" meaningless daily | last night's artifact never arrived | ["no previous run"](#no-previous-run-every-night) |
| Green run, silent channel | the Slack step, not the agent | [The Slack step](#the-slack-step-failed) |
| No run at all | the schedule | [The schedule](#the-schedule-never-fired) |
| Batch alerts at 03:10, agent in the logs | the clock, not the code | [Overlapping the batch](#the-night-overlapped-the-0300-batch) |

### Exit 2, and there is a partial report

Exit `2` is "partial": the cost ceiling was hit, or authentication failed before the first turn. One look separates them — a budget hit carries a real `total_cost_usd` sitting on your cap and usually a partial `result`; an auth failure carries zero cost and no result.

Then read `num_turns`, because it decides the fix:

- **Turns under the cap, cost at the cap** (17 of 25, above): the budget is too low for the work — fourteen red tests cost more to group than two. Raise `NIGHT_BUDGET_USD` once, deliberately, and watch what the next run spends.
- **Turns at the cap and cost at the cap:** it looped. Something it was told to read wasn't there, so it searched and re-searched, confidently. The fix is the prompt or the paths, not the wallet — [the worked example](/troubleshooting/overview/#worked-example-the-empty-report) is this exactly.

**Lever: tools** — the bound worked. Whether it was the *right* bound is the question, and a loop means the real failure was context.

### Exit 1, and there is no report at all

Exit `1` means the run failed outright, and both common causes print above the wrapper's line in the step log. The credential guard in `scripts/run-claude.sh` fires before `claude` runs at all:

```console
run-claude: no credential path configured (ANTHROPIC_API_KEY, CLAUDE_CODE_USE_BEDROCK, or CLAUDE_CODE_USE_VERTEX)
run-claude: exit=1
```

That's an empty secret, a renamed secret, or a fork: a `secrets.*` reference that doesn't resolve expands to an empty string rather than failing loudly. Check the workflow's `env:` block, then the secret names. A credential present but *wrong* is different — `claude` starts, fails to authenticate before the first turn, and exits `2` at zero cost.

The other cause is a prompt file that isn't there, after a rename or a partial checkout:

```console
cat: prompts/nightly-triage.md: No such file or directory
run-claude: exit=1
run-claude: no JSON produced (see the step log above)
```

The `cat` collapses to an empty prompt, so the run has no instructions and nothing to say. Fix the path — and expect this one after every reorganisation.

**Lever: context** for the missing prompt: the model was handed nothing. The credential case is no lever at all — it's plumbing, which is why you read the exit code before forming a theory.

### The job hit `timeout-minutes`

The failure is on the *job*, the log stops mid-step, and there's no artifact because the upload never ran:

```console
Error: The operation was canceled.
```

`timeout-minutes: 45` is the backstop bound — budget and turns govern the agent, this governs everything. It usually fires because the suite got slower, not the agent: a new test that starts a container, a cache miss on `setup-java`, a bad night on the runner. Compare step durations against a green run before touching the number, and budget the phases rather than extend the night ([the timing budget](/overnight-qa/anatomy-of-a-night/#the-timing-budget)).

**Lever: tools** — the outermost bound, and the only one that takes the evidence down with it. If it fires often, move the upload earlier.

### The report is the fallback line

The channel got a message saying RED with no findings, or the job summary is two lines. That text isn't the model's — it's the fallback in the publish step:

```bash
# seat: team — the line in nightly-triage.yml that produced what you're reading
jq -r '.result // "# Morning report — payments-api\n**Verdict:** RED — the agent produced no result (see run-claude line above)"' night.json > report.md
```

The fallback fires when `.result` is null: the agent produced no final text. So don't debug the report — go back to `night.json` and read `error` and `is_error`. Nine times in ten it's one of the two sections above, said honestly.

A *thin* report — a real `result` reading "Unable to locate the surefire reports" — is a different failure: context, not plumbing ([The Morning Report](/overnight-qa/the-morning-report/)).

**Lever: proof** — no evidence came out, and a report nobody can act on is the same as no report.

### "no previous run", every night

"New since last night" only means something if last night's artifact arrived. The fetch step is `continue-on-error: true` — the first night has nothing to fetch — so a permanent failure hides as one line, `no previous run`. Run the download by hand to see what the step swallowed:

```bash
# seat: team
gh run download 18234567890 -n morning-report -D previous/
```

```console
gh: HTTP 403
```

Two causes. The artifact name doesn't match — the fetch asks for `morning-report`, the upload publishes something else; check both spellings. Or the workflow can't read its own run history: in GitHub Actions, **naming any `permissions:` key sets every other key to `none`**, so `contents: read` alone gets a 403 downloading artifacts. The triage workflow carries `actions: read` for exactly this.

**Lever: context** — the night couldn't see yesterday, so every finding reads as new and the report becomes noise.

### The Slack step failed

Green through the agent, red on delivery:

```console
Error: Invalid webhook payload: invalid_payload
```

As of September 2026 the action is `slackapi/slack-github-action@v4`, whose payload handling is stricter than the inline multi-line YAML `payload:` blocks older examples pass — a model-written headline carrying a quote or a newline is the usual culprit. The fix is what the triage workflow already does: build the JSON with `jq --arg` into `slack.json` and hand the action `payload-file-path`, alongside `webhook:` and `webhook-type: incoming-webhook`. That's not only about quoting: model output interpolated into a workflow expression is a script-injection vector on a runner, and `jq --arg` from a file is safe by construction.

**Lever: proof** — the evidence exists and never reached a human. The job summary still has the report, and the artifact is downloadable for thirty days.

### The schedule never fired

No run, no red, nothing. `gh run list --workflow nightly-triage.yml --limit 5` is the check; three causes cover almost all of it:

- **Inactivity.** On a public repository, scheduled workflows are disabled automatically after 60 days without repository activity. GitHub emails an admin; nobody reads it. Re-enable it, and if the repo really is dormant, a schedule is the wrong trigger.
- **The wrong branch.** Scheduled workflows run only from the default branch's latest commit, so a cron edited on a feature branch changes nothing until it merges. The "but I fixed it" one.
- **Delay, not absence.** Scheduled jobs can be delayed under load, worst at the top of the hour; a run appearing at 06:40 for a `17 6` cron did fire. Hence the odd minute.

**Lever: none** — nothing ran, so nothing could fail. Which is why the first check on a silent morning is the run list, not the logs.

### The night overlapped the 03:00 batch

The night was green and someone else's morning wasn't: settlement alerted at 03:10 and the agent is in the logs at the same timestamps. Nothing failed — a bound was missing. The cron `17 6 * * 1-5` UTC is 02:17 New York precisely so the night finishes before the 03:00–03:40 batch window. Two things break that: a `workflow_dispatch` rerun during the day (the `concurrency` group stops it colliding with itself, not with the batch), and a night that grew until it ran long. Check the *finish* time, not the start, and treat any overlap as a blast-radius incident even when nothing broke ([Running Unattended](/overnight-qa/running-unattended/) has the kill switch).

**Lever: tools** — the missing bound was the clock.

:::caution[Raising the budget is the second fix, never the first]
After an exit `2` the instinct is to bump `NIGHT_BUDGET_USD` and rerun. Do that only when `num_turns` came in *under* the cap — that's honest work that ran out of money. Turns at the cap means circling, and a bigger budget buys a longer circle and a bigger bill. Change one bound per night; a night with three simultaneous fixes teaches nothing.
:::

## Escalate with these four things

Escalate when the first broken thing is in a column you don't own: the credential and its spend cap, the org's Actions policy, runner labels, the deployment path. Four attachments turn a ping-pong ticket into a ten-minute fix.

1. **The run URL** — `https://github.com/payments/payments-api/actions/runs/18234567890` — which carries the logs, the timings, and the artifacts.
2. **The exit code**, quoted from the `run-claude: exit=` line in the job summary, with the wrapper's cost/turns/denials line under it.
3. **`night.json`** — read it, then attach it. It holds no secrets by construction: the wrapper never echoes credentials, and GitHub masks them in logs.
4. **Which bound you believe was wrong**, and why: "budget, because turns came in at 17 of 25", or "`actions: read` is missing, because a hand-run download returns 403". A ticket that names a bound gets an answer; "Claude is broken" gets a queue.

Exact strings, decoded one by one, are in the [Error Message Index](/troubleshooting/error-index/); the three-question method that routed you here is [Which Lever Failed?](/troubleshooting/overview/).
