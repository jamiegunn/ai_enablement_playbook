---
title: "Field Notes: The Morning Report Nobody Read"
description: Six weeks of a nightly job that never failed, whose report opened with the same forty bullet points every morning — and the genuinely new failure that sat in position 23 for four days until a customer found it.
keywords:
  - overnight test run report nobody reads
  - nightly job report new since yesterday
  - morning report template for agent jobs
  - report actioned rate metric
  - slack summary for nightly ci report
  - oracle jdbc driver upgrade broke integration tests
  - agent finding without evidence link
  - how to make a nightly report worth reading
date: 2026-09-01
authors: editor
tags:
  - overnight-qa
  - reports
excerpt: The job ran green every weekday for six weeks and cost about ninety cents a night. Its report opened with the same forty bullets every morning. In week five a real new failure — an Oracle JDBC driver upgrade — sat in position 23 for four days, until a partner's support ticket found it for us.
---

Here is the entire root cause. Not a workflow, not a prompt — the first ten lines of the artifact itself, which passed review because it was accurate, complete, and arrived on time:

```markdown
# Nightly triage — 2026-08-17
412 tests · 40 findings · exit 0 · $0.88 · 22 turns

## Findings
- payments-api · PaymentsControllerIT.rejectsExpiredCard — AssertionError: expected 402 but was 500
- payments-api · PaymentsControllerIT.acceptsPartialRefund — AssertionError: expected 402 but was 500
- payments-api · RefundServiceTest.refundsToOriginalMethod — AssertionError: expected 402 but was 500
- payments-api · SettlementClientIT.retriesOnTimeout — SocketTimeoutException after 2000ms
- payments-api · SettlementClientIT.surfacesUpstream5xx — SocketTimeoutException after 2000ms
- payments-api · LedgerPostingIT.postsOnce — AssertionError: expected 1 but was 0
```

Thirty-four more bullets follow, in that order. Fourteen of them — the ones red since March — appeared in exactly those words, in exactly those positions, every weekday morning for six weeks. Every line is true. Not one line tells you anything you didn't know yesterday, and not one line gives you anywhere to click.

## The timeline, by week

Reconstructed from the workflow's run history, the Actions UI's per-run view counts, the Slack channel's reaction history, and one support ticket:

```text
Week 1 · 2026-07-20  nightly-triage.yml goes live on payments-api. Everyone reads it.
                     Dana reads it out at standup. Two findings get owners in the
                     first three days. Somebody puts a party popper on the Slack post.
Week 2 · 2026-07-27  the job is extended to ledger-api. The list grows from 26 bullets
                     to 40. Nobody objects — more coverage is more coverage. Slack
                     reactions: four on Monday, one on Friday.
Week 3 · 2026-08-03  zero opens of the run for the whole week (counted afterwards).
                     The Slack post gets no reactions at all. The job is green every
                     night, costs about $0.90, uploads its artifact, exits 0. From the
                     inside, this week is indistinguishable from week one.
Week 4 · 2026-08-10  a new failure enters the list at position 31. It is fixed four
                     days later by someone who happened to hit it on their laptop.
                     Nobody ever connects the fix to the report.
Week 5 · 2026-08-17  Mon 02:17  ledger-api's integration tests start failing: an Oracle
                                JDBC driver upgrade merged Friday afternoon changes how
                                TIMESTAMP WITH LOCAL TIME ZONE is mapped. Nine tests,
                                one cause. The night lists them individually, starting
                                at position 23.
                     Tue 02:17  the same nine, the same position, the same words.
                     Wed 02:17  the same. The driver upgrade reaches staging.
                     Thu 02:17  the same. Four mornings, forty bullets, no delta.
                     Fri 11:40  partner support ticket: statement dates on
                                /v2/statements are a day early in one timezone.
                     Fri 12:35  Marcus finds the driver upgrade. Then finds it in
                                Monday's report, in position 23, where it had been
                                sitting for four days with his own repo's name on it.
Week 6 · 2026-08-24  the report is rewritten against a contract. Same job, same model,
                     same cost. Monday's report has three findings, one of them new,
                     each with a link. Two have owners by 09:30. The fourteen March
                     failures become three root causes; one gets an owner by Wednesday.
```

Read week three again, because that is the week the incident actually happened. Nothing broke. The job ran, the tests ran, the model produced a correct summary, the Slack post went out, the artifact uploaded, the exit code was 0. Every signal the system was capable of emitting said *working*. The only thing that had failed was the part nobody had instrumented: whether a human on the other end did anything at all. From the inside, a report nobody reads and a report everybody reads look identical.

## The semantics we had wrong

The mental model that produced that report: *the night's job is to tell us the state of the tests, so the report should contain the state of the tests.* Five separate mistakes are folded into that.

**A report is a diff, not a status.** A status is a thing you go and look at when you have a question — that's a dashboard, and it's fine. A thing that arrives every morning unasked has exactly one job: answer *what changed since the last time you looked?* Ours could be generated without reading yesterday's, which is the tell. It wasn't a report; it was a printout.

**A finding without evidence is homework.** "`PaymentsControllerIT.rejectsExpiredCard` — expected 402 but was 500" is not a finding, it's a task assignment: go find the run, find the log, find the stack trace, find the line. Ten of those and the reader is redoing the night's work at 09:15 with less context than the agent had at 02:17. Nobody does that twice.

**Forty items is no items.** Attention is the budget the morning report spends, and it is far smaller than the token budget. An unranked list of forty spends all of it on the first three and drops the rest, and after the first week the first three are the same three as yesterday, so it spends nothing at all.

**Nobody owned "the report."** The workflow had an owner — Dana, who wrote it, and who would have been paged instantly if it had gone red. The *artifact* had none. There is no such thing as a broken report, in the sense that anything alerts on it, so a report can rot for six weeks inside a job whose health is perfect.

**The read rate was never measured, so week three looked exactly like week one.** We measured cost per run, turns, duration and exit code — everything the job could tell us about itself, and nothing about whether it had landed. This is the proof lever from [The Three Levers](/start/the-three-levers/), pointed at the humans instead of the model: we had proof the night ran and no proof anyone was on the other end.

> **A morning report is a diff against yesterday, addressed to a named person, with the evidence attached.** Everything else is a printout of a database — and a printout that arrives every morning doesn't just fail to inform people, it actively trains them to stop looking at the place informing happens.

## The contract the report is now written against

The prompt no longer asks for a summary; it asks for this shape, and the shape is checked before the report is published. It lives in full on [the morning report page](/overnight-qa/the-morning-report/):

```markdown
# Morning report — <service> — <YYYY-MM-DD>
**Verdict:** GREEN | AMBER | RED — <the one number that matters>

## New since yesterday
<the whole reason to read this — groups/findings that did not exist in yesterday's report; "nothing new" is a valid and good line>

## What failed, by cause
### <cause> — <n> tests — NEW | UNCHANGED
- tests: …
- evidence: `path:line` | <link to log/screenshot/diff/SARIF row>
- cause: <one sentence> (verified | inference)

## Resolved since yesterday
…

## Needs a human
- [ ] <item> — proposed owner: @<name>

## What the night did on its own
- opened draft PR #… (characterization tests for <module>)
- filed issue #… (<finding>)

## What ran
- <job>: <duration> · <tests run/failed> · cost $<total_cost_usd> · turns <num_turns> · exit <code>
- week to date: $<sum>
```

Four things in that template are load-bearing, and each of them is one of the five mistakes turned around. The **verdict line** is the whole report compressed to something a person can act on from a phone. **New since yesterday** sits second, above everything else, and "nothing new" is a good morning, not an empty one — the entire week-five failure would have been the first line of Monday's report and would have been read by three people before nine o'clock. **Evidence per finding** means the reader clicks rather than reconstructs. And **needs a human** carries a *proposed owner*, because "someone should look at this" is addressed to nobody, and a name is the difference between a finding and a task.

None of that is possible without yesterday's report to compare against, which is a workflow step rather than a prompt instruction — the run downloads its own last successful artifact before the agent starts:

```yaml
      - name: Fetch last night's report (for "what's new")
        continue-on-error: true            # the first night has nothing to fetch
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          RUN_ID=$(gh run list --workflow nightly-triage.yml --status success --limit 1 --json databaseId -q '.[0].databaseId')
          [ -n "$RUN_ID" ] && gh run download "$RUN_ID" -n morning-report -D previous/ || echo "no previous run"
```

Then Slack stopped receiving the report. It receives three lines and a button; the report itself lives in the run and on the Confluence page, where it can be long:

```text
Morning report · payments-api · AMBER — 1 new cause, 13 unchanged
[ Open the run ]
```

The wall of text had been our proof that the night had happened. It was also the reason the channel had learned to scroll past it. Three lines is a thing you read by accident, which is the only way anything gets read at 09:05.

:::caution
"New since yesterday" has its own failure mode, and we hit it in week seven. If the diff is computed on test *names*, a flaky test that fails in a different class each night is new every morning, and the section that exists to hold your attention becomes the section that wastes it. The diff is computed on causes, and a finding that has been new three days running is not new — it is unowned, and it moves to needs-a-human with a name on it.
:::

The last piece is the one that would have caught week three: the night files one issue labelled `nightly`, and that issue is **closed at standup** — actioned, assigned, or explicitly declined, out loud, by a person. That ritual produces the number we now track. The **report-actioned rate** is findings a human did something with, divided by findings reported; the target is 50%, and the rule is written down where it can't be negotiated in the moment: **a night whose report-actioned rate is under 20% for two consecutive weeks is turned off and redesigned, not tuned.** Under that rule the old job dies at the end of week three, on the evidence, without anyone needing to have a difficult opinion about it. The arithmetic and the ledger it sits in are on [cost and governance](/overnight-qa/cost-and-governance/).

## What we changed

- **The report opens with a verdict and "new since yesterday."** If the second section is empty, the report says "nothing new" and is four lines long. A short report is the job working, not the job idling.
- **Every finding carries a link.** A log line, a diff, a `path:line`, a screenshot, a SARIF row. A finding the agent cannot evidence goes under needs-a-human labelled as an inference, which is honest and takes ten seconds to dismiss.
- **Findings are grouped by cause, not listed by test.** Nine failing integration tests from one driver upgrade are one line with a nine in it. Fourteen March failures are three causes. Forty bullets became four.
- **Every needs-a-human item has a proposed owner by name**, and the night's issue is closed at standup every morning — actioned or declined, but never left to drift into the next day's identical list.
- **Slack gets three lines and a button.** The full report lives in the run artifact and on the "Nightly QA" page in space `PAY`, where length costs nobody anything.
- **We measure the report-actioned rate and we publish it weekly.** Under 20% for two weeks and the job is switched off. The metric is about us, not the model, which is exactly why it was the one we hadn't thought to collect.

Six weeks. Roughly thirty green runs, about twenty-seven dollars, one genuinely new and genuinely serious finding delivered on time and in full — and a partner's support desk got to it before we did. The job never failed once. The job was never the problem.

The report wasn't lying, either — that's the part that stings. Every morning for four days it said, in position 23, in accurate words, exactly what had broken and where. We had built something that told the truth into a room we had trained ourselves to leave.
