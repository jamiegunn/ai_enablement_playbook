#!/bin/bash
# .claude/hooks/block-destructive.sh — PreToolUse guard on Bash.
# Reads the hook JSON on stdin; denies with a reason. Exit 0 + JSON = decision.
COMMAND=$(jq -r '.tool_input.command // empty')
if echo "$COMMAND" | grep -Eq 'rm -rf|git push --force|git push -f\b|git reset --hard|DROP (TABLE|SCHEMA)|TRUNCATE '; then
  jq -n --arg c "$COMMAND" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:("blocked by policy (.claude/hooks/block-destructive.sh): " + $c)}}'
else
  exit 0
fi
