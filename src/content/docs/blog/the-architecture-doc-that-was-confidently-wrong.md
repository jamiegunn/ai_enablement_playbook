---
title: "Field Notes: The Architecture Doc That Was Confidently Wrong"
description: The first AI-generated ARCHITECTURE.md for ledger-core paraphrased a 2019 Confluence page fetched over MCP, passed a twenty-minute read of the prose, and put 340 double-posted settlements into staging — a postmortem on what "the model read the docs" actually means.
keywords:
  - ai generated architecture doc was wrong
  - claude read confluence and described the old flow
  - architecture.md with no citations
  - confluence page out of date ai
  - how to review ai generated documentation
  - settlement double posted after retry
  - path:line citations for generated docs
  - expert stamp pr approval kt:stamped
  - stale citation kt:stale
date: 2026-07-21
authors: editor
tags:
  - kt
  - confluence
  - proof
excerpt: We asked a session to write the architecture doc for our settlement engine. It read the Confluence page everyone links, wrote three hundred fluent lines about a flow that hasn't existed since 2022, and our best engineer said "looks about right" after twenty minutes. A contractor built on it. On a Thursday, the staging batch posted 340 settlements twice.
---

Here is the entire root cause, one section of a generated `docs/ARCHITECTURE.md` that passed review with "looks about right":

```markdown
<!-- ledger-core/docs/ARCHITECTURE.md as merged 2026-06-30 — the "Settlement" section -->
## Settlement

Settlement runs nightly. `ledger-batch` (03:00) selects the day's unsettled
transactions from `LEDGER_TXN` and calls `SettlementService.settle()` in
`ledger-core`, which writes one `SETTLEMENT` row and one `LEDGER_POSTING` row
per transaction through the JDBC `SettlementDao`, in one database transaction
per chunk. A chunk that fails is rolled back and retried on the next run.
Settlement is therefore idempotent: re-running for a date re-selects only
rows where `SETTLED_AT IS NULL`, so a retry can never post twice.
```

Every sentence is fluent. Every sentence was true on the eighth of November, 2019. Not one sentence has a pointer into the code, and that turned out to be the only fact about the document that mattered.

The session that wrote it had the Atlassian MCP server connected, because we'd just got it allowlisted and were pleased about it. It searched space `LEDGER` for "settlement", the "Settlement Flow" page came back first — it's the most-linked page in the space — and the section above is a paraphrase of it. In the 2022 rework, `ledger-batch` stopped calling `settle()`. It publishes one request per transaction to `LEDGER.SETTLE.IN`; `ledger-mq-bridge` drives `ledger-core`; replies come back on `LEDGER.SETTLE.OUT`, and `SETTLED_AT` is written by the reply reader, minutes later. Nothing in that flow is synchronous, and nothing in it is idempotent by accident. "Idempotent" was the word that did the damage.

## The timeline, from the page history to the batch log

Reconstructed from the Confluence page's version history, the session's `--output-format json` result, the PR timestamps, and the staging batch log:

```text
2019-11-08        "Settlement Flow" last edited, Confluence space LEDGER. Describes
                  ledger-batch calling SettlementService.settle() over JDBC. True.
2022-04-19        MQ rework merged. ledger-batch publishes to LEDGER.SETTLE.IN;
                  ledger-mq-bridge drives ledger-core; replies on LEDGER.SETTLE.OUT;
                  SETTLED_AT written by the reply reader. The page is not edited.
2026-06-29 14:10  session opened in ledger-core: "write docs/ARCHITECTURE.md for an
                  engineer joining next quarter". Atlassian MCP connected. No
                  CLAUDE.md. No citation rule. One repo in the working directory.
2026-06-29 14:12  searchConfluence, CQL space = LEDGER and text ~ "settlement"
                  -> "Settlement Flow" is the first result
2026-06-29 14:13  getConfluenceContent, detail="full": 2,400 words, two 2019 diagrams
2026-06-29 14:14  Grep "SETTLE.IN" in ledger-core: no matches. The queue names live in
                  ledger-mq-bridge and ledger-batch, which the session cannot see.
2026-06-29 14:31  docs/ARCHITECTURE.md written: 310 lines, 0 citations. "Settlement"
                  section paraphrases the page. num_turns 38.
2026-06-30 10:00  Priya reads the doc between meetings. Twenty minutes. "Looks
                  about right."
2026-06-30 10:22  PR merged. No label. Nothing records that a review happened,
                  or of what.
2026-07-01        contractor picks up "retry a failed settlement chunk within the
                  same run", designed from the doc: re-select SETTLED_AT IS NULL,
                  call again, safe by construction.
2026-07-08 16:40  contractor's PR merged. Reviewed against... the doc.
2026-07-09 03:00  staging batch. ledger-mq-bridge restarts at 03:04 (unrelated).
                  One chunk's replies are late; the retry re-selects the same 340
                  rows and publishes them again. Replies for both copies arrive.
                  340 settlements posted twice.
2026-07-09 08:50  Marcus, reading the staging batch log: 340 LEDGER_POSTING rows
                  sharing a settlement reference. "That's not how settlement
                  works." "The doc says-" "Which doc?"
```

Read 14:14 again. The session *saw* the disagreement — no `SETTLE.IN` anywhere in `ledger-core` — and nothing told it what a disagreement between a document and the code means, so it did what a fluent writer does and resolved it toward the more detailed source. The page was detailed. Then read 10:00. Priya's twenty minutes went on 310 lines of prose describing a flow she personally replaced in 2022, and it read fine, because it was a paraphrase of a page she'd almost certainly written parts of. "Looks about right" was an accurate review of the writing.

## The semantics we had wrong

The mental model that produced that document: *we connected the model to Confluence, so it read the docs, so it knows the system.* Three separate mistakes are folded into that sentence.

**"The model read the docs" is not "the model knew."** Reading puts words in the context window; it doesn't rank them by truth. The page was in the window. The two repos that would have contradicted it were not, and the one that was contradicted it only by silence, which a model does not hear. We had pulled the context lever hard, toward the wrong source, and congratulated ourselves on pulling it.

**A review of prose is not a review of evidence.** A twenty-minute read can tell you whether a document *sounds like* the system. It cannot tell you whether the document *is* the system, because there is nothing in it to check against — no line to open, no symbol to search for. Priya is the scarcest resource in the building, and we handed her a story and asked if it was well told.

**Confluence is undated.** Technically the page has a last-modified date. But nothing in the body says "this stopped being true in April 2022", the search returns it because everything links to it, and a model reads words, not metadata. A Confluence page is a claim with a timestamp, and the timestamp is the least prominent thing on it — to the model and, it turns out, to us.

> **A generated claim about code is true only when it points at the code.** Every claim cites `(path:line)`. A claim whose only source is a document goes under "Unverified", with what would confirm it. And the expert reviews the citations, not the prose — because checking that `SettlementService.java:112` says what the sentence says takes twenty seconds, and checking whether a paragraph is true takes a re-read of the module.

That is the proof lever from [The Three Levers](/start/the-three-levers/), and this incident is the site's standing example of leaving it unpulled: the model could see enough and was allowed enough; nobody checked, because there was nothing checkable.

## The replacement doc

The fix is a rule in a file, not a better prompt. The `map-repo` skill that now writes every repo map opens with rules that override everything else; the two that would have prevented this are quoted from [the mapping page](/kt/mapping-a-repo/):

```markdown
1. Every factual claim ends with a citation `(path:line)` or `(path:line-line)`.
   A claim you cannot cite goes under "## Unverified" with what would confirm it.
5. Never invent a class, method, table, queue, or endpoint name. If a name
   appears only in documentation and not in code, say exactly that.
```

The same section, regenerated under the skill on July 13, with no Confluence in the window at all:

```markdown
**Status: DRAFT — not yet reviewed by a named expert.**

## Integrations — settlement

- Settlement is entered through a command interface, not from `ledger-batch`.
  The only caller of `SettlementService.settle()` in this repo is
  `SettleCommandHandler` (src/main/java/com/ledger/core/settle/SettlementService.java:112),
  an interface implemented outside this repo — the MQ adapter lives in
  `ledger-mq-bridge`.
- `settle()` does not write `SETTLED_AT`. It returns a `SettlementResult`
  (src/main/java/com/ledger/core/settle/SettlementService.java:131-140); the column
  is written by whoever consumes the result. From the caller's side, settlement
  is asynchronous.
- `SettlementDao.settleDirect()` exists and has no callers found in this repo
  (src/main/java/com/ledger/core/settle/SettlementDao.java:140). No callers found
  is a finding, not "unused".

## Unverified

- Confluence "Settlement Flow" (space LEDGER, last edited 2019-11-08) says
  `ledger-batch` calls `settle()` over JDBC and that re-running a date is
  idempotent. No such call exists in this repo; `ledger-batch` was not searched.
  Would confirm: grep `ledger-batch` for `SettlementService`; ask Marcus.
```

Priya's thirty minutes on July 16 went differently, because the unit of work was different. She did not read the prose. She opened the cited lines — eleven of them for the settlement section — and left four review comments: two corrections, one "this is right, and it's exactly what the contractor needed to know", and an answer to the Unverified item: *no, MQ since 2022, the batch never calls `settle()`, archive the page.* Her approval merged the PR, the label flipped from `kt:draft` to `kt:stamped`, and that approval *is* the stamp — a git event with her name and a date on it, not a feeling in a hallway. The gate she walked the doc through is written up as [the review gate](/kt/mapping-a-repo/#the-review-gate); the rule that Confluence is triaged and never trusted, and the archive-with-a-comment step that retired the page, are on [Confluence: Mining a Graveyard for the Living](/kt/confluence/).

The last piece is that a citation can go stale the day after it's stamped. Every weekday the freshness job runs `scripts/check-citations.sh` over `docs/`, which is why the citation format is rigid — the script is a regex, not a reader:

```bash
# seat: team
scripts/check-citations.sh
```

```console
LINE GONE      src/main/java/com/ledger/core/settle/SettlementService.java:131-140 (file now has 128 lines)

1 stale citation(s)
```

That line, from the night after someone refactored `settle()`, became one issue labelled `kt:stale` and a ten-minute fix the next morning. The old document could never have produced it, because there was nothing in the old document that could go stale. [Keeping It True](/kt/living-docs/) owns the job.

:::caution
The structural check catches a file that moved or a line that vanished. It cannot catch a line that still exists and no longer says what the doc claims — that is the agent's weekly job, bounded like any other night, and it is why the stamp is revocable rather than permanent. A stamped doc is true as of the stamp, not forever.
:::

## What we changed

- **The citation rule is in the skill, not the prompt.** `(path:line)` on every claim, or the claim goes under "Unverified". The skill runs the same way for every repo and every session, which is the point: the rule doesn't depend on who typed the prompt.
- **Documents are never a citation target.** A Confluence page can *seed* a claim; only the code can *support* one. "The page says X; the code shows no X" is now a sentence the doc must contain rather than a disagreement the model quietly resolves.
- **The first line of every generated doc is `**Status: DRAFT — not yet reviewed by a named expert.**`** — and it stays there until a named expert's PR approval removes it. A doc with no status line is treated as `DRAFT`.
- **The review gate reads citations, not prose.** Thirty minutes, one section at a time, corrections as review comments, merge is the stamp, the label flips. Priya's name is on it, with a date, in git.
- **Confluence is triaged before it's read.** The pass on [the Confluence page](/kt/confluence/) scores every page for freshness, checks the ones that matter against the code, and archives the wrong ones with a comment saying what replaced them. "Settlement Flow" now has one line of content and a link to `ledger-core/docs/ARCHITECTURE.md`.
- **The nightly freshness check runs on every citation, and its failures are one issue, never one per line.** A stale pointer is a ten-minute fix if you hear about it the next morning and a repeat of this incident if you don't.

Twenty minutes of Priya's time. Three hundred and forty settlements posted twice in staging, and a contractor who did everything right by the only document he'd been given. The gap between those two things was entirely made of a sentence with no pointer in it, and we'd read that sentence and nodded.

The page wasn't lying, either — that's the part that stings. On the eighth of November 2019, every word of it was true, and Priya may well have been the one who made it true. The model did precisely what we asked: it read the docs. We were the ones who heard "it read the docs" and understood "it knows", and then spent the one resource we can't buy more of — twenty minutes of the person who knew better — checking whether the story was nicely told.
