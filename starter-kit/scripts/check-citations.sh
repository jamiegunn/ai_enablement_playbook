#!/usr/bin/env bash
# scripts/check-citations.sh — every "(path:line)" citation in docs/**/*.md must still point at a real line.
# Prints stale citations and exits 1 if any; the workflow turns the output into ONE issue labelled kt:stale.
set -uo pipefail
out=$(mktemp)
grep -rhoE '\(([A-Za-z0-9_./-]+\.[A-Za-z]+):([0-9]+)(-[0-9]+)?\)' docs/ --include='*.md' \
  | tr -d '()' | sort -u \
  | while IFS=: read -r path range; do
      line="${range%%-*}"
      if [ ! -f "$path" ]; then
        echo "MISSING FILE   $path:$range"
      elif [ "$line" -gt "$(wc -l < "$path")" ]; then
        echo "LINE GONE      $path:$range (file now has $(wc -l < "$path") lines)"
      fi
    done > "$out"
if [ -s "$out" ]; then cat "$out"; echo; echo "$(wc -l < "$out") stale citation(s)"; exit 1; fi
echo "all citations resolve"
