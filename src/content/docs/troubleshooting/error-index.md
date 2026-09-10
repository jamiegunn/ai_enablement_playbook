---
title: Error Message Index
description: Look up the literal string — an exit code, a denial reason, a webhook rejection, a retired endpoint — and get one sentence of meaning plus the page that fixes it.
keywords:
  - mcp server failed to start
  - exit code 143 github actions
  - permission_denials not empty
  - blocked by policy claude hooks
  - this scheduled workflow is disabled because there hasn't been activity
  - resource not accessible by integration
  - slack invalid_payload
  - channel_not_found
  - target page context or browser has been closed
  - pit no mutations found
sidebar:
  order: 7
---

<!-- lint: allow-deprecated -->

You have a string — from a job log, a `night.json`, a red step, a webhook response — and you want to know what it means before you form a theory about it. That's all this page does: the literal thing you saw, one sentence of what it actually means, and the page that fixes it. Bookmark it; it's the fastest stop between "the night is red" and knowing whose problem it is. Read every entry literally, in the spirit of the [triage method](/troubleshooting/overview/#the-method-three-questions-in-order) — an exit code describes the *process*, not the quality of the work, and a denial is a refusal, not a crash.

## Claude Code

The exit code appears in the job summary as the `run-claude: exit=` line; the rest come from the `--output-format json` file the run writes.

| What you see | What it means | Go to |
|---|---|---|
| `run-claude: exit=0` | The CLI finished the loop and wrote complete JSON — which says nothing about whether the report is any good. | [Reading the JSON, field by field](/overnight-qa/running-unattended/#reading-the-json-field-by-field) |
| `run-claude: exit=1` | The CLI itself failed — a bad flag, a missing prompt file, a run error — so there is usually no usable result. | [Exit codes, and what to do about each](/overnight-qa/running-unattended/#exit-codes-and-what-to-do-about-each) |
| `run-claude: exit=2` | Partial: the `--max-budget-usd` ceiling was hit mid-run, and the JSON still carries a partial `result` and the real `total_cost_usd`. | [Reading the JSON, field by field](/overnight-qa/running-unattended/#reading-the-json-field-by-field) |
| `exit=2` with no turns and no cost | Authentication or billing failed *before the first turn*, so nothing ran — the credential or its spend cap, not your prompt. | [The three deployment paths](/toolkit/enterprise-and-cost/#the-three-deployment-paths) |
| `run-claude: exit=130` | SIGINT — someone pressed Ctrl-C, or the container got an interrupt from outside. | [Exit codes, and what to do about each](/overnight-qa/running-unattended/#exit-codes-and-what-to-do-about-each) |
| `run-claude: exit=143` | SIGTERM — something outside the process killed it; on a runner that is almost always `timeout-minutes`. | [The timing budget](/overnight-qa/anatomy-of-a-night/#the-timing-budget) |
| `"is_error": true` in the JSON | The run ended in an error rather than a final answer; `result` holds the message, and the other fields still tell you how far it got. | [The JSON, field by field](/toolkit/headless-and-sdk/#the-json-field-by-field) |
| A non-empty `permission_denials` array | Something asked for a tool it wasn't allowed to use and was refused — the run continued without it. | [The method: three questions](/troubleshooting/overview/#the-method-three-questions-in-order) |
| `blocked by policy (.claude/hooks/block-destructive.sh): rm -rf target` | The destructive-command hook denied a `Bash` call before it ran; the fence worked. | [The examples](/toolkit/hooks/#the-examples) |
| `write outside src/test/ blocked by policy (.claude/hooks/write-scope.sh): src/main/java/...` | The write-scope hook denied an edit outside the night's fence — usually the agent trying to "fix" production code. | [The examples](/toolkit/hooks/#the-examples) |
| `MCP server failed to start` | A configured MCP server didn't come up before the startup timeout, so none of its tools existed in that session. | [The server shows as failed at startup](/troubleshooting/mcp-wont-connect/#the-server-shows-as-failed-at-startup) |

## GitHub Actions

| What you see | What it means | Go to |
|---|---|---|
| `This scheduled workflow is disabled because there hasn't been activity in this repository` | GitHub auto-disables schedules on public repos after 60 days without repository activity; re-enable it and the cron resumes. | [On a cron](/toolkit/github-action/#on-a-cron) |
| `gh: HTTP 403` from `gh run download` | The workflow token can't read Actions data — naming any key in `permissions:` sets every other one to `none`. | [The permissions block](/toolkit/github-action/#the-permissions-block) |
| `Error: The operation was canceled.` at the end of a long step | The job hit `timeout-minutes` and Actions killed it; the agent process saw SIGTERM and exited 143. | [The timing budget](/overnight-qa/anatomy-of-a-night/#the-timing-budget) |
| `Error: Resource not accessible by integration` | The token lacks the scope the step needs — `issues: write` to open an issue, `pull-requests: write` for a draft PR. | [The permissions block](/toolkit/github-action/#the-permissions-block) |
| A `schedule:` run that simply never appears | Cron is UTC, schedules run only on the default branch's latest commit, and queued runs can be dropped under load. | [On a cron](/toolkit/github-action/#on-a-cron) |

## Slack and Teams

The report reaching the channel is a delivery step, not an agent step — these fail long after the night succeeded.

| What you see | What it means | Go to |
|---|---|---|
| `invalid_payload` | The webhook got a body it can't parse — with `slackapi/slack-github-action@v4` this is usually indentation drift in a multi-line `payload:`. | [Where it lands](/overnight-qa/the-morning-report/#where-it-lands) |
| `channel_not_found` | On the bot-token path: the channel ID is wrong, or the app was never invited to `#payments-nightly`. | [Where it lands](/overnight-qa/the-morning-report/#where-it-lands) |
| `no_service` | The incoming webhook has been revoked or the app removed from the workspace; the URL is dead and must be re-issued. | [Where it lands](/overnight-qa/the-morning-report/#where-it-lands) |
| An HTTP 4xx from the Teams Workflows webhook | The Workflows trigger rejected the body — it takes a POST with an Adaptive Card attachment, and the old connector card shape no longer works. | [Where it lands](/overnight-qa/the-morning-report/#where-it-lands) |

## Atlassian

| What you see | What it means | Go to |
|---|---|---|
| A retirement or 404 response naming `https://mcp.atlassian.com/v1/sse` | You're pointed at the endpoint Atlassian retired on 30 June 2026; the current one is `/v2/mcp` over `--transport http`. | [You're on the retired endpoint](/troubleshooting/mcp-wont-connect/#youre-on-the-retired-endpoint) |
| `No such tool available: mcp__atlassian__getConfluencePage` | A v1 Confluence tool name in a prompt or an allowlist; v2 renamed them, and the old names resolve to nothing. | [The tool names changed in v2](/troubleshooting/mcp-wont-connect/#the-tool-names-changed-in-v2) |
| `401 Unauthorized` from a server that worked yesterday | The OAuth token expired; re-authenticate from a session where a browser can actually open. | [The OAuth flow never completes](/troubleshooting/mcp-wont-connect/#the-oauth-flow-never-completes) |
| `429 Too Many Requests` mid-pass | You've crossed your Atlassian plan's per-hour call limit — a 940-page sweep run flat out will do this. | [Discovery, rate limits, and pacing](/kt/confluence/#discovery-rate-limits-and-pacing) |

## Playwright

| What you see | What it means | Go to |
|---|---|---|
| `Target page, context or browser has been closed` | The agent called `browser_close` and then reached for another browser tool — a prompt problem, not a browser problem. | [Playwright: headless, origins, and a closed browser](/troubleshooting/mcp-wont-connect/#playwright-headless-origins-and-a-closed-browser) |
| A navigation that returns nothing while `--allowed-origins` is set | The origin isn't on the allowlist — most often the SSO host a login redirects through, which nobody remembers to list. | [Playwright: headless, origins, and a closed browser](/troubleshooting/mcp-wont-connect/#playwright-headless-origins-and-a-closed-browser) |
| The browser server starts and then hangs on a runner | No `--headless`, so it's waiting for a display the runner doesn't have. | [Playwright MCP in `.mcp.json`](/overnight-qa/exploratory-and-e2e/#playwright-mcp-in-mcpjson) |
| `npx: command not found` | No Node on the runner, so the `stdio` server can't launch at all. | [The server shows as failed at startup](/troubleshooting/mcp-wont-connect/#the-server-shows-as-failed-at-startup) |

## Test tools

| What you see | What it means | Go to |
|---|---|---|
| PIT: `No mutations found` | PIT ran and matched no classes — the target package doesn't match, or `test-compile` produced nothing to mutate. | [Mutation testing: the quality gate](/overnight-qa/characterization-tests/#mutation-testing-the-quality-gate) |
| `Unable to locate the surefire reports; no failures to group` | `target/surefire-reports/` doesn't exist because the build failed before any test ran — there is nothing to triage, and the agent is right to say so. | [Worked example: the empty report](/troubleshooting/overview/#worked-example-the-empty-report) |

If your string isn't here, the [escalation boundary](/troubleshooting/overview/#the-escalation-boundary) says whose it is and what to attach — and a string worth adding to this page is worth a one-line PR against it.
