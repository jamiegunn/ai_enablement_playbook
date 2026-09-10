---
title: Start From Your Situation
description: Twelve situations in your own words — a new hire starts Monday, our best engineer is retiring, Confluence has 900 pages nobody trusts — each routed to the pages that fix it, with an honest effort estimate.
keywords:
  - new developer starts monday no documentation
  - senior engineer retiring knowledge transfer
  - confluence has hundreds of pages nobody trusts
  - too many repos nobody understands the whole system
  - have to change legacy code i don't understand
  - docs and code disagree which is right
  - java 8 and java 17 in the same build
  - batch job nobody understands
  - oracle schema is the real architecture
  - architecture doc already out of date
  - infosec says source code cannot leave the building
  - i am the new hire what do i do
sidebar:
  order: 3
---

Find the sentence that sounds like your quarter; follow the path. Nothing on this page is new material — it's routing, with an effort estimate per journey so you can plan the work instead of discovering it, and the expert's time stated separately from yours, because the expert's is the one that runs out.

## "A new hire starts Monday"

Sam-shaped: senior-ish, Java, no Oracle, no MQ, and nothing to hand them but a Confluence link and Priya's calendar. You'll produce one stamped artifact for the repo Sam will touch first (`ledger-api`, 35k lines, the friendliest thing in the estate), then run the first two weeks *from* that artifact — a Claude session loaded with the map and told to cite or say "ask a human", exercises with answer keys, a first ticket chosen from the map's "safe places to change". The whole system picture can wait; Sam's questions about MQ and Oracle go to Marcus until it exists.

**Path:** [The 90-Minute Repo Map](/kt/quick-start/) (the gate, then the recipe) → [The First Two Weeks](/kt/onboarding-track/) → in week two, [Mapping One Repo](/kt/mapping-a-repo/) for `ledger-core`, where the first ticket lands. **Effort:** ninety minutes of yours for the map, thirty of Priya's for the stamp, and the two weeks are Sam's. The measurement starts the day Sam does — the predecessor took eleven weeks to a first PR; write that down before Monday.

## "Our best engineer is retiring in six months"

Priya-shaped. The instinct is to book interviews; the trap is the ninety-minute unstructured brain dump that produces a recording nobody transcribes. Six months is about twenty-four weekly sessions, which is plenty *if each one is prepared* — and preparation means mapping the repos she owns first, so the questions come from the map's "Unverified" section and the sixty "why" pages, not from a blank page. Each session produces decision records she corrects, not a transcript she's asked to read.

**Path:** [Inventory the Estate](/kt/inventory-the-estate/) (confirm what she's main-dev of — 71% of `ledger-core`, 88% of `ledger-shared`) → [Mapping One Repo](/kt/mapping-a-repo/) for both, in sections → [Getting It Out of Their Heads](/kt/expert-interviews/) → [Keeping It True](/kt/living-docs/) so the records outlast her. **Effort:** a week of mapping up front; then forty-five minutes of Priya per week plus an hour of yours per session to prepare the questions and file the records. The first session is the hard one to book; the rest are a standing invite.

## "Confluence has 900 pages and nobody trusts any of them"

Correct instinct, wrong conclusion. The pages aren't wrong, they're *undated* — the 2019 "Settlement Flow" page describes 2019 with full confidence. You'll date all 940 with one query (median last edit: 2021), let the agent sort them into true, wrong, and "why", migrate the true ones into the repo with a stub left behind, archive the wrong ones with a note saying what replaced them, and seed decision records from the sixty pages that record a *decision*. After that the repo is the source of truth and Confluence receives generated pages, not the other way round.

**Path:** [Inventory the Estate](/kt/inventory-the-estate/#the-docs-confluence-space-ledger-by-date) for the listing → [Confluence: Mining a Graveyard for the Living](/kt/confluence/) → [Keeping It True](/kt/living-docs/) for the publish-on-merge step. **Effort:** the listing is twenty minutes; the triage is an afternoon of agent time plus an hour of Marcus correcting the buckets; the migration is a week of small PRs you can spread across a month.

## "Twenty-three repos and nobody can draw the call graph"

The system is the edges, not the nodes — and the edges live in config files, queue names, and Priya. Rank the repos, map the seven that matter one at a time, then let a synthesis pass read the seven *maps* (never the code) and draw the integration picture as a table of edges with evidence, which Marcus corrects edge by edge. The contradiction audit — edges the docs claim versus edges the code shows — is where the Settlement Flow page finally gets retired.

**Path:** [Inventory the Estate](/kt/inventory-the-estate/) → [Mapping One Repo](/kt/mapping-a-repo/), seven times → [Mapping the System](/kt/mapping-the-system/) → [Confluence](/kt/confluence/) for the page that disagrees. **Effort:** an afternoon for the inventory; a week for seven maps at ninety minutes plus a thirty-minute stamp each; a day for the system map, including Marcus's hour on the edges.

## "I have to change code I don't understand by Friday"

Today: map the one repo you're changing (ninety minutes), read its "things that will surprise you" and "safe places to make a first change" sections, and ask the expert to stamp *only the section your change touches* — a ten-minute review, not thirty. Tonight: hand the code you'll touch to the night shift and have it write characterization tests — tests that pin down what the code does now, right or wrong — so Friday's PR has a net under it. The map tells you where you are; the tests tell you if you've moved anything.

**Path:** [The 90-Minute Repo Map](/kt/quick-start/#the-recipe) pointed at your repo → [What makes legacy hard](/kt/mapping-a-repo/#what-makes-legacy-hard) for the traps → [Characterization Tests](/overnight-qa/characterization-tests/) in the other playbook. **Effort:** ninety minutes today, one night, one PR on Friday with tests that existed on Thursday.

## "The docs and the code disagree and I don't know which is right"

The code wins for *what*; the doc may still win for *why*. The check is mechanical: the agent reads the page, greps the code for what the page describes, and reports which claims still hold with `path:line` and which don't — the Settlement Flow page took twenty minutes to disprove this way. If the doc's *why* is worth keeping, it becomes a decision record with the code's current behaviour cited alongside it. If the disagreement is a bug rather than drift, that's a finding, not a doc.

**Path:** the Field Note [The Architecture Doc That Was Confidently Wrong](/blog/the-architecture-doc-that-was-confidently-wrong/) for the shape of the failure → [Confluence](/kt/confluence/) for the does-this-match-the-code check → [the contradiction audit](/kt/mapping-the-system/#the-contradiction-audit) when it's an edge between repos. **Effort:** an hour per page, most of it the agent's; five minutes of an expert's for the "why".

## "We're mid-migration and the old and new coexist"

Java 8 *and* 17 in `ledger-core`'s build; .NET Framework 4.8 in `ledger-web` with a `ledger-migration-dotnet8` repo that stopped in October 2024. The danger isn't the two toolchains — it's a model that builds the wrong one and reports success. The mapping skill's rule for this is one line: *say which toolchain CI actually runs, citing the workflow or build file*, and the answer goes into `CLAUDE.md` under "What not to do" so every future session inherits it. For the stalled repo, the inventory's job is a decision — archive or resume — not a map.

**Path:** [What makes legacy hard](/kt/mapping-a-repo/#what-makes-legacy-hard) → [the CLAUDE.md template](/kt/mapping-a-repo/#take-this-with-you) → [Inventory the Estate](/kt/inventory-the-estate/#the-output-docsestatemd) for the stalled-repo row. **Effort:** none beyond the map — it's one instruction the skill already carries and one line in `CLAUDE.md` that saves every session after it from building the wrong profile.

## "The batch job is a black box that runs at 3 a.m."

`ledger-batch`: Spring Batch, 60k lines, Marcus at 84%, and the only documentation is a 2020 runbook. Map it like any repo, with one change of emphasis — the "entry points" question is *scheduled jobs* and the "request path" question is *trace one run from trigger to Oracle*. Then capture the story Marcus tells at every retro ("the time it ran twice") as a document with the code cited, because that story is the design rationale and it lives nowhere else. And note the window: nothing the night shift schedules may overlap 03:00–03:40.

**Path:** [Mapping One Repo](/kt/mapping-a-repo/) on `ledger-batch` → [Capturing failure stories](/kt/expert-interviews/#capturing-failure-stories) → [Anatomy of a Night](/overnight-qa/anatomy-of-a-night/) for why the crons are where they are. **Effort:** a map, a thirty-minute stamp, and one forty-five-minute session with Marcus that finally gets the running-twice story written down.

## "The Oracle schema is the real architecture"

`ledger-db`: 1,200 PL/SQL objects, Liquibase for everything since 2022, and a folder named `legacy/DO_NOT_RUN` for everything before. The map doesn't need a live database — it reads the Liquibase changelogs, the legacy folder, and a `DBMS_METADATA` export the DBA gives you. Every Java repo's map already cites the tables it touches under its "Data" question; the system map joins those citations to the schema, and that join is the architecture nobody has drawn.

**Path:** [the Oracle side of a repo map](/kt/mapping-a-repo/#what-makes-legacy-hard) → [Dependency extraction, per language](/kt/mapping-the-system/#dependency-extraction-per-language) → a Marcus session for the objects nobody's touched since 2021. **Effort:** the DBA export is the long pole — ask for it on day one; the map itself is an afternoon.

## "We mapped it once and it's already stale"

Drift is the default state of documentation, and a map with no check is a Confluence page with extra steps. The fix is structural: a nightly job that verifies every `path:line` citation still resolves and opens *one* issue labelled `kt:stale` when any don't; a PR-time pass that proposes a doc edit whenever a change touches a cited line; `CODEOWNERS` on `docs/` so a human owns the answer. The freshness number — share of citations that still resolve — is the metric, and the target is 95%.

**Path:** [Keeping It True](/kt/living-docs/) — all of it; the citation script is on the [cheat sheet](/kt/cheat-sheet/#the-citation-check) if you want it now. **Effort:** an hour to add the workflow; the metric then runs itself, and a stale issue is a ten-minute fix when it's caught the next morning instead of a rewrite when it's caught next year.

## "InfoSec says the code can't leave the building"

Usually that sentence means "not to a public endpoint", and the platform team's approved deployment (Bedrock in `us-east-1` in this shop) may already be inside the boundary — the question is answerable, and the policy page has it written out with the evidence to attach. While you wait for the answer, notice that the inventory page is git, `scc`, and `code-maat`: no model, no policy question, and a ranked estate at the end of it. The Confluence listing is titles and dates only, and even those exclude the `restricted` label.

**Path:** [Working Within Policy](/start/working-within-policy/) for the ask → [Inventory the Estate](/kt/inventory-the-estate/) for the week it takes to answer → [The 90-Minute Repo Map](/kt/quick-start/) the day it's approved. **Effort:** the ask is a form and a week of waiting; the inventory fills the week. If the answer is a flat no, the inventory is still the most useful document your team has produced this year.

## "I'm the new hire — what do I do?"

Sam-shaped, day one. You'll work from a stamped map, not from Priya's calendar: a Claude session loaded with `ARCHITECTURE.md` that answers with citations and says "not in the map — ask a human" when it can't; guided exercises with answer keys; a first ticket from the map's safe-change list; a first PR in week two with the night shift's tests under it. The expert-hour rule applies to you too — bring corrections, not questions, and when the map is wrong (it will be, somewhere), the PR that fixes it is the best thing you'll ship in your first month.

**Path:** [The First Two Weeks](/kt/onboarding-track/) → the cheat sheet's [FAQ](/kt/cheat-sheet/#faq) for "what do I do when the map is wrong". **Effort:** two weeks. Your first meaningful PR is the team's measurement, so nobody is going to rush it, and everybody is going to notice it.

---

None of these is you? The [overview's maturity ladder](/kt/overview/#the-maturity-ladder) routes by where you already stand — one verified map, the estate mapped, the heads on paper, living — and one level up is always a fine place to stop. The [cheat sheet](/kt/cheat-sheet/) routes by artifact if you already know which one you need.

## Where next

- **Next in the journey:** [The 90-Minute Repo Map](/kt/quick-start/) — whichever situation is yours, one repo mapped and stamped is the cheapest way to find out what the policy, the estate, and the expert's calendar will actually let you do.
- **The lateral jump:** [Inventory the Estate](/kt/inventory-the-estate/) — if you can't yet say which of the twenty-three repos matters most, rank them before you map any of them.
