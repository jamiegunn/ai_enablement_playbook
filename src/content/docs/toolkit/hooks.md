---
title: "Hooks: Guardrails That Don't Rely on Good Behaviour"
description: Run a script before a tool call and refuse it with a reason — the events, the JSON a hook receives and returns, the exit codes, and the two guards the night shift depends on.
keywords:
  - claude code hooks PreToolUse
  - block a command before claude runs it
  - hook json stdin tool_input
  - permissionDecision deny hookSpecificOutput
  - hook exit code 2
  - CLAUDE_PROJECT_DIR in hooks
  - hook not firing claude code
  - hook matcher regex
  - prevent agent from editing files outside a directory
  - test a claude code hook without running claude
sidebar:
  order: 5
---

A hook is a script Claude Code runs at a lifecycle event — most usefully, *before a tool call* — and whose answer can refuse the call, rewrite it, or let it through. The model never sees the script and can't argue with it. That's the difference between a hook and a sentence in `CLAUDE.md`: "don't delete tests" is a request the model weighs against finishing the job; a `PreToolUse` hook that returns `deny` for any write outside `src/test/` is a fence that holds at 02:17 with nobody watching. A deny rule in settings is also a fence, but it matches a pattern; a hook sees the whole command, or the whole file path, and runs any logic you can write in a shell script.

It pulls the **tools** lever — the line between *can* and *may* — and it's the only mechanism on this site that can draw that line with logic rather than a glob.

## Events, types, matchers

As of September 2026 a hook can fire on any of these events:

| Group | Events |
|---|---|
| Session lifecycle | `SessionStart`, `SessionEnd`, `Setup`, `InstructionsLoaded`, `ConfigChange` |
| The turn | `UserPromptSubmit`, `Stop`, `StopFailure`, `PreModelSwitch`, `Notification` |
| Tool calls | `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied` |
| Files and worktrees | `FileChanged`, `WorktreeCreate` |

The site uses one: `PreToolUse`, because it's the only place a fence can stop something *before* it happens. Hook types are `command` (run a script — what the site uses), `http`, `mcp_tool`, `prompt`, and `agent`. A **matcher** picks which tool calls the hook sees: `*` or omitted means all; `Bash|Edit` means either; anything else is a regex. The wiring lives in settings — this is the `hooks` block from the night's `.claude/settings.night.json`, an excerpt of the artifact the [headless page](/toolkit/headless-and-sdk/) shows in full:

```json
"hooks": {
  "PreToolUse": [
    { "matcher": "Edit|Write", "hooks": [{ "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/write-scope.sh" }] },
    { "matcher": "Bash",       "hooks": [{ "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/block-destructive.sh" }] }
  ]
}
```

The Day-1 baseline `.claude/settings.json` wires only the second one, the same way ([shown in full there](/start/day-1-checklist/#7-the-destructive-command-hook)). `${CLAUDE_PROJECT_DIR}` is the repo root, so the path resolves wherever the session was started from; the scripts use it too, to anchor the fence.

## The JSON it receives

The hook gets one JSON object on stdin:

```json
{ "session_id": "abc123", "tool_name": "Bash", "tool_input": { "command": "npm test" }, "permission_mode": "default", "hook_event_name": "PreToolUse" }
```

Field by field: `session_id` identifies the session, useful for a log line. `tool_name` is the tool about to run — `Bash`, `Edit`, `Write`, or an MCP tool's full `mcp__server__tool` name. `tool_input` is the tool's arguments, and its shape depends on the tool: `command` for `Bash`, `file_path` for `Edit` and `Write` — which is why one guard reads `.tool_input.command` and the other `.tool_input.file_path`. `permission_mode` is the session's mode, so a hook can be stricter in `acceptEdits` than in `plan`. `hook_event_name` says which event fired, because one script can serve several.

## The JSON it returns

To make a decision, the hook prints one JSON object on stdout and exits `0`:

```json
{ "hookSpecificOutput": { "hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "Reason", "updatedInput": { "command": "modified" } } }
```

`hookEventName` names the event the decision answers. `permissionDecision` is the verdict; `deny` is the one the site uses. `permissionDecisionReason` is the sentence that lands in the session, and in a headless run's `permission_denials` — write it so a human reading the morning's JSON knows which script fired and on what. `updatedInput` is the rewrite form: instead of refusing, hand back modified arguments (a `command` with `--dry-run` appended, say) and let the call proceed with those.

Exit codes are the other half of the contract:

| Exit | Meaning | When you'd use it |
|---|---|---|
| `0` | Success; stdout is parsed as the decision. No output means no opinion — the call proceeds | The normal path, both branches |
| `2` | Block unconditionally, whatever stdout says | A guard that must never be misread |
| other | Non-blocking — the hook failed, the call proceeds | Never on purpose; this is what a crashed hook looks like |

That last row is the one to remember: **a hook that crashes is a hook that allows.** Test it by hand before trusting it.

## The examples

The destructive-command guard, on every `Bash` call:

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

The write-scope guard, on every `Edit` or `Write` — the night's characterization job may create tests and nothing else:

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

Both are plain shell and `jq`, which is the point: no framework, nothing to install on a runner, readable by the security reviewer in a minute. Make them executable and commit both — `chmod +x .claude/hooks/*.sh`.

Test a hook the way it will be called — pipe it the JSON it would receive, with no Claude Code involved. The [Day-1 Checklist](/start/day-1-checklist/#7-the-destructive-command-hook) does this for the Bash guard; here is the write guard, one path outside the fence and one inside:

```bash
# seat: team
chmod +x .claude/hooks/*.sh
echo '{"tool_name":"Write","tool_input":{"file_path":"src/main/java/com/ledger/shared/MoneyMath.java"}}' | .claude/hooks/write-scope.sh
echo '{"tool_name":"Write","tool_input":{"file_path":"src/test/java/com/ledger/shared/MoneyMathCharacterizationTest.java"}}' | .claude/hooks/write-scope.sh; echo "exit=$?"
```

```console
$ echo '{"tool_name":"Write","tool_input":{"file_path":"src/main/java/com/ledger/shared/MoneyMath.java"}}' | .claude/hooks/write-scope.sh
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "write outside src/test/ blocked by policy (.claude/hooks/write-scope.sh): src/main/java/com/ledger/shared/MoneyMath.java"
  }
}
$ echo '{"tool_name":"Write","tool_input":{"file_path":"src/test/java/com/ledger/shared/MoneyMathCharacterizationTest.java"}}' | .claude/hooks/write-scope.sh; echo "exit=$?"
exit=0
```

The first call printed a `deny` with the script's name and the offending path — that string is what you'll grep for in `permission_denials`. The second printed nothing and exited `0`: inside the fence, no opinion, the write proceeds.

:::caution[Prove the fence in the mode you'll run it]
`--bare` skips hooks along with `CLAUDE.md` and skills, so a job that runs `--bare` has no hooks *from the repo's settings* — the night's writing job carries them in `--settings .claude/settings.night.json` instead, which still applies under `--bare`. And as of September 2026 the vendor's documentation doesn't state explicitly whether hooks from settings fire in `-p` sessions. The site's rule, from [Running Claude Unattended](/overnight-qa/running-unattended/): on the first night, make the job attempt a harmless violation — a write to `src/main/` — and confirm the denial appears in the JSON's `permission_denials`. A fence you haven't watched refuse something isn't a fence yet.
:::

## Used by

- [Day-1 Checklist](/start/day-1-checklist/#7-the-destructive-command-hook) — the Bash guard, wired, tested, and proven with a deliberate `TRUNCATE`.
- [Characterization Tests](/overnight-qa/characterization-tests/) — the write-scope guard on the job that creates tests.
- [Blast Radius](/overnight-qa/blast-radius/) — the deny list as a table, with the hook as the enforcement for the lines a pattern can't express.
- [Running Claude Unattended](/overnight-qa/running-unattended/) — where `--settings` carries the hooks into a job that runs `--bare`.

## The mistakes people make

**Forgetting `chmod +x`.** A hook that isn't executable doesn't run, and nothing tells you. The session proceeds as if there were no hook; the night writes wherever it likes; the morning's JSON shows `permission_denials: []` and everyone reads that as good news. The fix is the `chmod +x .claude/hooks/*.sh` above, committed so the bit travels with the file — and the piped test, which fails loudly (`Permission denied`) when the bit is missing.

**A matcher that never matches.** `"matcher": "bash"` is a regex, and regexes are case-sensitive: it never matches `Bash`. `"matcher": "Edit,Write"` looks like a list; it's a regex for the literal string `Edit,Write`, which no tool is called. Use `Edit|Write`, keep tool names exactly cased, and prove it the same way as everything else — a deliberate violation and a denial in the JSON.

**Printing debug output to stdout.** Stdout is the decision channel. An `echo "checking $COMMAND"` before the `jq -n` turns the output into something that isn't JSON, and a hook that exits `0` with unparseable output is not the fence you think it is. Send anything human-readable to stderr (`>&2`), keep stdout for the one JSON object, and if you need a log, append to a file the workflow uploads as an artifact.

The vendor's reference for events, matchers, the input and output JSON, and the other hook types: [code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks).
