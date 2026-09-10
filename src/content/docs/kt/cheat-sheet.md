---
title: KT on One Page (+ FAQ)
description: The whole knowledge-transfer playbook condensed — the pipeline table, the eight questions, the skills, the review gate, the CLAUDE.md skeleton, the inventory one-liners, the citation check, the metrics — plus the questions everyone asks, answered in three sentences each.
keywords:
  - can the ai just read all the repos
  - what if the expert says the ai generated doc is wrong
  - do we still need confluence
  - how much does it cost to document a codebase with claude
  - source code cannot leave the building ai
  - how to keep architecture docs from going stale
  - can we use copilot instead of claude code
  - how long does the expert review take
  - what if there is no expert left
  - knowledge transfer cheat sheet
sidebar:
  order: 12
---

Everything condensed; every cell links to the page that earns it. Top half: the artifacts. Bottom half: the FAQ.

## The pipeline, one table

| Stage | Page | Artifact | Proof |
|---|---|---|---|
| **Inventory** | [Inventory the Estate](/kt/inventory-the-estate/) | `docs/ESTATE.md` — repos ranked, docs dated, experts derived | numbers from git, `scc`, and CQL; no model claim to check |
| **Map** (repo) | [Mapping One Repo](/kt/mapping-a-repo/) | `docs/ARCHITECTURE.md` (DRAFT) + `CLAUDE.md` | every claim `path:line`; an "Unverified" section |
| **Map** (system) | [Mapping the System](/kt/mapping-the-system/) | `SYSTEM.md` — an edge table: from → to → mechanism → evidence | evidence per edge; the contradiction audit |
| **Map** (docs) | [Confluence](/kt/confluence/) | 940 pages sorted true / wrong / "why"; the true ones in the repo | each page grepped against the code |
| **Verify** | [The review gate](/kt/mapping-a-repo/#the-review-gate) · [Expert sessions](/kt/expert-interviews/) | a PR approval that flips `kt:draft` → `kt:stamped`; `docs/decisions/*.md` | the stamp is a git event, not a feeling |
| **Teach** | [The First Two Weeks](/kt/onboarding-track/) | the track; exercises with answer keys; a tutor session that cites or says "ask a human" | Sam's first meaningful PR |
| **Keep true** | [Keeping It True](/kt/living-docs/) | `nightly-freshness.yml`; one `kt:stale` issue per run; PR-time doc edits | freshness ≥ 95% |

The rule under all of it: **the expert's hour is the scarcest resource in the building — spend tokens to save expert hours, never the reverse** ([the contract](/kt/overview/#the-citizenship-contract)).

## The eight questions

What a repo map answers, in order — condensed from the skill; the [full skill](/kt/mapping-a-repo/#the-skill-and-why-each-line-is-there) carries the reasoning per line:

1. What is this, in one paragraph — and what is it *not* (what lives in neighbouring repos)?
2. Entry points — HTTP, listeners, scheduled jobs, CLI mains: entry → handler `path:line` → what it calls next.
3. The request path — one representative request, end to end, file by file.
4. Data — the domain model, every table and queue touched, with the code that touches it.
5. Integrations — every external system: config key, code, direction of data.
6. Build, run, test — the exact commands from the build files and CI, and what they need.
7. Things that will surprise you — dead-looking code with live callers, DI wiring, generated code, flags, dual toolchains, time zones.
8. Safe places to make a first change — three candidates with test coverage, cited.

Then `## Unverified` and `## Questions for the expert`. Five rules override everything: cite every claim; search, don't read; "no callers found" is a finding, "unused" is a conclusion; say which toolchain CI runs; never invent a name.

## The skills

| Skill | One line | Page |
|---|---|---|
| `map-repo` | Maps one repo into `docs/ARCHITECTURE.md` (DRAFT): the eight questions, every claim cited, unknowns as unknowns | [Mapping One Repo](/kt/mapping-a-repo/) |
| `system-map` | Reads every repo's stamped `ARCHITECTURE.md` — never raw code — and writes `SYSTEM.md` as an edge table with evidence | [Mapping the System](/kt/mapping-the-system/#the-system-map-skill) |
| `confluence-triage` | Dates and buckets the pages of one space (true / wrong / "why"), checking each against the code | [Confluence](/kt/confluence/) |
| `draft-adrs` | Turns a session transcript into one decision record per "why", each with its source timestamp, for the expert to correct | [Expert sessions](/kt/expert-interviews/#after-the-session-transcript-to-decision-records) |
| `tutor` | The new hire's session: answers only with citations from stamped docs, otherwise "not in the map — ask a human" | [The First Two Weeks](/kt/onboarding-track/) |
| `gen-exercises` | Generates guided exercises with answer keys from the stamped map ("find where FX conversion is applied; expected: `FxApplier.java:88`") | [The First Two Weeks](/kt/onboarding-track/) |

Every skill runs with `sonnet` except `system-map`, which synthesizes across twenty-three maps on `opus` — and is still cheap, because it reads maps, not code.

## The review gate

Paste into the PR that carries a generated document. Every unchecked box is a conversation; the full reasoning is at [the review gate](/kt/mapping-a-repo/#the-review-gate):

```markdown
- [ ] Every factual claim ends with a `path:line` citation — no prose without a pointer
- [ ] Claims that couldn't be cited are under "## Unverified", each with what would confirm it
- [ ] "No callers found" is reported as a finding, never as "unused"
- [ ] Dual toolchains: the doc says which one CI runs, citing the workflow or build file
- [ ] No invented class, method, table, queue, or endpoint names (spot-check five citations)
- [ ] The named expert can correct it in ≤ 30 minutes — if not, split the doc and re-request
- [ ] Corrections are review comments, not rewrites; the agent redrafts from them
- [ ] First line reads `**Status: DRAFT …**` until approval; the merge flips `kt:draft` → `kt:stamped`
```

## The CLAUDE.md skeleton

Three sections, never more; the [full template](/kt/mapping-a-repo/#take-this-with-you) with the reasoning per line. Excerpt (`# …` marks elided lines):

```markdown
# ledger-api

## What this is
Spring Boot 2.7 REST facade in front of `ledger-core` (the settlement engine).
Java 17 — the `jdk8` Maven profile is legacy and CI does not run it. Reads and
writes Oracle only through `ledger-core`; never talks to MQ directly.
Architecture: @docs/ARCHITECTURE.md (STAMPED 2026-09-12 by Priya — treat as
true and cite it; anything not in it is unknown, not inferred).

## How to work here
- Build: `./mvnw -q -DskipTests package`. Tests: `./mvnw test` — integration
  tests need `LEDGER_TEST_DB` set (see docs/ARCHITECTURE.md, "Build, run, test").
# …
- When asked where something happens: search first (Grep/Glob), then cite
  `path:line`. If you cannot find it, say "not found in this repo — may be in
  ledger-core" rather than guessing.

## What not to do
- Do not edit anything under `src/main/java/com/ledger/api/legacy/` — scheduled
  for deletion, no tests, and Marcus is the only person who knows why it exists.
# …
- Do not invent class, method, table, queue, or endpoint names. "Unknown" is an
  acceptable answer; a plausible-sounding name is not.
```

## The inventory one-liners

Each with its reason; the [full page](/kt/inventory-the-estate/) reads the outputs, and the [script](/kt/inventory-the-estate/#take-this-with-you) runs the repo pass across the estate:

```bash
# seat: team
# every repo in the org → CSV (name, last push, language, archived); the estate is the ledger-* rows
gh repo list payments --limit 500 --json name,pushedAt,primaryLanguage,isArchived | jq -r '.[] | [.name, .pushedAt, (.primaryLanguage.name // "none"), .isArchived] | @csv'
# size, per language and per file — sets expectations for the map's reading budget
scc --by-file --format json -o counts.json
# change frequency — a map of a frozen repo is a photograph
git log --since="1 year ago" --oneline | wc -l
# author concentration, by commits — the quick bus-factor proxy
git log --format='%aN' | sort | uniq -c | sort -rn
# code-maat log, dated after the 2021 Bitbucket migration ON PURPOSE (older history is one squashed commit)
git log --all --numstat --date=short --pretty=format:'--%h--%ad--%aN' --no-renames --after=2021-06-01 > git.log
# per-file main developer and ownership share — the number that goes in ESTATE.md
java -jar code-maat-1.0.4-standalone.jar -l git.log -c git2 -a main-dev
```

Confluence, over the Atlassian MCP server's `searchConfluence` — a listing, never a read: `space = LEDGER order by lastmodified asc` for the freshness histogram (median: 2021), and `space = LEDGER and label = decision order by lastmodified asc` for the sixty "why" pages. Add `and label != restricted` wherever InfoSec's label applies.

## The citation check

The structural freshness check the nightly job runs — does every `(path:line)` in `docs/` still point at a real line. The semantic check (does the line still *say* that) is the agent's weekly job; the workflow around this script is on [Keeping It True](/kt/living-docs/):

```bash
#!/usr/bin/env bash
# scripts/check-citations.sh — every "(path:line)" citation in docs/**/*.md must still point at a real line.
# Prints stale citations and exits 1 if any; the workflow turns the output into ONE issue labelled kt:stale.
set -uo pipefail
out=$(mktemp)
grep -rhoE '\(([A-Za-z0-9_./-]+\.[A-Za-z]+):([0-9]+)(-[0-9]+)?\)' docs/ --include='*.md' \
  | tr -d '()' | sort -u \
  | while IFS=: read -r path range; do
      line="${range%%-*}"
      if [ ! -f "$path" ]; then
        echo "MISSING FILE   $path:$range"
      elif [ "$line" -gt "$(wc -l < "$path")" ]; then
        echo "LINE GONE      $path:$range (file now has $(wc -l < "$path") lines)"
      fi
    done > "$out"
if [ -s "$out" ]; then cat "$out"; echo; echo "$(wc -l < "$out") stale citation(s)"; exit 1; fi
echo "all citations resolve"
```

## The metrics

Define → observe → decide, with the baseline's level stated (measured, proxy, or floor) — the [measurement page](/kt/measurement-and-governance/) has the fallback ladder:

| Metric | Plain definition | Baseline (level) | Target, one quarter | Fetched by |
|---|---|---|---|---|
| Time to first meaningful PR | Day one → first merged PR that changes behaviour | 11 weeks — the predecessor (measured) | ≤ 3 weeks | the PR's merge date |
| Expert questions per week | "Where is X / why does Y" in the team channel, answered by Priya or Marcus | ~30 (PROVISIONAL — Priya's estimate) | halved | count for two weeks; then the [async mining pass](/kt/expert-interviews/#the-async-variant-mining-the-questions-channel) |
| Main-dev share, per critical repo | Top author's share of lines added, current year | `ledger-core` 71% Priya (measured, since 2021-06-01) | no repo above 60% | `code-maat -a entity-ownership` |
| Doc freshness | Share of `path:line` citations that still resolve, nightly | none yet (floor: count for two weeks, TODO) | ≥ 95% | `check-citations.sh` in `nightly-freshness.yml` |
| Confluence `LEDGER` | Pages, and median last edit | 940 pages, median 2021 (measured) | every page in a bucket — an outcome, not a number | the CQL listing |

## Names and numbers that must agree

| Thing | Value |
|---|---|
| Labels | `kt:draft` (generated, unreviewed) · `kt:stamped` (a named expert approved the PR) · `kt:stale` (a citation stopped resolving; one issue per run) |
| Not yours | `nightly`, `needs-human`, `nightly:flaky` belong to the [Overnight playbook](/overnight-qa/cheat-sheet/) |
| Freshness cron | `47 6 * * 1-5` UTC — after triage, before the 03:00–03:40 New York batch window |
| Run caps | `map-repo`: `--max-turns 60 --max-budget-usd 8` · `system-map`: `--max-turns 40 --max-budget-usd 12` |
| Models | `sonnet` for mapping and drafting · `opus` for `system-map` · `haiku` for labelling passes |
| The status line | `**Status: DRAFT — not yet reviewed by a named expert.**` — first line of every generated doc until the stamp |

## FAQ

### Can the AI just read all 23 repos?

No, and it shouldn't try: no context window holds twenty-three repos, and a session that tries fills up and starts guessing. A repo map *searches* rather than reads — it touches maybe five to ten percent of `ledger-core` — and the system map reads the twenty-three *maps*, never the code. [How the agent explores](/kt/mapping-a-repo/#how-the-agent-explores); [why the system pass is cheap](/kt/mapping-the-system/#why-opus-here-and-why-its-still-cheap).

### What if the expert says the map is wrong?

That is the system working — it's what the thirty minutes are for. Corrections go in as review comments on the citations, the agent redrafts from the comments, and the merge is the stamp; if the code says one thing and Priya says another, the code wins for *what* and Priya wins for *why*, and the disagreement becomes a decision record or a bug. [The review gate](/kt/mapping-a-repo/#the-review-gate); [the stamp session](/kt/quick-start/#the-thirty-minute-stamp-session).

### Do we still need Confluence?

As a destination, yes; as a source, no. The repo holds the truth and Confluence receives generated pages on merge, space `LEDGER` stays read-only while it's triaged into true, wrong, and "why", and the sixty "why" pages are the only thing that migrates whole. [Confluence: Mining a Graveyard for the Living](/kt/confluence/).

### How much does mapping cost?

The shape, not a price: cost follows *files read*, and the skill is told to search rather than read, so a 410k-line repo costs a fraction of its size. The canonical run is capped at `--max-turns 60 --max-budget-usd 8` per repo map and `--max-turns 40 --max-budget-usd 12` for the system map — ceilings, not estimates — and the expensive part is the thirty minutes of Priya, which is the number to protect. [The cost shape](/kt/mapping-a-repo/#the-cost-shape); [Enterprise & cost](/toolkit/enterprise-and-cost/).

### What about code that can't leave the building?

Ask what the sentence means: the approved deployment (Bedrock in `us-east-1` here) may already be inside the boundary, and the policy page has the ask written out with the evidence to attach. While you wait, the inventory is git and two command-line tools — no model — and it produces the ranked estate regardless. [Working Within Policy](/start/working-within-policy/); [Inventory the Estate](/kt/inventory-the-estate/).

### I'm the new hire — what do I do when the map is wrong?

Fix it: open a PR against `docs/ARCHITECTURE.md` with the citation that proves the correction, and tell your tutor session so it stops citing the old line. It's the best PR you'll ship in your first month, it counts toward the "first meaningful PR" clock, and it costs the expert five minutes instead of the thirty they'd spend finding it later. [The First Two Weeks](/kt/onboarding-track/).

### How do we keep it from going stale?

Structurally, never by hoping: the nightly citation check opens one `kt:stale` issue when a cited line moves, the PR-time pass proposes a doc edit when a change touches a cited line, and `CODEOWNERS` on `docs/` gives the answer a human owner. Freshness is a number — citations that resolve ÷ citations — and the target is 95%. [Keeping It True](/kt/living-docs/).

### Can we use Copilot instead?

The principles, yes — the three levers, the citation rule, the review gate, and "the expert only corrects" are tool-agnostic and stated as such throughout. The recipes on this site are Claude Code because that's the deployment the platform team approved here; reproducing them elsewhere means finding that tool's equivalent of a standing-orders file, a reusable prompt, and a headless run with a turn cap. [The Three Levers](/start/the-three-levers/); [How Agentic Coding Actually Works](/start/how-agentic-coding-works/).

### How long does the expert's review take?

Thirty minutes per artifact, by construction — the unit of review is sized to fit, and a doc that needs two hours gets split. The expert reads the *citations*, not the prose: "does `FxApplier.java:88` do what this sentence says" takes twenty seconds a claim. [The thirty-minute stamp session](/kt/quick-start/#the-thirty-minute-stamp-session).

### What if there is no expert?

Then the map's "Unverified" section stays honest and the proof step changes: instead of a stamp, characterization tests from the night shift pin down what the code actually does, and the tests become the review. Git still names the last people who touched the repo — the inventory's expert map is derived, not asked — and `ledger-web`, whose main authors have left, is the worked example. [Inventory: the people](/kt/inventory-the-estate/#the-people-an-expert-map-you-derive-not-ask); [Characterization Tests](/overnight-qa/characterization-tests/).

### Why does every generated doc start with DRAFT?

Because somebody will be blamed when Sam ships a change based on the map and the batch double-posts, and "the AI wrote it" is not an answer. `DRAFT` says nobody has vouched for it yet; the PR approval that flips `kt:draft` to `kt:stamped` is dated, attributable, and revocable. [The citizenship contract](/kt/overview/#the-citizenship-contract).

### Where do I actually start?

[The 90-Minute Repo Map](/kt/quick-start/) if you want one verified artifact this week; [a situation that sounds like yours](/kt/scenarios/) if a specific pain brought you here; [the maturity ladder](/kt/overview/#the-maturity-ladder) if you want to know where you already stand.

:::tip[Take the whole thing]
Every file quoted on this page and across the playbook — `map-repo`, the settings baseline, both hooks, `run-claude.sh`, `check-citations.sh`, the freshness workflow — is in the repository's [`starter-kit/`](https://github.com/jamiegunn/ai_enablement_playbook/tree/main/starter-kit) directory as a real, runnable file rather than a snippet. Copy the directory, change the cast's names for yours, and read the page that owns each file before you run it: nothing in there is safe by being copied, only by being understood.
:::

## Where next

- **Next in the journey:** [Measuring KT and Rolling It Out to Five Teams](/kt/measurement-and-governance/) — once the artifacts exist, the four metrics are what keep them honest and what you take to the next planning meeting.
- **The lateral jump:** [Overnight QA on One Page](/overnight-qa/cheat-sheet/) — the sister playbook's condensed version, and where the nightly freshness job that keeps your map true actually lives.
