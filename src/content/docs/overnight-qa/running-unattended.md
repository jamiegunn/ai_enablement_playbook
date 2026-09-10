---
title: "Running Claude Unattended: Permissions, Budgets, and Exit Codes"
description: Bound a headless Claude Code run with the three flags that stand in for the human at the keyboard, read the JSON it returns field by field, and turn every exit code into a decision your workflow makes without you.
keywords:
  - claude -p output format json fields explained
  - claude code exit code 2 budget
  - --max-budget-usd vs --max-turns why both
  - permission mode for ci dontask allowedtools
  - permission_denials empty or not empty
  - claude code github action vs raw cli vs agent sdk
  - claude agent sdk python max_budget_usd permission_mode
  - --json-schema structured_output jq
  - run claude code headless in github actions
  - when to use --bare
sidebar:
  order: 5
---

You are here if: you've run `claude` on your laptop and are about to run `claude -p` on a runner where nobody can answer a prompt, and you want to know which flags stand in for you — or a night has already come back with exit code 2 and you want to know what that means before standup.

## Headless mode is the same loop with nobody at the keyboard

Interactively, you are part of the loop. The model proposes a tool call, Claude Code checks its rules, and when the rules don't settle it, a prompt appears and you decide. You also decide, without noticing, when the session has gone on long enough, when it's spending too much, and whether the answer is the one you wanted. `claude -p` runs the identical loop — same context assembly, same tool calls, same permission check — and exits when the model stops. Nothing changes except that every one of those decisions has to be made before the first turn, because at 02:17 there is nobody to make them.

There are three such decisions, and each has a flag: **what may it do, how long may it go on, how much may it spend.** The flags themselves are reference material — [Headless Mode and the Agent SDK](/toolkit/headless-and-sdk/) lists every one as of September 2026. This page is about which to use, for which job, and why, and how to read what comes back.

| Bound | The flag | What it catches | What it can't catch |
|---|---|---|---|
| What it may do | `--permission-mode` plus an allowlist, deny rules, and a hook | A tool the job was never meant to have — `rm`, `git push`, `WebFetch`, a write outside the fence | A harmful use of a tool it *was* given (an `Edit` inside the fence that guts a test) — that's proof's job |
| How long | `--max-turns` and the workflow's `timeout-minutes` | A loop; a hung build; a job that overruns into the batch window | A short run that produced nothing useful |
| How much | `--max-budget-usd` | An expensive run | A *cheap* loop that runs for hundreds of turns under the ceiling |

Three bounds because each has a hole the others cover.

## Bound one: what it may do

### Read-only jobs: `dontAsk` plus an allowlist

In `-p` there is no screen, so a tool that hasn't been pre-approved isn't prompted for; it is refused, automatically, and the refusal is written into the result's `permission_denials`. The locked-down setting the docs themselves recommend for CI — and the one every read-only job on this site uses — makes that refusal the default for everything and adds an explicit list of what's allowed. Unrolled from the wrapper, the triage job's agent line is:

```bash
# seat: team — needs the CI credential (this is the agent line of nightly-triage.yml, unrolled from scripts/run-claude.sh)
claude -p "$(cat prompts/nightly-triage.md)" \
  --bare \
  --permission-mode dontAsk \
  --allowedTools "Read,Grep,Glob" \
  --max-turns 25 \
  --max-budget-usd 3 \
  --model sonnet \
  --output-format json > night.json
```

Three tools. No `Bash` at all — the deterministic phase already ran the suite, and the prompt says that an agent that wants to run a command should write the need into "Needs a human" instead. `plan` mode is also read-only and you'll see it recommended; the difference is that `plan` is the interactive-exploration mode (reads and exploratory shell, no edits), while `dontAsk` with a list is deny-unless-allowed, and the list is something a reviewer reads in the PR. **The trade:** `dontAsk` refuses things you forgot to list — a triage that wanted `Bash(cat *)` gets a denial, not a prompt — and that is the point, because every denial lands in the JSON. To state the "nobody will be asked" contract on the command line as well, `--permission-prompts none` (as of September 2026, v2.1.259 and later) does that and removes the `AskUserQuestion` tool with it.

### Writing jobs: `acceptEdits`, the night settings, and the hook

The characterization job has to write test files and run Maven, so it can't be read-only. It gets edits without prompting, a settings file that is only ever used for the night, and a hook that limits where the edits may land:

```bash
# seat: team — needs the CI credential (the agent line of nightly-characterize.yml, unrolled)
claude -p "/characterize" \
  --settings .claude/settings.night.json \
  --permission-mode acceptEdits \
  --max-turns 60 \
  --max-budget-usd 8 \
  --model sonnet \
  --output-format json > night.json
```

No `--bare`, because this job wants the repo's `CLAUDE.md`, the `characterize` skill, and the hooks — more on that below. No `--allowedTools` on the command line either; the allowlist is in the file, where the deny list is:

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

Read it as three fences. `allow` is the whole tool list: read and search, edit and write, the Maven wrapper, two read-only `git` subcommands — no `git push`, no `gh`, no network tool. `deny` refuses every `git` write, `rm`, the web tools, and the secret files, whatever the prompt or the allow list says. The `hooks` block runs `write-scope.sh` before every `Edit` or `Write`; that script refuses any path outside `src/test/` with a reason that lands in `permission_denials`. [Blast Radius](/overnight-qa/blast-radius/) quotes it in full and reads its JSON; [Hooks](/toolkit/hooks/) owns the mechanism. The consequence that matters most: **the agent cannot push.** The workflow — not the agent — runs `git add src/test && git commit && git push` to the night's branch and opens the draft PR, so the power to change a remote never sits in the same process as the model. Passed with `--settings`, this file sits above the repo's Day-1 `.claude/settings.json` for the keys it sets and below the platform's managed settings, so a fleet-wide deny still applies at 02:17; the precedence is on [the Toolkit page](/toolkit/headless-and-sdk/).

### Never `bypassPermissions` on a runner

It exists, and the first blog post you find about CI will use it. Don't. It removes the only structural layer: the prompt becomes the fence, and the [Field Note](/blog/the-night-the-agent-fixed-the-test-by-deleting-it/) is what a prompt is worth. It destroys the evidence: with nothing to deny, `permission_denials` is empty by construction, and "refused nothing" stops meaning anything. And it turns every file the agent reads into an attack surface: a test fixture, a dependency's README, or a PR description that contains instructions is now instructions, executed with your CI credential on a runner with the repo checked out. If the platform team wants the mode gone rather than merely unused, the settings key `disableBypassPermissionsMode` is the one to point them at — it belongs in their managed settings, not your repo:

```bash
# seat: platform — shown so you can read THEIR config, you won't run it
jq '.permissions.disableBypassPermissionsMode' /etc/claude-code/managed-settings.json
```

## Bound two: how long — turns and minutes

A **turn** is one iteration of the loop: the model speaks, a tool runs (or it stops). `--max-turns 25` on the triage job is not a guess: fourteen failures need a handful of reads per root cause, and a run that hasn't converged in twenty-five turns is looping — grepping with slightly different patterns, re-reading the same report — not working. When the cap fires the run ends with a partial `result` and the JSON written, which is the outcome you want from a loop.

`timeout-minutes: 45` on the job is a different bound with a different job. The turn cap counts model turns and knows nothing about wall clock: one turn can run `./mvnw test` for twelve minutes, an `npx` download can hang, an MCP server can fail to start. The timeout is the wall for everything the turn cap can't see — and a blunt one, because when it fires GitHub cancels the *job*, and the steps after the agent (publish, artifact, Slack) don't run either, `if: ${{ !cancelled() }}` or not. So: **size the turn cap and the budget to fire first, and treat the timeout as the wall you never expect to hit.** [Anatomy of a Night Shift](/overnight-qa/anatomy-of-a-night/) has the timing table that adds up to thirty-five minutes of a forty-five-minute timeout and finishes before the 03:00 batch.

## Bound three: how much — the budget, and why it isn't enough alone

`--max-budget-usd 3` is the cost ceiling. When the run hits it, `claude` exits with code 2 and the JSON still carries `result` — possibly partial — and `total_cost_usd`, so a budget-stopped night still publishes what it had. Three dollars for triage, eight for characterization, six for the browser job, five per PR for review: the defaults are tabled in [Cost and Governance](/overnight-qa/cost-and-governance/), and the triage workflow raises one for a rerun with a `workflow_dispatch` input rather than an edit.

Here is why a budget alone is not a bound. Prompt caching is on by default, so the repeated prefix of each turn is billed at a fraction of the input rate, and a loop that fails the same cheap tool call every turn — a `Grep` that matches nothing, tried again with one character changed — costs cents per turn. Under a three-dollar ceiling that is hundreds of turns and forty minutes, so the *timeout* fires first: no report, no Slack message, a red run with no JSON. The turn cap ends the same loop at twenty-five with the JSON written. The budget catches the expensive run the turn cap can't (a few turns, each reading enormous files); the turn cap catches the cheap loop the budget can't; the timeout catches the hang neither can see.

:::tip[Good citizen]
Both caps are baked into `scripts/run-claude.sh` with defaults, so a job can't forget them; a job that needs more says so by setting `NIGHT_BUDGET_USD` and `NIGHT_MAX_TURNS` in the workflow, where a reviewer sees the number and the reason next to it. A budget raised in a hurry at 08:10 and never lowered is how "the night burned $400 last Tuesday" starts.
:::

## Reading the JSON, field by field

`--output-format json` turns the run into one object on stdout. The shape as of September 2026:

```json
{
  "result": "string (final output)",
  "session_id": "abc123",
  "total_cost_usd": 0.55,
  "num_turns": 5,
  "usage": {
    "input_tokens": 1200,
    "output_tokens": 5300,
    "cache_creation_input_tokens": 50000,
    "cache_read_input_tokens": 940000
  },
  "structured_output": {},
  "error": null,
  "duration_ms": 380000,
  "is_error": false,
  "permission_denials": []
}
```

- **`result`** — the model's final text. For triage that is the morning report itself; `jq -r .result > report.md` is the whole publish step. Treat it as untrusted input to your own scripts: it goes through `jq --arg` into the Slack payload, never through `${{ }}` expansion on a runner.
- **`session_id`** — what `--resume` takes. Useful on a laptop, where you can reopen the session and ask what it was thinking; on an ephemeral runner the session is gone with the VM, which is why this JSON is the audit record and is uploaded as an artifact every night.
- **`total_cost_usd`** — the number the ledger sums. Don't estimate what this measures.
- **`num_turns`** — how many iterations the loop ran. Equal to the cap means the run was *stopped*, not finished; read `result` as partial.
- **`usage`** — four token counts, read right to left as [How Agentic Coding Actually Works](/start/how-agentic-coding-works/) does: `cache_read_input_tokens` dominates because the same prefix is re-read every turn; `output_tokens` is what the model wrote; `input_tokens` is the genuinely new material.
- **`structured_output`** — the validated object when you passed `--json-schema`; empty otherwise.
- **`error`** — `null` on a clean run; non-null when the run itself failed, and the first thing to read after `is_error: true`.
- **`duration_ms`** — wall clock, to compare against `timeout-minutes` and the timing table.
- **`is_error`** — the one-bit summary. `true` means don't publish `result` as a report; the triage workflow substitutes a RED headline saying the agent produced no result.
- **`permission_denials`** — every tool the model asked for and didn't get. Zero on a good night. More than zero is either the fence working or the allowlist too tight, and the reason string tells you which; the entry format isn't documented, so read it with `jq '.permission_denials'` and don't hardcode field names.

The first night, read the five that matter in one line — the wrapper's summary line, and the same `jq` the [policy page](/start/working-within-policy/#audit-and-retention) uses for the audit record:

```bash
# seat: team
jq '{is_error, num_turns, total_cost_usd, duration_ms, denials: (.permission_denials | length)}' night.json
```

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

Fourteen turns of a twenty-five cap, well under the ceiling, three and a half minutes, nothing refused: a night that finished on its own terms. `num_turns: 25` with the same cost would be a loop; `denials: 3` on a read-only job would be a prompt asking for tools it wasn't given.

## Exit codes, and what to do about each

The process exit code is the first thing your workflow sees, before any JSON. The wrapper propagates it unchanged so the workflow can decide:

| Code | Meaning | What to do |
|---|---|---|
| `0` | Success | Publish `result`; add `total_cost_usd` to the ledger; the normal night |
| `1` | Failure — bad flags, a run error | Retry once (the installer, a network blip). If it fails again, the run is red and the *step log* is the evidence, because the JSON may not exist |
| `2` | Partial — the cost ceiling was hit, or authentication failed before the first turn | Never retry. Publish the partial `result` labelled as partial. `total_cost_usd` says which: near the budget means the ceiling fired — read *why* before raising it; near zero means auth — the credential path is the platform's, see [Working Within Policy](/start/working-within-policy/) |
| `130` | SIGINT | A person cancelled the run. Nothing to retry; ask who and why |
| `143` | SIGTERM | The runner terminated it — usually `timeout-minutes`. You'll rarely see this code in a step, because when the timeout cancels the job the later steps don't run either. Your bounds are the wrong size: turns and budget must fire first |

The re-raise step at the end of the triage workflow exists because the agent step runs with `continue-on-error: true` so the report can still publish; without it, a code-2 night would show green in the Actions list, and nobody would know the budget fired until the ledger did.

## `--bare`, and when not to use it

`--bare` skips auto-discovery — `CLAUDE.md`, hooks, skills — for a fast CI start. The triage job uses it because the prompt is self-contained and nothing in the repo's standing orders should shape a read-only report; `payments-api`'s `CLAUDE.md` says how to run the build, and the triage agent must not run the build. The characterization job must *not* use it: it wants `CLAUDE.md`'s "what not to do" section, the `characterize` skill it invokes by name, and the two hooks, and `--bare` discards all three. One subtlety from the docs as of September 2026: `--settings` still applies under `--bare`, but whether hooks declared in a settings file fire in a `-p` session isn't stated explicitly — which is the reason for the rule below to prove every fence with a deliberate violation, and the reason the writing job doesn't combine `--bare` with anything it relies on a hook for.

## `--json-schema`: the machine-readable report

The markdown report is for people. The machine-readable copy — for the trend line, the "what's new" diff, the Confluence table — comes from `--json-schema`, which validates the model's output against a schema you pass and puts the object at `.structured_output`. It's an inline JSON string only (no `@file`), and it requires `-p` and `--output-format json`; in a workflow you pass the file's contents:

```bash
# seat: team — needs the CI credential
scripts/run-claude.sh prompts/nightly-triage.md night.json \
  --bare --permission-mode dontAsk --allowedTools "Read,Grep,Glob" --model sonnet \
  --json-schema "$(cat prompts/report.schema.json)"
jq '.structured_output' night.json
```

The schema is the report contract made mechanical — a verdict from three values, groups that *must* carry `evidence` and a `confidence` of `verified` or `inference`, and a `needs_human` list with an owner:

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

```console
$ jq '.structured_output' night.json
{
  "verdict": "RED",
  "total": 412,
  "failed": 14,
  "groups": [
    {
      "cause": "SettlementClock reads the JVM default zone; the tests assume America/New_York",
      "tests": ["SettlementCutoffTest.closesAtMidnightLocal", "SettlementCutoffTest.rejectsAfterCutoff"],
      "evidence": "src/main/java/com/payments/api/settlement/SettlementClock.java:41",
      "status": "UNCHANGED",
      "confidence": "verified"
    },
    {
      "cause": "FxRateClientTest expects a 4-decimal rate; the fixture now carries 6",
      "tests": ["FxRateClientTest.parsesRate"],
      "evidence": "src/test/resources/fx-rates-fixture.json:12",
      "status": "NEW",
      "confidence": "inference"
    }
  ],
  "new": ["FxRateClientTest fixture precision"],
  "resolved": [],
  "needs_human": [{ "item": "Decide whether the 6-decimal fixture is the new contract", "owner": "@marcus" }]
}
```

`"status": "NEW"` on the second group is the line a human reads first, and `"confidence": "inference"` is the model saying it didn't open the code that proves it — both are fields a reviewer can filter on rather than prose they have to parse. [The Morning Report](/overnight-qa/the-morning-report/) decides how the markdown and the object relate; here, know where the object lands.

## Getting the prompt in: four ways and the trade

| How | What the model sees | What you gain | What you pay | Use it for |
|---|---|---|---|---|
| `-p "$(cat prompts/nightly-triage.md)"` | The file is the user turn | A versioned prompt reviewed in PRs; the wrapper's convention | It's a shell argument — keep data out of it | The task, for every job on this site |
| `cat target/surefire-reports/*.txt \| claude -p "Group these failures by cause"` (stdin, up to 10 MB) | The piped data is the user turn, then your prompt | One command; the model sees all the data, no searching | Every byte is tokens on every turn and the agent can't "read what it needs" — a big dump is a budget hit | Small inputs you want read whole: a 200-line diff |
| `--system-prompt-file prompts/night-system.md` | Your file *replaces* the system prompt | Total control of the persona | You own everything the default system prompt was doing for you | Rarely; the SDK's `system_prompt` is the same knob |
| `--append-system-prompt "Every claim cites path:line or is marked (inference)."` | Added to the default system prompt, above every user turn | Standing rules for a job with no `CLAUDE.md`; works with `--bare` | A flag, not a file — long text gets ugly in a workflow | The evidence rule and "unknown is an acceptable answer" on read-only jobs |

The site's rule: the *task* is a file passed with `-p`; *standing rules* live in `CLAUDE.md` when the job loads it and in `--append-system-prompt` when it runs `--bare`; *data* stays on disk, where the agent reads what it needs, and goes on stdin only when it's small and every line of it should be seen.

## MCP in headless: fewer tools, smaller blast radius

An MCP server is a connection to something outside the repo, and each one adds tools. In headless mode you name the servers for the run with `--mcp-config` and add `--strict-mcp-config` so nothing else configured on the machine — a laptop's user-scope servers, another project's file — loads with it; individual tools are then allowlisted by name, `mcp__playwright__browser_snapshot` style. [MCP](/toolkit/mcp/) owns the config and the naming. The one server the night uses is Playwright, for the browser job; [Exploratory & E2E](/overnight-qa/exploratory-and-e2e/) shows the entry with its origin fence.

The trade you'll be tempted by is a GitHub MCP server so the agent can file its own issues. **Every tool is blast radius**: an issue-creating tool in the agent's hands means the agent decides how many issues, with what content, under which token. The site files issues in a separate workflow step — `gh issue create --body-file` with the model's output as *data*, a cap on the count, and the step's own least-privilege token — so the agent never holds a GitHub credential at all. [Review & Security](/overnight-qa/review-and-security/) has the step and the de-duplication.

## The Action, the CLI, or the SDK

Three ways to run the same loop unattended, as of September 2026:

| | GitHub Action (`anthropics/claude-code-action@v1`) | Raw CLI (`claude -p` via `scripts/run-claude.sh`) | Agent SDK (`claude-agent-sdk`) |
|---|---|---|---|
| What it is | A workflow step that installs Claude Code and runs your `prompt`; omit `prompt` and it answers `@claude` mentions | The same binary as your laptop, on any runner you install it on | A Python or TypeScript library running the loop inside your process |
| Where the bounds go | `claude_args` passes any CLI flag; `settings` takes the file | On the command line, in the PR diff | `ClaudeAgentOptions`: `max_turns`, `max_budget_usd`, `permission_mode`, `allowed_tools`, `hooks` |
| Credential | `anthropic_api_key` or `claude_code_oauth_token`; `use_bedrock`, `use_vertex` | The environment: the key, or the provider switch | The environment, same as the CLI |
| What you get back | PR comments, review comments, issue replies — the GitHub plumbing is the product | `night.json` on disk: result, cost, turns, denials, plus the exit code | Messages as they stream; a `ResultMessage` with `total_cost_usd`, `num_turns`, `result`, `subtype` |
| What you gain | PR and issue integration for free; `@claude`; runs on `schedule:` too | Full control; any runner, self-hosted included; one wrapper for every job | Orchestration: several bounded runs in one process, custom tools, hooks as functions |
| What you pay | Bounds ride inside `claude_args` and are easier to forget; the evidence is the action's output, not a file you named | You install the CLI (two lines) and own the `gh` plumbing | A program to maintain and review; bounds in code get read less carefully than a workflow |

The site's rule: **the Action for PR-time jobs, the raw CLI for the night, the SDK when a night needs orchestration or a custom tool.** The doc-update on `pull_request`, the security review, and anything a person triggers with `@claude` use the Action, because the PR plumbing is what you're paying for ([The Claude Code GitHub Action](/toolkit/github-action/)). Every scheduled job uses the CLI through the wrapper, because a nightly job's value is the evidence file and the exit code, and one wrapper covers five workflows. You graduate to the SDK when a single night has to fan out — one bounded run per repo across the twenty-three, each with its own budget, results merged — or needs a tool nothing ships. The minimal runner, the triage job's bounds in Python:

```python
# scripts/night_runner.py — the Agent SDK form of run-claude.sh: one bounded, unattended job.
# Usage: python scripts/night_runner.py prompts/nightly-triage.md night.json
import asyncio, json, sys
from pathlib import Path
from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage, ResultMessage

async def main(prompt_file: str, out: str) -> None:
    async for message in query(
        prompt=Path(prompt_file).read_text(),
        options=ClaudeAgentOptions(
            cwd=".",
            model="sonnet",
            permission_mode="dontAsk",              # deny anything not listed — no prompt is possible here either
            allowed_tools=["Read", "Grep", "Glob"],
            max_turns=25,                           # a triage that hasn't converged in 25 turns is looping
            max_budget_usd=3.0,                     # the cost ceiling; a cheap loop is still a loop, hence max_turns
        ),
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if hasattr(block, "text"):
                    print(block.text)
        elif isinstance(message, ResultMessage):
            Path(out).write_text(json.dumps({
                "subtype": message.subtype, "result": message.result,
                "num_turns": message.num_turns, "total_cost_usd": message.total_cost_usd,
            }))
            print(f"Done: {message.subtype} cost=${message.total_cost_usd:.2f} turns={message.num_turns}")

asyncio.run(main(sys.argv[1], sys.argv[2]))
```

Same three bounds, same three tools, same evidence written to a file — and a place to put the loop over repos when you need one.

## Secrets on runners

Four rules, each closing a way the credential reaches a log, a prompt, or a report. **Never echo it**: the wrapper checks that a credential path is *set*, never the value. **Let GitHub mask it**: registered secrets are masked in logs; a value you compute during a job (an exchanged token, a URL with a key in it) isn't, so `echo "::add-mask::$VALUE"` before you use it. **Scope it to the step**: the model credential is job-level `env:` because the agent needs it; the Slack webhook and the Confluence token sit on their own steps' `env:`, so no tool call the agent makes can see them. **Keep it out of the model's reach**: `Read(./.env)` and `Read(./.env.*)` are denied in both settings files, and the night runs a secret scan over its own output before publishing. Which credential path you're on and how to ask for one with a spend cap is [Working Within Policy](/start/working-within-policy/); on Bedrock, prefer an OIDC role to a long-lived key in secrets — [Blast Radius](/overnight-qa/blast-radius/) makes that a platform ask.

## Retry policy: once on 1, never on 2

Exit 1 is a run error and sometimes transient — the installer, a network hiccup, a rate limit at the first call. Retry it once, in the same step, and say so in the summary. Exit 2 is never retried: a budget hit would spend the same money on the same loop, and an auth failure won't fix itself in thirty seconds and isn't yours to fix. The agent step of the triage workflow with the one `if` added:

```bash
# seat: team — needs the CI credential (the agent step of nightly-triage.yml with a single retry on exit 1)
CODE=0
scripts/run-claude.sh prompts/nightly-triage.md night.json \
  --bare --permission-mode dontAsk --allowedTools "Read,Grep,Glob" --model sonnet || CODE=$?
if [ "$CODE" -eq 1 ]; then
  echo "run-claude: exit 1 — retrying once" | tee -a "$GITHUB_STEP_SUMMARY"
  CODE=0
  scripts/run-claude.sh prompts/nightly-triage.md night.json \
    --bare --permission-mode dontAsk --allowedTools "Read,Grep,Glob" --model sonnet || CODE=$?
fi
echo "exit=$CODE" >> "$GITHUB_OUTPUT"
exit $CODE
```

Anything beyond one retry is a person's decision at 08:05 — `gh workflow run nightly-triage.yml -f budget_usd=5` is the rerun, with a bigger ceiling only if the JSON showed the ceiling was the problem.

## Prove the fence on the first night

A fence you haven't watched refuse something is a hope. Before the first writing night, run the writing job's exact settings against a prompt that violates them on purpose, on your laptop, in the repo:

```text
# prompts/prove-the-fence.md — a deliberate violation. Run ONCE, by hand, with the writing job's settings, before the first writing night.
You are testing a permission fence. Do each step below exactly once, in order, whether or not
the previous step succeeded. Do not retry a step, do not try another way, do not explain.
1. Write a file at src/main/java/FenceProbe.java containing the single line: // fence probe
2. Read the file .env
3. Run the command: git push --dry-run origin HEAD
4. Write a file at src/test/java/FenceProbeTest.java containing the single line: // fence probe
Then output one line per step — the step number and ALLOWED or DENIED — and nothing else.
```

```bash
# seat: team
printf 'FENCE_PROBE=1\n' > .env            # a real file to be refused; .env is gitignored since Day 1
claude -p "$(cat prompts/prove-the-fence.md)" \
  --settings .claude/settings.night.json \
  --permission-mode acceptEdits \
  --allowedTools "Read,Grep,Glob,Edit,Write,Bash(git push --dry-run*)" \
  --max-turns 8 \
  --max-budget-usd 1 \
  --output-format json > fence.json
jq -r '.result' fence.json
jq '.permission_denials | length' fence.json
grep -o 'blocked by policy[^"]*' fence.json
git status --short
rm -f .env src/test/java/FenceProbeTest.java
```

```console
$ jq -r '.result' fence.json
1 DENIED
2 DENIED
3 DENIED
4 ALLOWED
$ jq '.permission_denials | length' fence.json
3
$ grep -o 'blocked by policy[^"]*' fence.json
blocked by policy (.claude/hooks/write-scope.sh): src/main/java/FenceProbe.java
$ git status --short
?? src/test/java/FenceProbeTest.java
```

Step 1 was refused by the hook — its reason string is in the JSON, which is what the `grep` finds. Steps 2 and 3 were refused by the deny list, and note that `git push --dry-run` was *allowed* on the command line on purpose: the probe tests that deny beats allow, and a dry run pushes nothing even if it didn't. Step 4 landed inside the fence, and `git status` shows exactly one new file. Three denials, one allowed write: that's the output to paste into the PR and into [Ask 4](/start/working-within-policy/#ask-4-a-security-review-of-the-night-shift). Any other count means a fence isn't there yet — find out which before the night does.

## Take this with you: `scripts/run-claude.sh`

Every scheduled job on this site runs the agent through one wrapper, so the bounds can't be forgotten and the evidence is always written:

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

Line by line, the reasoning:

- `set -uo pipefail` and deliberately **not** `-e`: the script must survive a failing `claude` so that it can still write the summary line and hand back the real exit code. Unset variables are still fatal, because a missing `$1` is a bug you want to see.
- The credential check tests that *one of three paths* is configured and prints which names it looked for — never a value. A run with no credential fails here, in a second, with a message, instead of two minutes later with an authentication error at the first turn (which would also have been exit 2, and misread as a budget hit).
- `: "${NIGHT_BUDGET_USD:=3}"` and `: "${NIGHT_MAX_TURNS:=25}"` set defaults only if the workflow didn't: every job gets both caps, and a job that needs more sets the variable where a reviewer sees it.
- `claude -p "$(cat "$PROMPT_FILE")"` — the prompt is a file in the repo. `--output-format json` always, because the JSON is the evidence. Then the two caps, then `"$@"` — everything job-specific rides in from the workflow: `--bare` or not, the mode, the allowlist or `--settings`, the model, `--json-schema`.
- `> "$OUT"` then `CODE=$?` — the JSON is written before anything else happens, and the code is captured before anything can overwrite it.
- The summary block runs whether or not `claude` succeeded. `jq -e .` checks the output is parseable JSON before reading fields from it; if it is, one line carries cost, turns, `is_error`, denial count, and duration — the ledger row; if it isn't, it says so and points at the step log. `tee -a` writes it to the job summary on a runner and to stderr on a laptop.
- `exit $CODE` — the wrapper never decides what a code means. The workflow does: publish on 0, retry once on 1, publish-partial on 2, and the re-raise step at the end makes the run red so the Actions list tells the truth.

## Where next

- **Next in the journey:** [Characterization Tests](/overnight-qa/characterization-tests/) — the first job that writes, using the settings file, the hook, and the branch-only push you just read about, with mutation testing as the quality gate.
- **The lateral jump:** if a night has already failed and you're reading this at 08:05, [The Night Failed](/troubleshooting/the-night-failed/) starts from the symptom — timeout, budget hit, empty report — and works back to the bound that was missing.
