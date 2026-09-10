# Canonical artifacts (quote these verbatim; never fork them)

Every prompt, workflow, hook, template, and config the site teaches lives here
once. Pages embed the relevant artifact **exactly** (whole or a clearly marked
excerpt with `# …` for elided lines) so that a reader who copies from any page
gets the same thing. If an artifact must change, change it here first, then
every page that quotes it. All facts in these files were verified in
`docs/research/FACTS-*.md` on 2026-09-10.

Conventions inside artifacts: the cast's real names (`payments-api`,
`ledger-api`, `ledger-core`, Priya, Marcus, Sam, `#payments-nightly`, space
`PAY`, parent page "Nightly QA"); model aliases (`sonnet`, `opus`, `haiku`);
cron `17 6 * * 1-5`; labels `nightly`, `needs-human`, `nightly:flaky`,
`kt:draft`, `kt:stamped`, `kt:stale`.

---

## A1. `CLAUDE.md` — the three-section template (shown for `ledger-api`)

```markdown
# ledger-api

## What this is
Spring Boot 2.7 REST facade in front of `ledger-core` (the settlement engine).
Java 17 — the `jdk8` Maven profile is legacy and CI does not run it. Reads and
writes Oracle only through `ledger-core`; never talks to MQ directly.
Architecture: @docs/ARCHITECTURE.md (STAMPED 2026-09-12 by Priya — treat as
true and cite it; anything not in it is unknown, not inferred).

## How to work here
- Build: `./mvnw -q -DskipTests package`. Tests: `./mvnw test` — integration
  tests need `LEDGER_TEST_DB` set (see docs/ARCHITECTURE.md, "Build, run, test").
- Layout: controllers in `src/main/java/com/ledger/api/web`, DTOs in
  `src/main/java/com/ledger/api/dto`. No business logic in controllers — it
  lives in `ledger-core`.
- When asked where something happens: search first (Grep/Glob), then cite
  `path:line`. If you cannot find it, say "not found in this repo — may be in
  ledger-core" rather than guessing.

## What not to do
- Do not edit anything under `src/main/java/com/ledger/api/legacy/` — scheduled
  for deletion, no tests, and Marcus is the only person who knows why it exists.
- Do not add dependencies without a comment naming the reason; the nightly
  dependency job flags unexplained additions.
- Do not invent class, method, table, queue, or endpoint names. "Unknown" is an
  acceptable answer; a plausible-sounding name is not.
```

## A2. `.claude/skills/map-repo/SKILL.md` — the repo-mapping skill

```markdown
---
name: map-repo
description: Map this repository into docs/ARCHITECTURE.md (DRAFT) — entry points, request path, data model, integrations, build & run, surprises — every claim cited path:line, unknowns listed as unknowns. Use when onboarding or when asked "how does this repo work".
disable-model-invocation: true
allowed-tools: Read Grep Glob Bash(./mvnw *) Bash(git log *) Bash(find *)
---
You are mapping this repository for a senior engineer joining the team who has
never seen it. Write `docs/ARCHITECTURE.md`. Its first line is:
`**Status: DRAFT — not yet reviewed by a named expert.**`

Rules that override everything else:
1. Every factual claim ends with a citation `(path:line)` or `(path:line-line)`.
   A claim you cannot cite goes under "## Unverified" with what would confirm it.
2. Search, don't read: use Grep and Glob to find things; read only the files you
   cite. This repository may be very large.
3. "No callers found" is a finding; "unused" is a conclusion. Report the finding.
4. Two toolchains may coexist (Java 8 and 17 profiles, .NET Framework and .NET 8).
   Say which one CI actually runs, citing the workflow or build file.
5. Never invent a class, method, table, queue, or endpoint name. If a name
   appears only in documentation and not in code, say exactly that.

Answer these eight questions, each as a `##` section, in this order:
1. What is this, in one paragraph — and what is it NOT (what lives in
   neighbouring repositories)?
2. Entry points — every way execution starts: HTTP endpoints, message listeners,
   scheduled jobs, CLI mains. A table: entry → handler `path:line` → what it
   calls next.
3. The request path — trace ONE representative request end to end, file by file.
4. Data — the domain model and where it is persisted; every table and queue
   touched, with the code that touches it.
5. Integrations — every external system (databases, queues, HTTP clients, file
   drops): the config key, the code, the direction of data.
6. Build, run, test — the exact commands from the build files and CI, and what
   they require (environment variables, services, credentials by name only).
7. Things that will surprise you — anything a senior engineer would want to be
   warned about: dead-looking code with live callers, reflection or DI wiring,
   generated code, feature flags, dual toolchains, time-zone handling.
8. Safe places to make a first change — three candidates with test coverage,
   cited.

Then two more sections: "## Unverified" and "## Questions for the expert" —
the things only a human can answer (why, history, intent).

Keep the whole file under 400 lines. Prose is cheap; citations are the product.
```

Run it interactively (`claude` in the repo, then `/map-repo`) or headless:

```bash
# seat: team
claude -p "/map-repo" \
  --permission-mode acceptEdits \
  --allowedTools "Read,Grep,Glob,Write,Edit,Bash(./mvnw *),Bash(git log *),Bash(find *)" \
  --max-turns 60 \
  --max-budget-usd 8 \
  --model sonnet \
  --output-format json > map-run.json
```

## A3. `.claude/settings.json` — the Day-1 baseline every repo gets

```json
{
  "permissions": {
    "defaultMode": "default",
    "allow": ["Read", "Grep", "Glob", "Bash(./mvnw *)", "Bash(git status*)", "Bash(git diff*)", "Bash(git log*)"],
    "deny": ["Bash(rm -rf *)", "Bash(git push --force*)", "Bash(git push -f*)", "Bash(git reset --hard*)", "Read(./.env)", "Read(./.env.*)", "Read(./**/secrets/**)"]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/block-destructive.sh" }]
      }
    ]
  }
}
```

## A4. `.claude/hooks/block-destructive.sh` — the destructive-command guard

```bash
#!/bin/bash
# .claude/hooks/block-destructive.sh — PreToolUse guard on Bash.
# Reads the hook JSON on stdin; denies with a reason. Exit 0 + JSON = decision.
COMMAND=$(jq -r '.tool_input.command // empty')
if echo "$COMMAND" | grep -Eq 'rm -rf|git push --force|git push -f\b|git reset --hard|DROP (TABLE|SCHEMA)|TRUNCATE '; then
  jq -n --arg c "$COMMAND" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:("blocked by policy (.claude/hooks/block-destructive.sh): " + $c)}}'
else
  exit 0
fi
```

`chmod +x .claude/hooks/*.sh` and commit both.

## A5. `.claude/hooks/write-scope.sh` — the night may only write under `src/test/`

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

## A6. `.claude/settings.night.json` — settings for jobs that WRITE (passed with `--settings`)

```json
{
  "permissions": {
    "defaultMode": "acceptEdits",
    "allow": ["Read", "Grep", "Glob", "Edit", "Write", "Bash(./mvnw *)", "Bash(git status*)", "Bash(git diff*)"],
    "deny": ["Bash(git push*)", "Bash(git commit*)", "Bash(git checkout*)", "Bash(git reset*)", "Bash(rm *)", "WebFetch", "WebSearch", "Read(./.env)", "Read(./.env.*)"]
  },
  "hooks": {
    "PreToolUse": [
      { "matcher": "Edit|Write", "hooks": [{ "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/write-scope.sh" }] },
      { "matcher": "Bash",       "hooks": [{ "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/block-destructive.sh" }] }
    ]
  }
}
```

The workflow — not the agent — does `git add src/test && git commit && git push` to the night's branch and opens the draft PR. The agent never holds the power to push.

## A7. `scripts/run-claude.sh` — the reusable unattended-run wrapper

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

## A8. `prompts/nightly-triage.md` — the read-only triage prompt (L1)

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

## A9. `.github/workflows/nightly-triage.yml` — the first night (L1, read-only)

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

Reading the JSON the first time (from `night.json`):

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

## A10. `prompts/report.schema.json` — the machine-readable morning report (used with `--json-schema "$(cat prompts/report.schema.json)"`)

```json
{
  "type": "object",
  "required": ["verdict", "total", "failed", "groups", "new", "resolved", "needs_human"],
  "properties": {
    "verdict": { "type": "string", "enum": ["GREEN", "AMBER", "RED"] },
    "total": { "type": "integer" },
    "failed": { "type": "integer" },
    "groups": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["cause", "tests", "evidence", "status", "confidence"],
        "properties": {
          "cause": { "type": "string" },
          "tests": { "type": "array", "items": { "type": "string" } },
          "evidence": { "type": "string", "description": "path:line of the first frame inside src/" },
          "status": { "type": "string", "enum": ["NEW", "UNCHANGED"] },
          "confidence": { "type": "string", "enum": ["verified", "inference"] }
        }
      }
    },
    "new": { "type": "array", "items": { "type": "string" } },
    "resolved": { "type": "array", "items": { "type": "string" } },
    "needs_human": {
      "type": "array",
      "items": { "type": "object", "required": ["item"], "properties": { "item": { "type": "string" }, "owner": { "type": "string" } } }
    }
  }
}
```

## A11. The morning report template (the contract, in markdown)

```markdown
# Morning report — <service> — <YYYY-MM-DD>
**Verdict:** GREEN | AMBER | RED — <the one number that matters>

## New since yesterday
<the whole reason to read this — groups/findings that did not exist in yesterday's report; "nothing new" is a valid and good line>

## What failed, by cause
### <cause> — <n> tests — NEW | UNCHANGED
- tests: …
- evidence: `path:line` | <link to log/screenshot/diff/SARIF row>
- cause: <one sentence> (verified | inference)

## Resolved since yesterday
…

## Needs a human
- [ ] <item> — proposed owner: @<name>
- [ ] …

## What the night did on its own
- opened draft PR #… (characterization tests for <module>)
- filed issue #… (<finding>)

## What ran
- <job>: <duration> · <tests run/failed> · cost $<total_cost_usd> · turns <num_turns> · exit <code>
- week to date: $<sum>
```

## A12. Slack and Teams delivery (the summary is three lines + a button; the full report lives in GitHub/Confluence)

Slack — the incoming-webhook step is in A9. Teams — the Workflows webhook accepts an Adaptive Card:

```bash
# seat: team — needs the Workflows webhook URL for the channel (Teams: channel … → Workflows → "Send webhook alerts to a channel")
jq -n --arg h "$HEADLINE" --arg u "$RUN_URL" '{
  type: "message",
  attachments: [{
    contentType: "application/vnd.microsoft.card.adaptive",
    contentUrl: null,
    content: {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      type: "AdaptiveCard", version: "1.2",
      body: [{ type: "TextBlock", text: ("Morning report · payments-api\n" + $h), wrap: true }],
      actions: [{ type: "Action.OpenUrl", title: "Open the run", url: $u }]
    }
  }]
}' > teams.json
curl -sS -H 'Content-Type: application/json' -d @teams.json "$TEAMS_WEBHOOK_URL"
```

## A13. Publishing the report to Confluence (parent "Nightly QA", space `PAY`)

With `mark` (Cloud or Data Center; one command; needs a token scoped to the `PAY` space):

```bash
# seat: team — needs a Confluence API token (Cloud) or PAT (Data Center) for a service account limited to space PAY
{ printf '<!-- Space: PAY -->\n<!-- Parent: Nightly QA -->\n<!-- Title: Morning Report %s -->\n<!-- Label: nightly -->\n' "$(date -u +%F)"; cat report.md; } > confluence-page.md
docker run --rm -i -v "$PWD:/work" -w /work kovetskiy/mark:latest \
  mark -b "$CONFLUENCE_BASE_URL" -u "$CONFLUENCE_USER" -p "$CONFLUENCE_TOKEN" -f confluence-page.md --output-format github
```

With the Cloud v2 REST API directly (when you can't run a container):

```bash
# seat: team — needs CONFLUENCE_SITE, CONFLUENCE_EMAIL, CONFLUENCE_TOKEN (space PAY only)
SPACE_ID=$(curl -s -u "$CONFLUENCE_EMAIL:$CONFLUENCE_TOKEN" \
  "https://$CONFLUENCE_SITE.atlassian.net/wiki/api/v2/spaces?keys=PAY" | jq -r '.results[0].id')
PARENT_ID=$(curl -s -u "$CONFLUENCE_EMAIL:$CONFLUENCE_TOKEN" \
  "https://$CONFLUENCE_SITE.atlassian.net/wiki/api/v2/pages?space-id=$SPACE_ID&title=Nightly%20QA" | jq -r '.results[0].id')
BODY=$(pandoc -f gfm -t html report.md)      # storage format is XHTML; pandoc's HTML is close enough for text and tables
jq -n --arg s "$SPACE_ID" --arg p "$PARENT_ID" --arg t "Morning Report $(date -u +%F)" --arg b "$BODY" \
  '{spaceId:$s, status:"current", title:$t, parentId:$p, body:{representation:"storage", value:$b}}' \
  | curl -s -u "$CONFLUENCE_EMAIL:$CONFLUENCE_TOKEN" -X POST "https://$CONFLUENCE_SITE.atlassian.net/wiki/api/v2/pages" \
      -H 'Content-Type: application/json' -d @- | jq '{id, title, status}'
```

## A14. `scripts/check-citations.sh` — the freshness check behind `nightly-freshness.yml`

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

This is the cheap structural check (file exists, line exists). The semantic check — does the cited line still say what the doc claims — is the agent's weekly job, bounded like any other night.

## A15. `.github/workflows/nightly-freshness.yml` — the KT bridge into the night shift

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

## A16. `.mcp.json` — the project-scoped servers the playbooks use

```json
{
  "mcpServers": {
    "atlassian": {
      "type": "http",
      "url": "https://mcp.atlassian.com/v2/mcp"
    },
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--headless", "--browser", "chromium", "--isolated", "--output-dir", "pw-out"]
    }
  }
}
```

Add the Atlassian server once with `claude mcp add --transport http --scope project atlassian https://mcp.atlassian.com/v2/mcp`, then `/mcp` inside a session to complete the OAuth flow. Data Center shops replace the `atlassian` entry with the `sooperset/mcp-atlassian` container (`READ_ONLY_MODE=true`, `CONFLUENCE_SPACES_FILTER=LEDGER`) — the Confluence page has the full entry.

## A17. `.claude/skills/characterize/SKILL.md` — the night's test-writing skill (L2)

```markdown
---
name: characterize
description: Write characterization tests that pin the CURRENT behaviour of recently changed or untested code under src/test/ only, run them, and report — never touch src/main, never weaken an existing test.
disable-model-invocation: true
allowed-tools: Read Grep Glob Edit Write Bash(./mvnw *) Bash(git diff *) Bash(git status *)
---
You are writing characterization tests (Feathers: tests that document what the
system actually does, not what anyone wishes it did) for the targets listed in
`night/targets.txt` — one file per line, chosen by the workflow.

Rules that override everything else:
1. Write only under `src/test/`. If you believe `src/main/` needs a change, write
   it into `night/needs-human.md` instead and continue.
2. Never modify or delete an existing test, and never weaken an assertion.
3. Every generated test method carries the comment
   `// characterization: pins current behaviour as of <date>; may encode a bug`
   and asserts the OBSERVED output — including outputs that look wrong. Do not
   "fix" surprising behaviour by asserting what would be correct; record it in
   `night/surprises.md` with a `path:line` and move on.
4. Run `./mvnw -q test -Dtest=<the new classes>` after writing. Remove any test
   that does not pass. Then run the same command twice more; remove any test
   whose result changed between runs and note it in `night/flaky.md`.
5. Prefer many small tests over one large one; keep each class under 200 lines.
6. Finish by writing `night/summary.md`: targets, tests written, tests kept,
   tests dropped (and why), surprises, needs-human — every item with `path:line`.
```

## A18. Labels, names, and numbers (so pages agree)

| Thing | Value |
|---|---|
| Channel | `#payments-nightly` |
| Confluence spaces | `PAY` (the team's, receives reports) · `LEDGER` (the legacy graveyard, read-only) |
| Confluence parent page | "Nightly QA" |
| Cron | triage `17 6 * * 1-5` · freshness `47 6 * * 1-5` · characterize `27 6 * * 1-5` · e2e `07 6 * * 1-5` (needs the self-hosted runner) · review `37 6 * * 1-5` |
| Batch window to avoid | 03:00–03:40 America/New_York |
| Runners | `ubuntu-latest`; `[self-hosted, linux, payments]` for the Oracle test DB (`ledger-test-db.internal:1521/FREEPDB1`) and staging (`https://ledger-staging.internal`) |
| Budgets (defaults) | triage $3/25 turns · characterize $8/60 turns · e2e $6/40 turns · review $5 per PR/30 turns · map-repo $8/60 turns · system-map $12/40 turns |
| Labels | `nightly`, `needs-human`, `nightly:flaky`, `kt:draft`, `kt:stamped`, `kt:stale` |
| Branch pattern | `nightly/characterize-<YYYY-MM-DD>` |
| Baselines (KT) | predecessor's first PR: 11 weeks · expert questions/week: ~30 (PROVISIONAL, Priya's estimate) · `ledger-core` main-dev share: 71% Priya · Confluence `LEDGER`: 940 pages, median last-edit 2021 |
| Baselines (Overnight) | 14 tests red since March in `payments-api` (turned into 3 root causes, 1 owner in week one) |
| Models | `sonnet` default · `opus` for system-map and review · `haiku` for labelling passes |
