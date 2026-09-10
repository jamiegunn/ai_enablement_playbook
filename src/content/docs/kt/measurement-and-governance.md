---
title: Measuring KT and Rolling It Out to Five Teams
description: Four KT metrics with real baselines and the commands that fetch them, the review gate and PR checklist a second team can copy, and how to roll the method to five teams without becoming their KT department.
keywords:
  - how to measure knowledge transfer
  - bus factor metric per repo
  - time to first pull request new hire
  - documentation freshness metric
  - roll out ai coding to multiple teams
  - claude code plugin marketplace for teams
  - max-budget-usd monthly cap
  - ai documentation review checklist
  - data policy evidence for ai code tools
  - what to report at planning
sidebar:
  order: 11
---

**You are here if:** the first map is stamped, and someone has asked what it bought — or four other teams have seen it, want the same thing, and you are about to become the company's KT department by accident.

This page is the boring half of the initiative, and it's the half that decides whether the initiative survives the quarter. It has two jobs: give you four numbers you can say out loud with a straight face, and give the second, third, fourth and fifth team something to copy that isn't your calendar.

## Why measure at all

There's a defensive reason and an honest one, and you need both.

The defensive one: **an initiative nobody measured is an initiative nobody can defend at the next planning meeting.** In three months someone will ask what the AI spend bought, and "the docs are better" is not an answer that survives contact with a roadmap. "Sam's first behaviour-changing PR merged in nineteen days against a predecessor's eleven weeks, and `ledger-core` went from one author owning 71% of the code to two owning it" is.

The honest one is better: **a map nobody reads should be found out cheaply.** The failure mode of this playbook isn't a wrong document — the review gate catches those. It's a beautifully cited, expert-stamped `ARCHITECTURE.md` for a repo no new hire will ever open, generated because it was easy to generate. Measurement is how that shows up in week six instead of next year, when someone notices the fifth map cost an expert hour and answered nobody's question.

So every metric here is chosen for one property: it can go *wrong* visibly. A metric that only ever goes up is decoration.

### Define, observe, decide

Every measurement on this site carries three things, and a number missing any of them isn't a metric yet:

- **Defined** — one plain sentence, including what does *not* count. If two people can produce different numbers from the same week, the definition isn't finished.
- **Observed** — the exact command, run from a named seat, with its output. Not "we'll track this in a spreadsheet."
- **Decided** — the "if it reads X → do Y" rule, written down *before* you have the number. A threshold invented after the fact is a rationalization.

### The fallback ladder

You will not have a measured baseline for everything, and pretending otherwise is how a governance page becomes fiction. Three honest rungs, in order — and the rung is written next to the number, every time:

1. **Measured baseline → target.** You ran the command against history and got a number. `ledger-core`'s 71% main-dev share is this.
2. **Proxy, labelled `PROVISIONAL`.** Someone credible estimated it. "~30 expert questions a week — PROVISIONAL, Priya's estimate" is this, and the label stays until the counting is done.
3. **Floor, with a `TODO`.** No number and no credible estimate: write down the floor ("we will count for two weeks, then set a target"), with a dated TODO and an owner. This is the honest state for doc freshness on day one.

**A metric whose rung isn't stated is a metric someone will argue with in six months**, usually at the worst moment. Write the rung in `docs/ESTATE.md` next to the number, along with the window it was measured over.

## The four metrics

### 1. Time to first meaningful PR

**Defined.** Calendar days from a new engineer's first day to the merge of their first *meaningful* PR: one that changes production behaviour, was reviewed by someone other than their onboarding buddy, and stayed merged. What doesn't count: docs-only changes, dependency bumps, formatting, a revert of their own change, or the traditional first-day README fix. This is deliberately harsh — the point is "they changed the system and the system was fine", not "they used git".

**Observed.** One command, run in the repo new hires touch first:

```bash
# seat: team
cd ~/ledger/ledger-api
gh pr list --author sam --state merged --json number,mergedAt,title --limit 20
```

```json
[
  {"number": 1042, "mergedAt": "2026-09-16T09:12:41Z", "title": "docs: fix broken link in README"},
  {"number": 1051, "mergedAt": "2026-09-24T14:40:02Z", "title": "chore(deps): bump jackson-databind to 2.17.2"},
  {"number": 1066, "mergedAt": "2026-10-02T16:05:19Z", "title": "fix(fx): apply the rate from the cache, not the DAO, on retry"}
]
```

Read the *third* row, not the first: #1066 is the first one that changes behaviour. Sam started 2026-09-14, so the number is nineteen days. Run the identical command with the predecessor's handle to get the baseline — that's where eleven weeks came from, and it's why the baseline is measured rather than remembered.

**Baseline:** 11 weeks, the predecessor (measured). **Target:** ≤ 3 weeks. **Decided:** if it lands over three weeks, don't blame the hire — go and read what blocked them. Sam's questions in week one are the evidence, and every one the map should have answered is a gap in the map, not in Sam ([The First Two Weeks](/kt/onboarding-track/) collects them on purpose).

### 2. Expert questions per week

**Defined.** Questions of the form *where is X* or *why does Y* that Priya or Marcus answered this week, in the channel, in a DM, or over a shoulder. Incident questions don't count — an outage is not knowledge transfer. This metric is the point of the whole playbook: it's the expert's hour, measured.

**Observed.** A channel search over a fortnight gets you a starting number and undercounts badly, because the ones that hurt happen in DMs and huddles. The honest instrument is a tally sheet the experts actually fill in — a table in the repo, one line per question, kept for two weeks:

```bash
# seat: team — the tally lives in the repo so it survives the fortnight and can be re-run
cd ~/ledger/ledger-core
awk -F'|' 'NR>2 {n++; if ($5 ~ /where-is|why-does/) k++; if ($6 ~ /yes/) m++}
  END {printf "%d questions · %d where-is/why-does · %d the map already answered\n", n, k, m}' \
  docs/kt/question-tally.md
```

```console
58 questions · 41 where-is/why-does · 12 the map already answered
```

Two weeks, so twenty-nine a week — which is how "~30, PROVISIONAL" stops being Priya's guess and becomes a measured baseline. The third column is the one that tells you what to do: twelve questions the map could have answered but a human answered anyway means the map exists and nobody reaches for it, which is an onboarding problem, not a mapping problem.

**Baseline:** ~30/week (PROVISIONAL — Priya's estimate, until the fortnight's tally replaces it). **Target:** halved. **Decided:** if the number doesn't move in a quarter, mine the questions rather than writing more map — the recurring ones become FAQ entries and decision records ([Getting It Out of Their Heads](/kt/expert-interviews/)). Expect it to rise first when a new hire starts; measure the trend over a quarter, never week to week.

### 3. Bus factor per critical repo

**Defined.** The share of the current year's added lines that came from the repo's single most active author. Bus factor itself — how many people would have to leave before nobody could maintain the thing — can't be computed; main-dev share is the proxy every tool uses, and [Inventory the Estate](/kt/inventory-the-estate/#bus-factor-who-could-leave-and-take-a-repo-with-them) has the full treatment.

**Observed.** The per-file loop, windowed to the current year, which is the window the target is set on:

```bash
# seat: team
cd ~/ledger/ledger-core
for f in $(git ls-files); do git log --since=2026-01-01 --format='%aN' -- "$f" | sort | uniq -c | sort -rn \
  | awk -v f="$f" 'NR==1{top=$1} {sum+=$1} END{if (sum) printf "%.2f %s\n", top/sum, f}'; done \
  | awk '{s+=$1; n++} END {printf "files touched in 2026: %d · mean top-author share: %.2f\n", n, s/n}'
```

```console
files touched in 2026: 412 · mean top-author share: 0.68
```

**Baseline:** `ledger-core` at 71% Priya (measured, since 2021-06-01). **Target:** no critical repo above 60% on the current year's commits. And here is the trap that makes most governance tables useless: **a target measured on a different window than its baseline is not a target, it's a hope.** The 71% is the five-year figure, and five-year figures move in years; the current-year figure — 0.68 on the day you start — is the one a quarter of work can shift. Record both, each with its window, and compare like with like. The repo-level number that goes in the table comes from `code-maat -a entity-ownership`, on the same page.

**Decided:** above 60% on the current year, the repo gets a named second author — not a training plan, a person, with a ticket that puts them in that code this quarter. Below it, stop mapping that repo and go find the next one.

### 4. Doc freshness

**Defined.** The share of `(path:line)` citations under `docs/` that still resolve — file exists, line exists. It ignores meaning on purpose, because freshness is the number a script can produce every night without anyone's opinion. Meaning is the [weekly semantic check](/kt/living-docs/#the-weekly-semantic-check), and it has a human in it.

**Observed.** `scripts/check-citations.sh` gives you both signals at once: the count, and the exit code the workflow branches on.

```bash
# seat: team
cd ~/ledger/ledger-core
scripts/check-citations.sh; echo "exit=$?"
```

```console
LINE GONE      src/main/java/com/ledger/core/fx/FxApplier.java:88 (file now has 61 lines)
MISSING FILE   src/main/java/com/ledger/core/posting/PostingWriter.java:214

2 stale citation(s)
exit=1
```

Exit `1` is what `nightly-freshness.yml` turns into one issue labelled `kt:stale` — one per run, never one per citation. The percentage and the full define/observe/decide live on [Keeping It True](/kt/living-docs/#the-freshness-metric-defined-observed-decided); this page carries the governance half.

**Baseline:** none on day one — floor: count nightly for two weeks, then set the target (TODO, owner: Dana). **Target:** ≥ 95%. **Decided:** below 95%, the map is *demoted* — a one-line PR flips its status to `DRAFT`, the label goes back to `kt:draft`, and everyone querying it hears "DRAFT" until it's fixed. Demotion is not punishment; it's the honest state, and it makes the cost visible to the people who can fix it.

### The four, on one line each

| Metric | Baseline (rung) | Target, one quarter | How observed | How often |
|---|---|---|---|---|
| Time to first meaningful PR | 11 weeks — the predecessor (measured) | ≤ 3 weeks | `gh pr list --author <handle> --state merged --json number,mergedAt,title` | per new hire, read at week 4 |
| Expert questions/week | ~30 (PROVISIONAL — Priya's estimate) | halved | the fortnight tally in `docs/kt/question-tally.md` | counted for two weeks, reviewed monthly |
| Main-dev share, per critical repo | `ledger-core` 71% Priya (measured, 2021-06-01→) | no repo above 60%, current year | the per-file loop, or `code-maat -a entity-ownership` | quarterly |
| Doc freshness | none (floor: two weeks, TODO) | ≥ 95% | `scripts/check-citations.sh` — count and exit code | nightly, automatic |

Four numbers, one page of `docs/ESTATE.md`, five minutes at the monthly review. If you can only keep two, keep the first and the last: one says the method worked for a human, the other says the artifact is still true.

## The review gate, as a team's first map sees it

The gate is the same one [Mapping One Repo](/kt/mapping-a-repo/#the-review-gate) sets out — this is it condensed to what a second team pastes into its first PR body, so their expert knows in ten seconds what they're being asked for:

```markdown
# Generated-doc review gate — first map, <repo>
Reviewer: <the named main-dev>  ·  Time box: 30 minutes  ·  Approval = the stamp

- [ ] Every factual claim ends with `(path:line)`; anything that can't is under "## Unverified"
- [ ] Spot-check ten citations, not the prose — the line says what the sentence says
- [ ] Nothing cites `target/`, a Confluence page, a README, or a comment — code and committed schema only
- [ ] "## Unverified" is non-empty; an empty one on a big repo means the agent guessed
- [ ] "No callers found" is never written as "unused"
- [ ] The build sentence names the toolchain CI actually runs, and cites the workflow file
- [ ] "## Questions for the expert" holds only what code cannot answer — why, history, intent
- [ ] Under 400 lines, and you finished inside the time box
- [ ] Corrections are review comments on the line; the expert never rewrites the doc
- [ ] On approval: `kt:draft` → `kt:stamped`, and the status line becomes STAMPED <date> by <name>
```

The one line to defend when a new team pushes back on it: **the expert reads evidence, not prose.** Every item above exists to keep the thirty minutes spent on pointers rather than paragraphs.

## The KT PR review checklist

The gate is what the *expert* checks. This is what *you* — or whoever owns the rollout — checks when a team submits its first map, before it goes anywhere near Priya's calendar. It's a process checklist, and every item has caught a real problem at least once:

```markdown
# KT PR review — a team's first map

- [ ] Reviewer is the repo's actual main-dev, with the ownership output pasted in the PR body — not "a senior person who was free"
- [ ] PR is a draft, labelled `kt:draft`, and the stamp session is booked with this PR URL in the invite
- [ ] `docs/ARCHITECTURE.md` is under 400 lines and its first line is the DRAFT status line
- [ ] The generated-doc review gate is in the PR body, unedited
- [ ] `CLAUDE.md` has the three sections and imports the map, so future sessions load it unasked
- [ ] `.github/CODEOWNERS` has a `/docs/` line naming the experts — ownership is structural, not remembered
- [ ] `scripts/check-citations.sh` is in the repo, `nightly-freshness.yml` is scheduled, and the check is green on this branch
- [ ] The skill is the shared `map-repo`, not a local fork — if it was forked, the diff is in the PR and says why
- [ ] The run's evidence is attached: the `-p` JSON with `total_cost_usd`, `num_turns`, and `permission_denials` (empty, or explained)
- [ ] This repo is on the approved list for the deployment, and nothing `restricted` was pasted into the prompt
- [ ] `docs/ESTATE.md` has the metric row: the repo's main-dev share, its window, and its rung
```

Two failures this catches that nothing else does. A team that forked the skill "to make it work for .NET" and quietly dropped the citation rule — the map reads beautifully and proves nothing. And a team that picked a friendly reviewer instead of the main-dev, which produces a stamp with a name on it and no knowledge behind it.

## Rolling out to five teams

What scales is the *artifacts*. What doesn't is the *hour*.

| Scales — package it once | Doesn't scale — each team does its own |
|---|---|
| The inventory pass (`gh repo list` → `docs/ESTATE.md`) — same commands, any estate | Deciding which repos matter: that's local knowledge |
| The skills (`map-repo`, `system-map`, `confluence-triage`, `draft-adrs`, `tutor`) | The expert's thirty minutes — one expert, one repo, one review |
| The workflows: `nightly-freshness.yml`, the semantic check, `check-citations.sh` | Booking that expert and protecting the slot |
| The gate, this checklist, the four metric definitions | The numbers themselves — each team's baseline is its own |
| The `CLAUDE.md` three-section template | The first ticket a new hire gets |

The packaging unit, as of September 2026, is a **plugin**: skills and subagents bundled together, installed with `/plugin` from a marketplace, invoked as `/plugin:map-repo`, loaded in headless runs with `--plugins`. The mechanics are the Toolkit's — [Sharing a skill across five teams](/toolkit/skills/#sharing-a-skill-across-five-teams-plugins) — and this page stops at the decision: one install per team beats five copies that drift, because a copied skill is a fork the moment someone edits it, and you find out at the review gate six weeks later.

**The platform ask** is a marketplace your organization hosts, added to the managed settings so every team's Claude Code sees it. It's a fifth request in the shape of the four in [Working Within Policy](/start/working-within-policy/#the-four-asks): name the plugin, name the skills in it, say who maintains it (you), and attach the evidence that the method already worked once — the stamped PR, the metric row, the freshness run. Until you have it, a shared repo with the skill directory and `git subtree` is honest and boring, and boring is fine.

**The sequencing that works.** Team two is the test of the *method*: sit in their first stamp session, watch which gate item they argue with, and fix the gate rather than the team. Teams three through five are the test of the *packaging*: if you're in the room for those, the packaging failed. The rollout is done when a team you didn't help submits a PR that passes the checklist above.

**And the thing that doesn't scale, stated plainly:** you cannot centralize the expert. Priya can stamp `ledger-core` and `ledger-shared` because she wrote them; she cannot stamp another team's repo, and a stamp from someone who didn't write the code is a signature, not knowledge. So each team maps its own repos with its own experts, and the KT function you're building is a set of files plus a checklist — never a queue with your name on it.

## Budgeting the spend

No prices on this page — the arithmetic and the link to your provider's published rates are on [Enterprise & Cost](/toolkit/enterprise-and-cost/#the-cost-arithmetic). What governance needs is the *shape*, and the shape is friendly, because the expensive thing happens once:

```text
month(one team) = R_new × C_map        # repos newly mapped this month — usually 0–2 after the first quarter
                + S     × C_system     # the system map: once, then only when the estate changes shape
                + 21    × C_freshness  # weekday nights — a shell script, no model, C_freshness = 0
                + 4     × C_semantic   # the weekly semantic check, scoped to citations whose file changed

C_x is measured, never predicted: it is that run's own total_cost_usd.
```

Two things fall out of that. The recurring cost of keeping the map true is *one agent run a week* plus a free nightly script, because [the semantic check](/kt/living-docs/#the-weekly-semantic-check) only reads citations whose file changed — a dozen on a quiet week. And mapping is a one-off per repo, which is exactly why mapping a repo nobody will onboard onto is the waste that matters.

The caps are the ceiling and they're in the flags, not in a policy document: `--max-budget-usd 8 --max-turns 60` for a map, `12`/`40` for the system map, `4`/`60` for the semantic check. A cap does two jobs — it stops a runaway, and it makes the worst case arithmetic rather than anxiety. What the month actually cost comes from the JSON each run already leaves behind:

```bash
# seat: team — every run writes its own receipt; this reads the month's
cd ~/ledger/ledger-core
jq -s 'map(.total_cost_usd // 0) | {runs: length, spend_usd: ((add * 100 | round) / 100)}' night/*.json
```

```console
{
  "runs": 9,
  "spend_usd": 8.37
}
```

Nine runs because it was a mapping month. Your number will differ — model, repo size, and how much of the context was cache-read all move it — which is why the site teaches the arithmetic and refuses to print a per-repo figure.

**The monthly cap per team** is two fences, and you want both. Yours: `--max-budget-usd` on every unattended run, so no single job can run away. Theirs: the platform's spend limit on the credential itself, which is the only thing that stops *many* small jobs adding up — a cap per run says nothing about a workflow triggered forty times. Ask for it with [Ask 1](/start/working-within-policy/#the-four-asks); the night shift's version of the same conversation is [Cost and Governance](/overnight-qa/cost-and-governance/).

## The compliance evidence you keep

Security will ask, usually a quarter in and usually at short notice. The answer should be a table you already maintain, not an archaeology project. Keep it in the repo, next to the maps:

| What they ask | The evidence | Where it lives |
|---|---|---|
| Which repos' source has been sent to a model | one row per repo: name, date first mapped, who ran it, the PR that landed the map | `docs/kt/deployment-register.md` |
| Which deployment it went to | Bedrock in `us-east-1` via the platform's role (or the API-key path) — named, never pasted | the workflow's `env:`, and the register's header |
| What was retained, and for how long | the `-p` JSON and the report as run artifacts, `retention-days: 30` | the Actions run's artifacts |
| Whether the agent was ever refused something | `permission_denials` per run — empty, or explained in the register | `night.json` |
| Which Confluence spaces were read | `LEDGER`, read-only, `restricted` excluded by the filter | `.mcp.json` and the CQL in the triage prompt |
| How long laptop sessions are kept | `cleanupPeriodDays` in managed settings — the platform's to set | managed settings (platform seat) |

The register is six columns and one line per repo, and writing it as you go costs a minute per map. Reconstructing it later costs a week, because "which repos have we pointed this at" is not a question git can answer. The retention and audit detail — including what the JSON does *not* contain — is on [Working Within Policy](/start/working-within-policy/#audit-and-retention).

:::tip[Good citizen]
Don't map repos nobody will onboard onto. A map of `ledger-report-3` costs tokens, costs an expert thirty minutes she owed to `ledger-core`, and will be stale before anyone reads it — because nothing keeps a document true except people using it and noticing when it lies. The prioritization rule from [Inventory the Estate](/kt/inventory-the-estate/) is the filter: map what is **high-change × high-concentration × new-hire-facing**. Everything else gets a two-line stub in `docs/ESTATE.md` saying what it is and who last touched it, and that's a complete and honest answer. "We mapped nineteen of twenty-three repos" is a worse sentence than "we mapped the four that new hires touch, and the other nineteen have owners listed."
:::

## Where next

- **Next in the journey:** [KT on One Page](/kt/cheat-sheet/) — every table, prompt, and checklist in this playbook, condensed, with the FAQ.
- **The lateral jump:** [Cost and Governance](/overnight-qa/cost-and-governance/) — the same conversation for the night shift, where the spend recurs instead of happening once.
