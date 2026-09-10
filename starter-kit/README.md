# Starter kit

Every artifact the playbook tells you to create, as a real file you can copy
into your own repository. These are the *same* files the site quotes — they are
extracted from [`docs/CANONICAL-ARTIFACTS.md`](../docs/CANONICAL-ARTIFACTS.md),
so a page and this directory can never drift apart.

They are written for the site's cast (`payments-api`, the `ledger-*` repos,
`#payments-nightly`, Confluence space `PAY`). Change the names, keep the shape.

## What's here

```
.claude/
  settings.json                  Day-1 permissions baseline: allow list, deny list, the destructive-command hook
  settings.night.json            Settings for jobs that WRITE — passed with --settings, wires both hooks
  hooks/block-destructive.sh     PreToolUse guard on Bash: denies rm -rf, force-push, hard reset, DROP/TRUNCATE
  hooks/write-scope.sh           PreToolUse guard on Edit|Write: denies any path outside src/test/
  skills/map-repo/SKILL.md       Maps one repo into docs/ARCHITECTURE.md, every claim cited path:line
  skills/characterize/SKILL.md   Writes characterization tests under src/test/ only, flake-gated
.github/workflows/
  nightly-triage.yml             The first night: run the suite, read-only agent, report to summary + Slack
  nightly-freshness.yml          Checks every path:line citation in docs/ still resolves; one issue if not
prompts/
  nightly-triage.md              The read-only triage prompt (produces the morning report)
  report.schema.json             --json-schema for the machine-readable copy of the report
  morning-report-template.md     The report contract, as a template
scripts/
  run-claude.sh                  The bounded unattended-run wrapper: budget, turns, JSON, exit code, summary
  check-citations.sh             The structural freshness check behind nightly-freshness.yml
.mcp.json                        Project-scoped MCP servers: Atlassian (Cloud) and Playwright
```

## Before you run any of it

1. **Read the page that owns each file.** Nothing here is safe by being copied;
   it is safe because of the reasoning around it. `run-claude.sh` and the
   permission flags are [Running Claude Unattended](https://jamiegunn.github.io/ai_enablement_playbook/overnight-qa/running-unattended/);
   the hooks and the deny list are [Blast Radius](https://jamiegunn.github.io/ai_enablement_playbook/overnight-qa/blast-radius/);
   `map-repo` is [Mapping One Repo](https://jamiegunn.github.io/ai_enablement_playbook/kt/mapping-a-repo/).
2. **`chmod +x` the scripts** if your copy loses the bit: `chmod +x scripts/*.sh .claude/hooks/*.sh`.
3. **Set the secrets the workflows reference** — `ANTHROPIC_API_KEY` (or the
   Bedrock/Vertex environment) and `SLACK_WEBHOOK_URL`. The asks, with the
   evidence to attach, are on [Working Within Policy](https://jamiegunn.github.io/ai_enablement_playbook/start/working-within-policy/).
4. **Prove the fences before the first real night.** Run the job once with a
   deliberate violation in the prompt and confirm the denial appears in the
   run's `permission_denials`. A fence you haven't tested is a fence you're
   hoping for.

## What's deliberately not here

The skills that are specific to one page — `system-map`, `confluence-triage`,
`draft-adrs`, `tutor`, `gen-exercises` — are quoted in full on their own pages
rather than shipped here, because each needs editing against your estate before
it does anything useful. Copy them from the page, not from a template.

The workflows that write (`nightly-characterize.yml`, `nightly-e2e.yml`,
`nightly-review.yml`) are also page-only, on purpose: a job that opens PRs or
drives a browser should be assembled by someone who has read why each bound is
there.
