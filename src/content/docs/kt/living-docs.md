---
title: "Keeping It True: Living Documentation in CI"
description: Stop the stamped map rotting — a nightly script that checks every citation still resolves, a weekly bounded agent that checks the cited lines still mean what the doc says, and a PR-time job that proposes the doc edit before the drift lands.
keywords:
  - architecture documentation goes stale
  - keep documentation in sync with code ci
  - check that code citations still exist
  - docs drift detection github actions
  - claude code github action pull_request automation mode
  - codeowners docs folder
  - documentation freshness metric
  - publish docs to confluence on merge
  - nightly doc check opens one issue
sidebar:
  order: 10
---

You are here if: `ledger-api`'s map is stamped and you've already watched one of its line numbers move; or Sam's Tuesday exercise key pointed at a line that is now a comment; or you're the person who said "we mapped it once and it's already stale" in [Start From Your Situation](/kt/scenarios/). This page serves the **Keep true** stage — the loop at the bottom of the pipeline that sends stale pointers back to the map.

## Drift, in plain language

A stamped map is a set of pointers into the code — two hundred or so `(path:line)` citations in `ledger-core/docs/ARCHITECTURE.md` alone — and the code moves under them with every merge. **A citation rots in two ways, and they need two different checks.** The first is *structural*: the file was renamed, deleted, or got shorter, so `path:line` no longer points at anything. That's cheap to detect — a shell script can do it in seconds, with no model involved. The second is *semantic*: the file and the line both still exist, but the line no longer says what the doc claims. Someone refactored `FxApplier` and `apply()` moved from line 88 to line 104; line 88 is now a Javadoc comment. The citation resolves. The sentence it supports is wrong. Detecting that needs something to *read* both ends and compare, which is a job for a model — bounded, weekly, read-only.

Here's the arithmetic that makes this urgent rather than tidy. `ledger-core` merges about forty PRs a month. The map's 212 citations cover perhaps 60 files, and a refactor PR touches five or six of them. Without a check, the map is measurably wrong within a month and *trusted* for a year, which is exactly how the "Settlement Flow" page got to be wrong for four. With the checks on this page, the morning after the refactor there is one issue with seven lines in it, and the fix is one PR. That difference — one month of silent rot versus one issue the next morning — is the whole page.

Three jobs, each with its own trigger and blast radius:

| Job | Runs | Catches | Costs | Writes |
|---|---|---|---|---|
| Nightly freshness (`nightly-freshness.yml`) | Every weeknight, `47 6 * * 1-5` UTC | Structural drift: missing files, vanished lines | A shell script; no model | One issue, labelled `kt:stale` |
| Weekly semantic check | Saturdays, bounded | Semantic drift in files that changed this week | A short agent run under a budget | Lines appended to the same issue |
| PR-time doc update (`doc-drift.yml`) | On every PR that touches a cited file | Drift *before* it merges | One bounded action run per qualifying PR | One comment on the PR — never a push |

## The nightly freshness job

The script first, because it's the part you can read in a minute and the workflow only wraps it. This is the site's canonical `scripts/check-citations.sh`, verbatim:

```bash
#!/usr/bin/env bash
# scripts/check-citations.sh — every "(path:line)" citation in docs/**/*.md must still point at a real line.
# Prints stale citations and exits 1 if any; the workflow turns the output into ONE issue labelled kt:stale.
set -uo pipefail
out=$(mktemp)
grep -rhoE '\(([A-Za-z0-9_./-]+\.[A-Za-z]+):([0-9]+)(-[0-9]+)?\)' docs/ --include='*.md' \
  | tr -d '()' | sort -u \
  | while IFS=: read -r path range; do
      line="${range%%-*}"
      if [ ! -f "$path" ]; then
        echo "MISSING FILE   $path:$range"
      elif [ "$line" -gt "$(wc -l < "$path")" ]; then
        echo "LINE GONE      $path:$range (file now has $(wc -l < "$path") lines)"
      fi
    done > "$out"
if [ -s "$out" ]; then cat "$out"; echo; echo "$(wc -l < "$out") stale citation(s)"; exit 1; fi
echo "all citations resolve"
```

Line by line. `set -uo pipefail` without `-e`, because the loop *expects* some commands to fail (a missing file) and must keep going; `-u` still catches a typo in a variable name. The `grep` is the citation rule made mechanical: it finds every `(path:line)` or `(path:line-line)` in every markdown file under `docs/`, and the pattern is strict on purpose — a path must have an extension and a line must be digits — so that prose in parentheses doesn't produce false positives. `tr -d '()'` strips the brackets and `sort -u` means a file cited forty times is checked once. Inside the loop, `${range%%-*}` takes the *first* number of a range, because a range is stale when its start is gone. Two conditions, two messages: `MISSING FILE` when the path isn't there at all (a rename, a deletion, a repo moved), and `LINE GONE` when the file is now shorter than the cited line — with the file's current length, because that number tells the fixer how far off they are. Everything goes to a temp file first so the script can print a count at the end; `-s` asks "is the file non-empty", and if it is, the script prints the list, the count, and exits 1. The exit code is the contract: the workflow decides what to do with it, the script never touches GitHub.

Run it by hand before you ever schedule it, in the repo with the map:

```bash
# seat: team — any laptop with the repo checked out; no credential, no model
cd ~/ledger/ledger-core
scripts/check-citations.sh
```

```console
LINE GONE      src/main/java/com/ledger/core/fx/FxApplier.java:88 (file now has 71 lines)
LINE GONE      src/main/java/com/ledger/core/fx/FxApplier.java:88-96 (file now has 71 lines)
MISSING FILE   src/main/java/com/ledger/core/settle/SettlementRequestValidator.java:30

3 stale citation(s)
```

The line to look at is the count, then the first word of each row. Two of these are the same file — the refactor that split `FxApplier` — and one is a rename; a person fixes all three in one PR in ten minutes, because each row says exactly which pointer and what happened to its target.

Notice what the script cannot see: `FxApplier.java` still has 71 lines, so a citation to line 40 would pass even if line 40 now holds something else. That's the semantic gap, and it's the weekly job's, below.

The workflow, verbatim — this is the KT bridge into the night shift, and it's short because the script did the work:

```yaml
name: Nightly doc freshness

on:
  schedule:
    - cron: "47 6 * * 1-5"   # 02:47 New York — after triage, before the batch
  workflow_dispatch:

permissions:
  contents: read
  issues: write              # one issue per night at most, labelled kt:stale

concurrency:
  group: nightly-freshness
  cancel-in-progress: false

jobs:
  freshness:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v7
      - name: Check every citation in docs/
        id: check
        continue-on-error: true
        run: scripts/check-citations.sh | tee stale.txt
      - name: Open ONE issue if anything is stale (or add to today's)
        if: ${{ steps.check.outcome == 'failure' }}
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          TITLE="Stale citations in docs/ — $(date -u +%F)"
          EXISTING=$(gh issue list --label kt:stale --state open --search "$TITLE in:title" --json number -q '.[0].number')
          { echo "The nightly freshness check found citations that no longer resolve. Fix the doc or the citation; the map is only as good as its pointers."; echo; echo '```'; cat stale.txt; echo '```'; } > body.md
          if [ -n "$EXISTING" ]; then gh issue comment "$EXISTING" --body-file body.md; else gh issue create --title "$TITLE" --body-file body.md --label kt:stale; fi
```

Line by line, again. The cron is `47 6 * * 1-5` — 02:47 New York, the odd minute on purpose so it isn't competing with every other job that fires on the hour, thirty minutes after the triage job and well before the 03:00 batch window the whole estate avoids; the reasoning is the Overnight playbook's, in [Anatomy of a Night](/overnight-qa/anatomy-of-a-night/). `workflow_dispatch` is the kill switch's twin: it lets you run the job by hand after fixing a batch of citations, to confirm the issue can close. The `permissions` block is the blast radius stated as YAML — `contents: read` because the job never writes to the repo, `issues: write` because it writes exactly one thing, and nothing else. `concurrency` with `cancel-in-progress: false` means a manual run and the scheduled run queue rather than colliding, which matters because both might try to create today's issue. `timeout-minutes: 10` is generous for a script that takes seconds; a job that's still running at ten minutes is a job that's hung on something, and killing it costs nothing. The checkout is `actions/checkout@v7` — the current major, as of September 2026. The check step has `continue-on-error: true` and an `id`, because the script's exit 1 is *information*, not a failed job; `tee stale.txt` keeps the output for the next step while still printing it to the log. The issue step runs only on `steps.check.outcome == 'failure'` — outcome, not conclusion, because `continue-on-error` rewrites the conclusion to success and you want the real result. Inside it, `GH_TOKEN` is the workflow's own token (no secret to manage), the title carries the date, and the `EXISTING` lookup is what keeps the job at *one issue per day*: if today's issue already exists — a rerun, a manual dispatch — the output is added as a comment rather than a second issue. The body is one sentence a human can act on, then the script's output in a fence.

**One issue, never one per citation.** Seven stale citations from one refactor are one problem — the refactor — and they get fixed in one PR. Seven issues would be seven notifications, seven things to triage, seven things to close, and by the third night the label would be muted and the job dead. An issue per day with everything in it is the same rule the Overnight playbook applies to test failures: a report a human reads is worth more than a feed nobody does. The issue looks like this in the morning:

```markdown
**Stale citations in docs/ — 2026-09-24**   `kt:stale`

The nightly freshness check found citations that no longer resolve. Fix the doc or the citation; the map is only as good as its pointers.

```
LINE GONE      src/main/java/com/ledger/core/fx/FxApplier.java:88 (file now has 71 lines)
LINE GONE      src/main/java/com/ledger/core/fx/FxApplier.java:88-96 (file now has 71 lines)
MISSING FILE   src/main/java/com/ledger/core/settle/SettlementRequestValidator.java:30

3 stale citation(s)
```
```

:::note[The workspace repo cites across repos]
In `ledger-docs`, `SYSTEM.md` and the exercise files cite `ledger-core/src/...` — paths into sibling clones, which exist on a laptop and not on a fresh runner. That repo's copy of the workflow adds one step before the check: a loop that clones each repo the citations name, at the same relative paths (`gh repo clone payments/ledger-core ledger-core` and so on, read from the citation list). Same script, same one-issue rule; it just needs the neighbours present.
:::

## The weekly semantic check

The structural script proves the pointer exists; the semantic check proves it still means something. It's an agent job, so every rule from [Running Unattended](/overnight-qa/running-unattended/) applies: read-only tools, a turn cap, a money cap, a prompt in the repo, and JSON evidence. The one design decision that keeps it cheap is scope. Semantic drift can only happen in a file that changed, so a deterministic step lists the citations whose *file* changed in the last seven days, and the agent reads only those — a dozen on a quiet week, fifty after a refactor, never all 212. The prompt:

```text
# prompts/weekly-semantic-check.md
You are checking whether documentation citations still say what the documentation claims.

Input: night/changed-citations.txt — one line per citation, in the form
  <doc file>:<doc line>  ->  <path:line or path:line-line>
These are the citations under docs/ whose cited FILE changed this week. The nightly
structural check has already confirmed each file and line exists; you are checking meaning.

For each line:
1. Read the sentence in the doc file that carries the citation (the doc line).
2. Read the cited lines, plus five lines either side for context.
3. Decide:
   HOLDS   — the cited lines still support the sentence.
   DRIFTED — they no longer do: the symbol moved, the behaviour changed, or the line is now
             something else. Quote BOTH the doc sentence and the cited lines as they are now.
             If the right lines are nearby (the symbol moved within the file), say the new
             line number. Do not edit anything.
   UNSURE  — you cannot judge from the code alone; one sentence saying why.

Rules: do not edit any file. Do not read files that are not in the list or under docs/.
Never guess a new line number you have not read.

Write night/semantic.md: one entry per DRIFTED or UNSURE citation with both quotes, then
the three counts (HOLDS / DRIFTED / UNSURE). Nothing else.
```

Every DRIFTED entry carries both quotes so the human who reads it can decide in ten seconds whether the doc is wrong or the code is — the prompt never asks the model to choose, because a map that "fixes itself" to match whatever the code does now is a map that will document a bug as a design. The run uses the Overnight playbook's wrapper — the same `scripts/run-claude.sh` every night on this site runs through — with the read-only allowlist and a small budget:

```bash
# seat: team — needs the CI credential in secrets (API key, or the platform's Bedrock role); this is the workflow's agent step, runnable by hand too
cd ~/ledger/ledger-core
git log --since=7.days --name-only --format= | sort -u > night/changed.txt
grep -rnoE '\(([A-Za-z0-9_./-]+\.[A-Za-z]+):([0-9]+)(-[0-9]+)?\)' docs/ --include='*.md' \
  | while IFS=: read -r doc docline cite; do
      path=$(echo "$cite" | tr -d '()' | cut -d: -f1)
      grep -qxF "$path" night/changed.txt && echo "$doc:$docline  ->  $(echo "$cite" | tr -d '()')"
    done > night/changed-citations.txt
wc -l < night/changed-citations.txt
NIGHT_BUDGET_USD=4 NIGHT_MAX_TURNS=60 scripts/run-claude.sh prompts/weekly-semantic-check.md night/semantic.json \
  --permission-mode dontAsk --allowedTools "Read,Grep,Glob,Write(night/semantic.md)" --model sonnet
```

```console
14
run-claude: exit=0
run-claude: cost_usd=0.93 turns=31 is_error=false denials=0 duration_ms=142880
```

The first number is how many citations the agent will read this week — fourteen, so the turn cap of sixty is roughly two reads per citation plus the write, and a run that needs more than that is reading things it shouldn't. The wrapper prints the JSON's headline fields; `denials=0` is the one to check, because a denial means the prompt asked for a tool the allowlist refused, and that's a prompt bug to fix, not a safety event to celebrate. The workflow itself is the freshness workflow with a Saturday cron (`47 6 * * 6` — same minute, before the batch, on a day the freshness job doesn't run), this step in place of the script, and `night/semantic.md` appended to the open `kt:stale` issue with the same `gh issue comment` logic. The JSON goes up as a workflow artifact with `retention-days: 30`, like every other night's, so the [governance page](/kt/measurement-and-governance/) can point at it.

## The PR-time doc update

The nightly job tells you the map broke. The PR-time job tells the author *before* it merges, which is where the fix is cheapest — they still have the change in their head. As of September 2026 the mechanism is `anthropics/claude-code-action@v1` in automation mode (a `prompt` present means "run this", not "wait for an `@claude` mention") on the `pull_request` event; its inputs, its authentication, and how its output reaches the PR are the Toolkit's — [GitHub Action](/toolkit/github-action/) — and this page stops at the workflow. What makes it safe is that it runs only on PRs that touch a cited file, and that it cannot write:

```yaml
name: Doc drift check on PR

on:
  pull_request:
    branches: [main]

permissions:
  contents: read             # the job reads the branch; it never pushes
  pull-requests: write       # so ONE comment can land on the PR
  id-token: write            # needed when the credential comes through the platform's OIDC role (use_bedrock); harmless with an API key

concurrency:
  group: doc-drift-${{ github.event.pull_request.number }}
  cancel-in-progress: true   # a new push supersedes the check on the old one

jobs:
  gate:
    runs-on: ubuntu-latest
    outputs:
      hits: ${{ steps.overlap.outputs.hits }}
      files: ${{ steps.overlap.outputs.files }}
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0     # the three-dot diff below needs origin/main's history
      - name: Which changed files does ARCHITECTURE.md cite?
        id: overlap
        run: |
          git diff --name-only origin/main...HEAD | sort -u > changed.txt
          grep -oE '\(([A-Za-z0-9_./-]+\.[A-Za-z]+):[0-9]+' docs/ARCHITECTURE.md | tr -d '(' | cut -d: -f1 | sort -u > cited.txt
          comm -12 changed.txt cited.txt > hits.txt            # the intersection: changed AND cited
          echo "hits=$(wc -l < hits.txt | tr -d ' ')" >> "$GITHUB_OUTPUT"
          echo "files=$(tr '\n' ' ' < hits.txt)" >> "$GITHUB_OUTPUT"
          cat hits.txt

  propose:
    needs: gate
    if: ${{ needs.gate.outputs.hits != '0' }}   # most PRs stop here and cost nothing
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}   # or use_bedrock: true — the Toolkit page has both
          prompt: |
            This PR changes files that docs/ARCHITECTURE.md cites: ${{ needs.gate.outputs.files }}
            For each of those files, find every (path:line) citation of it in docs/ARCHITECTURE.md,
            read the cited lines on this branch and the sentence that cites them, and decide
            whether the sentence still holds. Where it does not, propose the corrected sentence
            and the corrected citation. Reply with ONE review comment for the whole PR, as a
            markdown list: doc line -> current sentence -> proposed sentence -> new citation.
            Do not edit any file. Do not push. If nothing drifted, reply with one line saying so.
          claude_args: "--permission-mode dontAsk --allowedTools Read,Grep,Glob --max-turns 15"
```

The gate job is the whole cost story: `git diff --name-only origin/main...HEAD` lists what the PR changed (three dots — against the merge base, so a stale branch doesn't list `main`'s changes as its own); the `grep` pulls the file half of every citation out of the map; `comm -12` keeps only the lines in both. Most PRs touch nothing the map cites, `hits` is `0`, and the `propose` job never starts — no model run, no cost, no comment. When it does start, the prompt hands the model the list rather than asking it to compute one (it can't — there's no `Bash` in its tools), and `claude_args` is the safety case in one line: `dontAsk` denies anything not on the allowlist, the allowlist is three read-only tools, and fifteen turns is enough to read a handful of citations and far too few to wander. The action's own response is what lands on the PR as a comment; the job has `pull-requests: write` for exactly that and `contents: read` so that even a prompt injection in a changed file couldn't produce a push. What the author sees:

```markdown
**Doc drift — 1 of 3 citations of `src/main/java/com/ledger/core/fx/FxApplier.java` no longer holds**

- docs/ARCHITECTURE.md:142 → "FX is applied by `FxApplier.apply` (src/main/java/com/ledger/core/fx/FxApplier.java:88), which requires the rate to be same-day."
  → proposed: "FX is applied by `FxApplier.apply` (src/main/java/com/ledger/core/fx/FxApplier.java:104); the same-day check moved to `FxRateGuard` (src/main/java/com/ledger/core/fx/FxRateGuard.java:19)."
- The other two citations (lines 88-96 as a range; line 40) still hold.
```

The author edits the doc in the same PR, CODEOWNERS pulls Priya in for the `docs/` line, and the map never has a stale night. Prove the whole thing on the first qualifying PR, the way every night on this site is proved: open a PR that touches `FxApplier.java`, watch `gate` report `hits=1`, watch `propose` run, and confirm that exactly one comment appears and the branch has no new commits from the action. If a second comment appears on a second push, the concurrency group isn't cancelling; if a commit appears, stop and read [Blast Radius](/overnight-qa/blast-radius/) before running it again.

The trade between this and the nightly job: PR-time catches drift where it's cheapest to fix and costs a model run per qualifying PR — a few a week; nightly catches everything, including drift from merges that bypassed the check, for free. Run both. The PR-time job is a courtesy to the author; the nightly job is the guarantee.

## Ownership

None of this works if a doc change can merge without an expert seeing it, because a stale-citation fix that also quietly rewrites the sentence is the Field Note in miniature. `CODEOWNERS` makes the review automatic:

```text
# .github/CODEOWNERS — a change under docs/ requests an expert's review automatically
/docs/          @priya-payments @dana-payments
/CLAUDE.md      @priya-payments @dana-payments
```

Priya because she stamped it; Dana because the tech lead owns the track that depends on it, and because a rule with one owner is a rule that blocks when she's on leave. The review is the same thirty-second kind the whole playbook is built on — is the new citation the right line — and a PR that only moves line numbers is approved from a phone. Stale-citation fixes keep the `kt:stamped` status line; a PR that changes what a section *claims* flips the status line to DRAFT and the label to `kt:draft` until the expert approves, which is the review gate in [Mapping One Repo](/kt/mapping-a-repo/#the-review-gate) doing its job on a smaller diff.

## The freshness metric: defined, observed, decided

**Defined:** freshness is the share of `(path:line)` citations under `docs/` that still resolve — the structural check's pass rate. It deliberately ignores the semantic check, which has a human judgement in it; freshness is the number a script can produce every night without anyone's opinion.

**Observed:** the script's exit code says whether it's 100%; the count says how far off. The percentage is two greps:

```bash
# seat: team — in the repo with the map; the same grep the script uses, so the numbers agree
cd ~/ledger/ledger-core
total=$(grep -rhoE '\(([A-Za-z0-9_./-]+\.[A-Za-z]+):([0-9]+)(-[0-9]+)?\)' docs/ --include='*.md' | sort -u | wc -l)
stale=$(scripts/check-citations.sh | grep -cE '^(MISSING FILE|LINE GONE)')
echo "freshness: $(( (total - stale) * 100 / total ))%  ($stale of $total citations stale)"
```

```console
freshness: 96%  (7 of 212 citations stale)
```

**Decided:** ≥95% and the map stays stamped and the issue gets fixed in the normal course of things. Below 95% — eleven or more stale citations in `ledger-core`'s 212 — the map is *demoted*: a one-line PR flips its status line to DRAFT, labelled `kt:draft`, and the tutor's first rule means Sam hears "DRAFT" before every answer until it's fixed. That's not punishment; it's the honest state. A map with one stale pointer in twenty is a map that will send someone to the wrong file this week, and the demotion makes the cost visible to the people who can fix it. The [governance page](/kt/measurement-and-governance/) carries this metric alongside the other three, with its baseline and the fallback ladder; here it's just the rule.

## Confluence sync on merge to `main`

The Confluence page established the direction — the repo publishes, Confluence receives — and showed the `mark` command by hand. In CI it's the same command on a `push` to `main` that touched the map, so the generated page can never lag the repo by more than one merge:

```yaml
name: Publish the map to Confluence

on:
  push:
    branches: [main]
    paths: ['docs/ARCHITECTURE.md']   # only when the map itself changed

permissions:
  contents: read                     # nothing in GitHub is written; Confluence is the target

jobs:
  publish:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v7
      - name: Wrap the map with mark's header and the "edit in git" banner
        run: |
          { printf '<!-- Space: LEDGER -->\n<!-- Parent: Architecture (generated) -->\n<!-- Title: ledger-core — Architecture (generated from git) -->\n<!-- Label: generated -->\n';
            printf '> Generated from `ledger-core/docs/ARCHITECTURE.md` at commit %s. Edit in git, not here — this page is overwritten on every merge to main.\n\n' "${GITHUB_SHA::7}";
            cat docs/ARCHITECTURE.md; } > confluence-page.md
      - name: Publish with mark
        env:
          CONFLUENCE_BASE_URL: ${{ secrets.CONFLUENCE_BASE_URL }}   # a service account scoped to space LEDGER — never a person's token
          CONFLUENCE_USER: ${{ secrets.CONFLUENCE_USER }}
          CONFLUENCE_TOKEN: ${{ secrets.CONFLUENCE_TOKEN }}
        run: |
          docker run --rm -i -v "$PWD:/work" -w /work kovetskiy/mark:latest \
            mark -b "$CONFLUENCE_BASE_URL" -u "$CONFLUENCE_USER" -p "$CONFLUENCE_TOKEN" -f confluence-page.md --output-format github
```

The `paths` filter is the cost control — a PR that touches only code doesn't republish — and the banner is the governance control: a page that says "edit in git" at the top gets edited in git. The three secrets are the one ask on this page that crosses the boundary: a Confluence service account limited to writing under "Architecture (generated)" in `LEDGER`, which InfoSec will grant faster than you expect once they see it can't read `restricted` pages and can't write anywhere else.

## This is an overnight job

Everything above is the Overnight playbook's shape with a documentation payload, and it pays to see that explicitly, because it means every rule that governs the night shift governs this — the kill switch, the budget ledger, the one-issue rule, the proof-on-the-first-night. The anatomy, for the nightly freshness job:

| Stage | Nightly freshness | Weekly semantic | PR-time |
|---|---|---|---|
| Trigger | `47 6 * * 1-5` | `47 6 * * 6` | `pull_request` |
| Environment | `ubuntu-latest`, checkout, 10 min | Same, plus the CI credential | Same, plus the action's auth |
| Deterministic phase | `check-citations.sh` | The changed-citations list | The `gate` job's intersection |
| Agent phase | None — no model | Read-only, 60 turns, a small budget | Read-only, 15 turns |
| Evidence | `stale.txt` — one line per pointer | `night/semantic.md` — both quotes | The comment — both sentences |
| Report | One `kt:stale` issue | Appended to it | One PR comment |
| Human | Whoever picks up `kt:stale`; Priya via CODEOWNERS | Same | The PR author |
| Blast radius | Read the repo; write one issue | Same | Read the branch; write one comment |

[Anatomy of a Night](/overnight-qa/anatomy-of-a-night/) is that table generalized, and [Blast Radius](/overnight-qa/blast-radius/) is the page to read before you widen any column of it — the moment someone proposes "let the PR job push the fix", that's the page that explains why the answer is a comment.

:::tip[Good citizen]
The weekly semantic check reads only citations whose files changed. Resist the temptation to have it re-verify all 212 every Saturday "to be safe" — that spends a budget on files nobody touched, and the structural check already proved the pointers exist. Spend model runs where the code moved; spend shell scripts everywhere else.
:::

## Where next

- **Next in the journey:** [Measuring KT and Rolling It Out to Five Teams](/kt/measurement-and-governance/) — freshness is one of four numbers; the page puts baselines and decision rules on all of them, and turns this repo's setup into something the other four teams can adopt.
- **The lateral jump:** [Anatomy of a Night](/overnight-qa/anatomy-of-a-night/) — the shape this page borrowed, explained on its own terms, with the kill switch and the budget ledger every scheduled job on this site is expected to have.
