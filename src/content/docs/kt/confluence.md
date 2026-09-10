---
title: "Confluence: Mining a Graveyard for the Living"
description: Triage 940 undated Confluence pages against the code with one bounded skill, keep the sixty that hold the why, and make the repo the source Confluence receives from instead of the one it argues with.
keywords:
  - confluence documentation out of date
  - confluence page is wrong but everyone links it
  - claude code atlassian mcp confluence
  - mcp.atlassian.com v2 mcp claude mcp add
  - cql order by lastmodified space
  - confluence data center mcp read only
  - migrate confluence pages to markdown in git
  - publish markdown to confluence from ci
  - confluence restricted label ai
  - which confluence pages can the ai read
sidebar:
  order: 7
---

You are here if: the repos that matter have a stamped `ARCHITECTURE.md` and the next question Sam asks is going to be answered by a Confluence page from 2019 unless you get there first; or InfoSec has asked, in writing, which pages the AI will read; or someone said "just clean up Confluence" and there are 940 of them. This page serves the **Map** stage of the pipeline — the dotted line in the [overview's diagram](/kt/overview/), the source you triage and never trust.

## Confluence isn't wrong, it's undated

A Confluence page is a sentence somebody once believed, with no expiry date on it. Space `LEDGER` has 940 pages and the median one was last edited in 2021. About 210 of them describe behaviour the code no longer has. About sixty are the only record anywhere of *why* something is the way it is. And the "Settlement Flow" page — the one everyone links, the one in every onboarding email since 2019 — has described a flow that hasn't existed since the 2022 MQ rework. Not one of those pages is lying. Every one was true on the day it was written. The rot is that the date isn't attached to the claim, so a reader can't tell a 2019 truth from a 2026 one, and neither can a model.

There are two ways to get this wrong, and most teams do one of them. The first is to trust it: point a model at the space, ask "how does settlement work?", and get the 2019 flow back — fluently, confidently, with a diagram. That's the Field Note [The Architecture Doc That Was Confidently Wrong](/blog/the-architecture-doc-that-was-confidently-wrong/), and it's the reason [Mapping One Repo](/kt/mapping-a-repo/) connects to nothing outside the code. The second is to ignore it: declare the space dead, stop linking it, and lose the sixty pages that are the only place anyone wrote down why `MoneyMath` rounds half-even when the Oracle side rounds half-up. Both mistakes come from treating the space as one thing. It's 940 things, and they need sorting.

**Treat every Confluence page as a claim to be checked against the code; keep what the code can't tell you; and make the repo the thing Confluence receives from, never the thing it competes with.** Three passes, in order: connect, triage, decide. Of the three levers, this page pulls Context (the page body reaches the model over MCP) and Proof (every verdict cites `path:line` in the code), and it pulls Tools deliberately in one direction — read-only, for the whole triage.

## Connect: the hosted server or the community one

MCP is the standard way to give the model a connection to something outside the repo — here, Confluence — and the connection shows up in the session as tools with names. The mechanics of adding a server, scopes, and the `.mcp.json` file are the Toolkit's: [MCP](/toolkit/mcp/). This page is about which server, and why. The choice isn't preference; it's where your Confluence runs. As of September 2026, Atlassian's own server is Cloud only, and Data Center shops use a community one.

### Atlassian Cloud: the hosted server

One command adds it at project scope, so the entry lands in `.mcp.json` at the repo root and every teammate who clones `ledger-docs` gets the same server:

```bash
# seat: team — needs the Atlassian MCP endpoint allowlisted by the platform team (the policy page's ask); Cloud sites only
cd ~/ledger
claude mcp add --transport http --scope project atlassian https://mcp.atlassian.com/v2/mcp
claude mcp list
```

```console
$ claude mcp list
Checking MCP server health...

atlassian: https://mcp.atlassian.com/v2/mcp (HTTP) - ✗ Needs authentication
```

The line to look at is the status: *needs authentication* is correct at this point, not a failure. Start a session and type `/mcp`; the browser opens Atlassian's OAuth 2.1 consent screen, you approve, and the status flips to connected. The server acts as *you* — it can read exactly the pages your Atlassian account can read, which is both the security model and the reason the triage below filters by label rather than trusting the connection to filter for it.

The entry this writes is the `atlassian` half of the site's canonical `.mcp.json` (the Playwright half is the Overnight playbook's):

```json
{
  "mcpServers": {
    "atlassian": {
      "type": "http",
      "url": "https://mcp.atlassian.com/v2/mcp"
    }
  }
}
```

Two things about the v2 server matter for the recipes on this page. First, the tool names: reads and writes are `getConfluenceContent`, `createConfluenceContent`, `updateConfluenceContent`, and CQL search is `searchConfluence` — the v1 `*Page` names are gone, and a skill that lists them in `allowed-tools` allows nothing. Second, the discovery model: those four are exposed directly, and the long tail — `listConfluenceSpaces`, `listConfluenceContent`, `archiveConfluenceContent`, `addLabelsToConfluenceContent`, `diffConfluenceContentVersions` and the rest — sits behind a `discover` tool and is called through `executeRead` or `executeWrite`. Appending `?tools=all` to the URL gives a flat list instead. The trade: a flat list puts every tool's definition into the context window of every session (more of your budget spent before the first question), while discovery keeps sessions small and costs an extra hop when you need a rare tool. The triage needs only `searchConfluence` and `getConfluenceContent`, both direct, so the canonical entry stays with discovery.

The read contract has one detail you'll hit immediately: `getConfluenceContent` returns an excerpt unless you ask for `detail="full"`, and an edit requires the `snapshotToken` from the read that preceded it. The skill below asks for full detail on every page; the writes on this page are done by humans or by `executeWrite` after a fresh read, for that reason.

### Data Center: the community server

Atlassian's server does not support Data Center or Server. The community `sooperset/mcp-atlassian` project (MIT, not official — say so when you ask the platform team to allow it) does, and it has two properties the hosted server lacks that turn out to be exactly what a triage wants: a read-only mode and a space filter. Data Center shops replace the `atlassian` entry with a container:

```json
{
  "mcpServers": {
    "atlassian": {
      "type": "stdio",
      "command": "docker",
      "args": ["run", "--rm", "-i", "--env-file", "${HOME}/.config/mcp-atlassian.env", "ghcr.io/sooperset/mcp-atlassian:latest"]
    }
  }
}
```

The server keeps the name `atlassian` so the same `.mcp.json` key works in both shops; only the tool names differ, and the skill's `allowed-tools` line changes with them (below). `${HOME}` expands inside `.mcp.json`, which is how each developer points at their own env file without committing a token. That file:

```text
# ~/.config/mcp-atlassian.env — one per developer, never committed; the PAT is yours, not the team's
CONFLUENCE_URL=https://confluence.internal
CONFLUENCE_PERSONAL_TOKEN=<your personal access token>
READ_ONLY_MODE=true
CONFLUENCE_SPACES_FILTER=LEDGER
ENABLED_TOOLS=confluence_search,confluence_get_page
```

Each line has a reason. `CONFLUENCE_PERSONAL_TOKEN` is a Data Center personal access token (your avatar → Settings → Personal access tokens; the default maximum expiry is 365 days, so put the renewal in your calendar the day you create it). `READ_ONLY_MODE=true` removes every write tool from the server *before* the model sees a tool list — a structural bound, not a polite request, and the reason a Data Center shop can run the triage with less ceremony than a Cloud one. `CONFLUENCE_SPACES_FILTER=LEDGER` means a search that forgets its `space =` clause still cannot wander into `PAY` or HR's space. `ENABLED_TOOLS` narrows the server to the two tools the triage uses, which keeps the context window small and the blast radius smaller. Check it the same way:

```console
$ claude mcp list
Checking MCP server health...

atlassian: docker run --rm -i --env-file /home/dana/.config/mcp-atlassian.env ghcr.io/sooperset/mcp-atlassian:latest - ✓ Connected
```

If it says anything else, [MCP Won't Connect](/troubleshooting/mcp-wont-connect/) starts from this output.

### The trade

| | Atlassian hosted (Cloud) | `sooperset/mcp-atlassian` (Data Center, or Cloud) |
|---|---|---|
| What you gain | Official, maintained by Atlassian; OAuth as you, no token to store; Jira in the same server; the v2 read/edit contract with snapshot tokens | `READ_ONLY_MODE` and `CONFLUENCE_SPACES_FILTER` as structural bounds; works on Data Center; runs on your machine or a runner you control |
| What you pay | Cloud only; no read-only switch — the CQL and your account's permissions are the only filters; per-plan hourly call ceilings; search may consume Rovo credits | Community project, not a vendor contract; a container on every laptop and runner; a PAT with an expiry you must manage; tool names differ from the hosted server |
| The ask | Allowlist `https://mcp.atlassian.com/v2/mcp` in managed settings | Allowlist the container image and the Confluence URL; InfoSec sign-off on a PAT-holding container |

Either way the ask crosses the boundary, and [Working Within Policy](/start/working-within-policy/) has it written out with the evidence to attach: the endpoint, the space, the label filter, and the fact that the triage never writes.

:::note[What the model sees]
The workspace `CLAUDE.md` in `~/ledger/` (which already says `LEDGER` is not evidence — [Mapping the System](/kt/mapping-the-system/)), the skill text, one page body at a time as the read tool returns it, and whatever Grep and Glob bring back from the twenty-three repos. Not the whole space. Not the page tree. That's the point: the model compares one claim to the code, then moves on.
:::

## The triage pass

The triage is a skill — a markdown file the team commits, invoked by a human, with its tools pinned — because it will run for several evenings and everyone who runs it must run the same thing. Skills and their frontmatter are the Toolkit's: [Skills](/toolkit/skills/#the-frontmatter). The file:

```markdown
---
name: confluence-triage
description: Triage Confluence space LEDGER against the code, oldest pages first — a freshness score from last-modified, then MATCHES / CONTRADICTS / UNVERIFIABLE with path:line evidence — appended to docs/CONFLUENCE-TRIAGE.md. Human-invoked only; never edits Confluence.
disable-model-invocation: true
allowed-tools: mcp__atlassian__searchConfluence mcp__atlassian__getConfluenceContent Read Grep Glob Write
argument-hint: "[max pages this run, default 120]"
---
You are triaging Confluence space LEDGER against the code in this workspace
(~/ledger, all 23 repos). You never edit Confluence. The only file you write
is docs/CONFLUENCE-TRIAGE.md, and you append to it — never rewrite rows that
are already there.

1. Search with this CQL, exactly, oldest first, so the pages most likely to
   be wrong are checked first:
     space = LEDGER AND label != restricted order by lastmodified asc
   Page through the results. Skip any page already listed in
   docs/CONFLUENCE-TRIAGE.md (this run resumes the last one). Stop after
   $ARGUMENTS pages (default 120) and report how many remain.
   If a returned page carries the label `restricted` anyway, skip it and
   say so; do not read its body.

2. Read each page with getConfluenceContent and detail="full" — the body,
   not the excerpt. An excerpt cannot be checked.

3. Freshness score from last-modified: edited this year 3 · one to two
   years ago 2 · three to four years ago 1 · older 0. The score is a prior,
   not a verdict. A page from 2019 can be true; a page from last month can
   be wrong.

4. The check. List every class, method, queue, table, endpoint, config key,
   and repo the page names. Grep the workspace for each. Then decide:
   - MATCHES — every named thing exists and the page's account of how they
     connect agrees with the code. Cite path:line for each named thing.
   - CONTRADICTS — a named thing does not exist anywhere in the workspace,
     or the code shows a different mechanism. Cite the path:line that shows
     what the code does instead, and the search that found nothing
     ("Grep DirectSettlementWriter — 0 hits").
   - UNVERIFIABLE — the page describes people, process, history, a vendor,
     or a system outside the workspace (Oracle internals, the MQ broker,
     the SFTP host). Say what would verify it. A page with no code claims
     at all — a rationale, a meeting, a decision — is UNVERIFIABLE with
     kind = why.
   Never invent a class, table, queue, or path. A name you cannot find is a
   finding ("0 hits"), not a guess about where it might be.

5. Append one row per page to the table in docs/CONFLUENCE-TRIAGE.md:
     | page | id | last modified | freshness | verdict | evidence | bucket |
   bucket is one of: migrate (MATCHES and still useful) · archive
   (CONTRADICTS) · why (UNVERIFIABLE, kind = why) · leave (everything else).

6. Finish with the three counts, the pages remaining, and the ten
   CONTRADICTS rows with the highest freshness score — recently edited and
   still wrong is the dangerous combination.
```

Why each line is there. `disable-model-invocation: true` means the model can't decide on its own that a session about `ledger-batch` would benefit from a Confluence sweep; only a human starts one, which is the same rule every unattended-shaped job on this site follows. The `allowed-tools` line is the whole safety case in one line: two MCP tools, both reads, plus `Read`, `Grep`, `Glob`, and `Write` — and `Write` is there only for `docs/CONFLUENCE-TRIAGE.md`, which the text says twice. (Data Center shops replace the two MCP names with `mcp__atlassian__confluence_search mcp__atlassian__confluence_get_page`; nothing else changes.) The CQL orders by `lastmodified asc` because a triage that starts with the newest pages spends its first evening confirming things that are probably still true; starting from 2015 finds the wreckage first. `label != restricted` is InfoSec's rule in the query itself, and step 1's second check is belt and braces for a page the search returns anyway. Step 2's `detail="full"` is the v2 contract — without it the model triages a summary. Step 3's score is deliberately crude: it's a prior for ordering the human's attention, and the page's own words say so, because an expert who sees "freshness 3" on a wrong page needs to know the number never claimed to be a verdict. Step 4 is the method of the whole playbook applied to a page: a claim becomes a Grep, a Grep becomes a citation or a "0 hits", and the model is told in plain words that "0 hits" is the answer, not an invitation to guess. Step 5 appends, so several evenings produce one table. Step 6 sorts the output by danger, because Dana will read the top ten and Priya will read only the rows Dana forwards.

Run it interactively the first evening, so you watch what it does with the first twenty pages:

```bash
# seat: team — the Atlassian server connected (above); the workspace repo checked out
cd ~/ledger
claude "/confluence-triage 20"
```

Then let it run unattended in bounded batches — each run a fresh context window, each capped in turns and money, each resuming from the table:

```bash
# seat: team — the same laptop; leave it running after hours, the batches pace themselves against Atlassian's ceilings
cd ~/ledger
for batch in 1 2 3 4 5 6 7 8; do
  claude -p "/confluence-triage 120" \
    --output-format json \
    --permission-mode dontAsk \
    --allowedTools "mcp__atlassian__searchConfluence,mcp__atlassian__getConfluenceContent,Read,Grep,Glob,Write" \
    --max-turns 400 \
    --max-budget-usd 6 \
    > "docs/triage-runs/batch-$batch.json"
  jq -r '"batch '"$batch"': turns=\(.num_turns) cost_usd=\(.total_cost_usd) is_error=\(.is_error)"' "docs/triage-runs/batch-$batch.json"
done
```

```console
batch 1: turns=318 cost_usd=4.21 is_error=false
batch 2: turns=305 cost_usd=3.97 is_error=false
batch 3: turns=331 cost_usd=4.40 is_error=false
```

The flags are the three that make any unattended run safe — `dontAsk` denies anything not on the list, the list is the skill's `allowed-tools` restated for the CLI, and the two caps stop a loop — and they're explained once, properly, in [Running Unattended](/overnight-qa/running-unattended/#bound-one-what-it-may-do). The turn cap is high because each page is roughly a read plus a handful of greps, so 120 pages is a few hundred turns; the money cap is the ceiling you'd accept losing to a bad evening. The line to look at is `is_error`, and then the tail of `docs/CONFLUENCE-TRIAGE.md`:

```markdown
| page | id | last modified | freshness | verdict | evidence | bucket |
|---|---|---|---|---|---|---|
| Settlement Flow | 21036 | 2019-11-04 | 0 | CONTRADICTS | names `DirectSettlementWriter` (Grep — 0 hits in 23 repos); code path is `ledger-mq-bridge/src/main/java/com/ledger/mq/SettleInListener.java:41` → `ledger-core/src/main/java/com/ledger/core/settle/SettlementService.java:57` | archive |
| Batch restart semantics | 21877 | 2020-02-19 | 0 | MATCHES | `SETTLEMENT_RUN` lock: `ledger-db/legacy/DO_NOT_RUN/settle_run_lock.sql:1`; `ALREADY_RAN` exit: `ledger-batch/src/main/java/com/ledger/batch/settle/SettlementJobListener.java:41` | migrate |
| Why we round half-even | 19442 | 2017-06-30 | 0 | UNVERIFIABLE (why) | no code claims; rationale for `ledger-shared/src/main/java/com/ledger/shared/MoneyMath.java:47` | why |
| Oracle RAC failover runbook | 30115 | 2021-09-08 | 1 | UNVERIFIABLE | describes the database cluster, not the code; a DBA can verify | leave |
```

Four verdicts, four different fates, and not one of them depends on anyone's memory of the page.

:::tip[Good citizen]
Nobody asks Priya to "have a look at Confluence". She sees the CONTRADICTS rows, ten at a time, each with the citation that contradicts the page — thirty seconds a row, because she's checking whether `SettleInListener.java:41` really is where settlements enter, not re-reading a page from 2019. The 940-page sweep is the model's evening, not her hour.
:::

## The Settlement Flow page fails the check

Here's the row that matters, in full, because it's the one everyone links. The page says settlement instructions arrive as files, and that a `DirectSettlementWriter` in the batch writes them straight to Oracle over JDBC — plausible, specific, and true in 2019. The agent's check, as it appears in the evidence column and the run log:

```markdown
Page "Settlement Flow" (id 21036, last modified 2019-11-04, freshness 0)
Named things: DirectSettlementWriter, SETTLEMENT (table), ledger-batch, "settlement file drop"
- Grep -rn "DirectSettlementWriter" ~/ledger — 0 hits in 23 repos
- Grep -rn "LEDGER.SETTLE.IN" ~/ledger — ledger-mq-bridge/src/main/resources/application.yml:23,
  ledger-mq-bridge/src/main/java/com/ledger/mq/SettleInListener.java:41
- SettleInListener.onMessage calls SettlementService.settle
  (ledger-mq-bridge/src/main/java/com/ledger/mq/SettleInListener.java:58 →
   ledger-core/src/main/java/com/ledger/core/settle/SettlementService.java:57)
- Persistence is ledger-core's DAO, not the batch:
  ledger-core/src/main/java/com/ledger/core/persist/SettlementPostingDao.java:73
Verdict: CONTRADICTS. The inbound path is a queue listener in ledger-mq-bridge feeding
ledger-core in real time; no direct-JDBC settlement writer exists in the workspace.
The batch nets and closes at 03:00 (ledger-batch/src/main/java/com/ledger/batch/settle/SettlementJobListener.java:41);
it does not ingest.
```

Every line a human can check in twenty seconds by opening the file. The "0 hits" is the load-bearing one: it isn't the model's opinion that the class is gone, it's a search anyone can rerun. When Priya reads this row she does exactly one thing — confirms `SettleInListener.java:41` is the real entry — and the page that has misled every new hire for four years is settled. The system-level version of this audit, edge by edge, is in [Mapping the System](/kt/mapping-the-system/); this page's job is the page-level version, 940 times.

## Three buckets

Every row lands in one of three places, and the third is the one people forget:

| Verdict | Bucket | What happens | Who does it |
|---|---|---|---|
| MATCHES, still useful | **migrate** | The page becomes markdown in the repo it describes, with the citations the check already found added to its claims; a stub stays in Confluence pointing at git | The agent drafts the markdown; a human moves it in a PR labelled `kt:draft`; the stub is a human edit or an `updateConfluenceContent` after a fresh read |
| CONTRADICTS | **archive** | The page is archived with a comment naming what replaced it — the stamped map's section, by path | A human, or `archiveConfluenceContent` through `executeWrite` after a fresh read; never the triage skill |
| UNVERIFIABLE, kind = why | **why** | The page's text becomes a seed in `docs/decisions/seeds/` with its id and date, ready for the interview page's question list | The agent, in the same PR as the migrations |
| Everything else | **leave** | Nothing. Runbooks about Oracle, meeting notes, vendor pages — Confluence is fine for what the code can't check | — |

**Migrate** is the bucket that saves future evenings: a page that lives in `ledger-batch/docs/` is covered by the nightly freshness check from the night it merges ([Keeping It True](/kt/living-docs/)), which no Confluence page will ever be. The migrated file carries its provenance at the top, and the stub left behind is short:

```markdown
> **Moved to git on 2026-09-18.** This page is no longer maintained here.
> Current version: https://github.com/payments/ledger-batch/blob/main/docs/batch-restart-semantics.md
> (verified against the code by the triage on 2026-09-18; every claim there cites `path:line`).
```

Leave the old body underneath the stub for a quarter — people have bookmarks, and a page that vanishes teaches nobody where it went. **Archive** gets a comment, not a deletion, because the comment is the only thing that stops the next person from restoring it: "Archived 2026-09-18: described the pre-2022 file-based flow. Current flow: `ledger-core/docs/ARCHITECTURE.md`, section 3, stamped by Priya 2026-09-12." **Why** pages are the quiet win. The sixty rationale pages in `LEDGER` are worth more than the other 880 combined, because the code can tell you *what* forever and *why* never; each one becomes a file in `docs/decisions/seeds/` — the Confluence page id, its last-modified date, the text — and [Getting It Out of Their Heads](/kt/expert-interviews/#where-the-questions-come-from) turns those seeds into the questions Priya is actually asked.

## The rule: the repo publishes, Confluence receives

Once the good pages live in git, a reasonable person asks whether Confluence has a job at all. It does, and it's a receiving job: the people who read the `LEDGER` space — support, audit, the product owner who will never open GitHub — still need the architecture, and they're going to look where they've always looked. So the rule is one direction only. **The repo is the source of truth; Confluence receives generated pages and nobody edits them there.** The site's publishing command is `mark`, shown once in the Overnight playbook for the morning report; here it is adapted for the stamped map — space `LEDGER`, parent "Architecture (generated)", a banner that says where the real file is:

```bash
# seat: team — needs a Confluence API token (Cloud) or PAT (Data Center) for a service account that can write to space LEDGER under "Architecture (generated)" only
cd ~/ledger/ledger-core
{ printf '<!-- Space: LEDGER -->\n<!-- Parent: Architecture (generated) -->\n<!-- Title: ledger-core — Architecture (generated from git) -->\n<!-- Label: generated -->\n';
  printf '> Generated from `ledger-core/docs/ARCHITECTURE.md` at commit %s. Edit in git, not here — this page is overwritten on every merge to main.\n\n' "$(git rev-parse --short HEAD)";
  cat docs/ARCHITECTURE.md; } > confluence-page.md
docker run --rm -i -v "$PWD:/work" -w /work kovetskiy/mark:latest \
  mark -b "$CONFLUENCE_BASE_URL" -u "$CONFLUENCE_USER" -p "$CONFLUENCE_TOKEN" -f confluence-page.md --output-format github
```

```console
::notice::page "ledger-core — Architecture (generated from git)" updated: https://payments.atlassian.net/wiki/spaces/LEDGER/pages/40211/
```

The line to look at is the page URL — open it once and check the banner is the first thing on the page. The header comments are how `mark` knows where to put the page (space, parent by title, the page title, a label); the `generated` label is what lets the triage CQL skip these pages on its next sweep (`AND label != generated`, once you're publishing), and it's a visible marker for the human who wonders whether to edit. Run it by hand the first time; [Keeping It True](/kt/living-docs/) puts it on merge to `main` so the Confluence copy can't lag the repo by more than one PR. `mark` works on Cloud and Data Center alike; the credential is a service account scoped to the one space, never a person's token, and it lives in the workflow's secrets, never in `.mcp.json`.

The trade, stated: docs in the repo are versioned, reviewed, checked nightly, and next to the code they describe — and they're invisible to anyone without GitHub. Docs in Confluence are visible to everyone and checked by no one. Publishing generated pages buys the visibility without paying the rot, at the cost of one workflow and a rule that a Confluence edit to a generated page is a bug report, not a contribution.

## Honouring `restricted`

InfoSec's policy is a sentence: source code may go to the approved deployment; customer PII may go nowhere; Confluence pages labelled `restricted` may not leave Atlassian. The third clause is the one this page must prove, and it's proved twice on purpose.

:::caution[Two filters, because one is a query and queries get edited]
The CQL carries `label != restricted`, and on Data Center `CONFLUENCE_SPACES_FILTER=LEDGER` confines the server to one space before any query runs. Neither is optional, and on the hosted server only the first exists — the OAuth user's own permissions are the other bound, which means the triage must run as an account that *cannot* see `restricted` pages, not merely one that promises not to look. Ask InfoSec for that account; it's a five-minute request, and it turns "the skill's CQL excludes them" into "the account can't read them", which is the sentence they actually want to hear. Then keep the evidence: the skill file (its CQL), the env file with the filter (values redacted), and the first batch's JSON showing which tools ran. [Working Within Policy](/start/working-within-policy/) has the evidence pack this feeds.
:::

One more honesty item: `restricted` is a label, and labels are applied by people. A page that *should* be restricted and isn't will be read. That's InfoSec's process gap, not yours — but if the triage surfaces a page that looks like it holds customer data, stop the batch, tell them, and don't paste the page anywhere.

## Discovery, rate limits, and pacing

Discovery has one operational consequence beyond context size: a deferred tool such as `archiveConfluenceContent` is called through `executeWrite`, it's a write, and so it never appears in the triage skill. Rate limits are the other constraint, and here the site is careful because the numbers come from Atlassian's marketing page, not an engineering document: it lists per-plan hourly call limits and notes that search may consume Rovo credits. Treat those figures as ceilings you'll hit, not budgets you can plan around — 940 pages is at least 940 reads plus the searches, and a loop that hits a ceiling mid-batch produces errors the skill will faithfully record as UNVERIFIABLE. So let it run over several evenings in batches of 120, which is what the loop above does; if a batch ends with `is_error: true` or a run of UNVERIFIABLE rows sharing one error text, wait an hour and rerun it — the table makes it resumable. Ask the platform team which plan you're on before the first evening; it's the difference between two evenings and eight.

The failure modes, so you recognise them:

| You see | It means | Do |
|---|---|---|
| The skill reports every page MATCHES | It's reading excerpts, not bodies — `detail="full"` was dropped, or the Data Center server's `confluence_get_page` was asked for a summary | Fix the read; rerun the batch with the rows deleted |
| Tool errors after ~an hour of running | A rate ceiling, hosted or Data Center | Wait; smaller batches; ask which plan |
| A CONTRADICTS row cites a class that *does* exist | The agent grepped the wrong workspace root, or one repo isn't cloned | `ls ~/ledger` — 23 directories; rerun that row's page |
| `allowed-tools` denies the search tool | The old `*Page` names, or the wrong server's names in the skill | Match the names to `claude mcp list`'s server |
| Priya says a MATCHES page is wrong | The code matches the page and both are wrong about *intent* — this is a "why" question, not a triage failure | Move the row to `why`; it's an interview question |

## Where next

- **Next in the journey:** [Getting It Out of Their Heads](/kt/expert-interviews/) — the `why` bucket is half of Priya's question list; the other half comes from the map's "Unverified" sections, and the interview page merges them.
- **The lateral jump:** [Keeping It True](/kt/living-docs/) — every page you migrate into `docs/` is checked nightly from then on, and the `mark` publish goes on merge to `main`.
