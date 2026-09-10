---
title: "Troubleshooting: Which Lever Failed?"
description: A three-question triage for any bad AI output — what it could see, what it could do, whether anyone checked — with one cheap command per question, a symptom-to-page table, and what to bring the platform team.
keywords:
  - claude code troubleshooting
  - why did the ai get it wrong
  - which lever failed context tools proof
  - claude code not doing what i asked
  - permission_denials empty
  - /context what is loaded
  - the agent did something it shouldn't
  - escalate to platform team what to include
  - ai output wrong where to start
sidebar:
  order: 1
---

Most time lost on a bad AI result goes to two mistakes: forming a theory about the model before checking what it could see, and rewriting the prompt before checking what it was allowed to do. This page is the method that avoids both. It's the same three questions every time, in the same order, whether it's a session that invented a class at 2 p.m. or a night that spent its budget and left an empty report at 02:40 — and each question has one cheap command that answers it.

The questions are the [Three Levers](/start/the-three-levers/) run from the symptom's side. You don't need that page first; the levers are restated here in the order you check them.

## Before you form a theory

When the output surprises you, the instinct is to explain it: "the model is bad at Java", "the prompt wasn't specific enough", "it hallucinated". Every one of those is a theory, and none is testable in the next sixty seconds. What *is* testable is what the model could see, what it was allowed to do, and whether anything checked the result. So the rule is the same as reading a stack trace: **look before you theorize, and read what you find literally.** An empty `permission_denials` means nothing was refused — not that the fence worked. A citation that resolves means the line exists — not that it says what the sentence claims. "Not found in this repo" means not found in this repo, and the answer may be next door in `ledger-core`.

## The method: three questions, in order

Stop at the first "no". A tools fix applied to a context failure changes nothing, and a better prompt applied to a missing proof step produces a more fluent wrong answer — which is why the order is fixed.

### 1. Could it see what it needed?

Inside a session, type `/context`. It shows how full the window is and what's in it — the standing orders, the files read, the tool output. The layout varies by version; the proportions are what you read:

```console
Context usage — claude-sonnet-5 · 612k / 1M tokens (61%)
  System prompt & tools      17k
  Memory files (CLAUDE.md)   41k
  Messages                  553k    ← mostly tool results
  Free                      388k
```

Two things to look for. Is `CLAUDE.md` in the memory line at all? If not, the session isn't in the repo you think it is. Is the messages line dominated by tool results? If so, what you told it an hour ago has probably been compacted away. The first is [Wrong Repo, Wrong Branch, Wrong File](/troubleshooting/wrong-target/); the second is [Context Exhausted](/troubleshooting/context-exhausted/).

A headless run has no `/context`, but it has the three inputs that decided what the model saw: the prompt file, any `--add-dir`, and whether `--bare` skipped `CLAUDE.md`, hooks, and skills. One command reads all three off the workflow:

```bash
# seat: team
head -3 prompts/nightly-triage.md
grep -n -- '--bare\|--add-dir\|--settings\|run-claude.sh' .github/workflows/nightly-triage.yml
```

```console
$ head -3 prompts/nightly-triage.md
# prompts/nightly-triage.md — READ-ONLY. Passed as the prompt by nightly-triage.yml. CLAUDE.md is NOT loaded (--bare).
You are the night-shift triage for payments-api. You are READ-ONLY: you may read
files and search; you may not edit, run, or fetch anything. If you find yourself
$ grep -n -- '--bare\|--add-dir\|--settings\|run-claude.sh' .github/workflows/nightly-triage.yml
65:          scripts/run-claude.sh prompts/nightly-triage.md night.json \
66:            --bare \
```

Line 66 is the one to read: `--bare` means the night saw the prompt and the checkout and nothing else — no standing orders, no "not found" rule, no hooks. That's right for a read-only triage and wrong for any job you expected to obey `CLAUDE.md`. No `--add-dir` means it saw exactly one checkout.

### 2. Could it do what it needed, and only that?

The JSON from an unattended run answers both halves at once, and the settings file says what the line was:

```bash
# seat: team
jq '.permission_denials' night.json
jq '.permissions | {allow, deny}' .claude/settings.json
```

```console
$ jq '.permission_denials' night.json
[]
$ jq '.permissions | {allow, deny}' .claude/settings.json
{
  "allow": ["Read", "Grep", "Glob", "Bash(./mvnw *)", "Bash(git status*)", "Bash(git diff*)", "Bash(git log*)"],
  "deny": ["Bash(rm -rf *)", "Bash(git push --force*)", "Bash(git push -f*)", "Bash(git reset --hard*)", "Read(./.env)", "Read(./.env.*)", "Read(./**/secrets/**)"]
}
```

Read `[]` literally. If the run did something it shouldn't have and nothing was refused, there is no fence — the deny list and the hooks in `.claude/settings.json` (or the `--settings` file the job passes) don't cover it yet. If the run *couldn't* do something it needed and the array isn't empty, the reason string says which fence fired: `grep -o 'blocked by policy[^"]*' night.json` finds a hook's reason; a denial with no such reason is the `--allowedTools` list or the deny list. Interactively, the same question is the permission prompt you did or didn't see. For a night, [The Night Failed](/troubleshooting/the-night-failed/) is the page; for an edit in the wrong place, [Wrong Repo, Wrong Branch, Wrong File](/troubleshooting/wrong-target/).

### 3. Did anyone check?

The question is *where's the `path:line`?* For a generated document, the structural check is that every citation still points at a real line; for a report, that every cause group has an evidence line:

```bash
# seat: team
scripts/check-citations.sh
grep -c '^### ' report.md && grep -c '^- evidence:' report.md
```

```console
$ scripts/check-citations.sh
all citations resolve
$ grep -c '^### ' report.md && grep -c '^- evidence:' report.md
3
3
```

Both pass and the answer is still wrong? Then open the cited lines: a citation can resolve and not say what the sentence says, and that's the one case where a human has to look. A claim with no pointer at all is [It Made Things Up](/troubleshooting/it-made-things-up/) — it was never checked, because there was nothing to check.

If all three come back "yes" — it saw the right things, it did only what it should, the evidence is there — then, and only then, suspect the prompt or the model. That's rare, and the last section of [It Made Things Up](/troubleshooting/it-made-things-up/) says what to bring.

## Worked example: the empty report

**Symptom:** Wednesday, 08:05, `report.md` is two lines: "Unable to locate the surefire reports; no failures to group." **Question 1:** the workflow shows `--bare` and the prompt file is intact — it saw what it was meant to see. **Question 2:** `jq '.permission_denials' night.json` prints `[]`; `jq '{num_turns, total_cost_usd}' night.json` prints `25` and `2.96` — the turn cap stopped a loop moments before the budget would have. Nothing was refused; nothing needed to be. **Question 3** never comes up: there's no report to check. The step log shows the same `Glob` over `target/surefire-reports/` on every turn, and the directory isn't there: a Maven plugin upgrade the day before moved the reports, and the deterministic step wrote them somewhere the prompt doesn't name. A context fix — the path in the prompt file and the artifact step — not a prompt fix, and six minutes with the method instead of an hour raising the budget.

## Symptom → page

| You're seeing… | Lever | Page |
|---|---|---|
| A class, method, table, queue, or endpoint that doesn't exist; a confident answer with no citation; a doc that says what the code doesn't | context, then proof | [It Made Things Up](/troubleshooting/it-made-things-up/) |
| The session re-asks what you told it; quality drops late in a long session; a night with `num_turns` at the cap and a thin `result` | context | [Context Exhausted](/troubleshooting/context-exhausted/) |
| Edits in `ledger-core` when you meant `ledger-api`; a commit on the wrong branch; a test under `src/main` | tools | [Wrong Repo, Wrong Branch, Wrong File](/troubleshooting/wrong-target/) |
| Exit `2`, exit `1`, `timeout-minutes` hit, an empty `report.md`, "no previous run", a failed Slack step, a schedule that didn't fire | tools (the bounds) | [The Night Failed](/troubleshooting/the-night-failed/) |
| `claude mcp list` shows the server failed; an OAuth loop; the tool isn't in the allowlist; Playwright dies on the runner | tools, then context | [MCP Won't Connect](/troubleshooting/mcp-wont-connect/) |
| An exact string or code you want decoded | — | [Error Message Index](/troubleshooting/error-index/) |

## The escalation boundary

Escalate when the first broken thing is in a column you can't see or touch. The line is the one the [operating model](/start/overview/#the-operating-model) draws:

| Yours to fix | The platform team's (or security's) |
|---|---|
| `CLAUDE.md`, `.claude/rules/`, the map, the prompt file | Managed settings — `/etc/claude-code/managed-settings.json` and the managed `CLAUDE.md` beside it |
| `.claude/settings.json`, the deny list, the hooks, `--allowedTools` | The credential and its spend cap; the deployment path (`ANTHROPIC_API_KEY` vs `CLAUDE_CODE_USE_BEDROCK=1`) |
| The workflow: cron, `permissions:`, `timeout-minutes`, the Slack payload | The GitHub org's Actions policy, runner labels, org secrets |
| `.mcp.json` and the OAuth login on your laptop | The MCP allowlist; whether `mcp.atlassian.com` is reachable at all |

Don't escalate with "Claude is broken". Attach what turns a ping-pong ticket into a ten-minute fix:

- The exact command with every flag, or the workflow file, and `claude --version`.
- The `-p` JSON (`night.json`) — its `session_id` is the run's identity — or, interactively, the `/context` output pasted.
- The run URL and the exit code, from the `run-claude: exit=` line in the job summary.
- The literal error string, verbatim. The [Error Message Index](/troubleshooting/error-index/) tells you what it means before you send it.
- What you've already ruled out, with the commands above.

:::tip[Mitigate first, diagnose second]
A night that's misbehaving gets switched off before it gets debugged: `gh workflow disable nightly-triage.yml` is the kill switch, and the artifacts — `night.json`, `report.md`, the surefire reports — stay downloadable for thirty days, so stopping it destroys no evidence. A session that's making things up gets `/clear` and a fresh start in the right directory — after you've copied out what it said, because that transcript is your evidence.
:::
