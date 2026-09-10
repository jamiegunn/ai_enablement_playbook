---
title: "The First Two Weeks: An Onboarding Track Built From the Map"
description: Turn the stamped map into Sam's first two weeks — a tutor session that cites or says "ask a human", generated exercises with answer keys, a first ticket the map chose, and a first PR with the night's tests underneath it.
keywords:
  - how to onboard a new developer to legacy code
  - new hire onboarding plan first two weeks
  - first pull request for a new engineer
  - onboarding exercises with answer keys
  - claude code as a tutor for a codebase
  - new developer asks the senior engineer too many questions
  - time to first meaningful pr
  - trace a request end to end onboarding checkpoint
  - not in the map ask a human
sidebar:
  order: 9
---

You are here if: Sam starts Monday and `ledger-api` has a stamped map; or you've onboarded three people onto Ledger by sitting them next to Priya and you'd like the fourth to cost her less; or you *are* Sam, reading this on day one — skip to [Sam's seat](#sams-seat) and come back for the rest. This page serves the **Teach** stage: the artifacts exist, and this is what you do with them.

## An onboarding track is a schedule of questions, not a reading list

Most onboarding is a reading list and a buddy. The reading list is Confluence, which this playbook has already triaged into true, wrong, and "why" ([Confluence](/kt/confluence/)); the buddy is Priya, whose hours are the scarcest thing in the building. Sam's predecessor took eleven weeks to a first meaningful PR under that model, and about two-thirds of the ~30 questions a week the team channel carries (Priya's estimate — PROVISIONAL, until [the measurement page](/kt/measurement-and-governance/) counts them) are of the form "where is X?" and "why does Y?". *Where* is what the map answers. *Why* is what the decision records answer. Both are now files with citations, so the schedule can be built from them.

**An onboarding track is a sequence of questions the new hire answers using the stamped artifacts, each with a proof that they did.** Not "read the architecture doc" — "trace a settlement from the queue to the table and write down the six files it passes through." The proof is what makes it a track rather than a hope: a checkpoint Sam can pass, a file Sam wrote, a PR that merged. In lever terms: Context is the stamped map loaded into Sam's session; Tools are read-only for the first week by construction; Proof is Sam opening the cited line every time.

The whole thing rests on the artifacts being stamped. A track built on a `kt:draft` map teaches Sam the model's inferences as facts, which is worse than the eleven weeks. Here's what has to exist on Monday, and what degrades if it doesn't:

| Artifact | State needed | If it's missing |
|---|---|---|
| `ledger-api/CLAUDE.md` (the three sections) | Stamped, references the map | The tutor has no standing orders; it will guess. Don't start |
| `ledger-api/docs/ARCHITECTURE.md` | `kt:stamped` | Same. The quick start produces it in a week: [The 90-Minute Repo Map](/kt/quick-start/) |
| `ledger-core/docs/ARCHITECTURE.md` | At least `kt:draft` with a real `## Unverified` section | Exercises 1, 3 and 4 below cross into core; drop them or mark the answers "draft — verify with Priya" |
| `~/ledger/SYSTEM.md` | Draft; the settlement edges stamped by Marcus if you can get them | The queue-to-table checkpoint becomes a week-two goal, not a week-one one |
| `docs/decisions/` | Whatever exists | "Why" questions go straight to the Thursday list instead of the tutor |
| `nightly-characterize.yml` running against `ledger-api` | Green for a week | Week two's safety net is the existing suite only; say so in the PR |
| Sam's credential, GitHub access, read-only Confluence | Day-one ready | Day one is lost. [Day-1 Checklist](/start/day-1-checklist/) is the list to send to the platform team the week before |

## The two weeks at a glance

| Day | Activity | Artifact used | Proof |
|---|---|---|---|
| 1 (Mon) | Access; build both repos; the guided tour with the tutor | `CLAUDE.md`, `docs/ARCHITECTURE.md`, the `tutor` skill | `claude -p` returns `ready`; the build passes; Sam has opened five cited files |
| 2 (Tue) | Five guided exercises with answer keys | `gen-exercises` output | Sam's answers file, each answer a `path:line`, checked against the key |
| 3–5 (Wed–Fri) | The first ticket, chosen from the map's "Safe places to make a first change" | Map section 8; `CLAUDE.md`'s "What not to do" | A draft PR by Friday, build green, existing tests green |
| 5 (Fri) | Checkpoint one | The stamped map | Sam traces `LEDGER.SETTLE.IN` → Oracle table, six hops, all cited, no questions asked |
| 6–7 (Mon–Tue) | Rebase onto the night's characterization tests; finish the change | `nightly/characterize-*` branch | Pinned tests green before and after Sam's change |
| 8–9 (Wed–Thu) | PR review; Priya corrects the *map* where Sam's confusion revealed a gap | The PR; a `docs/` PR | Review comments answered with citations; one doc correction merged |
| 10 (Fri) | First meaningful PR merged; checkpoint two | — | `gh pr list --author sam --state merged` shows it; the questions list is under ten |

Two weeks, not eleven. That's the target from the [measurement thread](/kt/measurement-and-governance/), and the track is how you hit it.

## Day 1: access, and the guided tour

Access first, because a day-one that ends in a permissions ticket teaches Sam the wrong thing about the team. The platform team's managed settings put the provider credential on Sam's laptop; the smoke test is the same one the quick start uses:

```bash
# seat: team — Sam's laptop, after the platform team's managed settings have landed
claude -p "Reply with the single word: ready" --max-turns 1 --bare
```

```console
ready
```

If that prints anything else, [Day-1 Checklist](/start/day-1-checklist/) has the four things to check, in order. Then clone `ledger-docs` (the workspace, with the twenty-two other repos inside it — [Mapping the System](/kt/mapping-the-system/) explains why the workspace is itself a repo), and build the two repos Sam will touch: `./mvnw -q -DskipTests package` in `ledger-api` and `ledger-core`. A build that passes on day one is the first proof, and it's Sam's, not the tutor's.

The tour is a Claude session with the map loaded and a skill that refuses to do anything but cite. The skill:

```markdown
---
name: tutor
description: Answer a new hire's question about this workspace using ONLY docs/ARCHITECTURE.md files and the code, with a path:line citation for every claim; say "not in the map — ask a human" when the answer isn't there. Never proposes changes.
allowed-tools: Read Grep Glob
argument-hint: "[your question]"
---
You are tutoring a new engineer (Sam) in their first week. Question: $ARGUMENTS

Rules:
1. Answer from two sources only: the docs/ARCHITECTURE.md of the repo the
   question is about (read its status line first — if it is DRAFT, say so in
   the first sentence of your answer), and the code itself. Never from
   Confluence, never from memory of how "Spring apps usually work".
2. Every factual sentence ends with a citation: (path:line) or
   (path:line-line). A sentence you cannot cite, you do not write.
3. If the map and the code disagree, say so, cite both, and stop. Do not pick
   one.
4. If the answer is not in the map and you cannot find it in the code with a
   search, answer exactly: "not in the map — ask a human", then say what you
   searched for, so Sam can bring that to the human.
5. Never propose a change, a refactor, or a fix, even if asked. This week is
   for reading. If Sam asks for a change, answer: "not this week — read the
   cited lines and add it to your Thursday list".
6. Keep it short: the citation is the answer; one sentence of explanation
   per citation is plenty. Sam is going to open every file you cite.
```

Rule 1 is the guard against the Field Note: the tutor reads the map, and the map's first line says whether an expert has stamped it, so Sam always hears "DRAFT" before hearing an answer. Rule 2 is [the citation rule](/kt/mapping-a-repo/#the-citation-rule) applied to speech; the tutor is allowed to be wrong, but never uncheckably wrong. Rule 3 exists because Sam will hit a disagreement in the first hour — the map is a week old and the code moved — and a tutor that resolves it silently teaches Sam one of two things with no way to know which. Rule 4 is the sentence the whole overview promised, and the "what I searched for" clause is what turns Sam's question to Priya into a correction rather than a question. Rule 5 is the reason `allowed-tools` has no `Edit` in it: the bound is structural, and the sentence is just the explanation. `disable-model-invocation` is deliberately absent — Sam types `/tutor` and it's Sam's session; nothing unattended here. Skill mechanics are the Toolkit's: [Skills](/toolkit/skills/).

Sam's first hour looks like this:

```bash
# seat: team — Sam's laptop, in the workspace, interactive
cd ~/ledger
claude "/tutor how does a settlement request get from the REST facade to the Oracle table?"
```

```markdown
ledger-api/docs/ARCHITECTURE.md is STAMPED (2026-09-12, Priya); ledger-core's is DRAFT — the last three hops below are from the draft and the code.

1. `POST /settlements` is handled by `SettlementController.create` (ledger-api/src/main/java/com/ledger/api/web/SettlementController.java:44).
2. It calls `SettlementService.settle` in ledger-core over the in-process client — there is no HTTP hop (ledger-api/src/main/java/com/ledger/api/web/SettlementController.java:61-74).
3. `settle` validates, then applies FX before fees (ledger-core/src/main/java/com/ledger/core/settle/SettlementService.java:57; ledger-core/src/main/java/com/ledger/core/fx/FxApplier.java:88).
4. Amounts are rounded HALF_EVEN in the shared jar (ledger-shared/src/main/java/com/ledger/shared/MoneyMath.java:47).
5. Postings are written by the DAO to LEDGER.SETTLEMENT_POSTING (ledger-core/src/main/java/com/ledger/core/persist/SettlementPostingDao.java:73).

Not in the map: what happens to the posting after 03:00 — that's ledger-batch, whose map I did not read for this question.
```

Every numbered line is something Sam opens. The last line is the tutor being honest about scope, which is the behaviour you want Sam to copy. And the second kind of answer, which Sam should hear on day one so it isn't a surprise on day four:

```markdown
not in the map — ask a human.
Searched: "03:00", "0 0 3", "@Scheduled" in ledger-batch/docs/ARCHITECTURE.md and ledger-batch/src/main — found the schedule
(ledger-batch/src/main/java/com/ledger/batch/settle/SettlementJobListener.java:41) but nothing that says WHY it is 03:00 rather than midnight.
Bring that citation to Marcus.
```

That's a "why" question, and no amount of grepping answers one. Sam writes it in a questions file for Thursday, with the citation, and moves on.

:::note[What the model sees]
The workspace `CLAUDE.md` (which indexes each repo's `CLAUDE.md`), the `tutor` skill, the one or two `ARCHITECTURE.md` files the question is about, and whatever Grep and Read return. Not the whole estate — the tutor searches, it doesn't read 410,000 lines. If Sam's session gets slow or vague, it's read too much; [Context Exhausted](/troubleshooting/context-exhausted/) is the page, and `/clear` is the fix.
:::

## Day 2: exercises with answer keys

Reading a map teaches the shape; finding things teaches the reflexes. The exercises are generated from the map by a skill so that the answer key is verified on the day it's written — the skill reads every line it's about to cite — and then, because the key lives in `docs/` with `(path:line)` citations, the nightly freshness job keeps checking it from then on ([Keeping It True](/kt/living-docs/)). An exercise file nobody maintains goes stale in a month; this one opens an issue when it does.

```markdown
---
name: gen-exercises
description: Generate five find-it exercises for a new hire from the stamped docs/ARCHITECTURE.md files, each with an answer key the skill has verified by reading the cited line, written to docs/onboarding/exercises-<date>.md. Human-invoked only.
disable-model-invocation: true
allowed-tools: Read Grep Glob Write
argument-hint: "[repos to draw from, e.g. ledger-api ledger-core ledger-mq-bridge]"
---
Write five exercises for a new engineer's second day, drawn from the
docs/ARCHITECTURE.md of: $ARGUMENTS. Only from sections whose status line
says STAMPED, unless a section is the only source — then mark the exercise
"draft — verify with the expert".

Each exercise: a question of the form "find where X happens / which Y does Z",
an expected answer as (path:line) citations, a "Verify:" line with the exact
`sed -n 'A,Bp' path` command that shows the cited lines, and a "Trap:" line
naming the wrong answer a reader of Confluence space LEDGER would give, if
there is one. Before writing an answer, Read the cited lines and confirm they
contain what you claim. If they do not, do not write that exercise.

Spread the five across: one entry point, one request-path hop, one data
question (a table or queue), one integration, one thing from "Things that
will surprise you". Write the file and nothing else.
```

The output, as Sam receives it on Tuesday morning:

```markdown
# Exercises — week one (generated 2026-09-14; every answer verified by reading the cited line)

1. **Find where FX conversion is applied to a settlement amount.**
   Expected: `FxApplier.apply` (ledger-core/src/main/java/com/ledger/core/fx/FxApplier.java:88), called from `SettlementService.settle` before fees are applied (ledger-core/src/main/java/com/ledger/core/settle/SettlementService.java:57).
   Verify: `sed -n '84,92p' ledger-core/src/main/java/com/ledger/core/fx/FxApplier.java`
   Trap: the 2019 "Settlement Flow" page says FX is applied after fees. It was, until 2022.

2. **Which queue carries inbound settlement instructions, and which class consumes it?**
   Expected: `LEDGER.SETTLE.IN` (ledger-mq-bridge/src/main/resources/application.yml:23), consumed by `SettleInListener.onMessage` (ledger-mq-bridge/src/main/java/com/ledger/mq/SettleInListener.java:41).
   Verify: `sed -n '38,44p' ledger-mq-bridge/src/main/java/com/ledger/mq/SettleInListener.java`
   Trap: Confluence says files arrive by SFTP and the batch imports them. No SFTP client exists in any of the 23 repos.

3. **What rounding mode does money arithmetic use, and where is it fixed?**
   Expected: `RoundingMode.HALF_EVEN` (ledger-shared/src/main/java/com/ledger/shared/MoneyMath.java:47).
   Verify: `sed -n '44,50p' ledger-shared/src/main/java/com/ledger/shared/MoneyMath.java`
   Trap: the Oracle package rounds half-up (ledger-db/legacy/DO_NOT_RUN/pkg_settle.sql:212). Both are deliberate; the why is a decision record, not a bug.

4. **Which endpoint creates a settlement, and what does its controller call in `ledger-core`?**
   Expected: `POST /settlements` → `SettlementController.create` (ledger-api/src/main/java/com/ledger/api/web/SettlementController.java:44) → `SettlementService.settle` (ledger-core/src/main/java/com/ledger/core/settle/SettlementService.java:57).
   Verify: `sed -n '40,48p' ledger-api/src/main/java/com/ledger/api/web/SettlementController.java`
   Trap: there is no business logic in the controller; if you find yourself reading validation code in ledger-api, you're in the wrong repo.

5. **What stops the 03:00 batch from posting twice for the same business date?**  *(draft — verify with Marcus)*
   Expected: a lock row in `SETTLEMENT_RUN` keyed by business date, taken before any write (ledger-batch/src/main/java/com/ledger/batch/settle/SettlementJobListener.java:41); the table is defined in the legacy folder (ledger-db/legacy/DO_NOT_RUN/settle_run_lock.sql:1).
   Verify: `sed -n '36,46p' ledger-batch/src/main/java/com/ledger/batch/settle/SettlementJobListener.java`
   Trap: `DO_NOT_RUN` means "already applied in 2019", not "broken". Never run it; do read it.
```

Sam's proof is a file: `docs/onboarding/sam-week-1-answers.md`, one `path:line` per exercise, written *before* looking at the key. The point is not the score; it's that by lunchtime on Tuesday Sam has run Grep across five repos and opened a Liquibase folder, an MQ config, and the shared jar, and has learned that the Confluence trap exists. Exercise 3's trap is the first "why" on Sam's Thursday list — it's also decision record `0004-moneymath-rounding` if the interview page has run, in which case the tutor cites it.

## Days 3–5: the first ticket, chosen by the map

The map's eighth section exists for exactly this day. It lists three places to make a first change, each with the tests that cover it cited, because a first ticket chosen by "this looks easy" is how new hires end up in `legacy/`. From `ledger-api`'s stamped map, representative:

```markdown
## 8. Safe places to make a first change
- `SettlementStatusDto` and its mapper — 14 tests (src/test/java/com/ledger/api/dto/SettlementStatusMapperTest.java:1); pure mapping, no I/O.
- `SettlementController.get` — 9 tests including a WebMvc slice (src/test/java/com/ledger/api/web/SettlementControllerTest.java:1); read-only path.
- `ExportController` CSV formatting — 11 tests (src/test/java/com/ledger/api/web/ExportControllerTest.java:1); one file, no core call.
Not safe: anything under src/main/java/com/ledger/api/legacy/ (no tests; see CLAUDE.md).
```

Pick the ticket with four rules: it lives in one repo; it touches one of the three listed places; it needs no MQ, no Oracle, and nothing under `legacy/`; and it is a real backlog item, because a made-up ticket teaches Sam that the track is theatre. Sam's is "return `settledAt` on `GET /settlements/{id}`" — the field already exists in core (`SettlementService.java:203-211` populates it), the DTO doesn't carry it, and the mapper test will need one new case. Thirty lines, one repo, fourteen existing tests as a net.

Sam works this in an ordinary session, not the tutor — the tutor's week-one rule forbids changes, and that's correct for questions, but the ticket is a change. The session still runs under `ledger-api`'s `CLAUDE.md`, whose "What not to do" section is the standing order that keeps Sam out of `legacy/` and stops the model inventing a field name. The proof for Friday is a draft PR with the build and tests green — `./mvnw test` in `ledger-api`, output attached to the PR — not a merged one. Merging is week two's job, and the reason is the next section.

## Week 2: the first PR, with the night's tests underneath

Here's the bridge between the two playbooks, and why the ticket stays a draft over the weekend. `ledger-api` has decent tests; `ledger-core`, which Sam's change reads from, has fourteen tests on `FxApplier` and almost nothing on the DTO-facing service methods. The Overnight playbook's L2 job writes **characterization tests** — tests that pin what the code does today, including the parts that look wrong, so a change that alters behaviour fails loudly — every weeknight at `27 6 * * 1-5` UTC, on a branch named `nightly/characterize-<date>`, never on `main`. [Characterization Tests](/overnight-qa/characterization-tests/) owns how targets are chosen and how the branch is reviewed; the onboarding page's ask is one line: get `SettlementStatusMapper` and `SettlementController.get` onto Thursday night's target list, so Monday morning there's a branch pinning their current behaviour.

Week two then runs in a fixed order. Monday, Sam (or the reviewer) merges the night's pinned tests first, then rebases the draft onto them — the tests are the *before* picture. Tuesday, Sam finishes the change and adds the one new mapper case; the pinned tests still pass, which is the proof the change is additive. Wednesday, the PR leaves draft and Priya is requested as reviewer — of the diff, thirty lines, with the test output in the description. Thursday, review; Friday, merge. The number the team records is the merge date minus Sam's start date, and it's the first data point on the [time-to-first-PR metric](/kt/measurement-and-governance/): two weeks against a baseline of eleven.

:::caution[The safety net is the night's, not the tutor's]
The tutor never proposed the change and never will; the characterization tests never read the map. That separation is deliberate. A model that documents the code and a model that tests the code are two different jobs with two different proofs, and a new hire who learns that on their first PR has learned the whole site.
:::

## Checkpoints

A checkpoint is a thing Sam can do, witnessed, not a feeling of readiness. Two of them, one per week:

**Week one — you're done when you can trace a settlement from `LEDGER.SETTLE.IN` to the Oracle table without asking.** Six hops, written down with citations, on a whiteboard or in a file, with the map closed:

```markdown
LEDGER.SETTLE.IN → SettleInListener.onMessage    (ledger-mq-bridge/src/main/java/com/ledger/mq/SettleInListener.java:41)
→ SettlementService.settle                        (ledger-core/src/main/java/com/ledger/core/settle/SettlementService.java:57)
→ FxApplier.apply, then fees                      (ledger-core/src/main/java/com/ledger/core/fx/FxApplier.java:88)
→ MoneyMath rounding, HALF_EVEN                   (ledger-shared/src/main/java/com/ledger/shared/MoneyMath.java:47)
→ SettlementPostingDao.insert                     (ledger-core/src/main/java/com/ledger/core/persist/SettlementPostingDao.java:73)
→ LEDGER.SETTLEMENT_POSTING; netted and closed at 03:00 by the batch (ledger-batch/src/main/java/com/ledger/batch/settle/SettlementJobListener.java:41)
```

Plus: both repos build on Sam's machine; Sam can name the three MQ queues and which repo touches each; Sam can say which Confluence page not to trust and why. Dana checks it Friday afternoon in ten minutes by opening two of the six files.

**Week two — you're done when the first PR is merged and the Thursday questions list is under ten.** The second half matters as much as the first: the list's length is the cost of the map's gaps, and each item on it is either a "why" for Marcus or a correction for the map.

## Sam's seat

The expert-hour contract applies to you from day one, and it's easier to keep than it sounds, because the tutor makes the cheap questions free.

**How to ask.** Name the thing you're looking at. "How does settlement work?" gets a page; "the map says `FxApplier.java:88` applies the rate before fees — what supplies the rate?" gets one citation. One question per `/tutor`; if the answer raises three more, ask them one at a time, and `/clear` between topics so the session doesn't drag `ledger-batch` into a question about `ledger-api`.

**How to verify.** The citation is the answer; the prose is the tutor's explanation of it, and explanations can be wrong. So open the file, every time:

```bash
# seat: team — Sam's laptop; the citation from the tutor's answer
sed -n '84,92p' ~/ledger/ledger-core/src/main/java/com/ledger/core/fx/FxApplier.java
```

```console
    public Money apply(Money amount, FxRate rate) {
        requireSameDay(rate);
        BigDecimal converted = amount.value().multiply(rate.value());
        return MoneyMath.round(converted, amount.currency());
    }
```

If the lines say what the tutor said, you've learned something true. If they don't, you've found either a stale citation or a wrong explanation, and either one is worth more than the answer — it's a correction, and corrections are what the experts want from you.

**When to ask a human.** When the tutor says "not in the map"; when the map and the code disagree and you can't tell which is current; when the question starts with "why". Never one at a time. Keep a file, and on Thursday bring the list to twenty booked minutes with Priya or Marcus — each item with the citation you already have and what you searched for. "The tutor cited line 88 and the code moved" is a two-minute answer and a doc fix. "How does FX work?" is an hour, and it's the hour the whole playbook exists to protect.

:::tip[Good citizen]
Ten prepared questions with citations cost Priya twenty minutes and produce ten corrections to the map. Ten Slack messages across the week cost her the same twenty minutes in interruptions and produce nothing durable. Same questions, same expert — the difference is entirely whether Sam batched them and brought the evidence.
:::

## What changes for Priya and Marcus

Nine years of "just ask me" ends, and what replaces it is narrower and better: they answer *corrections*, not *questions*. A question is "how does X work?" and it costs an explanation every time it's asked. A correction is "the map says X at `path:line`, Sam saw Y — which is right?" and it costs a look at one line, once, after which the map is fixed and the question never arrives again. Every mechanism on this page is shaped to turn the first kind into the second: the tutor's "what I searched for" clause, the exercise keys, the Thursday list, and the PR.

The corrections arrive through two channels, both diffs. The first is a `docs/` PR — when Sam's Thursday list reveals that the map's FX section never mentions that rates go stale after 16:00, the fix is three lines in `ARCHITECTURE.md` citing `FxRateCache.java:31`, opened by Sam, reviewed by Priya in a minute, merged with the label flipping back to `kt:stamped`. The second is the code review on Sam's PR, which Priya reviews as a diff with tests, not as a conversation. Neither channel asks her to explain anything from scratch, and after a month the thing you can measure is the one the overview promised: expert questions in the channel halved, and the ones that remain are the "why" questions only a human can answer — which is the interview page's job, and hers.

## Where next

- **Next in the journey:** [Keeping It True](/kt/living-docs/) — Sam's exercises and the map are now `docs/` files with citations; the nightly job that checks them, and the PR-time job that proposes updates, are what stop the track rotting before the next hire.
- **The lateral jump:** [Characterization Tests](/overnight-qa/characterization-tests/) — week two's safety net, from the other playbook: what the night writes, how targets are chosen, and how to review the branch on Monday morning.
