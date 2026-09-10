---
title: "CLAUDE.md: The Standing Orders"
description: How CLAUDE.md files combine, load, import, and get excluded — and the three-section template that makes "not found" the default answer instead of an invented class name.
keywords:
  - what is claude.md
  - claude.md vs claude.local.md
  - claude.md precedence user project managed
  - "@import in claude.md"
  - .claude/rules paths frontmatter
  - claude code auto memory disable
  - claudeMdExcludes
  - claude code /init /memory
  - claude.md too long ignored
  - how to write a claude.md for a legacy repo
sidebar:
  order: 2
---

`CLAUDE.md` is a markdown file Claude Code reads into the context window at the start of every session in a repo, before you type anything. It's the one mechanism that changes what the model sees *without* anyone remembering to paste it — the standing orders: what this repo is, how to work here, what not to do. Because it's loaded every time and sits at the front of the window, it's also the most expensive place to be verbose and the cheapest place to be precise. Everything on this site that asks the model to cite `path:line`, say "not found" instead of guessing, or stay out of a folder starts as a line in this file.

It pulls the **context** lever, almost entirely. The "what not to do" section touches the tools lever too, but only as a *request* — the model reads it and usually complies. A line in `CLAUDE.md` is never a fence; [a deny rule or a hook](/toolkit/hooks/) is. Write both.

## The files and how they combine

Several files can carry standing orders, and they stack. As of September 2026 the precedence, highest first:

| Wins | File | Who writes it | Committed? |
|---|---|---|---|
| 1 | Managed policy — Linux/WSL `/etc/claude-code/CLAUDE.md`, macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`, Windows `C:\Program Files\ClaudeCode\CLAUDE.md` | The platform team; cannot be excluded | Their fleet, not your repo |
| 2 | `~/.claude/CLAUDE.md` | You, for every repo on your machine | No |
| 3 | `./CLAUDE.md` or `./.claude/CLAUDE.md` | The team — the repo's standing orders | Yes, reviewed like code |
| 4 | `./CLAUDE.local.md` | You — personal overrides for this repo | No, gitignored |

**Loading order** runs root → parent directories → the current directory, so a `CLAUDE.md` in `~/ledger/` (the workspace that holds all twenty-three repos) loads before `~/ledger/ledger-api/CLAUDE.md`. A `CLAUDE.md` in a *subdirectory* loads lazily — only when Claude reads files in that directory — which is how a module-specific note in `src/main/java/com/ledger/api/legacy/CLAUDE.md` costs nothing until the model goes there.

**`@path` imports** pull another file into the window: `@docs/ARCHITECTURE.md` in the template below loads the stamped map into every session. The cost is the file's size, every session, in the always-present prefix; prompt caching makes later turns cheaper, but the window space is spent regardless. A 400-line map imported into a repo's `CLAUDE.md` is a good trade. Twenty-three repos' worth imported into a workspace-level file is not, which is why [Mapping the System](/kt/mapping-the-system/) indexes the repos rather than importing their maps. Wrap an `@` in backticks (`` `@docs/ARCHITECTURE.md` ``) when you mean it literally.

**HTML comments** (`<!-- -->`) are stripped before the file reaches the model — free notes to the maintainers, at zero token cost. Use them for "Marcus reviewed this section 2026-09-12" and "TODO after the Java 17 cutover".

**`.claude/rules/*.md`** are modular rules. A rule with `paths:` frontmatter loads only when the model works on files matching the glob; a rule without it loads always. Symlinks are allowed, so five teams can share one rule file. This is the answer to the 400-line `CLAUDE.md`: keep the always-loaded file short, and move anything that applies to one area into a scoped rule.

```markdown
---
paths: "src/test/**"
---
# Testing in ledger-api
- Integration tests read `LEDGER_TEST_DB`. If it is unset, skip them and say so;
  never point them at a hard-coded host.
- A generated test that pins surprising behaviour carries the comment
  `// characterization: pins current behaviour as of <date>; may encode a bug`.
```

The trade: what you gain is a small prefix and instructions that appear exactly when relevant; what you pay is that a rule the model never triggers is a rule nobody notices is stale.

**`claudeMdExcludes`** is a settings key — a glob list of `CLAUDE.md` files to skip. Managed policy can't be excluded; anything else can, which is how you silence a workspace-level file for one repo that shouldn't inherit it.

## Auto memory

Separately from anything you write, Claude Code keeps an **auto memory** per project — `~/.claude/projects/<project>/memory/MEMORY.md` plus topic files — in which the model records things it learned; the first 200 lines or 25 KB of `MEMORY.md` are loaded at session start. `/memory` opens the memory files for editing; `/init` generates a starter `CLAUDE.md` by looking at the repo. Disable auto memory with `autoMemoryEnabled: false` in settings or `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` in the environment.

On a runner, disable it. A night's inputs should be the checkout, the prompt, and the settings — all reviewed — and a memory file that accumulates across runs is an input nobody reviewed. The read-only triage job goes further and runs with `--bare`, which skips auto-discovery altogether (`CLAUDE.md`, hooks, skills) because that job's prompt is self-contained; for jobs that *need* the standing orders, set `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` in the workflow's `env:` so the no-memory rule is explicit. [Running Claude Unattended](/overnight-qa/running-unattended/) decides which jobs get `--bare`.

## The example: `ledger-api`

The site's template, in full — the same file the [Day-1 Checklist](/start/day-1-checklist/#5-a-claudemd-with-the-three-sections) has you write, shown here for what each section is *for*:

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
- Layout: controllers in `src/main/java/com/ledger/api/web`, DTOs in
  `src/main/java/com/ledger/api/dto`. No business logic in controllers — it
  lives in `ledger-core`.
- When asked where something happens: search first (Grep/Glob), then cite
  `path:line`. If you cannot find it, say "not found in this repo — may be in
  ledger-core" rather than guessing.

## What not to do
- Do not edit anything under `src/main/java/com/ledger/api/legacy/` — scheduled
  for deletion, no tests, and Marcus is the only person who knows why it exists.
- Do not add dependencies without a comment naming the reason; the nightly
  dependency job flags unexplained additions.
- Do not invent class, method, table, queue, or endpoint names. "Unknown" is an
  acceptable answer; a plausible-sounding name is not.
```

**What this is** exists to stop the model reasoning from the wrong premise. Two toolchains coexist here; the file says which one CI runs. The repo *doesn't* talk to MQ; the file says so, which saves a search for queue code that isn't there. The `@` import loads the stamped map, and the parenthesis tells the model how to treat it — true and citable — and how to treat everything else: unknown, not inferred.

**How to work here** exists so the model's first tool calls are the right ones: the exact build and test commands, the layout, and the "search first, cite, else say not found" rule that makes an honest answer the path of least resistance ([why that works](/start/how-agentic-coding-works/#why-it-makes-things-up)).

**What not to do** exists because it holds the things only a human knows — the folder nobody may touch and why, the dependency rule, the never-invent rule. It's the section `/init` cannot write and the one an expert should check in the PR. And, again: these lines are requests. Where a job must not be *able* to touch `legacy/`, the night's [write-scope hook](/toolkit/hooks/) refuses every write outside `src/test/` — a fence, not a sentence.

## Used by

- [Day-1 Checklist](/start/day-1-checklist/) — writes this file with `/init` and reshapes it into the three sections.
- [The 90-Minute Repo Map](/kt/quick-start/) and [Mapping One Repo](/kt/mapping-a-repo/#output-layout) — produce the `docs/ARCHITECTURE.md` the file imports, and decide what goes in `CLAUDE.md` versus the map.
- [Mapping the System](/kt/mapping-the-system/) — the workspace-level file that indexes twenty-three repos.
- [The First Two Weeks](/kt/onboarding-track/) — Sam's session, loaded with the stamped map and the "not in the map — ask a human" rule.
- [Running Claude Unattended](/overnight-qa/running-unattended/) — which nightly jobs load it and which run `--bare`.

## The mistakes people make

**The 400-line `CLAUDE.md`.** It starts as three sections and grows a paragraph per incident until it's a wiki page loaded into every session — costing tokens on every turn and, worse, burying the three rules that matter under forty that rarely apply. The fix is structural: keep the always-loaded file to what applies to *every* session, move area-specific instructions into `.claude/rules/` with `paths:`, and put the long-form knowledge in `docs/ARCHITECTURE.md` where the map's citations can be checked nightly.

**Instructions that ask instead of fence.** "Never run `git push --force`" in `CLAUDE.md` is honoured by a model that reads it, weighs it, and usually agrees. Under pressure to finish — a failing test, a stuck rebase — "usually" is what the Field Note [The Night the Agent Fixed the Test by Deleting It](/blog/the-night-the-agent-fixed-the-test-by-deleting-it/) is about. Keep the sentence (it improves behaviour) and add the fence: a `deny` rule in `.claude/settings.json` and, for anything a pattern can't express, [a hook](/toolkit/hooks/).

**Forgetting `CLAUDE.local.md` in `.gitignore`.** It's the personal overlay — this week's branch, your own reminders, and, the day you're careless, a test database password. `git check-ignore -v CLAUDE.local.md` should print a line; if it prints nothing, the file will be committed with the next `git add .`. The [Day-1 Checklist](/start/day-1-checklist/) adds it alongside `.claude/settings.local.json`.

The vendor's reference for the memory hierarchy, imports, rules, and auto memory: [code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory).
