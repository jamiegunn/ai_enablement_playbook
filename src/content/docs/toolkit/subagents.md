---
title: "Subagents: Delegation With a Fresh Context"
description: Hand one job to a worker with its own context window and get a summary back — the agent file format, built-ins, invocation, fan-out across repos, and the three ways delegation goes wrong.
keywords:
  - claude code subagents
  - .claude/agents custom agent file
  - subagent fresh context window returns summary
  - fan out over many repos with claude code
  - "@agent invoke subagent"
  - claude --agent flag
  - --agents inline json headless
  - subagent doesn't remember the conversation
  - subagent maxTurns
  - explore plan general-purpose built-in agents
sidebar:
  order: 4
---

A subagent is a worker the main session delegates one job to. It gets its own fresh context window, its own tool list, and its own model; it runs its own loop — searching, reading, calling tools — and when it's done it returns a *summary* to the session that spawned it, not its transcript. The parent never sees the forty `grep` results the subagent waded through, only the answer. That's the whole reason to use one: the parent's window stays clean, the noisy work happens somewhere disposable, and you can run the same delegation twenty-three times — once per repo — without one session drowning.

It pulls the **context** lever: each subagent is a fresh window, and the parent's window fills with summaries rather than raw output. Each subagent also has its own **tools** list, which is where the site's rule "give it exactly the tools the job needs" applies a second time.

## Where agents live, and which wins

As of September 2026, definitions are found in this priority order:

| Wins | Source | Who writes it |
|---|---|---|
| 1 | Managed settings | The platform team |
| 2 | `--agents <json>` on the command line | You, inline, for one headless run |
| 3 | `.claude/agents/<name>.md` | The team — committed, reviewed |
| 4 | `~/.claude/agents/<name>.md` | You, for every repo on your machine |
| 5 | A plugin's `agents/` directory | Whoever published the plugin |

Three built-ins exist without any file: **Explore** (search and read, for "where is X"), **Plan** (work out an approach before touching anything), and **general-purpose**. The model reaches for them on its own; a custom agent is for when you want the tools, model, or rules pinned down.

## The frontmatter

| Field | What it does | The site's habit |
|---|---|---|
| `name` | The agent's name — what you invoke | Lowercase, one job: `repo-question` |
| `description` | When to delegate to it — the model matches on this | Say the *one* thing it answers |
| `tools` | Space-separated tool list; **inherits everything if omitted** | Always set it; read-only unless the job writes |
| `model` | `sonnet`, `opus`, `haiku`, or a full ID | `sonnet` for search and answer; `opus` only for synthesis |
| `permissionMode` | `default`, `acceptEdits`, `auto`, `plan`, `dontAsk` | `plan` for anything that only reads |
| `skills` | Skills preloaded into the agent | The procedure it should follow, if one exists |
| `memory` | Which memory scope it uses: `user`, `project`, `local` | Leave unset for the night's jobs |
| `isolation: worktree` | Run it in its own git worktree, so its edits never touch your checkout | Agents that write |
| `maxTurns` | Cap on the agent's own loop | Always set it — see the mistakes |

## Invoking

Three ways. Naturally — "use the repo-question agent to find where FX conversion is applied" — and the model delegates. Explicitly, by mentioning it: `@"repo-question (agent)"` followed by the question. Or start a whole session *as* the agent: `claude --agent repo-question`. Headless, `--agents <json>` passes definitions inline so a workflow doesn't depend on a checked-in file; the site's recipes use the file form because it's reviewed like code, and the vendor's page linked at the end has the inline shape.

Two facts about how they run, as of September 2026: subagents run in the **background by default**, so a parent that delegates eight questions isn't waiting on them one at a time; and subagents can spawn subagents, **to a maximum of five levels**. Neither is a reason to build a tree. The site's fan-outs are one level deep: a parent and its workers.

## The example: `repo-question`

The agent the repo map fans out with — one question in, one cited answer out:

```markdown
---
name: repo-question
description: Answers one architecture question about this repo with path:line citations. Use when the main session needs a fact about where or how something happens and finding it requires searching the code.
tools: Read Glob Grep
model: sonnet
maxTurns: 20
---
You answer exactly one question about this repository, for a senior engineer
who will act on the answer. Rules:
1. Search, don't read: Grep and Glob to find candidates; read only what you cite.
2. Every claim ends with `(path:line)`. If you cannot cite it, say "not found —
   may be in a neighbouring repo" and name the repo if the code suggests one.
3. Never invent a class, method, table, queue, or endpoint name.
4. Reply in under 200 words: the answer, the citations, then "Unverified:" for
   anything you inferred. The main session sees only your reply, so it must
   stand alone.
```

Save it as `.claude/agents/repo-question.md`, commit it, and ask it something from a session in `ledger-api`:

```text
> @"repo-question (agent)" Where is the rounding mode set for amounts this repo forwards to ledger-core?
```

```markdown
Rounding for forwarded amounts is fixed in one place: `MoneyDto.toMinorUnits()`
sets `RoundingMode.HALF_EVEN` (src/main/java/com/ledger/api/dto/MoneyDto.java:23-27),
and every controller under `web/` builds outgoing requests through it
(src/main/java/com/ledger/api/web/SettlementController.java:61-74,
src/main/java/com/ledger/api/web/RefundController.java:48-55).

Unverified: whether ledger-core re-rounds on receipt — that code is not in this
repo. The client forwards the DTO unchanged
(src/main/java/com/ledger/api/client/CoreClient.java:19).
```

The lines to look at are the ones in parentheses. Every sentence carries a `path:line` a human can open in twenty seconds, and the one thing the agent couldn't prove is under "Unverified" with the reason — the answer is usable *because* it says where it stops. The parent session received those nine lines; the searches that produced them stayed in the subagent's window and are gone.

The fan-out in [Mapping One Repo](/kt/mapping-a-repo/) is this agent used eight times: the parent runs `/map-repo`, delegates each of the map's eight questions to `repo-question`, and assembles `docs/ARCHITECTURE.md` from eight cited replies instead of from eight rounds of its own searching. [Mapping the System](/kt/mapping-the-system/) is the same shape one level up — one worker per repo, summaries back, the parent draws the edges. The trade: each worker pays for its own window, and the parent knows only what the summary says. If the summary is wrong, the parent has no way to notice — which is why every reply carries citations the *human* checks, not the parent.

## Used by

- [Mapping One Repo](/kt/mapping-a-repo/) — the eight-question fan-out, and the headless `--agents` form for running it in CI.
- [Mapping the System](/kt/mapping-the-system/) — one worker per repo, twenty-three summaries, one integration map.
- [Exploratory & E2E](/overnight-qa/exploratory-and-e2e/) — Playwright's generated planner, generator, and healer agents land in `.claude/agents/`.

## The mistakes people make

**Giving a subagent write tools it doesn't need.** `tools` omitted means the agent inherits *every* tool the parent has — including `Edit`, `Write`, and `Bash` — so a question-answering agent spawned from a session with edit rights can edit. A worker that only answers questions gets `Read Glob Grep` and `permissionMode: plan`; a worker that writes gets an explicit list, `isolation: worktree`, and the same write-scope hook the night uses. The fix is one line in the frontmatter and it's the line people leave out.

**Expecting it to remember the parent's conversation.** It can't. A fresh context window means the subagent knows nothing you said, nothing you read, and nothing the previous subagent found. "Check the class we discussed" returns an answer about some class. The fix is to write the delegation as a self-contained question with every fact it needs in it — the repo, the class, the branch, the definition of done — and to make the agent's own rules require a stand-alone reply, as `repo-question` does in rule 4.

**Unbounded `maxTurns`.** A subagent that can't find what it was asked for doesn't stop; it keeps searching, in the background, spending the run's budget where nobody's watching the transcript. Set `maxTurns` in every agent file — 20 is generous for one question — and keep the run-level `--max-turns` and `--max-budget-usd` as the outer bounds. A cheap loop is still a loop, and it's cheapest of all inside a subagent nobody's reading.

The vendor's reference for the file format, built-ins, and the inline `--agents` shape: [code.claude.com/docs/en/sub-agents](https://code.claude.com/docs/en/sub-agents).
