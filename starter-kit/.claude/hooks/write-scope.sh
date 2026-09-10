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
