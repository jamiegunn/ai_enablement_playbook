---
title: "The First Night: Read-Only Test Triage in 30 Minutes"
description: One scheduled, read-only Claude Code job that reads your existing suite's failures, groups them by cause with evidence, says what's new since last night, and posts three lines to Slack — bounded so it can't hurt anyone.
keywords:
  - nightly test triage with ai
  - claude code github actions schedule
  - read only claude -p in ci
  - group test failures by root cause automatically
  - surefire reports to slack summary
  - first overnight ai job
  - claude -p output format json exit code 2
  - permission_denials
  - what's new since last night test failures
sidebar:
  order: 2
---

You are here if: you have a test suite that already runs in CI and a Slack channel the team actually reads; or you want one night that can't hurt anyone before reading eleven pages; or you're piloting the section's approach on the service with the best tests before pointing it at the legacy estate.

Here is the smallest night that won't hurt anyone — and, at the end, the honest list of what it deliberately doesn't do. Thirty minutes assumes the gate passes; if the gate fails, the gate just saved you from a job that would have run for a week and produced nothing, which is a better use of the thirty minutes.

The example is `payments-api` — Spring Boot 3.3 on Java 21, forty thousand lines, a suite people trust, and fourteen tests that have been red since March because nobody reads the folder the results go to. That folder is L0 of [the maturity ladder](/overnight-qa/overview/#the-maturity-ladder); this page is L1. Substitute your names throughout.

What the night will do, in one paragraph: at 02:17 New York time on weekdays, a GitHub Actions workflow checks out `main`, runs the real suite, and hands the results — the surefire reports, the source tree, and last night's report if there is one — to Claude Code in headless mode with a read-only tool set, a turn cap, and a cost ceiling. The model groups the failures by root cause, cites the first stack frame inside `src/` as `path:line`, says which groups are new since last night, and writes the report in a fixed template. The workflow puts the report in the job summary, keeps it as an artifact for thirty days, and posts a three-line summary with a button to `#payments-nightly`. It cannot edit a file, run a command, open an issue, or push, because the flags and the workflow's permissions don't let it. **The night is read-only by construction, not by request.**

## The gate: four checks

Each is one command. Any failure → stop, follow the link, come back.

**1. The suite runs in CI today.** The night doesn't run tests you don't have; it interprets the ones you do. "Green-ish" is fine — red tests are the input, not a blocker:

```bash
# seat: team
gh run list --workflow ci.yml --limit 3
```

```console
$ gh run list --workflow ci.yml --limit 3
STATUS  TITLE                                      WORKFLOW  BRANCH  EVENT  ID           ELAPSED  AGE
X       Merge pull request #418 from payments/fx…  CI        main    push   17264450912  11m4s    3h
✓       Merge pull request #417 from payments/re…  CI        main    push   17251103377  10m48s   1d
X       Merge pull request #416 from payments/id…  CI        main    push   17238870021  11m2s    2d
```

Three runs, two red, eleven minutes each. That's the reading you want: a suite that exists, completes, and has been red often enough that nobody trusts a red run any more — the exact input triage is for. The `ELAPSED` column goes into the timing budget later. No workflow, or one that hasn't completed in weeks → the night has nothing to interpret; get `./mvnw test` running in CI first (the sister site's [Testing in CI](https://jamiegunn.github.io/k8s_soup_to_nuts/ci/testing-in-ci/) page) and come back.

**2. A credential in GitHub secrets, with a spend cap.** The runner needs a way to reach the approved Claude deployment, and it must be one the platform team issued for CI with a monthly cap on *their* side — never your personal key:

```bash
# seat: team — needs the CI credential from the platform team (Ask 1)
gh secret list
```

```console
$ gh secret list
NAME                 UPDATED
ANTHROPIC_API_KEY    about 2 days ago
```

`ANTHROPIC_API_KEY` present → pass. Missing → send [Ask 1: a CI credential with a spend cap](/start/working-within-policy/#ask-1-a-ci-credential-with-a-spend-cap) today; it's the only ask this page needs and the one with a lead time. On Bedrock the secret is different — the workflow sets `CLAUDE_CODE_USE_BEDROCK=1` and `AWS_REGION` and the runner gets its AWS identity from OIDC; [the three deployment paths](/start/working-within-policy/#the-three-deployment-paths) explains which is yours and [Enterprise Setup](/toolkit/enterprise-and-cost/) has the mechanics. The recipe below marks the two lines that change.

**3. A Slack incoming webhook for `#payments-nightly`.** Yours to create — a channel admin's job, not the platform team's. In Slack: your app → *Incoming Webhooks* → *Activate Incoming Webhooks* → *Add New Webhook to Workspace* → choose `#payments-nightly` → *Authorize*. The URL looks like `https://hooks.slack.com/services/T…/B…/…` and it is a secret: anyone holding it can post to the channel. Put it where the workflow reads it:

```bash
# seat: team — needs a Slack incoming webhook for the channel (you create it; a channel admin authorizes it)
gh secret set SLACK_WEBHOOK_URL
gh secret list
```

```console
$ gh secret set SLACK_WEBHOOK_URL
? Paste your secret: ****************************************************************
✓ Set Actions secret SLACK_WEBHOOK_URL for payments/payments-api
$ gh secret list
NAME                 UPDATED
ANTHROPIC_API_KEY    about 2 days ago
SLACK_WEBHOOK_URL    less than a minute ago
```

`gh secret set` prompts for the value, so the URL never lands in your shell history. A webhook posts as the app it belongs to, into the channel it was created for — the channel can't be overridden per message, so make it the right channel now. On Teams the webhook comes from the Workflows app and the payload is an Adaptive Card; [The Morning Report](/overnight-qa/the-morning-report/) shows it once.

**4. `claude -p` works on a runner.** Your laptop's credential path and the runner's are different paths, and the runner's is the one that matters at 02:17. A throwaway workflow — one turn, no repo, nothing to read:

```yaml
# .github/workflows/claude-smoke.yml — seat: team — needs ANTHROPIC_API_KEY (check 2). Delete it after it passes once.
name: Claude smoke
on: workflow_dispatch
jobs:
  smoke:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    env:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    steps:
      - run: curl -fsSL https://claude.ai/install.sh | bash -s stable && echo "$HOME/.local/bin" >> "$GITHUB_PATH"
      - run: claude -p "Reply with the single word: ready" --max-turns 1 --bare
```

Merge it (or push it to `main` if branch protection allows a one-line workflow), then run it by hand:

```bash
# seat: team
gh workflow run claude-smoke.yml
sleep 60 && gh run list --workflow claude-smoke.yml --limit 1
```

```console
$ gh run list --workflow claude-smoke.yml --limit 1
STATUS  TITLE         WORKFLOW      BRANCH  EVENT              ID           ELAPSED  AGE
✓       Claude smoke  Claude smoke  main    workflow_dispatch  17266001208  41s      1m
```

Green, and the second step's log says `ready` → pass. Red on the first step → the installer couldn't run on this runner image (a locked-down org sometimes blocks the download; that's a platform conversation). Red on the second step with an authentication error → the secret exists but the credential doesn't reach the deployment: wrong path, wrong region, or a key issued for a different workspace. `--bare` and `--max-turns 1` mean this run can't read anything or wander; it proves the plumbing and nothing else.

## The recipe

Three files, committed together on one branch and reviewed like code: the wrapper script every job on this site runs through, the prompt (a file, never a string in YAML), and the workflow.

### `scripts/run-claude.sh` — the wrapper

```bash
#!/usr/bin/env bash
# scripts/run-claude.sh — run ONE bounded, unattended Claude Code job and leave evidence.
# Usage: scripts/run-claude.sh <prompt-file> <out.json> [extra claude flags...]
# Exit code = claude's exit code (0 ok · 1 error · 2 partial: budget or auth), so the
# workflow can decide what to do; the JSON is always written, even on failure.
set -uo pipefail
PROMPT_FILE="$1"; OUT="$2"; shift 2

# One of the three credential paths must be configured by the workflow. Never echo any of them.
if [ -z "${ANTHROPIC_API_KEY:-}" ] && [ -z "${CLAUDE_CODE_USE_BEDROCK:-}" ] && [ -z "${CLAUDE_CODE_USE_VERTEX:-}" ]; then
  echo "run-claude: no credential path configured (ANTHROPIC_API_KEY, CLAUDE_CODE_USE_BEDROCK, or CLAUDE_CODE_USE_VERTEX)" >&2
  exit 1
fi
: "${NIGHT_BUDGET_USD:=3}"     # cost ceiling — exit 2 when hit
: "${NIGHT_MAX_TURNS:=25}"     # turn cap — a cheap loop is still a loop

claude -p "$(cat "$PROMPT_FILE")" \
  --output-format json \
  --max-budget-usd "$NIGHT_BUDGET_USD" \
  --max-turns "$NIGHT_MAX_TURNS" \
  "$@" > "$OUT"
CODE=$?

# Always leave something readable next to the JSON, even when the run failed.
{
  echo "run-claude: exit=$CODE"
  if jq -e . "$OUT" >/dev/null 2>&1; then
    jq -r '"run-claude: cost_usd=\(.total_cost_usd // "n/a") turns=\(.num_turns // "n/a") is_error=\(.is_error // "n/a") denials=\((.permission_denials // []) | length) duration_ms=\(.duration_ms // "n/a")"' "$OUT"
  else
    echo "run-claude: no JSON produced (see the step log above)"
  fi
} | tee -a "${GITHUB_STEP_SUMMARY:-/dev/stderr}"
exit $CODE
```

Five things it does that the bare `claude -p` line wouldn't. It refuses to start unless one of the three credential paths is configured, and it never echoes any of them. The two bounds come from environment variables with defaults — `$3`, 25 turns — so a workflow can raise them for one rerun without editing the script. `set -uo pipefail` deliberately leaves out `-e`: the script has to survive a failing `claude` call to reach the summary. It always prints one line to the job summary — `run-claude: cost_usd=… turns=… is_error=… denials=… duration_ms=…` — which is the first line you'll read every morning, and it prints it even when there's no JSON. And it exits with Claude Code's own code, so the workflow can decide what a `2` means. Everything after the two fixed arguments is passed through; that's how the workflow adds `--bare` and the allowlist. `chmod +x scripts/run-claude.sh` before you commit — a non-executable script fails the step with a permission error, which is the one failure that isn't the agent's fault. [Running Claude Unattended](/overnight-qa/running-unattended/) takes this script apart flag by flag.

### `prompts/nightly-triage.md` — the question

```text
# prompts/nightly-triage.md — READ-ONLY. Passed as the prompt by nightly-triage.yml. CLAUDE.md is NOT loaded (--bare).
You are the night-shift triage for payments-api. You are READ-ONLY: you may read
files and search; you may not edit, run, or fetch anything. If you find yourself
wanting to run a command, stop and write the need into "Needs a human" instead.

Inputs on disk:
- target/surefire-reports/   the JUnit XML and .txt output from tonight's ./mvnw test
- previous/report.md         last night's report, if it exists (it may not)
- src/                       the source, for locating causes

Do this, in order:
1. List every failed or errored test from the surefire reports. Count them.
2. Group the failures by ROOT CAUSE, not by test class. A root cause is one code
   location or one environmental condition. For each group give: the test names,
   the first stack frame that is inside src/ as `path:line`, and one sentence on
   the likely cause — marked (verified) if you read the code that proves it,
   (inference) if you did not.
3. If previous/report.md exists, compare: which groups are NEW tonight, which are
   UNCHANGED, which are RESOLVED. If it does not exist, write "no previous report".
4. Do NOT propose code changes. Do NOT judge whether a test is worth fixing.
   Do NOT speculate beyond what the reports and the code show.

Output ONLY the following markdown, nothing before or after it:

# Morning report — payments-api — <date from the surefire timestamps>
**Verdict:** GREEN | AMBER | RED — <failed> failed of <total>
(GREEN = 0 failed · AMBER = failures exist but every group is UNCHANGED · RED = any NEW group)
## New since last night
- <group> — or "nothing new"
## Failures by cause
### <cause> — <n> tests — NEW|UNCHANGED
- tests: <names>
- evidence: `path:line` — first frame inside src/
- cause: <one sentence> (verified|inference)
## Resolved since last night
- <group> — or "nothing resolved"
## Needs a human
- [ ] <one line per NEW group; propose an owner from CODEOWNERS if the file matches a rule>
## What ran
- suite: <total> tests · <failed> failed · <errors> errors · <skipped> skipped
```

The prompt is where the one question lives — *which of tonight's failures share a cause, and which of those are new?* — and everything else in the file exists to keep the model inside it. Four lines are worth a second look. The first line is a comment saying what the file is, that it's read-only, which workflow loads it, and that `CLAUDE.md` is *not* loaded; every prompt on this site starts that way, because a prompt file gets read cold by a reviewer six months on. "You are READ-ONLY" is a courtesy, not a control — the control is the allowlist in the workflow — and the prompt says what to do on hitting the fence ("write the need into Needs a human") so a denial produces a useful line instead of a stuck model. The `(verified)`/`(inference)` rule is the site's evidence contract applied per sentence: the model may say "the rate lookup returns null for CHF" only if it labels whether it read the code that proves it. And the output template is the short form of [the report contract](/overnight-qa/the-morning-report/) — headline verdict with the one number, what's new *first*, causes with `path:line`, a checklist for humans — with "Output ONLY the following markdown" as the line that makes `jq -r .result` produce a file you can post without cleaning.

The three verdicts are defined in the file so they mean the same thing every night: GREEN is zero failures; AMBER is "everything failing tonight was failing last night"; RED is "something new". On the first night there's no previous report, so every group is new and the verdict is RED. That's correct, and it means the second night's AMBER is the first real signal.

### `.github/workflows/nightly-triage.yml` — the night

```yaml
name: Nightly triage (read-only)

on:
  schedule:
    - cron: "17 6 * * 1-5"   # 02:17 America/New_York (UTC-4) on weekdays. Odd minute on purpose:
                             # GitHub delays jobs queued at the top of the hour. Finishes well before
                             # the 03:00 settlement batch, which this job must never overlap.
  workflow_dispatch:         # rerun by hand: gh workflow run nightly-triage.yml -f budget_usd=5
    inputs:
      budget_usd:
        description: Cost ceiling for the agent step (USD)
        default: "3"
        type: string

permissions:
  contents: read             # checkout only
  actions: read              # to download last night's report artifact

concurrency:
  group: nightly-triage      # a manual rerun never overlaps the scheduled run
  cancel-in-progress: false

jobs:
  triage:
    runs-on: ubuntu-latest
    timeout-minutes: 45      # the backstop bound: budget and turns cap the agent, this caps everything
    env:
      # seat: team — needs the CI credential from the platform team (one of the three paths).
      # API-key path shown; for Bedrock set CLAUDE_CODE_USE_BEDROCK=1 + AWS_REGION and use OIDC instead.
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      NIGHT_BUDGET_USD: ${{ inputs.budget_usd || '3' }}
      NIGHT_MAX_TURNS: "25"  # a triage that hasn't converged in 25 turns is looping
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: "21"
          cache: maven

      - name: Deterministic phase — run the real suite
        id: tests
        continue-on-error: true            # red tests are the input, not a reason to stop
        run: ./mvnw -B -q test

      - name: Fetch last night's report (for "what's new")
        continue-on-error: true            # the first night has nothing to fetch
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          RUN_ID=$(gh run list --workflow nightly-triage.yml --status success --limit 1 --json databaseId -q '.[0].databaseId')
          [ -n "$RUN_ID" ] && gh run download "$RUN_ID" -n morning-report -D previous/ || echo "no previous run"

      - name: Install Claude Code
        run: |
          curl -fsSL https://claude.ai/install.sh | bash -s stable
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"   # the installer's bin dir is not on PATH in a non-login shell

      - name: Agent phase — read-only triage
        id: agent
        continue-on-error: true            # the report step must still run; the last step re-raises the failure
        run: |
          CODE=0
          scripts/run-claude.sh prompts/nightly-triage.md night.json \
            --bare \
            --permission-mode dontAsk \
            --allowedTools "Read,Grep,Glob" \
            --model sonnet || CODE=$?      # GitHub runs steps with bash -e; capture instead of aborting
          echo "exit=$CODE" >> "$GITHUB_OUTPUT"
          exit $CODE

      - name: Publish — job summary and artifact
        id: publish
        if: ${{ !cancelled() }}
        run: |
          jq -r '.result // "# Morning report — payments-api\n**Verdict:** RED — the agent produced no result (see run-claude line above)"' night.json > report.md
          cat report.md >> "$GITHUB_STEP_SUMMARY"

      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: morning-report
          path: |
            report.md
            night.json
            target/surefire-reports/
          retention-days: 30

      - name: Build the Slack payload
        if: ${{ !cancelled() }}
        run: |
          # The headline is MODEL OUTPUT. Read it from the file with jq --arg (safe quoting);
          # never pass it through ${{ }} — that is a script-injection vector on a runner.
          RUN_URL="${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
          jq -n --arg h "$(sed -n '2p' report.md)" --arg u "$RUN_URL" \
            '{text: ("Morning report · payments-api · " + $h),
              blocks: [
                {type: "section", text: {type: "mrkdwn", text: ("*Morning report · payments-api*\n" + $h)}},
                {type: "actions", elements: [{type: "button", text: {type: "plain_text", text: "Open the run"}, url: $u}]}
              ]}' > slack.json

      - name: Post to #payments-nightly
        if: ${{ !cancelled() }}
        uses: slackapi/slack-github-action@v4
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK_URL }}   # seat: team — an incoming webhook you create for the channel
          webhook-type: incoming-webhook
          payload-file-path: ./slack.json

      - name: Re-raise the agent's failure so the run shows red
        if: ${{ steps.agent.outputs.exit != '0' }}
        run: |
          echo "agent exited ${{ steps.agent.outputs.exit }} (0 ok · 1 error · 2 budget/auth partial)"
          exit 1
```

The comments carry the what; here's the why, line by line, for the lines that aren't obvious.

**The cron and the batch window.** `17 6 * * 1-5` is UTC — GitHub's schedules always are unless you add a `timezone:` key — which is 02:17 in New York in summer and 01:17 in winter. The minute is odd on purpose: GitHub delays jobs queued at the top of the hour and, under load, drops them. The settlement batch in `ledger-batch` runs 03:00–03:40 local; this job touches nothing the batch touches (it runs on `ubuntu-latest` against `payments-api`), but every job on the night shift is scheduled to be finished before it as a matter of habit, so that when the e2e job reaches the shared database the habit already exists. [Anatomy of a Night Shift](/overnight-qa/anatomy-of-a-night/#trigger) has the cron table for all five jobs and the daylight-saving trade.

**`permissions:`.** Naming any key sets every other key to `none`, so this block is the complete list of what the job's token can do: read the repo, read other runs' artifacts. No `issues`, no `pull-requests`, no `contents: write`. Even if the agent step were compromised end to end, the token in its environment can't open, comment, push, or delete. It's the first and cheapest fence, and GitHub enforces it, not anything the model sees.

**`timeout-minutes: 45` is the backstop.** The agent has a budget and a turn cap; the runner has this. It exists for the failure the other two can't catch — a hung Maven download, a tool call that never returns — and it's the one bound you never want to hit, because a timed-out job is cancelled and the report steps don't run. The anatomy page's timing table adds up to 35 minutes; 45 leaves room for a slow queue.

**`concurrency`.** One night at a time. A manual rerun queues behind the scheduled run instead of overlapping it, and `cancel-in-progress: false` means nothing ever cancels a night that's already producing evidence.

**`continue-on-error: true` on the tests.** Red tests are the input. Without this line, a red suite ends the job before the agent runs — which is the L0 behaviour you're replacing. `-B -q` keeps the console short; the surefire XML under `target/surefire-reports/` is what the model reads, not the log.

**Fetching last night's artifact.** "What's new" is a diff between two nights, so last night's report is an *input*: `gh run list … --status success --limit 1` finds the last night that completed cleanly and `gh run download` puts its `morning-report` artifact under `previous/`. On the first night there's nothing to fetch, and `continue-on-error` plus the `|| echo` keep that from being a failure. Two consequences: the artifact name is part of the contract (rename it and every later night says "no previous report"), and the baseline is the last *successful* run, so a night whose agent crashed never becomes tomorrow's baseline.

**The installer and `GITHUB_PATH`.** The native installer puts `claude` in `~/.local/bin`, which isn't on `PATH` in a non-login shell; appending it to `$GITHUB_PATH` makes it visible to every later step. `bash -s stable` pins the release channel; once you've seen a night work you can pin an exact version the same way (as of September 2026 the documented form is `bash -s 2.1.89`) so it keeps working the same way.

**`--bare`, `dontAsk`, and the allowlist: read-only by construction.** Three flags, one property. `--bare` skips auto-discovery — no `CLAUDE.md`, no hooks, no skills — so the run starts fast and the prompt is the whole instruction set. `--permission-mode dontAsk` means anything not explicitly allowed is denied without prompting, because there's nobody to prompt. `--allowedTools "Read,Grep,Glob"` is the explicit list: read a file, search contents, find files. No `Edit`, no `Write`, no `Bash`, no `WebFetch` — the model *can't* rerun the failing test, fix it, or fetch anything, and every attempt lands in the JSON's `permission_denials`, which is where you'll look on Friday to see whether it ever tried. As of September 2026 this is the locked-down CI form the Claude Code docs recommend; `plan` mode is for interactive exploration. [Running Claude Unattended](/overnight-qa/running-unattended/) is the page for choosing a mode, and [Headless Mode and the Agent SDK](/toolkit/headless-and-sdk/) is the flag reference.

**Capturing the exit code under `bash -e`.** GitHub runs `run:` scripts with `bash -e`, so a non-zero exit from the wrapper would end the step before the next line. `|| CODE=$?` catches it, `echo "exit=$CODE" >> "$GITHUB_OUTPUT"` publishes it as a step output, and `exit $CODE` fails the step honestly — with `continue-on-error: true` on the step so the job carries on to the report. The point of the dance: a failed agent must still produce a report that says it failed.

**`!cancelled()` on the report steps.** Every step after the agent runs whether the agent succeeded or not — but not if the job was cancelled by a timeout or a person. `if: always()` would try to post to Slack from a job being torn down, and hang. The publish step's fallback string is what the report says when there's no `.result` at all: a RED headline pointing at the wrapper's summary line.

**The injection point.** The Slack headline is *model output*. Written as `text: "${{ steps.something.outputs.headline }}"`, GitHub would expand the expression into the script before the shell ran it, and a model-written headline containing a backtick or `$(…)` would execute on the runner, with the job's token and the API key in its environment. So the headline is read from `report.md` with `sed -n '2p'` and handed to `jq --arg`, which treats it as a string whatever it contains; the only `${{ }}` expansions in that step are GitHub's own context values. Treat every `result` the way you'd treat a form field on a public website — the security reviewer will, and [Blast Radius](/overnight-qa/blast-radius/) lists every place the rule applies.

**The re-raise step.** Because the agent step has `continue-on-error`, the job would show green even when the agent exited `2` on a budget hit. The last step reads the captured code and fails the job if it wasn't `0`, so the run's colour means what it looks like. Keep the two colours apart in your head: **the run's colour is about the night — did the machinery work — and the report's verdict is about the suite.** A RED verdict on a green run is normal and good; a red run means read the wrapper's line first.

### Prove the fence, then run it once by hand

The site's rule for every fence is a deliberate violation before the first real night. The wrapper runs on your laptop exactly as it does on the runner, so ask it to do the one thing the allowlist forbids:

```bash
# seat: team
printf '%s\n' 'Run this exact shell command and report its output: echo fence-check' > fence-prompt.md
NIGHT_BUDGET_USD=1 NIGHT_MAX_TURNS=3 scripts/run-claude.sh fence-prompt.md fence.json \
  --bare --permission-mode dontAsk --allowedTools "Read,Grep,Glob" --model sonnet
jq '.permission_denials | length' fence.json
rm fence-prompt.md fence.json
```

```console
$ NIGHT_BUDGET_USD=1 NIGHT_MAX_TURNS=3 scripts/run-claude.sh fence-prompt.md fence.json --bare --permission-mode dontAsk --allowedTools "Read,Grep,Glob" --model sonnet
run-claude: exit=0
run-claude: cost_usd=0.02 turns=2 is_error=false denials=1 duration_ms=4120
$ jq '.permission_denials | length' fence.json
1
```

`denials=1` is the fence proving itself: the model asked for `Bash`, nothing had approved it, and the run recorded the refusal instead of executing `echo`. If you see `denials=0` and the result says the command ran, stop — something in your environment is approving tools the flags didn't, and nothing below should run until you know what.

Now commit the three files, open the PR — the reviewer works from the [nightly-job PR review checklist](/overnight-qa/cost-and-governance/#the-nightly-job-pr-review-checklist) — and after merge run the night by hand rather than waiting for 02:17:

```bash
# seat: team
chmod +x scripts/run-claude.sh
git checkout -b nightly-triage
git add scripts/run-claude.sh prompts/nightly-triage.md .github/workflows/nightly-triage.yml
git commit -m 'Nightly triage (read-only): wrapper, prompt, workflow — $3 / 25 turns / 45 min, Read,Grep,Glob only'
git push -u origin nightly-triage
gh pr create --title "Nightly read-only triage for payments-api" --body "First night. Read-only by construction (dontAsk + Read,Grep,Glob), \$3 ceiling, 25 turns, 45-minute timeout; reports to the job summary, a 30-day artifact, and #payments-nightly. Fence proven on a laptop: denials=1." --reviewer marcus-payments
```

```bash
# seat: team — after the PR merges
gh workflow run nightly-triage.yml
sleep 30 && gh run list --workflow nightly-triage.yml --limit 1
```

```console
$ gh run list --workflow nightly-triage.yml --limit 1
STATUS  TITLE                       WORKFLOW                    BRANCH  EVENT              ID           ELAPSED  AGE
*       Nightly triage (read-only)  Nightly triage (read-only)  main    workflow_dispatch  17266488130  2m11s    2m
```

Twelve to fifteen minutes later it's `✓`, the job summary holds the report, and the channel has three lines and a button. If it's `X`, the wrapper's summary line and the exit-code table below are the two things to read before anything else.

## Reading night.json the first time

Download the artifact and read the JSON *before* the report — the JSON tells you whether to trust the report:

```bash
# seat: team
RUN_ID=$(gh run list --workflow nightly-triage.yml --limit 1 --json databaseId -q '.[0].databaseId')
gh run download "$RUN_ID" -n morning-report -D night-1/
jq '{is_error, num_turns, total_cost_usd, duration_ms, denials: (.permission_denials | length)}' night-1/night.json
```

```console
$ jq '{is_error, num_turns, total_cost_usd, duration_ms, denials: (.permission_denials | length)}' night-1/night.json
{
  "is_error": false,
  "num_turns": 14,
  "total_cost_usd": 0.41,
  "duration_ms": 212873,
  "denials": 0
}
```

Field by field, the way you'll read it every morning:

- **`is_error: false`** — the model reached a final answer. `true` means it didn't; `.result` is then an error message, not a report, and the publish step's fallback headline will have fired.
- **`num_turns: 14`** — fourteen rounds of "call a tool, read the result" before it answered, against a cap of 25. A number that creeps toward the cap night after night means the prompt is asking an open question; a number *at* the cap means it was cut off and the report is partial. Fourteen, for fourteen failing tests and a handful of source lookups, is about right.
- **`total_cost_usd: 0.41`** — what this run cost, against the `$3` ceiling. Read it; don't estimate it. It's the first row of the week's ledger below.
- **`duration_ms: 212873`** — three and a half minutes of wall clock for the agent step, out of the fifteen the timing budget allows.
- **`denials: 0`** — it never asked for a tool outside `Read,Grep,Glob`. A non-zero count isn't a failure; it's the fence working, and the entries say what it wanted (`jq '.permission_denials' night-1/night.json`). The entry shape isn't documented as of September 2026, so read them by eye rather than scripting against field names.

And the exit code, which the wrapper printed as `run-claude: exit=0` in the job summary:

| Exit | Meaning | What to do |
|---|---|---|
| `0` | The run finished and produced a result | Read the report. |
| `1` | It failed before or during the run — a bad flag, a run error, or no credential path (the wrapper's own message) | Read the step log, not the JSON; there may be no JSON. [The Night Failed](/troubleshooting/the-night-failed/) starts here. |
| `2` | Partial: the cost ceiling was hit, or authentication failed before the first turn | `total_cost_usd` near the ceiling → the input was too big or the question too open; near zero → the credential. The JSON still carries `result`, possibly partial, so the report may be usable. Never retry a `2` automatically. |

(`130` and `143` are a signal — a person or the runner's timeout killed it — and with a timeout there's no report at all, which is why the timeout is a backstop and not a plan.)

Then the report. Here's the first night on `payments-api`, and this is what fourteen-red-since-March looks like when a reader with citations goes through it:

```markdown
# Morning report — payments-api — 2026-09-10
**Verdict:** RED — 14 failed of 812
## New since last night
- no previous report
## Failures by cause
### SettlementReportAssembler dereferences a missing CHF rate — 8 tests — NEW
- tests: SettlementReportControllerIT.exportsMonthlyTotals, SettlementReportControllerIT.exportsByCurrency, SettlementSummaryIT.* (6)
- evidence: `src/main/java/com/payments/api/report/SettlementReportAssembler.java:88` — first frame inside src/
- cause: `rates.get(currency)` returns null for CHF; the fixture `src/test/resources/fixtures/settlements-2026-03.json` has a CHF row and the rate table fixture does not (verified)
### FxRateClient reaches the network from the test JVM — 4 tests — NEW
- tests: FxRateClientTest.fetchesDailyRates, FxRateClientTest.retriesOnTimeout, FxRateClientTest.parsesRateTable, FxRateClientTest.cachesForOneHour
- evidence: `src/main/java/com/payments/api/fx/FxRateClient.java:142` — first frame inside src/
- cause: the client is built with the real base URL and the runner has no route to fx-rates-feed (inference — no stub or mock server usage found under src/test for this class)
### IdempotencyKey format changed under an unchanged test — 2 tests — NEW
- tests: IdempotencyKeyTest.formatsWithPrefix, IdempotencyKeyTest.roundTrips
- evidence: `src/main/java/com/payments/api/idempotency/IdempotencyKey.java:31` — first frame inside src/
- cause: the key now embeds the merchant id (`PAY-<merchant>-<uuid>`); the test still expects `PAY-<uuid>` (verified)
## Resolved since last night
- nothing resolved
## Needs a human
- [ ] CHF rate missing from the rate-table fixture — proposed owner: @dana-payments (CODEOWNERS: src/main/java/com/payments/api/report/)
- [ ] FxRateClientTest needs a stub or a network-free profile — no CODEOWNERS rule matches src/main/java/com/payments/api/fx/
- [ ] IdempotencyKeyTest: update the expected format or revert the key change — proposed owner: @dana-payments (CODEOWNERS: src/main/java/com/payments/api/idempotency/)
## What ran
- suite: 812 tests · 14 failed · 0 errors · 3 skipped
```

Fourteen tests, three causes, two with an owner. Everything a human does next is a twenty-second check: open `SettlementReportAssembler.java:88`, see the `get`, agree or disagree. The one `(inference)` is labelled as one and says what it looked for and didn't find. That's the whole difference between this and "the tests are flaky, I think."

## The one-sentence measurement seed

Two minutes that upgrade this from "a thing we scheduled" to "a thing we can judge." Write down, anywhere durable — a comment at the top of `prompts/nightly-triage.md` is fine:

> **A finding is actioned when ______.**

("…someone assigns it, fixes it, or labels it `nightly:flaky` with a reason, the same day." "…its *Needs a human* box is ticked by the end of standup.") The blank is the definition of the **report-actioned rate** — findings a human did something with, divided by findings reported — and that rate is the number that decides in a month whether this job stays on. Can't fill it yet? Then record today's baseline honestly: fourteen findings have been reported every day since March and zero were actioned, because nobody read the folder. Write "PROVISIONAL: baseline 0 of 14; count for two weeks before setting a target" next to it. The target this site uses is ≥50%; a night below 20% for two weeks is turned off and redesigned, not tuned. [The Morning Report](/overnight-qa/the-morning-report/) defines, observes, and decides it.

## Watch it for a week

Three things, each with what-good-looks-like and the action if it doesn't:

| Watch | How | Healthy | If not |
|---|---|---|---|
| Did anyone open it? | GitHub doesn't count who opens a run, so make the read receipt explicit: whoever reads it reacts ✅ on the Slack message, and at standup `gh run view <id>` is the page you read from | A reaction by 09:30, and every *Needs a human* line assigned or labelled by the end of standup | No reaction two days running → nobody owns the ten minutes; fix the ritual, not the prose — [The Morning Report](/overnight-qa/the-morning-report/) |
| Was anything NEW? | `grep -A2 '^## New since' week/*/report.md` (below) | "nothing new" most days, and a NEW group the morning after a real regression merged | The same groups UNCHANGED all week → they're decisions, not findings: assign them or label `nightly:flaky`, so the report stops repeating the March list. [The Morning Report Nobody Read](/blog/the-morning-report-nobody-read/) is what happens otherwise |
| What did it cost? | the `jq` below, across the week's `night.json` artifacts | Flat, and a fraction of the `$3` ceiling | Rising `num_turns` → the question is drifting open; an exit `2` → [The Night Failed](/troubleshooting/the-night-failed/), then [Cost and Governance](/overnight-qa/cost-and-governance/) for the ledger |

The week in one loop — download every successful night's artifact, sum the cost, and pull the "new" sections:

```bash
# seat: team
mkdir -p week
for id in $(gh run list --workflow nightly-triage.yml --status success --limit 5 --json databaseId -q '.[].databaseId'); do
  gh run download "$id" -n morning-report -D "week/$id"
done
jq -s 'map(.total_cost_usd) | {nights: length, total_usd: (add * 100 | round / 100), max_usd: max}' week/*/night.json
grep -A2 '^## New since' week/*/report.md
```

```console
$ jq -s 'map(.total_cost_usd) | {nights: length, total_usd: (add * 100 | round / 100), max_usd: max}' week/*/night.json
{
  "nights": 5,
  "total_usd": 2.13,
  "max_usd": 0.58
}
$ grep -A2 '^## New since' week/*/report.md
week/17266488130/report.md:## New since last night
week/17266488130/report.md-- no previous report
…
week/17301122764/report.md:## New since last night
week/17301122764/report.md-- nothing new
```

Five nights for less than one night's ceiling, and by Friday the "new" section says "nothing new" — which is the sentence that makes the one morning it says something else worth reading. This week of watching is, quietly, the first rows of the cost ledger and the first data points of the actioned rate; [Cost and Governance](/overnight-qa/cost-and-governance/) turns them into the weekly line in the report.

:::tip[Good citizen]
Two things on this page spend other people's resources. The Slack message is three lines and a button, not the report, because `#payments-nightly` is shared attention and a wall of markdown at 02:30 trains everyone to mute it. And the `$3` ceiling is a claim on the platform team's monthly cap: the cap in Ask 1 was sized from the per-run bounds in your workflow, so raising `NIGHT_BUDGET_USD` for one rerun is fine and raising the default without updating the ask is how a team quietly spends another team's budget.
:::

:::caution[What this deliberately doesn't do]
Honesty about the recipe's edges — this is L1 of [the maturity ladder](/overnight-qa/overview/#the-maturity-ladder), not the destination:

- **It's read-only.** It cannot fix a test, rerun one to check for flakiness, or touch a file. The first job that writes is [Characterization Tests](/overnight-qa/characterization-tests/), and it needs [Running Claude Unattended](/overnight-qa/running-unattended/) and [Blast Radius](/overnight-qa/blast-radius/) first.
- **No new tests.** It interprets the suite you have; the legacy modules with no suite get nothing from it. → [Characterization Tests](/overnight-qa/characterization-tests/)
- **No browser.** The UI is untouched. → [Exploratory & E2E](/overnight-qa/exploratory-and-e2e/), which needs the self-hosted runner and its ask.
- **No security or dependency triage.** → [Review & Security](/overnight-qa/review-and-security/)
- **No Confluence page, no GitHub issue.** The report lives in the job summary and a thirty-day artifact, and in Slack as three lines. The durable page and the night's issue are [The Morning Report](/overnight-qa/the-morning-report/).
- **No trend.** It knows about last night, not last month. The ledger and the actioned rate over time are [Cost and Governance](/overnight-qa/cost-and-governance/).

Your real homework, in order: [Anatomy of a Night Shift](/overnight-qa/anatomy-of-a-night/) → [Running Claude Unattended](/overnight-qa/running-unattended/) → [Blast Radius](/overnight-qa/blast-radius/) (send [Ask 4](/start/working-within-policy/#ask-4-a-security-review-of-the-night-shift) early; it buys goodwill) → [The Morning Report](/overnight-qa/the-morning-report/) → your first writing job.
:::

## Where next

- **Next in the journey:** [Anatomy of a Night Shift](/overnight-qa/anatomy-of-a-night/) — the seven stages you just built, each with its failure modes, its seat, and its minutes.
- **The lateral jump:** it's 08:05 and the run is red? [The Night Failed](/troubleshooting/the-night-failed/) starts from the exit code you just learned to read.
