---
title: Start From Your Situation
description: Twelve situations in your own words — the suite is red and nobody knows which failures matter, the UI has no tests, the night burned the budget, InfoSec wants a list — each routed to the exact pages that fix it, with an honest effort estimate.
keywords:
  - test suite is red and nobody knows which failures matter
  - no tests on legacy code before making changes
  - regression coverage before java 17 migration
  - ui has no automated tests
  - nightly dependency check with impact not a cve list
  - morning report nobody reads
  - nightly ai job cost too much
  - claude code github actions bedrock credentials
  - what can the ai agent access security review
  - can ai fix failing tests overnight
sidebar:
  order: 3
---

Find the sentence that sounds like your week; follow the path. Nothing on this page is new material — it's routing, with an honest effort estimate per journey so you can plan the work instead of discovering it. Every path assumes a suite that runs in CI, a credential the platform team issued, and a channel; if you don't have those, [the gate](/overnight-qa/quick-start/#the-gate-four-checks) in The First Night is where the effort really begins.

## "Our suite is red and nobody knows which failures matter"

Fourteen tests have been red in `payments-api` since March. Everyone knows they're "the flaky ones"; nobody can name which failure is the same bug three times and which is new since Tuesday. You'll run the suite as it is, let a read-only agent group tonight's failures by root cause with a `path:line` for each, and post three lines to `#payments-nightly`. On this site's cast that turned fourteen red tests into three causes and one owner in the first week.

**Path:** [The First Night](/overnight-qa/quick-start/) (the whole recipe, annotated) → [Reading `night.json`](/overnight-qa/quick-start/#reading-nightjson-the-first-time) → [watch it for a week](/overnight-qa/quick-start/#watch-it-for-a-week). **Effort:** 30 minutes to set up if the gate passes; one credential ask if it doesn't; then a week of ten-minute mornings before you change anything.

## "We have no tests on the legacy module we're about to change"

Sam starts Monday and the first ticket touches `ledger-shared`'s `MoneyMath`, which everything routes through and nothing tests. You don't know what's *correct* in there — Priya does, and she's retiring — but the code knows what it *does*. You'll have the night write characterization tests that pin current behaviour (including the surprising bits, labelled as such), run them three times, keep only the deterministic ones, and open one draft PR for a human to read before Sam's first commit.

**Path:** [What a characterization test is](/overnight-qa/characterization-tests/#what-a-characterization-test-is-and-why-legacy-code-gets-those) → [the skill](/overnight-qa/characterization-tests/#the-skill) → [the workflow](/overnight-qa/characterization-tests/#the-workflow) → [prove the fence](/overnight-qa/characterization-tests/#prove-the-fence-before-the-first-night) → [the morning review checklist](/overnight-qa/characterization-tests/#the-morning-review-checklist). **Effort:** an afternoon for the workflow and the fence test; the first PR review takes an hour because you'll want to read every "surprise"; the fifth takes twenty minutes.

## "We need regression coverage before the Java 17 cutover"

`ledger-core` is half-migrated, both toolchains are in the build, and the second half is a quarter of work touching 410k lines that have Priya's name on 71% of them. A migration with no safety net is a migration you find out about in settlement. You'll point the characterization job at the classes the cutover touches — not the whole repo — gate each night's tests on mutation score so you keep the ones that would actually catch a regression, and read the score trend as the migration's readiness number.

**Path:** [The night's job](/overnight-qa/characterization-tests/#the-nights-job) (targets: the cutover's changed files, one package at a time) → [mutation testing as the gate](/overnight-qa/characterization-tests/#mutation-testing-the-quality-gate) → [cost shape](/overnight-qa/characterization-tests/#cost-shape) → the weekly line in [Cost and Governance](/overnight-qa/cost-and-governance/). **Effort:** a sprint of nights per package, one draft PR each morning; budget the review time honestly — the tests are cheap, the reading isn't.

## "The UI has no automated tests at all"

`ledger-web` is .NET Framework 4.8, the .NET 8 migration stalled in 2024, and the back-office operators find the regressions. You'll give a browser agent a plain-language scenario list — log in as the test operator, open yesterday's settlement batch, check the totals against the API, screenshot each step — fenced to the staging origin, on the self-hosted runner, scheduled in the gap between the `catalog` team's window and the 03:00 batch. What's stable gets promoted into Playwright specs that run without an agent.

**Path:** [What the night looks at](/overnight-qa/exploratory-and-e2e/#what-the-night-looks-at) → [Playwright MCP in `.mcp.json`](/overnight-qa/exploratory-and-e2e/#playwright-mcp-in-mcpjson) → [test data and auth](/overnight-qa/exploratory-and-e2e/#test-data-and-auth) → [the workflow](/overnight-qa/exploratory-and-e2e/#the-workflow) → [the test-agents alternative](/overnight-qa/exploratory-and-e2e/#the-alternative-playwrights-test-agents). **Effort:** the self-hosted runner label is a platform ask with the longest lead time — start it today; the scenarios file is an afternoon with an operator; the first useful night is a week out.

## "We want every PR reviewed even when reviewers are swamped"

Three reviewers, thirty PRs a week, and the ones that merge on Friday afternoon get a glance. You'll add a nightly job that lists the day's PRs and leaves one deep review comment on each — findings with `path:line`, never an approval or a request-changes, because a night can't be accountable for a merge decision. PR-time review stays light and blocking; the night is deep and advisory.

**Path:** [Review & Security](/overnight-qa/review-and-security/) (the PR-review job, and the trade against PR-time review) → the per-PR budget in [Cost and Governance](/overnight-qa/cost-and-governance/). **Effort:** an afternoon; the cost scales with PRs per day, so read the ledger after the first week and decide whether `opus` earns its keep on this job.

## "Security asked for a nightly dependency check with *impact*, not a CVE list"

The scanner already produces forty findings a night and InfoSec's actual question is "which of these can be reached from our code?" You'll keep the scanners deterministic — they produce the list — and give the agent the one job a scanner can't do: for each finding, a paragraph on reachability with a `path:line` to the call site, or "not reachable — evidence: no import". Findings become de-duplicated GitHub issues; the summary goes to code scanning as SARIF.

**Path:** [Review & Security](/overnight-qa/review-and-security/) (scanners → impact paragraphs → issues) → [the evidence pack](/overnight-qa/blast-radius/#the-security-review-evidence-pack) so InfoSec can approve the job that answers their own question. **Effort:** a day, most of it agreeing with InfoSec what "reachable" means; the job itself is the review workflow with a different prompt.

## "The batch job's output changed and nobody noticed for a week"

`ledger-batch` ran at 03:00 every night, produced a settlement file nobody diffed, and a rounding change in `MoneyMath` moved totals by cents for seven days. The night can't run *during* the batch — that window is a wall — but it can pin what the batch step produces on the test database and compare it with yesterday's artifact, so a change shows up as NEW the next morning instead of a week later.

**Path:** [Evidence](/overnight-qa/anatomy-of-a-night/#evidence) (the previous night's artifact is the night's only memory) → [Characterization Tests](/overnight-qa/characterization-tests/) pointed at the batch step's outputs → [The Morning Report](/overnight-qa/the-morning-report/) ("new since yesterday" is the whole mechanism). **Effort:** if the step's SQL runs on a Liquibase-built schema, a `gvenzl/oracle-free` container and an afternoon; if it needs the legacy objects, the self-hosted runner and the platform ask first — see [Environment](/overnight-qa/anatomy-of-a-night/#environment) for which.

## "The morning report is ignored"

It posts every day. It says the same eleven things every day. Nobody has opened it since the second week, and the one morning it mattered, it looked like every other morning. You'll rewrite the report to the contract — headline verdict, *what's new* at the top, every finding with evidence and a proposed owner — and install the ten-minute standup ritual that closes the night's issue. Then you'll count the report-actioned rate and let it decide.

**Path:** [The Morning Report](/overnight-qa/the-morning-report/) (the contract and the ritual) → [The Morning Report Nobody Read](/blog/the-morning-report-nobody-read/) (the story) → the 20% rule in [Cost and Governance](/overnight-qa/cost-and-governance/). **Effort:** an afternoon on the template; the ritual costs ten minutes a day forever, which is the deal.

## "The night burned $400 last Tuesday"

One job looped on a file it couldn't parse, the budget flag wasn't set, and the platform team's spend alert arrived before the report did. *Right now*: the incident page — was it a missing bound, a prompt that asked two questions, or a credential someone else used? *Afterwards*: every job gets all three bounds, because each one catches what the others miss — a budget alone doesn't stop a cheap loop, a turn cap alone doesn't stop an expensive turn, and only `timeout-minutes` stops a hang.

**Path:** [The Night Failed](/troubleshooting/the-night-failed/) first → [the three bounds](/overnight-qa/running-unattended/#bound-one-what-it-may-do) → [the exit codes](/overnight-qa/running-unattended/#exit-codes-and-what-to-do-about-each) → the ledger in [Cost and Governance](/overnight-qa/cost-and-governance/). **Effort:** incident time now; an hour to add the bounds to every workflow; a weekly ledger line after that.

## "We're on Bedrock and the key isn't ours"

There's no `ANTHROPIC_API_KEY` to put in a secret; the platform team runs Claude through Bedrock in `us-east-1` and the credential is an IAM role, not a string. Nothing on this site changes except the credential path: the wrapper accepts `CLAUDE_CODE_USE_BEDROCK=1` with `AWS_REGION`, and the workflow gets the role through OIDC — `permissions: id-token: write` — instead of a stored key. The ask to the platform team is one role, one region, one spend cap.

**Path:** [Working Within Policy](/start/working-within-policy/) (the copyable ask) → the credential check in [`scripts/run-claude.sh`](/overnight-qa/running-unattended/#take-this-with-you-scriptsrun-claudesh) → [Enterprise and Cost](/toolkit/enterprise-and-cost/) for the `ANTHROPIC_DEFAULT_*` pins the platform team will want to set. **Effort:** one ask with a two-week lead time is typical; your side is a ten-line change to the workflow's `env:` and one `id-token` permission.

## "InfoSec wants to know exactly what the agent can touch"

The approval meeting is Thursday and the question is not "is AI safe" but "what can this job read, write, send, and spend, and how do you know?" You'll bring the deny list with its enforcement column — every "may never" mapped to a `permissions:` key, a permission mode, a hook, an origin fence, or a cap — plus the workflows, the hook, and the run where you deliberately broke the fence and it held.

**Path:** [Blast Radius](/overnight-qa/blast-radius/) (the deny list and how each line is enforced) → [prove the fence](/overnight-qa/running-unattended/#prove-the-fence-on-the-first-night) → [the security review evidence pack](/overnight-qa/blast-radius/#the-security-review-evidence-pack). **Effort:** half a day to assemble if the jobs already follow the site's skeletons; the fence-proof run is twenty minutes and the single most persuasive item in the pack.

## "We want the night to fix things, not just find them"

The honest answer first: the night may *propose* a fix as a draft PR, and a human merges it — nothing on this site lets an unattended agent change `main`, and the Field Note about the agent that fixed a test by deleting it is why. What you'll actually build is the writing job done properly: `acceptEdits` inside a write-scope fence, a branch per night, one draft PR labelled `nightly` and `needs-human`, mutation-checked, with a review checklist for the morning. That's L2 today and the road to L4.

**Path:** [Characterization Tests](/overnight-qa/characterization-tests/) (the first writing job) → [Blast Radius](/overnight-qa/blast-radius/) (what a writing job may never do) → [the review checklist](/overnight-qa/cost-and-governance/#the-nightly-job-pr-review-checklist) → [the maturity ladder](/overnight-qa/overview/#the-maturity-ladder) for what L4 is and isn't. **Effort:** L2 is a week; L4 is a quarter of trust earned one merged draft PR at a time, and nobody skips the middle.

---

None of these is you? [The maturity ladder](/overnight-qa/overview/#the-maturity-ladder) routes by where you are rather than what hurts — and "one level up" is always a fine place to stop. [The cheat sheet](/overnight-qa/cheat-sheet/) routes by artifact. If it's an incident, it's [The Night Failed](/troubleshooting/the-night-failed/).

## Where next

- **Next in the journey:** [Anatomy of a Night Shift](/overnight-qa/anatomy-of-a-night/) — the seven stages every path above runs through, with the failure modes and the timing budget.
- **The lateral jump:** [The First Night](/overnight-qa/quick-start/) — whichever situation is yours, a read-only night on the suite you already have is the cheapest way to find out what the platform, the runner, and the channel will actually let you do.
