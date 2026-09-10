---
title: It Made Things Up
description: Tell an invented class, table, queue, or endpoint from a real one in sixty seconds, find which lever let it happen, and make "not found" the answer the model gives next time.
keywords:
  - the agent made up a class that doesn't exist
  - claude invented a method name
  - ai hallucination codebase
  - confident answer with no citation
  - confluence page says something the code doesn't
  - ask claude to cite path and line
  - claude.md not found rule
  - was claude.md loaded
  - ai generated documentation wrong
sidebar:
  order: 2
---

**Symptom:** the session names a class, method, table, queue, or endpoint you can't find. Or it explains a flow that matches a Confluence page and not the code. Or it answers with total confidence and no `path:line` anywhere. All three are the same incident in different clothes: the answer wasn't in the window, so the model produced what an answer would look like — [why it makes things up](/start/how-agentic-coding-works/#why-it-makes-things-up) is the mechanism, and this page is what to do about it.

## Step zero: is the name real?

Don't argue with the session; grep. The cheapest check on this site is a search for the exact name in the repo it should be in, then across the workspace:

```bash
# seat: team
cd ~/ledger/ledger-api
grep -rn "FxConversionService" src/ ; echo "exit=$?"
grep -rln "FxConversionService" ~/ledger/*/src 2>/dev/null | head
```

```console
$ grep -rn "FxConversionService" src/ ; echo "exit=$?"
exit=1
$ grep -rln "FxConversionService" ~/ledger/*/src 2>/dev/null | head
```

`exit=1` from grep means no match; an empty second result means no match in any of the twenty-three repos either. The name is invented. If the second command *does* return a hit, the name is real and the session was looking in the wrong repo — that's [Wrong Repo, Wrong Branch, Wrong File](/troubleshooting/wrong-target/), not this page. For a table or a queue, the target is the config rather than the code: a queue the model named that isn't in `ledger-mq-bridge`'s `src/main/resources` is a queue that doesn't exist.

## Cheap checks, in order

**1. Ask for the pointer.** Reply with one line: *cite `path:line` for that claim, or say "not found".* A real answer comes back with a file and a line you can open. An invented one comes back with an apology, a different invented name, or a citation into a *document* rather than the code — which is the same as none.

**2. Check what it could see.** `/context` shows whether `CLAUDE.md` loaded and what the session has read. From the shell, three lines answer the three questions that matter:

```bash
# seat: team
pwd                                   # the repo the standing orders belong to?
ls CLAUDE.md 2>&1                     # do they exist here?
head -1 docs/ARCHITECTURE.md 2>&1     # was the map it read stamped, or a draft?
```

```console
$ pwd
/home/sam/ledger/ledger-api
$ ls CLAUDE.md 2>&1
CLAUDE.md
$ head -1 docs/ARCHITECTURE.md 2>&1
**Status: DRAFT — not yet reviewed by a named expert.**
```

The third line is a finding on its own: the session read a map nobody has verified, so anything it said *from the map* is only as good as the map. A stamped map's `CLAUDE.md` line says so ("STAMPED 2026-09-12 by Priya — treat as true and cite it") and the `DRAFT` banner is gone.

**3. Check the standing orders say what you think.** `grep -n "not found\|invent" CLAUDE.md` should return the two rules below. If it returns nothing, the model was never told that "unknown" is an acceptable answer, and it filled the gap the way the loop fills gaps.

## Which lever failed

Context first, then proof. The model couldn't see the answer — the right repo wasn't in the window, the file that holds it was never read, or the only thing in the window that mentioned settlement was a page from 2019 — and nothing in the window said that not finding something is an acceptable outcome. That's the context lever. Then nobody asked for the pointer before acting on the answer, so the invention passed as a fact. That's the proof lever. It wasn't the model being creative; **a model that finds the answer doesn't invent one.**

## The fix

### Make "not found" the default

The two lines that do it live in every `CLAUDE.md` on this site — the [Day-1 Checklist](/start/day-1-checklist/) has the whole file:

```markdown
# CLAUDE.md (excerpt — the two rules that make "not found" the default)
## How to work here
# …
- When asked where something happens: search first (Grep/Glob), then cite
  `path:line`. If you cannot find it, say "not found in this repo — may be in
  ledger-core" rather than guessing.

## What not to do
# …
- Do not invent class, method, table, queue, or endpoint names. "Unknown" is an
  acceptable answer; a plausible-sounding name is not.
```

Why a file and not a better prompt: the rule sits in the window on every turn of every session, and it gives the model a specific sentence to say when it finds nothing — so the plausible continuation is no longer a plausible name. A prompt says it once. The file says it always.

### Require the pointer

Every generated claim on this site carries a `path:line` or lives under "Unverified". The `map-repo` skill states it as the rule that overrides everything else: *"Every factual claim ends with a citation `(path:line)` or `(path:line-line)`. A claim you cannot cite goes under '## Unverified' with what would confirm it."* The test you apply, to the model or to a document, is mechanical: **is there a pointer, and does the line say what the sentence says?** No pointer means inference, and inference gets labelled before anyone acts on it. `scripts/check-citations.sh` keeps the pointers honest afterwards.

### The review gate and the tutor rule

A generated document isn't done until a named expert has read the *citations* — not the prose — and approved the PR; [the review gate](/kt/mapping-a-repo/#the-review-gate) is the checklist, and the approval flips `kt:draft` to `kt:stamped`. For the new hire's sessions, the `tutor` skill in [The First Two Weeks](/kt/onboarding-track/) applies the same rule at answer time: answer only with citations into the stamped map, otherwise say "not in the map — ask a human." Sam gets a slower answer and never a wrong one.

## Worked example: the Settlement Flow page

The Confluence page everyone links, fetched over MCP into a session mapping `ledger-batch`. It says settlement results are written by `ledger-core` straight to Oracle. That was true in 2019. Since the 2022 MQ rework the results go out on `LEDGER.SETTLE.OUT` and `ledger-batch` picks them up — and the generated `ARCHITECTURE.md` reproduced the page's version, fluently, and passed review because it read like something Priya would write.

The check that catches it takes twenty seconds:

```bash
# seat: team
grep -rn "LEDGER.SETTLE.OUT" ~/ledger/ledger-core/src/main ~/ledger/ledger-mq-bridge/src/main | head -3
```

```console
$ grep -rn "LEDGER.SETTLE.OUT" ~/ledger/ledger-core/src/main ~/ledger/ledger-mq-bridge/src/main | head -3
/home/dana/ledger/ledger-core/src/main/resources/application.yml:41:    settle-out: LEDGER.SETTLE.OUT
/home/dana/ledger/ledger-mq-bridge/src/main/java/com/ledger/mq/SettleOutPublisher.java:27:    @Value("${ledger.mq.settle-out}")
```

The code names the queue; the page doesn't. So the page is wrong, the claim sourced to it goes under "Unverified" with *"confirm against `SettleOutPublisher.java:27`"*, and the map cites the code. The Field Note [The Architecture Doc That Was Confidently Wrong](/blog/the-architecture-doc-that-was-confidently-wrong/) is the long version; the rule it left behind is on [Confluence: Mining a Graveyard for the Living](/kt/confluence/): **a Confluence page is undated until the code confirms it, and a citation into a document is not a citation.**

## When it's the model, not the context

Rarely, all three checks pass — the right repo, the standing orders loaded, the file that holds the answer read and cited — and the sentence next to the citation still doesn't match the line. That's worth reporting, and worth reporting *well*, because "Claude hallucinated" gets a shrug and evidence gets a fix. The platform team own the deployment and the model pins; bring them:

- The `session_id` — from the JSON of a `-p` run, or the session you can `--resume`.
- The exact prompt, and the `CLAUDE.md` in force.
- The full `-p` JSON if headless — `result`, `num_turns`, `usage` — and the `--model` you passed.
- The citation and the line it points to, side by side, showing the mismatch.

:::caution[Don't fix it with an adjective]
"Be accurate" and "don't hallucinate" in a prompt change the tone of the invention, not its existence. The fixes above are files and a check: the rule in `CLAUDE.md`, the citation requirement, the grep before you act. If you're editing the prompt for the third time, you're pulling the wrong lever.
:::

## Prevention

- The two rules in every `CLAUDE.md`, and a stamped map imported from it.
- "Cite `path:line`" as the reflex reply to any answer you're about to act on.
- No Confluence page enters a map as a fact; it enters as a question for the code.
- The nightly freshness job ([Keeping It True](/kt/living-docs/)), so a citation that stops resolving becomes an issue labelled `kt:stale` instead of a quiet lie.
