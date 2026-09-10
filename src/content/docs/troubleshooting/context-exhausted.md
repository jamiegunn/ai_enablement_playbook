---
title: "Context Exhausted: The Session That Forgot"
description: Recognise a session that has compacted away what you told it, read the window with /context and the JSON with jq, and stop refilling it — search instead of read, subagents for the noisy work, one question per job.
keywords:
  - claude forgot what i told it
  - claude code context window full
  - session quality drops after a while
  - /context /compact /clear
  - num_turns at max turns result thin
  - claude.md too long
  - test output filling the context
  - claude code subagent fresh context
  - max turns headless loop
sidebar:
  order: 3
---

**Symptom:** the session asks you something you told it an hour ago. Answers that were sharp at 10:00 are vague at 12:30. Or a headless run finished with `num_turns` at the cap and a `result` three lines long. Nothing is broken. The window filled, Claude Code compacted the older part of the conversation into a summary, and the thing you were relying on was in the part that got summarised.

## What compaction actually is

The context window is the model's working memory for one session, and every tool result lands in it in full — the 400 lines of `./mvnw test` output, the whole of `SettlementService.java`, the Confluence page. When it fills, Claude Code compacts: it summarises the older conversation and carries on with the summary in place of the detail ([the working memory](/start/how-agentic-coding-works/#the-context-window-is-the-working-memory)). Summaries lose things, and which things is not up to you. So a session that has compacted twice still *works*, but it works from a paraphrase of what it read, and the instruction you gave at 10:00 may now be one clause in that paraphrase.

Windows are large as of September 2026 — a million tokens on the `sonnet` and `opus` aliases — and that changes *when* this happens, not *whether*. A session with a chatty test suite fills any window.

## Step zero: how full is it, and with what?

Inside the session, `/context`. The layout varies by version; the proportions are what you read:

```console
Context usage — claude-sonnet-5 · 812k / 1M tokens (81%)
  System prompt & tools      17k
  Memory files (CLAUDE.md)   58k    ← CLAUDE.md + 6 @imports
  Messages                  737k    ← 590k of it is tool results
  Free                      188k
```

Two numbers tell the story. A memory line in the tens of thousands means the standing orders are too long or import too much — and that cost is paid on *every* turn. A messages line that's mostly tool results means the session has been reading, not searching. `/cost` shows the bill for it:

```console
Total cost:            $6.80
Total duration (API):  41m 09s
Total duration (wall): 2h 51m
```

Because every turn re-sends the whole window, a session's cost tracks its turn count times its window size — which is why a session that forgets is usually also a session that's expensive.

## Reading it headless

A night has no `/context`, but the JSON carries the same two facts. `num_turns` at the cap plus a thin `result` is the loop running out of room, not out of things to do:

```bash
# seat: team
jq '{num_turns, is_error, result_chars: (.result | length), usage}' night.json
```

```console
$ jq '{num_turns, is_error, result_chars: (.result | length), usage}' night.json
{
  "num_turns": 25,
  "is_error": false,
  "result_chars": 214,
  "usage": {
    "input_tokens": 3100,
    "output_tokens": 9800,
    "cache_creation_input_tokens": 61000,
    "cache_read_input_tokens": 1480000
  }
}
```

`num_turns: 25` is exactly `--max-turns 25` — the cap stopped it, not the model. `result_chars: 214` is a report that never got written. And `cache_read_input_tokens` at 1.48 million over 25 turns is a window averaging sixty thousand tokens, re-read every turn: the run was carrying a lot and getting nowhere with it. A healthy triage on the same suite is fourteen turns and a `result` of a few thousand characters ([reading the JSON](/overnight-qa/running-unattended/#reading-the-json-field-by-field)).

## Causes, ranked by likelihood

### 1. Reading whole files instead of searching

`Read` on a 2,000-line class puts 2,000 lines in the window; `Grep` for the method name puts three. A session that reads its way through `ledger-core` is full before it has answered anything. The `map-repo` skill states the rule for a reason: *search, don't read — use Grep and Glob to find things; read only the files you cite.* If `/context` shows tool results dominating and the session has been "looking around", this is it.

### 2. A 400-line CLAUDE.md

The standing orders load on every turn of every session. A `CLAUDE.md` that has grown into an architecture document is paid for on every turn, and the model has to find the three rules that matter in among the history. The site's template is three short sections; the architecture lives in `docs/ARCHITECTURE.md` and is imported, once, by a single line.

### 3. Verbose tool output in the main context

`./mvnw test` prints a thousand lines. Run it four times while iterating and four thousand lines of Surefire output sit in the window, most of them identical. Test logs, build logs, `git log` without a limit, `find` over the whole tree: the model needs the conclusion, not the transcript.

### 4. Too many @ imports

`@docs/ARCHITECTURE.md` in `CLAUDE.md` is one import and it's the right one. A workspace `CLAUDE.md` that imports twenty-three repo maps has put twenty-three maps in every session's window before the first prompt. Imports are convenient precisely because they're invisible, which is why `/context` is the only place you'll see what they cost.

## The fix

**Between tasks, `/compact` or `/clear`.** `/compact` summarises now, on your terms, before the automatic one does it on the model's; `/clear` empties the window. Finish the FX question, `/clear`, start the MQ question — the second task doesn't need the first's grep output, and a fresh window is cheaper than a compacted one.

**Send the noisy work to a subagent.** A subagent has its own fresh window and returns a summary — so the four thousand lines of test output live in the subagent's window and the parent gets "3 failures, all in `SettlementServiceTest`, first frame `SettlementService.java:212`". In a skill, one frontmatter line does it. This is `.claude/skills/run-suite/SKILL.md`, in full:

```markdown
---
name: run-suite
description: Run ./mvnw test and report failures grouped by cause with path:line — never the raw log.
context: fork
agent: Explore
allowed-tools: Bash(./mvnw *) Read Grep
---
Run `./mvnw -q test`. Report only: total, failed, and for each failure the test
name and the first stack frame inside src/ as `path:line`. Do not paste the log.
```

`context: fork` runs the skill in an isolated subagent; the parent never sees the log. [Subagents](/toolkit/subagents/) owns the file format and the trade — each subagent pays for its own context, and the parent knows only what the summary says.

**Scope the standing orders with `.claude/rules/`.** A rule file with a `paths:` frontmatter loads only when the model works on matching files — so Marcus's warnings about `src/main/java/com/ledger/api/legacy/` cost nothing in a session about DTOs. [CLAUDE.md](/toolkit/claude-md/) has the mechanics.

**Cap the turns, and split the job.** `--max-turns` is a context bound as much as a cost bound: a run that hasn't converged in twenty-five turns is carrying too much. And a job that asks two questions fills its window answering the first. **One question per job** — "which tests failed and why" tonight, "what changed since last night" as a comparison against a downloaded artifact rather than a second investigation — is the rule that keeps a night's window small enough to finish.

## Which lever failed

Context. The model could do everything it needed and nobody's check was missing; it simply no longer had in front of it what it needed. Fixes that pull other levers — a stricter allowlist, a review step — won't touch it.

## Decision path

1. `/context`: is the memory line large? → shorten `CLAUDE.md`, cut the imports, move area rules to `.claude/rules/` (causes 2, 4).
2. Is the messages line mostly tool results? → `/compact` now; next time search, don't read, and fork the noisy work (causes 1, 3).
3. Headless: `num_turns` at the cap and a thin `result`? → split the job; fork the test run; keep the cap where it is (all four).
4. None of the above and it still forgot? → it was in the compacted part. Put it in a file — `CLAUDE.md`, or `CLAUDE.local.md` for this week's branch — because **a file survives compaction and a sentence in the conversation doesn't.**

## Escalation

Almost never. The window, the imports, the prompt, and the bounds are all yours. The one thing that isn't: which model the alias resolves to and how large its window is — if `/context` shows a 200K window where you expected a million, the platform team's `ANTHROPIC_DEFAULT_*` pins decide that, and the ask is a model, not a fix.

:::tip[Good citizen]
A forgetful session on your laptop wastes your afternoon. The same pattern on a runner re-reads a bloated window twenty-five times and bills the team for every pass — `cache_read_input_tokens` is the line that shows it. If a night's `num_turns` sits at the cap two runs running, don't raise the cap; shrink what the job carries.
:::
