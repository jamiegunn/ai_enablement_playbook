---
title: "The Morning Report: Evidence, Not Opinions"
description: The seven-part report contract the whole night shift writes to, the four places it lands (job summary, Slack or Teams, a GitHub issue, Confluence), the ten-minute standup that closes it, and the one metric that decides whether the night stays on.
keywords:
  - morning report template for nightly tests
  - post github actions results to slack
  - slack-github-action incoming webhook payload
  - teams workflows webhook adaptive card from github actions
  - publish markdown to confluence from ci
  - kovetskiy mark confluence page from markdown
  - github step summary size limit
  - nobody reads the nightly report
  - claude code json-schema structured_output
  - report actioned rate
sidebar:
  order: 9
---

You are here if: the night runs and its output goes to a folder; or the report exists, lands in the channel every morning, and you have watched the read count fall to two — you and the bot.

The report is the product. Everything else in this playbook — the cron, the bounds, the hooks, the scanners — is plumbing whose only purpose is to put a page in front of a person at 9:15 that changes what they do next. So the report has a contract, stated once here, that every night job on this site writes to, whether it triaged a suite, wrote tests, clicked through staging, or read the day's diffs. The contract exists because the alternative — each job's prompt inventing its own shape — produces a channel full of paragraphs, and **a paragraph is not a finding; a finding is something a human can click and check in twenty seconds.**

## The contract, in seven parts

Every report answers seven questions, in the order a busy person asks them:

1. **The headline verdict** — one line: `GREEN`, `AMBER`, or `RED`, and *the one number that matters* ("14 failed, 0 new"). This line is what Slack gets and what the streak counter watches.
2. **What ran** — the jobs, their durations, their cost. Nobody reads this first, so the template puts it last.
3. **What's new since yesterday** — the diff against the previous report. This is the whole reason to open the page; "nothing new" is a valid and good line.
4. **What failed, grouped by cause** — not by test class; by the one thing that would fix several. Each group carries its evidence: a `path:line`, a log line, a screenshot, a SARIF row.
5. **What needs a human** — a checklist, each item with a proposed owner. An unowned item is everyone's and therefore nobody's.
6. **What the night did on its own** — every PR opened, every issue filed, with numbers. This is the audit line: if it isn't here, the night didn't do it.
7. **Cost** — this night's `total_cost_usd` and turns, and the week to date. One line each; the arithmetic is on [Cost and Governance](/overnight-qa/cost-and-governance/).

The template puts *what ran* and *cost* together at the bottom, because the order of the template is the order of attention. Line 2 is the headline, and the Slack step in the workflow reads exactly that line (`sed -n '2p' report.md`), so keep it on line 2:

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

Two words in that template carry the evidence rule. `(verified | inference)` on every cause: *verified* means the agent read the file at the cited line and the line says what the sentence says; *inference* means it reasoned from the stack trace and did not, or could not, confirm. Both are useful; only one may be acted on without a human reading the code first. And `evidence:` is not optional — a group without it is deleted before the report is published, and the schema below makes that mechanical.

## The machine-readable copy

The markdown is for people. The night also needs a copy a script can read — to compute *what's new* without trusting the agent's arithmetic, to count findings for the metric at the bottom of this page, and to sum the cost. Claude Code produces both in one run: `--json-schema` makes the model return an object that validates against a schema you supply, and the validated object lands in the JSON result's `structured_output` field (the flag's mechanics are on [Running Claude Unattended](/overnight-qa/running-unattended/)). The schema for the report:

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

`evidence` and `confidence` are in `required`, so a group without them fails validation and never reaches the report. The agent step of `nightly-triage.yml` grows one flag, and reading the result is one `jq`:

```bash
# seat: team — the agent step of nightly-triage.yml with the schema added; everything else exactly as in the quick start
scripts/run-claude.sh prompts/nightly-triage.md night.json \
  --bare \
  --permission-mode dontAsk \
  --allowedTools "Read,Grep,Glob" \
  --model sonnet \
  --json-schema "$(cat prompts/report.schema.json)"
jq '.structured_output' night.json
```

```json
{
  "verdict": "AMBER",
  "total": 1412,
  "failed": 14,
  "groups": [
    { "cause": "FxRateCache serves the previous day's rate for the first request after midnight UTC", "tests": ["FxConversionTest.convertsAtMidnight", "FxConversionTest.convertsAfterRollover", "FxConversionTest.roundTripsEurUsd"], "evidence": "src/main/java/com/payments/api/fx/FxRateCache.java:88", "status": "UNCHANGED", "confidence": "verified" },
    { "cause": "SettlementTotals rounds per line, the fixture rounds the sum", "tests": ["SettlementTotalsTest.sumsBatch4471", "SettlementTotalsTest.sumsBatch4472", "SettlementTotalsTest.sumsEmptyBatch", "SettlementTotalsTest.sumsSingleLine", "SettlementTotalsTest.sumsNegativeAdjustment", "SettlementTotalsTest.sumsMixedCurrency", "SettlementTotalsTest.sumsLargeBatch", "SettlementTotalsTest.sumsRefunds", "SettlementTotalsTest.sumsPartialRefund", "SettlementTotalsTest.sumsZeroLine"], "evidence": "src/main/java/com/payments/api/settlement/SettlementTotals.java:41", "status": "UNCHANGED", "confidence": "verified" },
    { "cause": "Oracle service container not healthy before SettlementRepositoryIT starts", "tests": ["SettlementRepositoryIT.findsOpenBatches"], "evidence": "target/surefire-reports/com.payments.api.settlement.SettlementRepositoryIT.txt:14", "status": "NEW", "confidence": "inference" }
  ],
  "new": ["Oracle service container not healthy before SettlementRepositoryIT starts"],
  "resolved": [],
  "needs_human": [
    { "item": "Decide whether FxRateCache's midnight behaviour is a bug or a quirk to pin", "owner": "Priya" },
    { "item": "Add a health wait for the Oracle service container", "owner": "Marcus" }
  ]
}
```

Read `groups[2]`: `status: NEW`, `confidence: inference`, evidence pointing at a surefire report rather than a source line — the agent is saying "this is new, I think it's the container, I did not prove it". That is exactly the right thing for it to say, and exactly the item Marcus should spend two minutes on. The other two groups are the fourteen-since-March baseline, still `UNCHANGED`, still owned.

The "what's new" list is the agent's claim. Check it with arithmetic, because the previous night's JSON is already downloaded (the *fetch last night's report* step in the workflow):

```bash
# seat: team — the diff the agent claims, computed independently: causes in tonight's groups that were not in last night's
jq -n --slurpfile a previous/night.json --slurpfile b night.json \
  '($b[0].structured_output.groups | map(.cause)) - ($a[0].structured_output.groups | map(.cause))'
```

```console
[
  "Oracle service container not healthy before SettlementRepositoryIT starts"
]
```

When `jq`'s list and the agent's `new` list disagree, `jq` is right and the prompt needs work. That's the proof step for the one section of the report people actually read.

## Where it lands

Four destinations, each for a different reader, and the rule is that **the summary goes where people already look and the full report goes where it can be found in a month.**

### The job summary — always

Every night job appends `report.md` to `$GITHUB_STEP_SUMMARY` (the *publish* step in the workflow: `cat report.md >> "$GITHUB_STEP_SUMMARY"`), which renders as GitHub-flavored Markdown on the run's page. The limits are 1 MiB per step and 20 summaries shown per job — a report that gets near either is a report with forty items, which is a problem this page addresses below, not a limit to engineer around. The summary is where the *Open the run* button in Slack lands, so it's the first full view anyone gets.

### Slack

The summary is three lines and a button; the full report lives in GitHub and Confluence. The workflow builds the payload with `jq` and posts it with `slackapi/slack-github-action@v4` — these are the two steps from `nightly-triage.yml`, quoted exactly:

```yaml
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
```

The comment in the first step is the security-relevant line on this page: the headline is model output, and model output goes through `--arg`, never through `${{ }}`. `if: ${{ !cancelled() }}` rather than `if: always()` so a cancelled run doesn't hang on the report. The webhook is yours to create as the channel's admin — in the Slack app: Incoming Webhooks → Activate → Add New Webhook to Workspace → choose `#payments-nightly` → Authorize — and the URL it gives you (`https://hooks.slack.com/services/…`) goes in the repository secret `SLACK_WEBHOOK_URL` and nowhere else. A webhook is bound to one channel at creation; the message cannot override channel, username, or icon.

The bot-token variant is the same action with `method: chat.postMessage`, `token: ${{ secrets.SLACK_BOT_TOKEN }}`, and a payload carrying `channel:` and `text:`; the app needs the `chat:write` scope and an invitation to the channel. What you gain is that the step returns `ts`, `thread_ts`, and `channel_id` as outputs, so the e2e job at 02:07 and the review job at 02:37 can post *under* the triage message instead of beside it — one thread per night. What you pay is a Slack app, which in most shops is an admin's approval rather than yours. Start with the webhook; move to the token when five messages a morning becomes noise.

### Teams

Teams' older connector-based webhooks were retired in 2026 (final removal rolled out in May), so as of September 2026 the path is the Workflows app: in the channel, **… → Workflows → "Send webhook alerts to a channel"** → Save → copy the URL. It accepts a POST with an Adaptive Card (message cards render, but without buttons), and the card supports `Action.OpenUrl`, `Action.ShowCard`, and `Action.ToggleVisibility`:

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

`$HEADLINE` is `$(sed -n '2p' report.md)` as in the Slack step, and `$TEAMS_WEBHOOK_URL` comes from a repository secret through the step's `env:`. Same rule, same reason: model output through `--arg`.

### GitHub: one issue per night, and the children

The tracker gets one issue per night per service, titled by date, created by whichever job runs first and appended to by the rest, and **closed at standup** — the closure is the record that a human read it, which is what the metric at the bottom of this page counts. The script every night job calls with its `report.md`:

```bash
#!/usr/bin/env bash
# scripts/night-issue.sh — append this job's report to tonight's issue, creating it if this job is first.
# Usage: scripts/night-issue.sh <service> <report.md>     (the job needs permissions: issues: write)
set -euo pipefail
SERVICE="$1"; REPORT="$2"; TITLE="Morning report — $SERVICE — $(date -u +%F)"
N=$(gh issue list --search "\"$TITLE\" in:title" --label nightly --state open --json number -q '.[0].number')
if [ -z "$N" ]; then
  gh issue create --title "$TITLE" --body-file "$REPORT" --label nightly
else
  gh issue comment "$N" --body-file "$REPORT"
fi
```

```console
$ scripts/night-issue.sh payments-api report.md
https://github.com/<org>/payments-api/issues/220
```

Findings are child issues, filed by [`scripts/file-findings.sh`](/overnight-qa/review-and-security/#findings-become-issues-once) with `--label nightly --label needs-human` and de-duplicated by fingerprint; the workflow appends their URLs to the report before publishing (`sed 's/^/- filed /' night/filed.txt >> report.md`) so the night's issue links every child under *What the night did on its own*. The triage workflow in the quick start has `contents: read` and `actions: read` only; add `issues: write` to its `permissions:` when you take this step, and nothing more. At standup:

```bash
# seat: team — the last thing standup does
gh issue close 220
```

```console
✓ Closed issue <org>/payments-api#220 (Morning report — payments-api — 2026-09-10)
```

### Confluence: the durable page

Slack scrolls away in a week and the night's issue is closed by lunchtime. The Confluence page under **"Nightly QA"** in space `PAY` is the copy that exists in a month — the one the platform reviewer reads to see the trend, the one InfoSec can audit, and the one Sam reads on Monday to learn what the service's suite has been saying about itself. Two ways to publish, both from the same `report.md`. With `mark`, a header comment names the space, parent, title, and label, and the tool does the markdown-to-storage conversion:

```bash
# seat: team — needs a Confluence API token (Cloud) or PAT (Data Center) for a service account limited to space PAY
{ printf '<!-- Space: PAY -->\n<!-- Parent: Nightly QA -->\n<!-- Title: Morning Report %s -->\n<!-- Label: nightly -->\n' "$(date -u +%F)"; cat report.md; } > confluence-page.md
docker run --rm -i -v "$PWD:/work" -w /work kovetskiy/mark:latest \
  mark -b "$CONFLUENCE_BASE_URL" -u "$CONFLUENCE_USER" -p "$CONFLUENCE_TOKEN" -f confluence-page.md --output-format github
```

With the Cloud v2 REST API directly, when you can't run a container on the runner:

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

```console
{
  "id": "1998848",
  "title": "Morning Report 2026-09-10",
  "status": "current"
}
```

| | `mark` | The raw v2 REST call |
|---|---|---|
| **What you gain** | Cloud *and* Data Center with one command; markdown → storage format done properly (tables, code blocks, headings); space, parent, title, and label ride in the file's header comments; `--dry-run` to see what it would do | No container, no extra tool beyond `curl`, `jq`, and `pandoc`; you can read the exact request in the log; updating in place is one `PUT` with the version number |
| **What you pay** | A container pull (or a Go binary) on every run, one more version to pin; its own markdown dialect for anything beyond plain text | Cloud only as written (Data Center is the v1 API with a different shape); `pandoc`'s HTML is not storage format, so code blocks and anything macro-like may render oddly; "page already exists" is yours to handle |

The token in either case belongs to a service account limited to space `PAY` — never a person's token, and never one that can see `LEDGER`'s `restricted` pages. The scope is [InfoSec's](/start/working-within-policy/) to grant and yours to ask for; the [blast-radius page](/overnight-qa/blast-radius/) says where it sits.

## The standup ritual

Ten minutes, the same shape every day, so that reading the report is a habit and not a decision. Copy this into the team's standup doc:

```markdown
## The night's ten minutes
- [ ] **Headline.** Read line 2 aloud. GREEN → skip to "what the night did". RED → this is the standup.
- [ ] **New since yesterday.** For each new group, one sentence: real, flaky (label it `nightly:flaky`), or environment. Nothing new? Say so and move on — that's a good morning.
- [ ] **Needs a human.** Every checkbox gets a name today or gets deleted. There is no "we'll see".
- [ ] **Assign.** The named person replies on the item's issue (or the PR) with what they'll do — a link, not a promise.
- [ ] **Close the night's issue.** `gh issue close <n>` — the closure is the record that a human read it.
- [ ] **Cost.** Once a week, say the week-to-date line aloud. If it doubled, someone owns finding out why before tomorrow.
```

The first item is the one teams skip and shouldn't: *reading the verdict aloud* is what makes a GREEN morning take thirty seconds instead of zero, and zero is how the habit dies.

## Reports that get ignored, and why

The [Field Note](/blog/the-morning-report-nobody-read/) is the long version. The short version is five symptoms, each with a mechanical fix — not a plea for more urgent prose:

| Symptom | Why it gets ignored | The fix |
|---|---|---|
| **Same every day** | The reader learns nothing from opening it, so they stop opening it | *New since yesterday* at the top; "nothing new" as a first-class line; the streak counter below, read weekly |
| **No diff against yesterday** | The reader does the diff in their head, once, then never again | The *fetch last night's report* step, `status: NEW \| UNCHANGED` in the schema, and the `jq` arithmetic above as the check |
| **Findings without evidence** | Every item is homework, and homework goes to the bottom of the pile | `evidence` and `confidence` are `required` in the schema; a cause is `(verified)` or `(inference)`, and inference is never assigned without a human reading the code |
| **Forty items** | Nobody reads forty of anything at 9:15 | Group by cause, not by test; cap issues at ten a night (the rest go in the artifact); a `needs_human` list longer than five is a prompt problem |
| **No owner** | An unowned item is everyone's, and therefore nobody's | `proposed owner:` on every checkbox — from `git log`, with the caveat that pre-2021 blame lies on the Ledger repos — and the standup rule that an unnamed item is deleted |

Every fix in that column is a line in the template, the schema, or the standup checklist. None of them is "write a better paragraph".

## The report-actioned metric

This is the one number that decides whether the night stays on, so it gets the full treatment: define, observe, decide.

**Define.** Report-actioned rate = findings a human did something with ÷ findings reported, per week. "Did something" means an issue closed — by a PR that references it, by a commit, or by a person with a closing comment that says what was decided; "won't fix, allowlisted at the controller" is an action, because a human decided. The night's own issue, closed at standup, is a second signal: it counts *nights read*, which is the denominator's floor. Baseline: none — the fallback ladder's floor applies, so the first two weeks are a count with a `TODO: set target` written next to it, and the target after that is ≥50% or the report is noise.

**Observe.** Two `gh` calls, run on Fridays:

```bash
# seat: team — nights read this month: the night's issue closed at standup
gh issue list --label nightly --state closed --search "Morning report in:title created:>=2026-09-01" --json number,closedAt -q 'length'
# findings actioned vs still open: every needs-human issue filed this month
gh issue list --label needs-human --state all --search "created:>=2026-09-01" --json number,state,closedAt -q 'group_by(.state) | map({state: .[0].state, n: length})'
```

```console
8
[{"state":"CLOSED","n":6},{"state":"OPEN","n":5}]
```

Eight nights read of eight run; six of eleven findings actioned — 55%. Above the line, and the five open ones are what Friday's ten minutes are for.

**Decide.** Below 20% for two consecutive weeks → the job is turned off and redesigned — not tuned, not given a sterner prompt — because a report nobody acts on is training the team to ignore the channel, and that costs more than the tokens. Between 20% and 50% → find the noisiest group in the report (the one with the most `UNCHANGED` nights) and fix *that*: an owner, a `nightly:flaky` label, or a scanner rule excluded with a reason in the config. At or above 50% → keep it, and consider the next rung of the [ladder](/overnight-qa/overview/#the-maturity-ladder). The person who turns it off is you, without a meeting; that was in the [citizenship contract](/overnight-qa/overview/#the-citizenship-contract).

## Trend: the week-to-date line and the streak

Two lines at the bottom of the report carry the trend. The first is cost: `week to date: $<sum>`, the sum of `total_cost_usd` across the week's runs, produced by the ledger script on [Cost and Governance](/overnight-qa/cost-and-governance/) and pasted in by the publish step. Read it once a week at standup; a week that doubles has a reason, and the reason is usually a red suite whose surefire output tripled the input.

The second is the streak, and **a "same as yesterday" streak counter is a smell, not a comfort.** Pull the last five nights' JSON and look at the headline fields:

```bash
# seat: team — the last five successful nights, headline fields only
for id in $(gh run list --workflow nightly-triage.yml --status success --limit 5 --json databaseId -q '.[].databaseId'); do
  gh run download "$id" -n morning-report -D "ledger/$id"
done
for f in ledger/*/night.json; do jq -r '.structured_output | "\(.verdict) failed=\(.failed) new=\(.new | length)"' "$f"; done
```

```console
AMBER failed=14 new=0
AMBER failed=14 new=0
AMBER failed=14 new=0
AMBER failed=14 new=0
AMBER failed=14 new=1
```

Four nights of `new=0` with the same fourteen failures is a streak. Either those fourteen have an owner and a plan — in which case the report should say so in one line under *Needs a human* and stop listing them by name — or they don't, and the report is a daily reminder nobody asked for. The fourteen are where this site's L1 baseline came from: red since March, listed every night, read by nobody. Grouped by cause they became three root causes and one owner in week one, and the streak broke. A streak that doesn't break is a job that has stopped answering a question anyone is asking; the honest response is to run it weekly, or to change the question.

## Where next

- **Next in the journey:** [Blast Radius](/overnight-qa/blast-radius/) — the deny list with an "enforced by" column, the kill switch, and the evidence pack for the security reviewer who will ask what the night can touch.
- **The lateral jump:** [The Morning Report Nobody Read](/blog/the-morning-report-nobody-read/) — the Field Note: the week the read count fell to two, and which row of the table above it turned out to be.
