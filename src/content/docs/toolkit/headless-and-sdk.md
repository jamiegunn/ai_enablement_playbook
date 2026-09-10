---
title: Headless Mode and the Agent SDK
description: Every claude -p flag on one line each, the JSON result read field by field, the exit codes, the locked-down CI shape, the reusable run wrapper — and when a shell script should become an SDK program.
keywords:
  - claude -p headless mode flags
  - claude --output-format json fields
  - claude code exit code 2 budget
  - --max-budget-usd --max-turns
  - --permission-mode dontAsk --allowedTools ci
  - --json-schema structured_output
  - --bare --settings claude code
  - claude agent sdk python query ClaudeAgentOptions
  - "@anthropic-ai/claude-agent-sdk typescript"
  - run claude code in github actions without the action
sidebar:
  order: 7
---

`claude -p "…"` runs the agent loop once, with nobody at the keyboard, and exits. Same context assembly, same tool calls, same permission check — the only thing missing is you. So every decision you would have made at the keyboard has to be made in advance, as a flag: what it may do, how long it may go on, how much it may spend, what shape the answer takes. And because nobody watched, the run has to leave evidence: a JSON result with the cost, the turn count, the denials, and an exit code that says how it ended. The Agent SDK is the same loop driven from Python or TypeScript, for the day a shell wrapper stops being enough.

Headless mode pulls the **tools** lever — the bounds are flags — and the **proof** lever: the JSON is the night's evidence, and `--json-schema` makes the report's shape enforceable.

## The flags

As of September 2026:

| Flag | One line |
|---|---|
| `-p`, `--print` | Run non-interactively and exit |
| `--output-format text\|json\|stream-json` | Shape of the output; default `text`; `json` for anything a script reads |
| `--input-format text\|stream-json` | Shape of the input |
| `--json-schema <schema>` | Produce JSON validated against an inline schema; lands in `structured_output` |
| `--permission-mode <mode>` | `default`, `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions`, `manual` |
| `--permission-prompts host\|none` | Who answers permission requests; `none` (v2.1.259+) also removes `AskUserQuestion` |
| `--allowedTools <list>` | Comma-separated: `Read`, `Edit`, `Bash(git *)`, `mcp__server__tool` |
| `--disallowedTools <list>` | The inverse |
| `--model <alias\|id>` | `sonnet`, `opus`, `haiku`, or a full ID such as `claude-sonnet-5` |
| `--fallback-model <models>` | Comma-separated, tried in order |
| `--max-turns <n>` | Cap on agentic turns |
| `--max-budget-usd <amount>` | Cost ceiling; exit code `2` when hit |
| `--system-prompt <text>`, `--system-prompt-file <path>`, `--append-system-prompt <text>` | Replace, replace from a file, or extend the system prompt |
| `--bare` | Skip auto-discovery — `CLAUDE.md`, hooks, skills — for fast CI startup |
| `--settings <file\|json>` | Settings for this run; still applies under `--bare` |
| `--mcp-config <file\|json>` | MCP servers for this run; pair with `--strict-mcp-config` |
| `--add-dir <path>` | Extra directories the session may access |
| `--agents <json>` | Inline subagent definitions |
| `--plugins <plugins>` | Plugins for this run |
| `--worktree <branch\|url>` | Run in a git worktree |
| `--continue`, `--resume <session_id\|path>` | Pick up a previous session |
| `--verbose`, `--include-partial-messages`, `--forward-subagent-text` | More on the stream |

Stdin works too — `cat target/surefire-reports/*.txt | claude -p "group these failures by cause"` — up to 10 MB, which is how a log gets into the window without a tool call.

## The JSON, field by field

With `--output-format json` the run prints one object:

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

`result` is the model's final output — the morning report, when the prompt asked for one; `jq -r .result` is how it becomes `report.md`. `session_id` lets you `--resume`. `total_cost_usd` is what the run cost — read it, never estimate it. `num_turns` is how many loop iterations it took; a triage that needs 40 is looping. `usage` breaks the tokens down: fresh input, output, cache writes, cache reads — the shape [the cost page](/toolkit/enterprise-and-cost/) explains. `structured_output` is filled only with `--json-schema`. `error` and `is_error` say whether the run failed as a run. `duration_ms` is wall time. `permission_denials` lists every tool call refused by the allowlist, a deny rule, or a hook — the field the first night is judged on. Its entries' fields aren't documented as of September 2026: read them with `jq '.permission_denials'` and don't hardcode names.

The exit code is the other evidence:

| Exit | Meaning | What to do |
|---|---|---|
| `0` | Success | Read `result`; publish |
| `1` | Failure — bad flags, a run error | Fix the invocation; one retry is reasonable |
| `2` | Partial — the cost ceiling was hit, or auth failed before the first turn | The JSON still carries `result` (possibly partial) and `total_cost_usd`. Never retry blindly: a retry doubles the spend |
| `130` | SIGINT | Someone interrupted it |
| `143` | SIGTERM | The runner's `timeout-minutes` killed it |

## The three flags that make it safe in CI

**`--permission-mode dontAsk` plus an explicit `--allowedTools`** is the vendor's locked-down recommendation and the site's rule: everything not on the list is denied automatically (there's nobody to ask), and every denial lands in `permission_denials`. `plan` mode is for interactive exploration and is not the CI shape. `--permission-prompts none` makes the no-prompting explicit.

**`--max-turns` and `--max-budget-usd`, together.** A budget alone doesn't stop a cheap loop; a turn cap alone doesn't stop an expensive turn. The runner's `timeout-minutes` is the third bound.

**`--json-schema`** takes the schema inline only — no `@file` — and requires `-p` with `--output-format json`; the validated object appears at `.structured_output`. In a workflow: `--json-schema "$(cat prompts/report.schema.json)"`. A finding without an evidence field becomes a schema error rather than a judgement call.

Two more that decide what the run *sees*: `--bare` skips `CLAUDE.md`, hooks, and skills, right for a self-contained prompt and wrong for a job that depends on the standing orders; `--settings .claude/settings.night.json` carries a permissions-and-hooks file into the run — as a path or inline JSON — and applies even under `--bare`.

## The example: `run-claude.sh`

Every unattended job on this site runs through one wrapper, so the bounds, the JSON, and the summary line are the same on every night:

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

The first night calls it with the job-specific flags after the two positional arguments:

```bash
# seat: team — needs the CI credential in the workflow's env (one of the three paths)
scripts/run-claude.sh prompts/nightly-triage.md night.json \
  --bare \
  --permission-mode dontAsk \
  --allowedTools "Read,Grep,Glob" \
  --model sonnet
```

```console
run-claude: exit=0
run-claude: cost_usd=0.41 turns=14 is_error=false denials=0 duration_ms=212873
```

The second line is the one to read at standup: cost, turns, whether it errored, how many tool calls were refused, and how long it took — in the job summary, whatever else happened. The wrapper refuses to start with no credential path, never prints a credential, and propagates the exit code so the workflow can re-raise a failure *after* the report is published.

## The Agent SDK

The SDK is the same loop called from a program: `claude-agent-sdk` for Python, `@anthropic-ai/claude-agent-sdk` for TypeScript. `query()` takes a prompt and options, and yields messages as the run proceeds; the last is a result message with `total_cost_usd`, `result`, `num_turns`, and `subtype`. The read-only triage, as a program with the same bounds as the wrapper:

```python
# scripts/triage.py — the read-only triage as an SDK program; same bounds as run-claude.sh
import asyncio
from pathlib import Path
from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage, ResultMessage

async def main():
    async for message in query(
        prompt=Path("prompts/nightly-triage.md").read_text(),
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Glob", "Grep"],
            permission_mode="plan",
            model="sonnet",
            max_turns=25,
            max_budget_usd=3.0,
        ),
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if hasattr(block, "text"):
                    print(block.text)
        elif isinstance(message, ResultMessage):
            Path("report.md").write_text(message.result or "")
            print(f"run: {message.subtype} cost_usd={message.total_cost_usd:.2f} turns={message.num_turns}")

asyncio.run(main())
```

```typescript
// scripts/triage.ts — the same triage from TypeScript
import { readFileSync, writeFileSync } from "node:fs";
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: readFileSync("prompts/nightly-triage.md", "utf8"),
  options: { allowedTools: ["Read", "Glob", "Grep"], permissionMode: "plan" },
})) {
  if (message.type === "result") {
    writeFileSync("report.md", message.result);
    console.log(`run: cost_usd=${message.total_cost_usd} turns=${message.num_turns}`);
  }
}
```

The Python options mirror the flags: `allowed_tools` and `disallowed_tools`, `permission_mode`, `system_prompt`, `cwd`, `model` and `fallback_model`, `max_turns`, `max_budget_usd`, `continue_conversation`, `resume`, `fork_session`, `mcp_servers`, `agents`, `hooks`, `env`, `output_format`. The TypeScript package takes the same options in camelCase; `allowedTools` and `permissionMode` are the two shown.

**When to graduate.** Stay with `run-claude.sh` while a job is one prompt, one run, one JSON — a shell script is what the security reviewer can read in a minute and what `jq` already parses. Move to the SDK when the job needs logic *between* runs (one review per PR, a retry with a narrower prompt), when hooks should be functions rather than shell scripts, or when the run lives inside a service rather than a workflow step. What you gain is control; what you pay is a program to maintain, test, and get reviewed as code that spends money.

## Used by

- [The First Night](/overnight-qa/quick-start/) — the wrapper, the JSON read for the first time, the exit codes in a workflow.
- [Running Claude Unattended](/overnight-qa/running-unattended/) — choosing the mode and the three bounds per job; the SDK as the third option.
- [The Morning Report](/overnight-qa/the-morning-report/) — `--json-schema` and the machine-readable copy.
- [The 90-Minute Repo Map](/kt/quick-start/) — the headless form of `/map-repo`.
- [The Night Failed](/troubleshooting/the-night-failed/) and [Error Message Index](/troubleshooting/error-index/) — exit codes and `permission_denials`, interpreted.

## The mistakes people make

**`bypassPermissions` on a runner.** It skips every check — deny rules, hooks, the allowlist — on a machine that holds a credential and a checkout with push rights. There is no job on this site that needs it, and the platform team can disable it fleet-wide with `disableBypassPermissionsMode`. The fix is `dontAsk` plus an allowlist, which is also faster to reason about: the list *is* the blast radius.

**No `--max-turns`.** A budget looks like enough until the model hits a tool call that fails the same way every turn: each turn is cheap, the budget holds for hundreds of them, and the job runs until `timeout-minutes`. Set both, always — the wrapper defaults to 25 turns and refuses to run without a number.

**Interpolating model output through `${{ }}`.** `${{ steps.agent.outputs.headline }}` inside a `run:` step pastes the model's text into a shell script *before* the shell parses it: a backtick or `$(…)` in the report becomes code on your runner. The model's output is untrusted input. Read it from a file with `jq --arg`, as the first night's Slack step does, and never through the expression syntax.

The vendor's reference for the flags, the JSON, and the exit codes: [code.claude.com/docs/en/headless](https://code.claude.com/docs/en/headless); for the SDK, [code.claude.com/docs/en/agent-sdk/quickstart](https://code.claude.com/docs/en/agent-sdk/quickstart).
