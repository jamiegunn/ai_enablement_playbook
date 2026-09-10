---
title: "Skills: Procedures You Can Invoke"
description: Turn the prompt you keep pasting into a named, reviewed procedure with its own tool list — the SKILL.md format, every frontmatter field, invocation, and how a skill is shared across teams.
keywords:
  - claude code skills skill.md
  - how to create a custom slash command claude code
  - disable-model-invocation
  - allowed-tools in skill frontmatter
  - skill invoked at the wrong time
  - "$ARGUMENTS in skill"
  - claude code plugin marketplace share skills across teams
  - skill keeps asking for permission
  - reusable prompt as a file in the repo
sidebar:
  order: 3
---

A skill is a markdown file that describes a procedure — what to do, in what order, under which rules, producing what — and that you or the model can invoke by name. `/map-repo` in a session runs `.claude/skills/map-repo/SKILL.md`. That's the whole idea, and it matters because a procedure in a file is reviewed in a PR, versioned with the code, shared by everyone who clones the repo, and identical every time it runs. A prompt pasted from a notes app is none of those. Every load-bearing prompt on this site is a skill or a prompt file for exactly this reason.

It pulls the **context** lever — a skill is text that enters the window when invoked — and, through its `allowed-tools` field, the **tools** lever: a skill can carry its own allowlist, so `/map-repo` runs with the Maven wrapper, `git log`, and `find` pre-approved and nothing else.

## Where skills live

| Location | Path | Who it serves |
|---|---|---|
| Project | `.claude/skills/<name>/SKILL.md` | Everyone who clones the repo — the site's default |
| Personal | `~/.claude/skills/<name>/SKILL.md` | You, in every repo on your machine |
| Enterprise | Distributed via managed settings | The platform team's fleet-wide skills |

The directory name is the default skill name; `name:` in the frontmatter overrides it.

## The frontmatter

As of September 2026 the fields are:

| Field | What it does | When you'd set it |
|---|---|---|
| `name` | The invocation name; defaults to the directory name | Rarely — the directory name is usually right |
| `description` | What the skill does and when to use it — **this is what the model matches on** when deciding to invoke a skill itself | Always, and precisely |
| `disable-model-invocation: true` | Only a human can invoke it | Anything that writes files or costs real money — `map-repo`, `characterize` |
| `user-invocable: false` | Only the model can invoke it | A helper procedure that makes no sense to type by hand |
| `allowed-tools` | Space-separated tool patterns pre-approved while the skill runs: `Read Grep Glob Bash(./mvnw *)` | Whenever the skill runs commands — otherwise every call prompts |
| `argument-hint` | A hint for whoever types `/name`, e.g. `"[filename]"` | Skills that take arguments |
| `arguments` | Named arguments, e.g. `[file, format]` | When positional `$0`, `$1` would be unreadable |
| `context: fork` | Run the skill in an isolated subagent with a fresh window | Verbose work whose transcript the parent doesn't need |
| `agent` | Which subagent type to fork into, e.g. `Explore` | With `context: fork` |
| `background` | Run it in the background (`false` by default) | Long work you don't want to wait on interactively |
| `paths` | Only load the skill for matching files, e.g. `"src/**" "tests/**"` | Area-specific procedures |

## Invoking, dynamic content, substitutions

Type `/map-repo` in a session; a skill from a plugin is `/plugin:skill`. Headless, the same string is the prompt: `claude -p "/map-repo"`.

Inside the body, `` !`command` `` runs a shell command once when the skill loads and pastes its output into the skill text — `` !`git diff HEAD` `` to hand the model the current diff without a tool call. Substitutions available in the body: `$ARGUMENTS` (everything after the name), `$0`, `$1` (positional), `${CLAUDE_SESSION_ID}`, `${CLAUDE_SKILL_DIR}` (the skill's own directory — for a script or template shipped with it), and `${CLAUDE_PROJECT_DIR}` (the repo root).

## The example: `map-repo`

The site's repo-mapping skill, in full:

```markdown
---
name: map-repo
description: Map this repository into docs/ARCHITECTURE.md (DRAFT) — entry points, request path, data model, integrations, build & run, surprises — every claim cited path:line, unknowns listed as unknowns. Use when onboarding or when asked "how does this repo work".
disable-model-invocation: true
allowed-tools: Read Grep Glob Bash(./mvnw *) Bash(git log *) Bash(find *)
---
You are mapping this repository for a senior engineer joining the team who has
never seen it. Write `docs/ARCHITECTURE.md`. Its first line is:
`**Status: DRAFT — not yet reviewed by a named expert.**`

Rules that override everything else:
1. Every factual claim ends with a citation `(path:line)` or `(path:line-line)`.
   A claim you cannot cite goes under "## Unverified" with what would confirm it.
2. Search, don't read: use Grep and Glob to find things; read only the files you
   cite. This repository may be very large.
3. "No callers found" is a finding; "unused" is a conclusion. Report the finding.
4. Two toolchains may coexist (Java 8 and 17 profiles, .NET Framework and .NET 8).
   Say which one CI actually runs, citing the workflow or build file.
5. Never invent a class, method, table, queue, or endpoint name. If a name
   appears only in documentation and not in code, say exactly that.

Answer these eight questions, each as a `##` section, in this order:
1. What is this, in one paragraph — and what is it NOT (what lives in
   neighbouring repositories)?
2. Entry points — every way execution starts: HTTP endpoints, message listeners,
   scheduled jobs, CLI mains. A table: entry → handler `path:line` → what it
   calls next.
3. The request path — trace ONE representative request end to end, file by file.
4. Data — the domain model and where it is persisted; every table and queue
   touched, with the code that touches it.
5. Integrations — every external system (databases, queues, HTTP clients, file
   drops): the config key, the code, the direction of data.
6. Build, run, test — the exact commands from the build files and CI, and what
   they require (environment variables, services, credentials by name only).
7. Things that will surprise you — anything a senior engineer would want to be
   warned about: dead-looking code with live callers, reflection or DI wiring,
   generated code, feature flags, dual toolchains, time-zone handling.
8. Safe places to make a first change — three candidates with test coverage,
   cited.

Then two more sections: "## Unverified" and "## Questions for the expert" —
the things only a human can answer (why, history, intent).

Keep the whole file under 400 lines. Prose is cheap; citations are the product.
```

Three lines of the frontmatter do the work. The `description` says what it produces *and* when it applies ("when onboarding or when asked 'how does this repo work'") — the second half is what stops the model reaching for it during an unrelated bug fix. `disable-model-invocation: true` means it never runs unless a person types `/map-repo`: it writes a file and spends a budget, and a skill like that should start with a human decision. `allowed-tools` pre-approves exactly the reads, the searches, the Maven wrapper, `git log`, and `find` — so the run isn't a wall of prompts and the model can't quietly reach for anything else while the skill is active. Note what's absent: no `Write`. The skill's allowlist covers the *exploration*; permission to write the one output file comes from the session — interactively, your approval when it's asked for; headless, the `--allowedTools` list and `acceptEdits` in the command below.

Run it interactively (`claude` in the repo, then `/map-repo`) or headless:

```bash
# seat: team
claude -p "/map-repo" \
  --permission-mode acceptEdits \
  --allowedTools "Read,Grep,Glob,Write,Edit,Bash(./mvnw *),Bash(git log *),Bash(find *)" \
  --max-turns 60 \
  --max-budget-usd 8 \
  --model sonnet \
  --output-format json > map-run.json
```

```console
$ jq '{is_error, num_turns, total_cost_usd, denials: (.permission_denials | length)}' map-run.json
{
  "is_error": false,
  "num_turns": 41,
  "total_cost_usd": 2.87,
  "denials": 0
}
$ head -1 docs/ARCHITECTURE.md
**Status: DRAFT — not yet reviewed by a named expert.**
```

`denials: 0` is the number to check: the skill's tool list and the flag's allowlist agree, so nothing was refused mid-run. The first line of the output file is the status the skill was told to write; [the review gate](/kt/mapping-a-repo/#the-review-gate) is what turns it into `STAMPED`.

## Sharing a skill across five teams: plugins

A skill in one repo helps one team. As of September 2026, the unit of sharing is a **plugin** — a package that bundles skills (and subagents) and is installed with `/plugin` from a **marketplace**; a skill from a plugin is invoked as `/plugin:skill`, a headless run loads plugins with `--plugins`, and the GitHub Action takes `plugins` and `plugin_marketplaces` inputs. The platform ask, when you get to [rolling KT out](/kt/measurement-and-governance/), is a marketplace your organization hosts so `map-repo` is one install per team rather than five copies that drift. Until then, a shared repo with the skill directory and a `git subtree` is honest and boring.

## Used by

- [The 90-Minute Repo Map](/kt/quick-start/) and [Mapping One Repo](/kt/mapping-a-repo/) — `map-repo`, above.
- [Mapping the System](/kt/mapping-the-system/) — `system-map`, which reads maps, never code.
- [Confluence](/kt/confluence/) — `confluence-triage`.
- [Getting It Out of Their Heads](/kt/expert-interviews/) — `draft-adrs`.
- [The First Two Weeks](/kt/onboarding-track/) — `tutor` and `gen-exercises`.
- [Characterization Tests](/overnight-qa/characterization-tests/) — `characterize`, the night's writing skill.
- [KT on One Page](/kt/cheat-sheet/) — the full list with one-line purposes.

## The mistakes people make

**A vague `description`, so the model invokes it at the wrong time.** "Analyzes the codebase" matches half of everything a session does; a skill with that description and model invocation enabled will fire during a bug fix, spend its allowance, and confuse everyone. The fix is two-part: write the description as *what it produces* + *when to use it* (the `map-repo` line is the shape), and set `disable-model-invocation: true` on anything with a cost or a side effect, so the description only has to be good enough for a human to find.

**Skills that do the work instead of describing it.** A `SKILL.md` that pastes last month's architecture doc into the body, or opens with `` !`./mvnw test` `` and dumps 3,000 lines of output before the first turn, has confused the procedure with its output. It's stale by next week and it fills the window before the model has read the rules. The fix: the body is *rules first, then the questions to answer, then the output's shape* — and dynamic content is one small command whose output the procedure needs, not a way to run the job at load time.

**Forgetting `allowed-tools`, so the skill prompts for every tool.** Interactively, that's twenty permission prompts and a person clicking through them without reading — which is worse than no fence. Headless, every unlisted call is a denial and the run ends with a half-written map. The fix is to list exactly the tools the procedure uses, as patterns (`Bash(./mvnw *)`, not `Bash`), and to check `permission_denials` in the JSON after the first run.

The vendor's reference for skills, frontmatter, and substitutions: [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills).
