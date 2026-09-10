---
title: "Clicking Through Staging: Exploratory and End-to-End Testing With a Browser Agent"
description: Give a browser agent a plain-language scenario list and a fenced staging origin, and get a screenshot-per-step report every morning — for the UI that has no automated tests at all.
keywords:
  - ui has no automated tests
  - playwright mcp claude code headless
  - browser agent end to end testing overnight
  - playwright allowed-origins staging only
  - browser_snapshot vs screenshot
  - storage state auth.json playwright login
  - playwright init-agents planner generator healer
  - agent retries until green flaky e2e
  - shared staging environment nightly test window
  - self-hosted runner internal staging url
sidebar:
  order: 7
---

You are here if: the back-office UI has no automated tests at all, the click-through before a release happens the day before (when it happens), and you have a staging environment on the internal network that other teams also use.

A browser agent is a tester who never gets bored and never learns. It will open the settlement batch screen at 02:07 every weekday, read every number on it, compare them to the API, screenshot each step, and report — with the same attention on day ninety as on day one. It will also, on day ninety, still not know that the "Close batch" button moved last week, because it doesn't remember day eighty-nine. Both halves of that sentence shape this page: **give it a script and a place to leave evidence, and never let it improvise its way past a failure.** This is level 3 of [the maturity ladder](/overnight-qa/overview/#the-maturity-ladder).

## What the night looks at

Two ways for the agent to see a page, and they're not interchangeable. **`browser_snapshot`** returns the page's accessibility tree — the same structure a screen reader gets: every heading, button, table row, and text node, with a reference id per element. It's text, it's cheap in tokens, and it's what the model *reads* and *acts on*: "click the button whose label is Close batch" is a lookup in the snapshot, not a guess at pixel coordinates. **`browser_take_screenshot`** writes an image to disk. The model can't reason about it cheaply, and it doesn't need to; the screenshot is for the human reading the report at 9:15, who wants to see what the agent saw. The rule in the prompt is the rule on this page: **snapshot before acting, screenshot after every step, and every PASS or FAIL cites both.**

A representative snapshot of yesterday's batch screen — the lines the agent will quote as evidence:

```console
- banner [ref=e2]:
  - text: Signed in as e2e-operator
- heading "Settlement batch 2026-09-10" [level=1] [ref=e14]
- table "Batch totals" [ref=e21]:
  - row "Total debits 1,204,318.55" [ref=e22]
  - row "Total credits 1,204,318.55" [ref=e23]
  - row "Item count 3,411" [ref=e24]
- button "Close batch" [ref=e31]
```

That `row "Item count 3,411"` line is a finding waiting to happen: the API says 3,412, and the report below quotes both.

The three questions, answered for this job: the **question** is "can the operator still do yesterday's three things in the UI, and do the numbers on screen agree with the API?"; the **evidence** is a screenshot per step plus the snapshot line that proves the outcome; the **blast radius** is one shared staging environment and whatever the test operator's account can do in it — which is why the origin fence and the test data get their own sections.

## Playwright MCP in `.mcp.json`

MCP is the standard way to give the model a connection to something outside the repo; here that something is a browser, and Playwright's MCP server exposes it as a set of tools ([MCP](/toolkit/mcp/) owns the mechanics). The project-scoped config is the one every playbook on this site shares, with the Playwright entry extended by two flags:

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
      "args": ["-y", "@playwright/mcp@latest", "--headless", "--browser", "chromium", "--isolated", "--output-dir", "pw-out",
               "--allowed-origins", "https://ledger-staging.internal", "--storage-state", "auth.json"]
    }
  }
}
```

`--allowed-origins https://ledger-staging.internal` is the fence: the browser refuses to load anything from any other origin, so a link to production, an external analytics domain, or a phishing-shaped redirect in test data all fail at the browser, not at the model's discretion. `--storage-state auth.json` seeds the isolated browser profile with a session the workflow created deterministically (next section), so the agent never sees a password. `--isolated` means the profile is in memory and gone when the server exits; `--output-dir pw-out` is where screenshots land. A developer who wants the same browser on a laptop runs `node e2e/login.mjs` first with the staging credentials in their environment — `auth.json` is in `.gitignore`, and it should never be anywhere else.

## Test data and auth

**The agent logs in as nobody.** It uses a dedicated staging user — `e2e-operator`, an account that exists only in staging, has the operator role and nothing more, and whose credentials live in the repo's GitHub secrets. Never a real person's session: a person's storage state carries their identity into every screenshot and every audit log, outlives their intent, and is exactly the credential InfoSec's policy says may not sit on a runner.

The login is a deterministic Playwright script, not an agent step, because a login that fails should fail *loudly and early* — before any budget is spent — and because typing a password is the one thing the model must never do:

```js
// e2e/login.mjs — deterministic login as the staging operator; writes auth.json for the agent's browser. Never a person's session.
import { chromium } from 'playwright';

const { E2E_USER, E2E_PASSWORD } = process.env;
if (!E2E_USER || !E2E_PASSWORD) { console.error('login: E2E_USER and E2E_PASSWORD must be set'); process.exit(1); }

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto('https://ledger-staging.internal/login');
await page.getByLabel('Username').fill(E2E_USER);
await page.getByLabel('Password').fill(E2E_PASSWORD);
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL('https://ledger-staging.internal/home');   // fail here, not three steps into the agent's run
await context.storageState({ path: 'auth.json' });                // cookies + local storage — the session, not the password
await browser.close();
console.log('login: auth.json written');
```

`e2e/package.json` lists `playwright` (and `@playwright/test`, for the promoted specs later). The workflow deletes `auth.json` in a step that runs even when the job is cancelled, and never uploads it as an artifact.

The data the scenarios read is yesterday's settlement batch, which exists in staging because the `catalog` team's 01:30 run and the staging batch job put it there. The one number the agent compares against comes from the API, fetched by the workflow *before* the agent starts and saved to `night/api-totals.json` — so the comparison is UI-versus-API, not UI-versus-what-the-model-remembers.

## The scenarios and the prompt

The scenarios are plain language in a file a product owner could edit. Three tonight; add a fourth only when the first three have been green for a week:

```markdown
# e2e/scenarios.md — plain language, one scenario per heading. The workflow has already logged in as e2e-operator.

## 1. Log in as the test operator
Open https://ledger-staging.internal/. You are already signed in (the workflow did that).
PASS if the page header names the signed-in operator. FAIL if you see a login form.

## 2. Yesterday's settlement batch totals match the API
From the home page open Settlement → Batches and select the batch whose date is
`batchDate` in night/api-totals.json. Read the on-screen Total debits, Total credits
and Item count. Compare each with `totalDebits`, `totalCredits` and `itemCount` in
night/api-totals.json. PASS if all three match exactly; FAIL if any differ — quote both values.

## 3. A batch with open items cannot be closed
Still on that batch (night/api-totals.json says `openItems`; if it is 0, mark BLOCKED and stop).
Click "Close batch". PASS if the UI refuses with a message that names open items and the
status still reads OPEN. FAIL if the batch closes, or the click is silently ignored.
Never confirm a dialog that offers to close it anyway: a refusal is PASS, an offer is FAIL, stop there.
```

The prompt turns the scenario list into a procedure with the evidence rule built in:

```text
# prompts/nightly-e2e.md — passed as the prompt by nightly-e2e.yml. The browser is fenced to https://ledger-staging.internal by the MCP server.
You are the night-shift tester for ledger-web on staging. Run each scenario in
e2e/scenarios.md, in order, exactly as written. You may read files and drive the
browser through the tools you have been given; nothing else.

For every scenario:
1. Before acting, take a browser_snapshot and find the element you need in it.
   Act on what the snapshot shows, never on what you expect to be there.
2. After every step, take a browser_take_screenshot into pw-out/, named
   <scenario>-<step>-<what>.png (for example 2-3-totals.png).
3. Report PASS or FAIL per scenario. Evidence, for either, is the screenshot
   filename AND the snapshot line — quoted verbatim — that shows the outcome.
   Where a scenario compares against night/api-totals.json, quote both values.
4. If a step cannot be completed after ONE honest attempt, mark the scenario
   BLOCKED with the snapshot line that shows why. Never retry until green; never
   work around a failure; never change test data to make a step possible.
5. If the browser ever lands outside https://ledger-staging.internal, stop all
   scenarios and report the URL under "Needs a human".
6. Do not judge whether a failure matters. Do not propose fixes.

Output ONLY the following markdown, nothing before or after it:

# E2E — ledger-web staging — <today's date>
**Verdict:** GREEN | AMBER | RED — <passed> of <total> scenarios passed
(GREEN = all PASS · AMBER = any BLOCKED, no FAIL · RED = any FAIL)
## Scenarios
### <n>. <scenario title> — PASS | FAIL | BLOCKED
- evidence: `<snapshot line>` — pw-out/<screenshot>
- on FAIL: expected <value and where it came from>, saw `<snapshot line>`
- cause: <one sentence, only if visible in the browser> (verified | inference)
## Needs a human
- [ ] <one line per FAIL or BLOCKED, with the scenario number>
## What ran
- scenarios: <total> · steps: <n> · screenshots: <n>
```

Rule 4 is the one that separates a tester from a liability. A model that can retry will eventually get a green by reloading, waiting, clicking twice — and the report will say PASS about a screen that fails for a human one time in three. "One honest attempt, then BLOCKED with the line that shows why" is the whole flake policy for the agent; the retries belong to deterministic specs, below.

## The workflow

`nightly-e2e.yml` lives in `ledger-web` and runs on the self-hosted runner because `https://ledger-staging.internal` isn't reachable from GitHub-hosted machines. The label is a platform ask ([Working Within Policy](/start/working-within-policy/) has the request written out); everything else is yours.

```yaml
# .github/workflows/nightly-e2e.yml — seat: team — needs the runner label (platform), the staging operator's credentials and a read-only staging API token in secrets, and the CI credential
name: Nightly E2E (browser agent on staging)

on:
  schedule:
    - cron: "07 6 * * 1-5"   # 02:07 America/New_York on weekdays: after the catalog team's 01:30 window on shared staging,
                             # with a hard stop (timeout-minutes) before the 03:00 settlement batch.
  workflow_dispatch:
    inputs:
      budget_usd:
        description: Cost ceiling for the agent step (USD)
        default: "6"
        type: string

permissions:
  contents: read
  issues: write              # at most ONE issue per night, filed by the workflow (never the agent) when a scenario FAILs

concurrency:
  group: nightly-e2e
  cancel-in-progress: false

jobs:
  e2e:
    runs-on: [self-hosted, linux, payments]   # the only way to reach the internal staging URL
    timeout-minutes: 40      # 02:07 + 40 = 02:47. Whatever the agent is doing at 02:47, it stops before the batch.
    env:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}   # or CLAUDE_CODE_USE_BEDROCK=1 + AWS_REGION via OIDC
      NIGHT_BUDGET_USD: ${{ inputs.budget_usd || '6' }}
      NIGHT_MAX_TURNS: "40"  # three scenarios × (snapshot, act, screenshot) × a few steps fits in 40; 80 is a loop
      GH_TOKEN: ${{ github.token }}
      # The staging credentials are deliberately NOT here. A job-level env: is inherited by every
      # step, including the agent's — and a Bash tool call can read the environment. They live on
      # the two deterministic steps that need them, and nowhere else.
    steps:
      - uses: actions/checkout@v7
        with:
          clean: true        # a self-hosted runner keeps yesterday's workspace; the night rebuilds its world

      - uses: actions/setup-node@v7
        with:
          node-version: "22"

      - name: Deterministic phase — Playwright, a browser, a fresh login as the test operator
        env:
          E2E_USER: ${{ secrets.E2E_STAGING_USER }}          # a dedicated staging account — never a person's
          E2E_PASSWORD: ${{ secrets.E2E_STAGING_PASSWORD }}  # scoped to this step: the agent's step never sees it
        run: |
          cd e2e && npm ci && npx playwright install chromium && cd ..   # the browser is cached on the runner after night one
          node e2e/login.mjs                                             # writes auth.json; fails the job if login fails

      - name: Deterministic phase — the API's answer for yesterday's batch, saved for the agent to compare against
        env:
          LEDGER_API_TOKEN: ${{ secrets.E2E_STAGING_API_TOKEN }}  # read-only, staging-only, and only in this step
        run: |
          mkdir -p night pw-out
          curl -sSf -H "Authorization: Bearer $LEDGER_API_TOKEN" \
            "https://ledger-staging.internal/api/settlement/batches/$(date -u -d yesterday +%F)/totals" > night/api-totals.json
          jq '{batchDate, totalDebits, totalCredits, itemCount, openItems}' night/api-totals.json   # visible in the log for the morning

      - name: Install Claude Code
        run: |
          curl -fsSL https://claude.ai/install.sh | bash -s stable
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"

      - name: Agent phase — run the scenarios
        id: agent
        continue-on-error: true            # the report and cleanup steps must run; the last step re-raises the failure
        run: |
          CODE=0
          scripts/run-claude.sh prompts/nightly-e2e.md night.json \
            --mcp-config .mcp.json --strict-mcp-config \
            --permission-mode dontAsk \
            --allowedTools "Read,Glob,mcp__playwright__browser_navigate,mcp__playwright__browser_snapshot,mcp__playwright__browser_click,mcp__playwright__browser_type,mcp__playwright__browser_fill_form,mcp__playwright__browser_take_screenshot,mcp__playwright__browser_wait_for" \
            --model sonnet || CODE=$?
          # --strict-mcp-config: only the servers in .mcp.json exist tonight, nothing from the runner's user config.
          # The allowlist names seven browser tools: no browser_evaluate (arbitrary JS), no browser_file_upload, no tabs.
          echo "exit=$CODE" >> "$GITHUB_OUTPUT"
          exit $CODE

      - name: Remove the session — even if the job was cancelled
        if: ${{ always() }}                # the one step where always() is right: a credential must not outlive the run
        run: rm -f auth.json

      - name: Publish — job summary, artifact, and ONE issue if anything FAILed
        if: ${{ !cancelled() }}
        run: |
          jq -r '.result // "# E2E — ledger-web staging\n**Verdict:** RED — the agent produced no result (see the run-claude line above)"' night.json > report.md
          cat report.md >> "$GITHUB_STEP_SUMMARY"
          if grep -q ' — FAIL$' report.md; then
            TITLE="E2E FAIL — ledger-web staging — $(date -u +%F)"
            EXISTING=$(gh issue list --label nightly --state open --search "$TITLE in:title" --json number -q '.[0].number')
            if [ -z "$EXISTING" ]; then gh issue create --title "$TITLE" --body-file report.md --label nightly --label needs-human; fi
          fi

      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: nightly-e2e
          path: |
            report.md
            night.json
            night/
            pw-out/
          retention-days: 30               # auth.json is deliberately not listed

      - name: Build the Slack payload
        if: ${{ !cancelled() }}
        run: |
          # The headline is MODEL OUTPUT: read it from the file with jq --arg, never through ${{ }}.
          RUN_URL="${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
          jq -n --arg h "$(sed -n '2p' report.md)" --arg u "$RUN_URL" \
            '{text: ("E2E · ledger-web staging · " + $h),
              blocks: [
                {type: "section", text: {type: "mrkdwn", text: ("*E2E · ledger-web staging*\n" + $h)}},
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

The tool allowlist is the second fence, and it's deliberately short. Seven browser tools: navigate, snapshot, click, type, fill a form, screenshot, wait. Not in the list: `browser_evaluate` (runs arbitrary JavaScript in the page — an agent with that can do anything the operator's session can), `browser_file_upload`, `browser_tabs`, `browser_console_messages`. Add one back only when a scenario needs it and the page says why. The API path in the totals step is the shape, not the gospel — your facade's route will differ; the point is that the workflow, not the agent, fetches the number to compare against.

### Reading a night's output

The artifact has three things you'll open: `report.md`, `pw-out/`, and `night/api-totals.json`. A representative report, the morning the item count disagreed:

```markdown
# E2E — ledger-web staging — 2026-09-11
**Verdict:** RED — 2 of 3 scenarios passed
## Scenarios
### 1. Log in as the test operator — PASS
- evidence: `text: Signed in as e2e-operator` — pw-out/1-1-home.png
### 2. Yesterday's settlement batch totals match the API — FAIL
- evidence: `row "Item count 3,411"` — pw-out/2-3-totals.png
- on FAIL: expected 3412 (`"itemCount": 3412` in night/api-totals.json), saw `row "Item count 3,411"`
- debits and credits match: `row "Total debits 1,204,318.55"` = `"totalDebits": "1204318.55"`
- cause: not determinable from the browser (inference: the list view may exclude one item by status)
### 3. A batch with open items cannot be closed — PASS
- evidence: `dialog "Cannot close batch: 12 open items"` — pw-out/3-2-refused.png; status `text: OPEN` — pw-out/3-3-status.png
## Needs a human
- [ ] Scenario 2: item count differs by one between the batch view and ledger-api for batch 2026-09-10
## What ran
- scenarios: 3 · steps: 11 · screenshots: 11
```

Read it against the contract in [The Morning Report](/overnight-qa/the-morning-report/): the verdict line is the Slack headline; every scenario cites a snapshot line *and* a file; the cause on scenario 2 is labelled *inference* because the browser can't show why two systems count differently. Open `pw-out/2-3-totals.png` to see exactly what the operator would see — that's the whole reason screenshots exist. The listing tells you the evidence is complete before you read a word:

```bash
# seat: team
gh run download --name nightly-e2e -D last-night/ && ls last-night/pw-out/
```

```console
1-1-home.png  2-1-batches.png  2-2-batch-2026-09-10.png  2-3-totals.png  3-1-close-clicked.png  3-2-refused.png  3-3-status.png
```

Eleven steps, seven screenshots — the prompt says one per step, so four are missing. That's a small finding about the night, not the app; if it persists, tighten the prompt's step definition. The verdict still stands on the evidence that exists.

## Flake handling

Two different mechanisms for two different things. **The agent never retries until green** — that's prompt rule 4, and it's a rule because a model that reloads until the number appears will report PASS on a page that's broken for one user in three, and the report becomes a lie with screenshots. A scenario that doesn't complete on one honest attempt is BLOCKED with the line that shows why, and a human decides whether that's the app or the night.

**Promoted specs get `retries: 2`.** Once a scenario has been green for a week it becomes a `.spec.ts` (next section), and deterministic Playwright tests may retry, because Playwright's documented behaviour is to report a failed-then-passed run as *flaky* rather than hiding it. Retries are off by default; `retries: 2` in `playwright.config.ts` is this playbook's choice, low enough that a genuinely broken page still fails the run. A flaky spec is a finding too (a race in the page, a slow staging night); it lands in the report with the `nightly:flaky` label and gets fixed or deleted within the week, never left to retry forever.

The trade: agent exploration surfaces the flake as BLOCKED and costs a scenario that night; a spec with retries survives the flake and costs a label. Use each where it belongs.

## The alternative: Playwright's test agents

Playwright ships its own agent loop. `npx playwright init-agents --loop=claude` writes three subagent definitions into `.claude/agents/` — a planner, a generator, and a healer — plus a `specs/` directory for plans and `tests/seed.spec.ts` as the starting point. The planner explores the app and writes a test plan in markdown; the generator turns a plan into `tests/**/*.spec.ts`; the healer proposes fixes when a generated spec starts failing ([Playwright test agents](https://playwright.dev/docs/test-agents)). What comes out is ordinary Playwright — it runs in CI on every commit with no model, no budget, and no MCP server.

```bash
# seat: team
cd e2e && npx playwright init-agents --loop=claude && ls .claude/agents/ specs/ tests/
```

```console
.claude/agents/:
playwright-test-generator.md  playwright-test-healer.md  playwright-test-planner.md

specs/:

tests/:
seed.spec.ts
```

The names may differ by version; the shape — three agents, a plans directory, a seed spec — is the point. So which do you run at night?

| | Agent exploration (this page's workflow) | Generated specs (test agents) |
|---|---|---|
| **Finds new things** | Yes — it reads what's on screen *tonight* | No — it asserts what was true when generated |
| **Cost per night** | Tokens, every night | None after generation |
| **Deterministic** | No — same scenario, a different path through it | Yes, and `retries: 2` handles the residue |
| **Evidence** | Screenshots + quoted snapshot lines | Playwright's own report and trace |
| **When the UI changes** | Reports BLOCKED; a human reads why | Fails; the healer proposes a fix a human reviews |
| **Blast radius** | Whatever the allowlist and origin fence permit | Whatever the spec does — read it |

**The site's rule: explore with the agent, promote what's stable into `.spec.ts` that runs without an agent.** Scenario 1 has been green since the first night and will never find anything new — that's a spec by next week, running on every PR to `ledger-web`. Scenario 2 compares numbers that change daily and reads a screen that changes with the data; keep it agent-driven, because the value is in a tester who reads what's actually there. Scenario 3 is the interesting middle: promote the *refusal* path as a spec, keep the agent's version until you trust the spec. Over a quarter the agent's list stays at three or four scenarios and the spec suite grows; the night's cost stays flat while coverage climbs. The agent is how you find the tests; the specs are how you keep them.

:::tip[Good citizen]
Staging is shared. Three rules, none negotiable: **schedule after the `catalog` team's 01:30 window** — 02:07 is chosen to be clear of it, and if their run overruns, your BLOCKED scenarios say so with a snapshot of *their* half-loaded data. **Finish before 03:00** — `timeout-minutes: 40` is the hard stop, and the agent's turn cap is tuned so a normal night ends by 02:25; a browser agent still clicking through settlement screens when the batch starts is an incident with your name on it. **Never test anything with side effects outside staging** — no scenario sends an email, publishes to `LEDGER.SETTLE.IN`, triggers the FX feed, or touches anything with "payment" in its name, because staging's outbound integrations are the parts nobody is sure are disconnected. Scenario 3 has teeth precisely because it *could* close a batch if the UI is broken; that's acceptable only on disposable staging data, and only with the "never confirm" line in the scenario.
:::

## What not to test

Anything whose side effects leave staging: outbound email, MQ publishes, file drops, the FX rates feed, anything that calls a partner sandbox that bills per call. Anything that needs a real person's identity. Anything on production, ever — there is no page on this site for that and there won't be. And anything the scenario can't state a PASS condition for in one sentence: "explore the settlement screens and report anything odd" produces a paragraph of odd, none of it evidence, and burns the budget on screens that were fine. If you want exploration, run the planner from the previous section by hand, read its plan, and turn the two scenarios worth having into tonight's list.

## Where next

- **Next in the journey:** [The Night Reviews the Day](/overnight-qa/review-and-security/) — the day's PRs get a deep review comment, and scans get an impact paragraph instead of a CVE list.
- **The lateral jump:** [Blast Radius](/overnight-qa/blast-radius/) — every fence on this page (`--allowed-origins`, the tool allowlist, `--strict-mcp-config`, the runner) in the table InfoSec will ask for.
