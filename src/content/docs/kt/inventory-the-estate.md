---
title: "Inventory the Estate: Repos, Docs, and Who Knows What"
description: Turn twenty-three repos, nine hundred Confluence pages, and two experts into one ranked table that says what to map first — in an afternoon, without spending an expert hour.
keywords:
  - which repos to document first
  - bus factor of a codebase
  - too many repos where do i start
  - gh repo list all repos in an org
  - count lines of code across many repositories
  - code-maat main-dev
  - git log commits per author
  - confluence pages by last modified date
  - who knows this code
  - knowledge concentrated in one developer
sidebar:
  order: 4
---

You are here if: you have been handed an estate — twenty-three repos, a Confluence space, two people who know it — and you cannot say, with evidence, which repo to map first, which documents are worth a second look, or what would break if Priya's retirement came early.

**Stage: Inventory**, the first arrow in the [pipeline](/kt/overview/). Of the [three levers](/start/the-three-levers/), this page barely touches the model's: it is git, two command-line tools, and one small Confluence query, and the model appears once, to run a listing. That's deliberate. The inventory is the cheapest page in the playbook and the one that decides where every token after it goes.

## You can't map what you haven't listed

The temptation is to point the agent at `ledger-core` because it's the biggest, or at whatever Marcus mentioned last week, and start mapping. Both are guesses, and a guess costs the same tokens as a measurement. The inventory replaces the guess with three lists, each with a number attached:

1. **The repos, ranked** — how big each is, how often it changes, and how concentrated the knowledge of it is in one person.
2. **The documents, dated** — every page in Confluence space `LEDGER` with its last-edit date, and the few that record a *decision* rather than a description.
3. **The people, derived** — who the commit history says the expert is, per repo, and who the second name is.

The output is one file, `docs/ESTATE.md`, about forty lines long. It answers the first of the [four questions](/kt/overview/#the-four-questions-before-any-kt-work) — *where does this knowledge live?* — for the whole estate at once, and it fixes the order in which [Mapping One Repo](/kt/mapping-a-repo/) gets run.

**Derive the inventory from evidence; ask the experts only to correct it.** Ask Priya which repos matter and you get "all of them"; ask Marcus and you get "just ask me". Either way an expert hour is gone and nothing is ranked. Git answers the same question in minutes, and it also gives you the *second* name on every repo — which is the name the bus factor is actually about.

## The repos: list, clone, size

Start with what GitHub knows. This lists every repo in the org with its language, last push, and archived flag, and turns the JSON into a CSV you can sort in anything (the `jq` filter pulls the language name out of the nested object, and prints `none` for an empty repo):

```bash
# seat: team
mkdir -p ~/ledger-inventory
gh repo list payments --limit 500 --json name,pushedAt,primaryLanguage,isArchived \
  | jq -r '.[] | [.name, .pushedAt, (.primaryLanguage.name // "none"), .isArchived] | @csv' \
  | sort -t, -k2 -r \
  > ~/ledger-inventory/repos.csv
head -n 8 ~/ledger-inventory/repos.csv
```

```console
"ledger-api","2026-09-09T09:41:53Z","Java",false
"ledger-core","2026-09-08T14:02:11Z","Java",false
"payments-api","2026-09-08T11:15:40Z","Java",false
"ledger-batch","2026-09-02T17:20:07Z","Java",false
"ledger-db","2026-08-28T08:33:19Z","PLSQL",false
"ledger-mq-bridge","2026-07-30T15:55:02Z","Java",false
"ledger-web","2026-06-17T10:12:44Z","C#",false
"ledger-migration-dotnet8","2024-10-22T13:17:40Z","C#",false
```

Two rows to notice: `payments-api` is in the org but not in the estate (the filter below leaves it out), and `ledger-migration-dotnet8` was last pushed in October 2024 — the stalled migration announcing itself before anyone has read a line. Further down the file, `ledger-docs` shows `"none"` and a 2021 push date: empty, which is why it's about to become the workspace.

Now clone the estate. [Mapping the System](/kt/mapping-the-system/#the-workspace) wants all twenty-three repos under one directory with a repo of their own for the cross-repo artifacts, so clone the empty `ledger-docs` *as* `~/ledger/`, clone the other twenty-two inside it, and tell git to ignore them. The loop is the standard `gh` idiom with a filter for the estate's names; `ghorg clone payments --token="$GITHUB_TOKEN"` does the same in one command if the platform team has installed it, but it clones the whole org, `payments-api` included:

```bash
# seat: team
gh repo clone payments/ledger-docs ~/ledger
cd ~/ledger
gh repo list payments --limit 500 --json nameWithOwner -q '.[].nameWithOwner' \
  | grep -E '^payments/(ledger-|fx-rates-feed)' \
  | grep -v '^payments/ledger-docs$' \
  | xargs -n1 gh repo clone
ls -d ledger-*/ fx-rates-feed/ > .gitignore
ls -d */ | wc -l
```

```console
Cloning into 'ledger-api'...
Cloning into 'ledger-archiver'...
Cloning into 'ledger-batch'...
Cloning into 'ledger-core'...
(… 18 more …)
22
```

Twenty-two clones inside the twenty-third. The trade on cloning everything rather than the seven that will matter: you pay disk and twenty minutes; you gain a script that can't miss a repo, and a workspace the system page can use unchanged.

Size comes from [`scc`](https://github.com/boyter/scc), which counts code, comments, and blanks per language and, with `--by-file`, per file. Run it in the biggest repo first, because its output is the first thing that sets your expectations for the map's [cost shape](/kt/mapping-a-repo/#the-cost-shape):

```bash
# seat: team
cd ~/ledger/ledger-core
scc --by-file --format json -o counts.json
jq -r '.[] | [.Name, .Count, .Code] | @tsv' counts.json | sort -t$'\t' -k3 -rn | head -n 6
jq '[.[].Code] | add' counts.json
jq -r '.[] | select(.Name == "Java") | .Files[] | [.Code, .Location] | @tsv' counts.json | sort -rn | head -n 3
```

```console
Java	4108	388910
XML	212	12774
SQL	96	5312
Properties	61	2144
Shell	14	880
Markdown	9	342
410362
6120	src/main/java/com/ledger/core/settlement/SettlementEngine.java
4877	src/main/java/com/ledger/core/posting/PostingWriter.java
3902	src/main/java/com/ledger/core/fx/FxApplier.java
```

Read the JSON once: each element is a language, `Count` is its number of files, `Code` is its code lines (comments and blanks are separate fields), and `Files` — populated because of `--by-file` — is the per-file list. The line to look at is the total, 410,362, and then the first file: a 6,120-line `SettlementEngine.java` is where the map will spend most of its reading, and it's the first thing the expert's thirty minutes will be spent on.

Change frequency is one `git log` per repo. The window is a year — long enough to smooth out a release, short enough that a repo nobody has touched shows as what it is:

```bash
# seat: team
cd ~/ledger
for d in */; do
  [ -e "$d/.git" ] || continue
  printf '%6s  %s\n' "$(git -C "$d" log --since="1 year ago" --oneline | wc -l)" "${d%/}"
done | sort -rn
```

```console
   620  ledger-core
   310  ledger-api
   140  ledger-batch
    90  ledger-db
    45  ledger-mq-bridge
    40  ledger-ops-scripts
    30  ledger-web
    25  fx-rates-feed
    12  ledger-shared
(… 11 repos between 0 and 20 …)
     3  ledger-archiver
     0  ledger-migration-dotnet8
```

Two numbers matter more than the ranking. `ledger-shared` at twelve commits a year is the jar every Java repo depends on, so *low* change here means "nobody dares", not "nobody needs". And `ledger-web` at thirty is a 120,000-line application that is, for practical purposes, frozen — which changes what "mapping it" is for.

## Bus factor: who could leave and take a repo with them

**Bus factor** is the number of people who would have to leave before nobody could maintain a thing. A bus factor of one is a repo with one expert, and it is the number this whole playbook exists to raise. Nobody can compute it exactly; the proxy every tool uses is **main-dev share** — the fraction of the work on a repo, or a file, that came from its single most active author. Worked with the cast's numbers: since June 2021, 148,200 lines have been added to `ledger-core`, and 105,200 of them were Priya's — a main-dev share of 0.71. By commit count it comes out at 0.69 (2,180 of 3,140). Either way: one name, and it retires next year.

The quick version is a per-file loop — one `git log` per tracked file, the top author's commits divided by all commits on that file:

```bash
# seat: team
cd ~/ledger/ledger-core
for f in $(git ls-files); do git log --format='%aN' -- "$f" | sort | uniq -c | sort -rn | awk -v f="$f" 'NR==1{top=$1} {sum+=$1} END{printf "%.2f %s\n", top/sum, f}'; done | sort -rn
```

```console
1.00 src/main/java/com/ledger/core/util/DateRanges.java
1.00 src/main/java/com/ledger/core/util/Checksums.java
1.00 src/main/java/com/ledger/core/reporting/LegacyExportFormat.java
(… 3,480 more files at 1.00 …)
0.92 src/main/java/com/ledger/core/fx/FxApplier.java
0.85 src/main/java/com/ledger/core/settlement/SettlementRun.java
0.71 src/main/java/com/ledger/core/posting/PostingWriter.java
0.44 src/main/java/com/ledger/core/config/DataSourceConfig.java
```

Two things before the number means anything. The loop runs `git log` 4,108 times, which on this repo is about four minutes — fine once, not something to script across the estate. And the top of the output is a lie: 3,483 files at `1.00` looks like 3,483 files with a sole author, but ask git who that author is —

```bash
# seat: team
git log --format='%h %ad %aN' --date=short -- src/main/java/com/ledger/core/util/DateRanges.java
```

```console
a41c2f0 2021-05-28 bitbucket-migration
```

— and it's the import. Which is the caveat that governs everything else on this page.

:::caution[The history lies before June 2021]
The estate moved from Bitbucket to GitHub in May 2021 with squashed history: every line that existed on migration day belongs to one commit by one service account. Undated, any ownership analysis reports that commit as the main developer of 3,400 files, and by lines added the import owns roughly 380,000 of the 530,000 lines in the log — the "main-dev share" becomes a statement about the migration, not about people. So every analysis on this page is dated `--after=2021-06-01`, the first full month after the cut-over, **on purpose**. What you get is the honest question anyway: *who has been doing the work recently?* What you pay: anyone whose contribution was pre-2021 is invisible, and a file untouched since the import has no data at all. Read "no data" as the finding it is — `ledger-shared` has forty classes with exactly that — and write the cut-off date into `docs/ESTATE.md`, so next quarter's number is comparable to this one.
:::

The proper tool is [code-maat](https://github.com/adamtornhill/code-maat), which reads one git log for the whole repo and answers ownership questions per file. The log format is exactly what the jar's `git2` parser expects, and the date filter is the caveat above made concrete:

```bash
# seat: team — needs Java on the laptop; the jar is the standalone build from the code-maat releases page
cd ~/ledger/ledger-core
git log --all --numstat --date=short --pretty=format:'--%h--%ad--%aN' --no-renames --after=2021-06-01 > git.log
java -jar ~/tools/code-maat-1.0.4-standalone.jar -l git.log -c git2 -a main-dev > main-dev.csv
sort -t, -k5 -rn main-dev.csv | head -n 5
```

```console
src/main/java/com/ledger/core/fx/FxApplier.java,Priya,1412,1530,0.92
src/main/java/com/ledger/core/mq/SettleInListener.java,Marcus,640,702,0.91
src/main/java/com/ledger/core/settlement/SettlementRun.java,Priya,2210,2604,0.85
src/main/java/com/ledger/core/posting/PostingWriter.java,Priya,980,1379,0.71
src/main/java/com/ledger/core/config/DataSourceConfig.java,Marcus,88,201,0.44
```

The columns are `entity,main-dev,added,total-added,ownership`: for each file, the author who added the most lines since the cut-off, how many, out of how many, and the ratio. `FxApplier.java` at 0.92 is the file to worry about — if Priya retires, the FX path has no second author. `DataSourceConfig.java` at 0.44 is what healthy looks like.

The repo-level figure — the one that goes in the table and gets tracked — comes from `entity-ownership`, which lists lines added and deleted per author per file. Summing `added` by author gives the share:

```bash
# seat: team
java -jar ~/tools/code-maat-1.0.4-standalone.jar -l git.log -c git2 -a entity-ownership \
  | awk -F, 'NR>1 { by[$2]+=$3; total+=$3 } END { for (a in by) printf "%.2f %s\n", by[a]/total, a }' \
  | sort -rn
```

```console
0.71 Priya
0.18 Marcus
0.08 Dana
0.03 dependabot[bot]
```

The first line is the estate's headline number: **71% of every line added to `ledger-core` in five years came from one person.** It is the baseline for the bus-factor metric in [Measurement & Governance](/kt/measurement-and-governance/), and the target there — no critical repo above 60% on the current year's commits — is the definition of "KT worked" for this repo. Keep `git.log`; the same file answers `-a coupling` (which files change together), a question the repo map's "things that will surprise you" section will want later.

## The people: an expert map you derive, not ask

Run the `entity-ownership` sum in every repo that matters and you have the expert map — who is main-dev where, and who the second name is:

| Repo | Main-dev (share of lines since 2021-06) | Second | Read as |
|---|---|---|---|
| `ledger-core` | Priya 71% | Marcus 18% | bus factor one, and the one is retiring |
| `ledger-shared` | Priya 88% | — | eleven commits in five years; `MoneyMath` lives here |
| `ledger-batch` | Marcus 84% | Priya 9% | bus factor one |
| `ledger-mq-bridge` | Marcus 93% | Dana 5% | bus factor one, and the queue names live here |
| `ledger-db` | Marcus 77% | Priya 15% | one, with half the architecture outside the code |
| `ledger-api` | Dana 44% | Priya 31% | healthy — which is why the quick start lives here |
| `ledger-web` | Dana 38% | authors who have left: 52% combined | the bus already came |

Derived, not asked, for two reasons. Asking "who knows the batch?" gets you "Marcus" from everyone including Marcus, and asking "who *else*?" gets a shrug and an hour gone; git gives the second name in a minute, and the second name is the point. And the map assigns the stamps: Priya reviews `ledger-core` and `ledger-shared`, Marcus reviews the batch, MQ, and Oracle, and nobody alive can stamp `ledger-web` — which means its map's proof step is not a stamp but the [characterization tests](/overnight-qa/characterization-tests/) the night shift can write around it.

:::tip[Good citizen]
The inventory costs zero expert hours. Keep it that way: don't ask Priya "which repos matter?" — show her the ranked table and ask "what's wrong with this order?" Five minutes, and she'll tell you the one thing git can't: that `ledger-archiver`, three commits a year and every one of them hers, is the regulatory retention job, and nobody else knows it exists.
:::

## The docs: Confluence space `LEDGER`, by date

Confluence isn't wrong, it's *undated* — a page from 2019 describes 2019, and nothing on the page says so. You cannot score 940 pages by reading them, and you shouldn't try; you can score them by date with one query. The inventory *lists*; [Confluence: Mining a Graveyard for the Living](/kt/confluence/) does the reading and the sorting into true, wrong, and "why".

The listing runs over the Atlassian MCP server. MCP is the protocol that lets Claude Code call an external system as a tool — here, Confluence's search ([Toolkit: MCP](/toolkit/mcp/)); connecting it, and the Cloud-versus-Data-Center choice, is the first section of the [Confluence page](/kt/confluence/). Once it's connected, the prompt is a file in the workspace repo, because it will run again next quarter:

```text
# prompts/inventory-confluence.md
Inventory Confluence space LEDGER. Do not read any page body — this is a listing, not a review.

1. Call searchConfluence with the CQL `space = LEDGER order by lastmodified asc`.
   Page through the results until the search is exhausted; expect roughly 940 pages.
2. Write docs/estate/confluence-pages.csv, one row per page, header
   lastModified,id,title,labels — lastModified first, as returned; titles quoted;
   labels joined with a space.
3. Call searchConfluence with `space = LEDGER and label = decision order by lastmodified asc`
   and write docs/estate/confluence-decisions.csv in the same format.
4. Report the row count of each file and the earliest and latest lastModified. Nothing else.
```

```bash
# seat: team — needs the Atlassian MCP server connected and read access to space LEDGER
cd ~/ledger
claude "$(cat prompts/inventory-confluence.md)"
```

Approve the two tool prompts when they appear (the search, then the write). The session ends with the report:

```console
Wrote docs/estate/confluence-pages.csv: 940 rows (earliest 2013-02-11, latest 2026-09-03).
Wrote docs/estate/confluence-decisions.csv: 60 rows (earliest 2014-06-30, latest 2024-02-19).
```

:::note[What the model sees]
The prompt, one search result per page (title, id, date, labels — a few tokens each), and the workspace `CLAUDE.md` if you've written one. No page bodies. That is why this listing is cheap and why the `restricted` question below is about titles, not content.
:::

Now the freshness histogram. The date is the first CSV column precisely so that a title with a comma in it can't break the count; the second line pulls the 470th of 940 sorted dates, which is the median:

```bash
# seat: team
tail -n +2 docs/estate/confluence-pages.csv | cut -d, -f1 | cut -c1-4 | sort | uniq -c
tail -n +2 docs/estate/confluence-pages.csv | cut -d, -f1 | sort | sed -n '470p'
```

```console
     14 2013
     41 2014
     62 2015
     70 2016
     66 2017
     58 2018
     55 2019
     49 2020
    210 2021
     96 2022
     78 2023
     64 2024
     52 2025
     25 2026
2021-08-19T14:07:33.000Z
```

The median page was last edited in August 2021. Four hundred and fifteen pages predate 2021 entirely, and 2021's spike is the migration year — a bulk relink re-stamped about two hundred pages that nobody actually edited — so the dates lie in *both* directions: an old date is honest, a 2021 date is suspect. The "Settlement Flow" page everyone links sits in the 2019 row; the [Field Note](/blog/the-architecture-doc-that-was-confidently-wrong/) is what happens when a model reads it as current.

The sixty pages in `confluence-decisions.csv` are different in kind. They are the only place the estate's *why* is written down — "Why settlement rounds half-even" (2016), "Decision: FX rates move to `LEDGER.FX.RATES`" (2022) — and they are the seed list for the [interview questions](/kt/expert-interviews/#where-the-questions-come-from) and the one Confluence bucket that migrates into the repo whole.

:::caution[InfoSec's `restricted` label]
Pages labelled `restricted` may not leave Atlassian, and a listing over MCP passes their *titles* through the model. Exclude them in the query itself — `space = LEDGER and label != restricted order by lastmodified asc` — rather than after the fact; a filter on the server side (the Data Center server's space filter, on the [Confluence page](/kt/confluence/)) is belt, and this clause is braces. If you're unsure whether titles count under your policy, [Working Within Policy](/start/working-within-policy/) has the question written out for InfoSec.
:::

## The output: `docs/ESTATE.md`

Everything above collapses into one table in the workspace repo. `tests?` means a suite that runs in CI and someone trusts; `docs?` names the best existing document and its date, because the date is the finding:

```markdown
# Ledger estate — inventory (2026-09-10; ownership since 2021-06-01, see caveat)

| # | Repo | LOC | Commits/yr | Main-dev share | Tests? | Docs? | New-hire-facing? |
|---|---|---|---|---|---|---|---|
| 1 | ledger-api | 35k | 310 | Dana 44% | yes | README (2023) | yes — Sam's first repo |
| 2 | ledger-core | 410k | 620 | Priya 71% | partial (settlement only) | Confluence "Settlement Flow" (2019, wrong since 2022) | yes — first ticket lands here |
| 3 | ledger-shared | 9k | 12 | Priya 88% | MoneyMath only | none | yes — everything routes through MoneyMath |
| 4 | ledger-batch | 60k | 140 | Marcus 84% | few | Confluence runbook (2020) | no — but it runs at 03:00 |
| 5 | ledger-mq-bridge | 12k | 45 | Marcus 93% | none | queue names in Confluence (2022) | no |
| 6 | ledger-db | 1,200 PL/SQL objects | 90 | Marcus 77% | none | Liquibase changelogs (2022–) | not yet — Sam has no Oracle |
| 7 | ledger-web | 120k | 30 | Dana 38%; 52% from authors who have left | some (MSTest) | none | no |
| — | ledger-report-* (5) | 4–11k each | 0–20 | mixed | none | none | no |
| — | ledger-tools-* (6) | 1–6k each | 0–8 | Marcus | none | none | no |
| — | fx-rates-feed | 7k | 25 | Marcus 60% | some | none | no — map with mq-bridge |
| — | ledger-ops-scripts | 2k | 40 | Marcus 90% | n/a | none | read alongside the batch map |
| — | ledger-archiver | 5k | 3 | Priya 100% | none | none | no — ask Priya what it is |
| — | ledger-migration-dotnet8 | 30k | 0 (last push 2024-10) | left the org | — | — | decide: archive or resume |
| — | ledger-docs | 0 | 0 (last 2021) | — | — | — | now the workspace repo |

Confluence LEDGER: 940 pages, median last-edit 2021-08; 415 pre-2021; 60 labelled `decision`.
Caveat: pre-2021 history squashed at the Bitbucket migration; all ownership figures are --after=2021-06-01.
```

The prioritization rule that produced the numbers in the first column: **map first what is high-change × high-concentration × new-hire-facing.** High-change because a map of a frozen repo is a photograph, and a map of a busy one is a tool. High-concentration because that's where a departure hurts. New-hire-facing because Sam is the measurement. `ledger-core` scores highest on all three, and it is still row two — because the quick start needs a map an expert can stamp in [thirty minutes](/kt/quick-start/#the-thirty-minute-stamp-session), and 410,000 lines don't fit in thirty minutes. `ledger-api` is the first artifact; `ledger-core` is the second week, mapped in sections. `ledger-shared` jumps to row three on nine thousand lines because of one class and one retirement date. Don't compute a score; sort by the story, and write the story in the column.

## Take this with you

The whole repo pass as one script, so next quarter's inventory is a command rather than an afternoon. It loops over the clones under `~/ledger/`, sums `scc`'s code lines, counts commits in the window, and reports the top author's share of those commits — the quick commit-based proxy, not code-maat's line-based one; the trade is a number you can rerun in a minute against one that needs a jar and a dated log. Repos with no commits in the window still get a row, with their last-ever commit date so "dormant since 2021" and "empty" read differently:

```bash
#!/usr/bin/env bash
# scripts/inventory.sh — one CSV row per repo under ~/ledger: code lines, commits in the window,
# top author and their share of those commits, date of the last commit ever.
# Needs git, scc, jq. Usage: bash scripts/inventory.sh [root] > docs/estate/inventory.csv
# Widen the window with SINCE="2 years ago". Uses -u and pipefail but deliberately NOT -e:
# `sort | head -n 1` closes its pipe early, and -e would abort the loop on that.
set -uo pipefail
root="${1:-$HOME/ledger}"
since="${SINCE:-1 year ago}"
echo "repo,loc,commits,top_author,top_share,last_commit"
for dir in "$root"/*/; do
  repo="$(basename "$dir")"
  [ -e "$dir/.git" ] || continue                                          # skip docs/, prompts/ — only clones count
  loc="$(scc --format json "$dir" | jq '[.[].Code] | add // 0')"         # code lines summed over every language
  last="$(git -C "$dir" log -1 --format='%as' 2>/dev/null)"               # empty for a repo with no commits
  commits="$(git -C "$dir" log --since="$since" --oneline 2>/dev/null | wc -l | tr -d ' ')"
  if [ "$commits" -eq 0 ]; then                                           # nothing in the window: dormant or empty
    echo "$repo,$loc,0,none,0.00,${last:-never}"
    continue
  fi
  top="$(git -C "$dir" log --since="$since" --format='%aN' | sort | uniq -c | sort -rn | head -n 1)"
  top_n="$(echo "$top" | awk '{print $1}')"
  top_name="$(echo "$top" | sed -E 's/^ *[0-9]+ //')"
  share="$(awk -v n="$top_n" -v t="$commits" 'BEGIN { printf "%.2f", n / t }')"
  echo "$repo,$loc,$commits,\"$top_name\",$share,$last"
done
```

```bash
# seat: team
cd ~/ledger
bash scripts/inventory.sh > docs/estate/inventory.csv
sort -t, -k3 -rn docs/estate/inventory.csv | head -n 4
grep ',0,none,' docs/estate/inventory.csv
```

```console
ledger-core,410362,620,"Priya",0.68,2026-09-08
ledger-api,35118,310,"Dana",0.45,2026-09-09
ledger-batch,60407,140,"Marcus",0.82,2026-09-02
ledger-db,94870,90,"Marcus",0.76,2026-08-28
ledger-migration-dotnet8,30212,0,none,0.00,2024-10-22
```

The `0.68` (commits, last twelve months) against code-maat's `0.71` (lines, since 2021) is a difference of window and unit, and both say the same thing. Commit the CSV next to `ESTATE.md`; the [measurement page](/kt/measurement-and-governance/) diffs them quarter over quarter.

## Where next

- **Next in the journey:** [Mapping One Repo](/kt/mapping-a-repo/) — take row one of `ESTATE.md` and turn it into a stamped `ARCHITECTURE.md`; the eight questions, the citation rule, and the review gate.
- **The lateral jump:** [Measurement & Governance](/kt/measurement-and-governance/) — the 71% you just computed is a baseline the moment you write it down; that page says what to do with it every quarter.
