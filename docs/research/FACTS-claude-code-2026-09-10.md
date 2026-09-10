# Claude Code fact sheet — verified 2026-09-10

Source of truth for every Claude Code flag, file path, and behaviour the site
teaches. Verified against https://code.claude.com/docs on the date above. When
a page needs a fact that isn't here, verify it and add it — don't write from
memory. Re-verify this whole file before any release that touches commands.

## 1. Headless / non-interactive mode (`claude -p`)

Verified at: https://code.claude.com/docs/en/headless

Flags:

- `-p` / `--print` — run non-interactively and exit
- `--output-format text|json|stream-json` (default `text`)
- `--input-format text|stream-json`
- `--json-schema <schema>` — validate/produce structured JSON output (result lands in `structured_output`)
- `--permission-mode default|acceptEdits|plan|auto|dontAsk|bypassPermissions|manual`
- `--permission-prompts host|none` — who answers permission requests
- `--allowedTools <list>` — comma-separated, patterns like `Bash(git *)`, `Read`, `Edit`, `mcp__server__tool`
- `--disallowedTools <list>`
- `--model <alias|id>` — `sonnet`, `opus`, `haiku`, or a full ID such as `claude-sonnet-5`
- `--fallback-model <models>` — comma-separated
- `--max-turns <n>` — cap agentic turns
- `--max-budget-usd <amount>` — cost ceiling; exit code 2 when hit
- `--append-system-prompt <text>`, `--system-prompt <text>`, `--system-prompt-file <path>`
- `--bare` — skip auto-discovery (CLAUDE.md, hooks, skills) for fast CI startup
- `--mcp-config <file|json>` — MCP servers for this run
- `--add-dir <path>` — extra directories the session may access
- `--continue`, `--resume <session_id|path>`
- `--verbose`, `--include-partial-messages`, `--forward-subagent-text`
- `--agents <json>` — inline subagent definitions
- `--settings <file|json>`
- `--plugins <plugins>`
- `--worktree <branch|url>`

Stdin works: `cat file.txt | claude -p "prompt"` (max 10 MB).

JSON output shape (`--output-format json`):

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

Exit codes: `0` success · `1` failure (bad flags, run error) · `2` partial (cost
ceiling hit, auth failed before first turn) · `130` SIGINT · `143` SIGTERM.

## 2. CLAUDE.md memory hierarchy

Verified at: https://code.claude.com/docs/en/memory

Precedence, highest first:

1. Managed policy (cannot be excluded): macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`, Linux/WSL `/etc/claude-code/CLAUDE.md`, Windows `C:\Program Files\ClaudeCode\CLAUDE.md`
2. User: `~/.claude/CLAUDE.md`
3. Project: `./CLAUDE.md` or `./.claude/CLAUDE.md` (committed)
4. Local: `./CLAUDE.local.md` (gitignored personal overrides)

Loading: root → parents → current directory; subdirectory `CLAUDE.md` files load on demand when Claude reads files in that directory.

- `@path` imports (`@README.md`); wrap in backticks to keep literal
- HTML comments `<!-- -->` are stripped before injection (free notes to maintainers)
- `.claude/rules/*.md` — modular rules; optional `paths:` frontmatter with globs (`src/**/*.ts`) scopes a rule to matching files; symlinks allowed
- `claudeMdExcludes` setting — glob list of CLAUDE.md files to skip
- Auto memory: `~/.claude/projects/<project>/memory/MEMORY.md` (first 200 lines / 25 KB loaded at start) plus topic files; disable with `autoMemoryEnabled: false` or `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`
- `/init` generates a starter CLAUDE.md; `/memory` edits memory files

## 3. Skills

Verified at: https://code.claude.com/docs/en/skills

Locations: personal `~/.claude/skills/<name>/SKILL.md`, project `.claude/skills/<name>/SKILL.md`, enterprise via managed settings.

Frontmatter:

```yaml
---
name: my-skill                    # optional; defaults to directory name
description: What this does       # drives auto-invocation
disable-model-invocation: true    # only humans invoke it
user-invocable: false             # only Claude invokes it
allowed-tools: Bash(git *) Read Edit
argument-hint: "[filename]"
arguments: [file, format]
context: fork                     # run in an isolated subagent
agent: Explore                    # subagent type when forked
background: false
paths: "src/**" "tests/**"        # only load for matching files
---
```

Invoke with `/skill-name` (or `/plugin:skill`). Dynamic content: `` !`git diff HEAD` `` runs once at load. Substitutions: `$ARGUMENTS`, `$0`, `$1`, `${CLAUDE_SESSION_ID}`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PROJECT_DIR}`.

## 4. Subagents

Verified at: https://code.claude.com/docs/en/sub-agents

Priority: managed settings → `--agents` CLI → `.claude/agents/<name>.md` (project) → `~/.claude/agents/<name>.md` (user) → plugin `agents/`.

```yaml
---
name: code-reviewer
description: Reviews code           # when to delegate
tools: Read Glob Grep               # inherits all if omitted
model: sonnet                       # sonnet|opus|haiku|<id>
permissionMode: default             # default|acceptEdits|auto|plan|dontAsk
skills: skill-name
memory: project                     # user|project|local
isolation: worktree
maxTurns: 10
---
```

Built-ins: Explore, Plan, general-purpose. Invoke naturally, with `@"code-reviewer (agent)"`, or `claude --agent code-reviewer`.

## 5. Hooks

Verified at: https://code.claude.com/docs/en/hooks

Events: `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`, `StopFailure`, `PreModelSwitch`, `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied`, `FileChanged`, `WorktreeCreate`, `ConfigChange`, `Notification`, `InstructionsLoaded`, `Setup`.

Hook types: `command`, `http`, `mcp_tool`, `prompt`, `agent`. Matcher: `*`/omitted = all; `Bash|Edit` alternatives; other characters = regex.

Hook stdin (example):

```json
{ "session_id": "abc123", "tool_name": "Bash", "tool_input": { "command": "npm test" }, "permission_mode": "default", "hook_event_name": "PreToolUse" }
```

Hook stdout decision:

```json
{ "hookSpecificOutput": { "hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "Reason", "updatedInput": { "command": "modified" } } }
```

Exit codes: `0` success (JSON parsed) · `2` block unconditionally · other = non-blocking.

Minimal destructive-command guard — `.claude/settings.json`:

```json
{ "hooks": { "PreToolUse": [ { "matcher": "Bash", "hooks": [ { "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/block-destructive.sh" } ] } ] } }
```

`.claude/hooks/block-destructive.sh`:

```bash
#!/bin/bash
COMMAND=$(jq -r '.tool_input.command')
if echo "$COMMAND" | grep -Eq 'rm -rf|git push --force|git push -f|DROP TABLE'; then
  jq -n '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:"Destructive command blocked by policy"}}'
else
  exit 0
fi
```

## 6. Permissions & settings

Verified at: https://code.claude.com/docs/en/settings · https://code.claude.com/docs/en/managed-settings

Precedence: managed (`managed-settings.json`, MDM, console) → `--settings` → `.claude/settings.local.json` → `.claude/settings.json` → `~/.claude/settings.json`.

Managed paths: macOS `/Library/Application Support/ClaudeCode/managed-settings.json`, Linux `/etc/claude-code/managed-settings.json`, Windows `C:\Program Files\ClaudeCode\managed-settings.json`.

```json
{
  "permissions": {
    "allow": ["Read", "Bash(git *)", "Edit", "mcp__github__list_commits"],
    "deny": ["Bash(rm *)", "Bash(git push --force)"],
    "ask": ["AskUserQuestion"],
    "defaultMode": "plan"
  }
}
```

Modes: `default` (prompt), `acceptEdits`, `plan` (read-only), `auto` (classifier-reviewed), `dontAsk` (deny unless allowed), `bypassPermissions`, `manual`.

Other keys: `model`, `autoMemoryEnabled`, `claudeMdExcludes`, `env`, `apiKeyHelper`, `sandbox`, `cleanupPeriodDays`, `includeCoAuthoredBy`, `hooks`, `disableBypassPermissionsMode`.

Enterprise routing: `CLAUDE_CODE_USE_BEDROCK=1` (+ `AWS_REGION`), `CLAUDE_CODE_USE_VERTEX=1`, `CLAUDE_CODE_USE_FOUNDRY=1`, `CLAUDE_CODE_USE_MANTLE=1`. Pin models per provider with `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL`.

## 7. MCP

Verified at: https://code.claude.com/docs/en/mcp-quickstart

```bash
claude mcp add --transport http --scope project my-docs https://mcp.example.com/endpoint
claude mcp add --scope project playwright -- npx -y @playwright/mcp@latest
claude mcp add --transport http --header "Authorization: Bearer $TOKEN" name https://host/mcp
claude mcp list | claude mcp get <name> | claude mcp remove <name>
claude mcp login <name> | claude mcp logout <name>     # v2.1.185+
```

Scopes: `user` (`~/.claude.json`), `project` (`.mcp.json` at repo root, committed), `local`. `--transport sse` is deprecated; use `http`.

`.mcp.json`:

```json
{
  "mcpServers": {
    "playwright": { "type": "stdio", "command": "npx", "args": ["-y", "@playwright/mcp@latest"] },
    "atlassian": { "type": "http", "url": "https://mcp.atlassian.com/v2/mcp" },
    "github": { "type": "http", "url": "https://mcp.github.com", "headers": { "Authorization": "Bearer ${GITHUB_TOKEN}" } }
  }
}
```

`${ENV_VAR}` expands. Headless: `--mcp-config <file|json>` (add `--strict-mcp-config` to ignore other configured servers). `MCP_TIMEOUT=60000` startup timeout (ms).

## 8. Claude Code GitHub Action

Verified at: https://code.claude.com/docs/en/github-actions

`anthropics/claude-code-action@v1` (`@beta` deprecated). Inputs: `anthropic_api_key`, `claude_code_oauth_token`, `prompt` (omit → responds to `@claude` mentions; present → automation mode), `claude_args` (any CLI flags, e.g. `--model sonnet --max-turns 5 --allowedTools "..."`), `trigger_phrase`, `plugins`, `plugin_marketplaces`, `settings`, `use_bedrock`, `use_vertex`, `use_foundry`, `allowed_non_write_users`, `allowed_bots`, `github_token`, `anthropic_federation_rule_id`, `anthropic_organization_id`, `anthropic_service_account_id`, `anthropic_workspace_id`.

Permissions typically: `contents: write`, `pull-requests: write`, `issues: write`, `id-token: write`, `actions: read` — narrow to `read` where the job only comments.

Setup: `/install-github-app` inside `claude`, or install https://github.com/apps/claude manually. Works on `schedule:` like any other automation-mode job.

## 9. Agent SDK

Verified at: https://code.claude.com/docs/en/agent-sdk/quickstart · /python · /typescript

Packages: `@anthropic-ai/claude-agent-sdk` (TS), `claude-agent-sdk` (Python).

Python options (`ClaudeAgentOptions`): `allowed_tools`, `disallowed_tools`, `permission_mode`, `system_prompt`, `cwd`, `model`, `fallback_model`, `max_turns`, `max_budget_usd`, `continue_conversation`, `resume`, `fork_session`, `mcp_servers`, `agents`, `hooks`, `env`, `output_format`.

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage, ResultMessage

async def main():
    async for message in query(
        prompt="Review utils.py for bugs",
        options=ClaudeAgentOptions(allowed_tools=["Read", "Glob", "Grep"], permission_mode="plan"),
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if hasattr(block, "text"):
                    print(block.text)
        elif isinstance(message, ResultMessage):
            print(f"Done: {message.subtype} cost=${message.total_cost_usd:.2f}")

asyncio.run(main())
```

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
for await (const message of query({ prompt: "Review utils.js for bugs", options: { allowedTools: ["Read", "Glob", "Grep"], permissionMode: "plan" } })) {
  if (message.type === "result") console.log(message.result, message.total_cost_usd);
}
```

Result message fields: `total_cost_usd`, `result`, `num_turns`, `subtype`.

## 10. Cost / context

Verified at: https://code.claude.com/docs/en/model-config · /costs · /context-window

Aliases: `opus`, `sonnet`, `haiku`, `best`, plus `sonnet[1m]` / `opus[1m]` where a 1M window is an add-on. Current IDs (2026-09-10): `claude-opus-5` (1M), `claude-sonnet-5` (1M native), `claude-haiku-4-5-20251001` (200K). Prices change — the site teaches the arithmetic with placeholders and links the pricing page rather than printing dollar figures.

- `/cost` and `/usage` show session spend; `/context` shows window usage; `/compact` summarises; `/clear` resets.
- Prompt caching on by default; cache reads billed at a fraction of input rate; `DISABLE_PROMPT_CACHING=1` to disable.
- `ANTHROPIC_MODEL`, `ANTHROPIC_DEFAULT_MODEL`, `CLAUDE_CODE_MAX_OUTPUT_TOKENS`, `MAX_THINKING_TOKENS` env vars.
- Cost levers: right-size the model per job, `--max-budget-usd`, `--max-turns`, fork verbose work into subagents, path-scoped `.claude/rules/`.

## 11. Recent features worth naming (one line each)

Verified at: https://code.claude.com/docs/en/whats-new

- Cloud sessions / web (`claude --cloud`), Remote Control, mobile
- Plugins and marketplaces (`/plugin`), `.plugin` packages
- Routines (cloud scheduling) and Desktop scheduled tasks; `/loop`
- `/security-review` skill; Claude Code Security (web, research preview)
- `/rewind`, checkpoints; `/code-review` background subagent; `/ultrareview`
- Auto mode (classifier-reviewed permissions) — default on Pro/Max/Team since Aug 2026
- Subagents run in background by default; subagents spawn subagents (max 5 levels)
- `.claude/rules/` path-scoped instructions; auto memory
- `claude mcp login/logout`; `/doctor`

## Not verified / avoid stating

- Per-token prices (link the pricing page instead)
- The exact Anthropic MCP directory entry for Atlassian (Atlassian's own docs are authoritative — see FACTS-integrations)

## 12. Follow-up verification (same day)

Verified at: https://code.claude.com/docs/en/headless · https://code.claude.com/docs/en/permission-modes · https://code.claude.com/docs/en/setup · https://code.claude.com/docs/en/cli-reference

- **Tool denial in `-p`:** a tool not pre-approved by `--allowedTools`/settings is denied automatically (no prompt is possible); denials are listed in the JSON result's `permission_denials`. `--permission-prompts none` (v2.1.259+) makes this explicit and removes `AskUserQuestion`.
- **Locked-down CI recommendation (docs):** `--permission-mode dontAsk` + an explicit `--allowedTools` allowlist — e.g. `claude -p "..." --permission-mode dontAsk --allowedTools "Read,Grep,Glob"`. `plan` mode is for interactive exploration (reads and exploratory shell, no edits) and is not the CI recommendation.
- **Budget hit (exit 2):** the JSON still carries `result` (possibly partial) and `total_cost_usd`.
- **Install on a Linux runner:** native installer `curl -fsSL https://claude.ai/install.sh | bash` (pin: `| bash -s stable` or `| bash -s 2.1.89`); installs to `~/.local/bin/claude`, which is NOT on PATH in non-login shells — in GitHub Actions add `echo "$HOME/.local/bin" >> "$GITHUB_PATH"` after installing. Alternatives: `npm install -g @anthropic-ai/claude-code` (Node 22+), apt/dnf repos at `downloads.claude.ai`. No official "install the CLI" GitHub Action is documented; the `anthropics/claude-code-action` installs its own.
- **`--json-schema`:** inline JSON string only (no `@file`); requires `-p` and `--output-format json`; validated object appears at `.structured_output`. In a workflow: `--json-schema "$(cat prompts/report.schema.json)"`.
- **`--settings`:** accepts a file path or inline JSON (`--settings .claude/settings.night.json`) and still applies under `--bare`. Whether hooks from settings fire in `-p` sessions is not stated explicitly in the docs — the site's rule: **prove every fence on the first night** with a deliberate violation and confirm the denial in `permission_denials`.
- **`permission_denials` entry fields:** not documented; read them with `jq '.permission_denials'` and don't hardcode field names.
