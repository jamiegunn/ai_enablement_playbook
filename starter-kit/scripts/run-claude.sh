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
