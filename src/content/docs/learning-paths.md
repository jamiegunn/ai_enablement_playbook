---
title: Learning Paths
description: Curated reading tracks through the site — new to agentic coding, running the knowledge-transfer program, standing up the night shift, the new hire's first two weeks, and the reviewer's seat.
keywords:
  - where do i start on this site
  - how this guide is organized
  - reading track for people new to claude code
  - tech lead onboarding program track
  - overnight qa setup track
  - new hire first two weeks track
  - security reviewer what to read
  - which pages to read in order
---

This site has about fifty pages. Nobody should read it front to back, and nobody should land mid-recipe without the prerequisites. Pick the track that matches your situation, read the steps **in order**, and use the checkpoint to know when you're done.

Time estimates assume reading plus doing the recipe against a real repo. If you only read, halve them — and retain half as much.

**A few rules of thumb:**

- Track 1 is the prerequisite for everything else. If you can't yet explain what the context window is and why the model made something up, start there regardless of your role.
- Tracks combine. The tech lead handed both initiatives does 1 → 2 → 3; the new hire does 4 and then, when they inherit the night shift, 3.
- Skim what you know, but don't skip the checkpoints — they're the honest test of whether skipping was safe.
- Every track ends before the site does. When you finish one, the section overview pages are the map to the rest.

## 1. New to agentic coding

**Who it's for:** you've used Claude in a chat window and maybe run Claude Code once; you've never written a `CLAUDE.md`, never set a permission rule, never run an agent without watching it.
**Time:** half a day, then an afternoon for the checklist.

1. [Start Here](/start/overview/) — the seat you sit in, the operating model, the two-minute access check.
2. [How Agentic Coding Actually Works](/start/how-agentic-coding-works/) — the loop, the context window as working memory, why it makes things up, what a tool call is.
3. [The Three Levers](/start/the-three-levers/) — context, tools, proof: the model for any technique on this site and the diagnostic for any that failed.
4. [Working Within Policy](/start/working-within-policy/) — what may leave the building, the three deployment paths, the four asks.
5. [Day-1 Checklist](/start/day-1-checklist/) — install, auth, `/doctor`, a `CLAUDE.md` with the three sections, a deny list and the destructive-command hook.
6. [The Toolkit: What Each Piece Is For](/toolkit/overview/) — one table: piece → lever → file → where the playbooks use it.
7. [CLAUDE.md: The Standing Orders](/toolkit/claude-md/) — the one mechanism you'll edit every week.
8. [It Made Things Up](/troubleshooting/it-made-things-up/) — read it before it happens, so you recognise it when it does.

**You're done when you can:** explain to a colleague what the model could and couldn't see in a session that went wrong, set a permission mode on purpose, and point at the `CLAUDE.md` line that should have prevented it.

## 2. Running the knowledge-transfer program

**Who it's for:** the tech lead who has a legacy estate, two experts, a Confluence space, and a new hire on the calendar.
**Time:** about three weeks of part-time work to reach Level 2; the first artifact in a day.

1. [Knowledge Transfer, Explained From Zero](/kt/overview/) — the three places knowledge lives, the pipeline, the ladder, the contract.
2. [The 90-Minute Repo Map](/kt/quick-start/) — one repo, one `ARCHITECTURE.md` with citations, one expert stamp. Do this before reading further; the rest of the track will make more sense with a stamped artifact in hand.
3. [Inventory the Estate](/kt/inventory-the-estate/) — rank the repos by change × concentration × new-hire exposure; find the experts by evidence; score Confluence by freshness.
4. [Mapping One Repo](/kt/mapping-a-repo/) — the eight questions, the `map-repo` skill in full, the citation rule, the review gate, the output layout.
5. [Mapping the System](/kt/mapping-the-system/) — the edges: dependencies, queues, schemas; synthesis from maps, never from code.
6. [Confluence: Mining a Graveyard for the Living](/kt/confluence/) — connect, triage into true / wrong / "why", migrate the true into the repo, publish generated pages back.
7. [Getting It Out of Their Heads](/kt/expert-interviews/) — prepared questions from the map's unknowns; decision records the expert corrects.
8. [The First Two Weeks](/kt/onboarding-track/) — Sam's schedule, built from the stamped artifacts.
9. [Keeping It True](/kt/living-docs/) — the nightly freshness job and PR-time doc updates.
10. [Measuring KT and Rolling It Out](/kt/measurement-and-governance/) — the four metrics, the review gate as a checklist, five teams.
11. [KT on One Page](/kt/cheat-sheet/) — bookmark it.

**You're done when you can:** hand a new hire a repo whose `CLAUDE.md` loads a stamped map, show the expert's approval in git, and point at the nightly job that will tell you when the map goes stale.

## 3. Standing up the night shift

**Who it's for:** the engineer who owns CI for the team and has been asked to "get AI testing going" — and who is rightly nervous about cost and blast radius.
**Time:** the first night in an hour; Level 3 in a month of evenings.

1. [Overnight QA, Explained From Zero](/overnight-qa/overview/) — bounded, evidence, act on; the anatomy; the ladder; the contract.
2. [The First Night](/overnight-qa/quick-start/) — read-only triage of the existing suite, reporting to the job summary and the channel. Run it tonight.
3. [Anatomy of a Night Shift](/overnight-qa/anatomy-of-a-night/) — the seven stages, each with its failure modes and its seat; the timing table.
4. [Running Claude Unattended](/overnight-qa/running-unattended/) — the three bounds and their flags, the JSON output field by field, exit codes, the Action vs the CLI vs the SDK.
5. [Blast Radius](/overnight-qa/blast-radius/) — the deny list, how each item is enforced structurally, the kill switch, the evidence pack for security. Read this *before* the first job that writes.
6. [Characterization Tests](/overnight-qa/characterization-tests/) — the first writing job: tests that pin current behaviour, flake-gated, mutation-checked, one draft PR.
7. [The Morning Report](/overnight-qa/the-morning-report/) — the contract, the template, Slack/Teams/GitHub/Confluence delivery, the standup ritual.
8. [Exploratory & E2E](/overnight-qa/exploratory-and-e2e/) — the browser agent through staging, fenced to staging.
9. [Review & Security](/overnight-qa/review-and-security/) — nightly PR review, scans with impact paragraphs, dependency triage.
10. [Cost and Governance](/overnight-qa/cost-and-governance/) — the arithmetic, model selection, caps at three levels, the review checklist, the ledger.
11. [Overnight QA on One Page](/overnight-qa/cheat-sheet/) — bookmark it.

**You're done when you can:** read a night's JSON output and say what it did, what it cost, and why it exited the way it did; show security the table of what the job may never do and the flag or hook that enforces each row; and throw the kill switch in under a minute.

## 4. The new hire's first two weeks

**Who it's for:** you're Sam. It's Monday. Someone sent you this link.
**Time:** it *is* the two weeks — but the reading is a morning.

1. [Start Here](/start/overview/) — skim the operating model and run the two-minute access check; the rest can wait.
2. [How Agentic Coding Actually Works](/start/how-agentic-coding-works/) — so you know what your tutor session can and can't see.
3. [The Three Levers](/start/the-three-levers/) — especially the proof lever: every answer you get should come with a `path:line`, and one that doesn't is a question for a human.
4. [The First Two Weeks](/kt/onboarding-track/) — your actual schedule: the guided tour, the exercises with answer keys, the first ticket, the first PR with the night's tests as a net.
5. [It Made Things Up](/troubleshooting/it-made-things-up/) — it will; here's how to tell and what to do.
6. [KT on One Page](/kt/cheat-sheet/) — the FAQ has "I'm the new hire — what do I do when the map is wrong?"

**You're done when you can:** trace a settlement from the MQ queue to the Oracle table using only the map and your session, say which two claims you found the map was wrong about, and have opened a PR that the night's characterization tests protected.

## 5. The reviewer's seat

**Who it's for:** platform or security, reading to decide whether to approve the unattended jobs, the MCP allowlist, or the CI credential.
**Time:** two hours.

1. [Start Here — the operating model](/start/overview/#the-operating-model) — what the team is claiming to own and what it's asking you for.
2. [Working Within Policy](/start/working-within-policy/) — the four asks as the team will send them, with the evidence they're told to attach.
3. [Blast Radius](/overnight-qa/blast-radius/) — the deny list and the enforcement for each row; the evidence pack was written for you.
4. [Running Claude Unattended](/overnight-qa/running-unattended/) — the bounds, why three, and what each flag actually prevents.
5. [The nightly-job PR review checklist](/overnight-qa/cost-and-governance/#the-nightly-job-pr-review-checklist) — the gate the team applies to itself; hold them to it.
6. [Confluence: Mining a Graveyard for the Living](/kt/confluence/) — the hosted Atlassian MCP vs the self-hosted one, read-only mode, the space filter that honours `restricted`.
7. [Enterprise Setup, Models, and Cost Arithmetic](/toolkit/enterprise-and-cost/) — managed settings, the deployment paths, spend limits.

**You're done when you can:** name, for each row of the deny list, the flag, setting, hook, or workflow permission that enforces it — and name the one row where enforcement is a human, so you can decide whether that's acceptable.
