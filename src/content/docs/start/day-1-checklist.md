---
title: Day-1 Checklist
description: An afternoon's worth of steps that leave you with Claude Code installed against the approved deployment, a CLAUDE.md with the three sections, a permissions baseline, and a destructive-command hook you have proved fires.
keywords:
  - install claude code
  - claude code native installer not on path
  - claude --version
  - claude code /doctor
  - /init claude.md what to edit
  - claude code settings.json deny list
  - block rm -rf git push --force hook
  - gh auth status workflow scope
  - CLAUDE.local.md gitignore
  - day one setup checklist claude code
sidebar:
  order: 5
---

Ten steps, each with the command, what you should see, and a *done when* line. The repo is `ledger-api` — the one new hires touch first, so the baseline you leave here is the one Sam inherits on Monday. Every file you create is committed and reviewed like code, because that's what it is. Budget an afternoon; the steps that need the platform team ([the four asks](/start/working-within-policy/#the-four-asks)) are deliberately not on this list, so nothing here waits on anyone.

Two things are true of every artifact below: it's the site's canonical version, quoted whole, so what you copy from this page is what every other page assumes you have; and it's a starting point you'll edit within a week, which is fine — the point of day one is to have something real to edit.

## 1. Install Claude Code

The native installer is the recommended path as of September 2026; `stable` pins you to the current stable release rather than whatever shipped this morning:

```bash
# seat: team
curl -fsSL https://claude.ai/install.sh | bash -s stable
command -v claude || echo "not on PATH yet — see the note below"
claude --version
```

```console
$ command -v claude
/home/dana/.local/bin/claude
$ claude --version
2.1.230 (Claude Code)
```

The version line is what you're after; the number will differ. If `command -v claude` prints nothing, the binary is where the installer put it (`~/.local/bin/claude`) and that directory isn't on your `PATH` in a non-login shell — add `export PATH="$HOME/.local/bin:$PATH"` to your shell profile and open a new terminal. The same gotcha appears on CI runners, which is why every workflow on this site adds the directory to `GITHUB_PATH` after installing.

The alternative is npm — `npm install -g @anthropic-ai/claude-code` — which needs Node 22 or later and lands wherever your global npm binaries go. Both paths give you the same `claude`; pick native unless your laptop is already managed around Node. (Some platform teams push Claude Code through the OS package repositories at `downloads.claude.ai` or an MDM instead; if `claude --version` already works on a fresh laptop, that's why, and you skip this step.)

- [ ] **Done when** `claude --version` prints a version from any directory in a new terminal.

## 2. Sign in against the approved path

Which sign-in you do depends on the deployment path you confirmed on [Working Within Policy](/start/working-within-policy/#the-three-deployment-paths). On the direct-API path, run `claude` in any directory and it walks you through signing in with the organization's Anthropic account on first launch. On Bedrock or Vertex there is nothing to sign in to: the provider switch in the managed settings and your cloud credentials *are* the login. Either way, the proof is the same one-turn call:

```bash
# seat: team
claude -p "Reply with the single word: ready" --max-turns 1 --bare
```

```console
$ claude -p "Reply with the single word: ready" --max-turns 1 --bare
ready
```

`--bare` skips `CLAUDE.md`, hooks, and skills, so the only thing being tested is the credential path; `--max-turns 1` means it can't wander. An authentication error here is a policy-page problem, not an install problem: the credential isn't reaching the deployment.

- [ ] **Done when** the one-turn call prints `ready`.

## 3. Run /doctor

Inside a session, `/doctor` checks the installation and reports anything it finds wrong. Start a session anywhere and run it:

```bash
# seat: team
claude
```

```text
> /doctor
```

The exact lines vary by version; what you're reading for is any check that isn't OK, each of which says what to fix. A `PATH` warning here is the step-1 note above. Type `/exit` when you're done.

- [ ] **Done when** `/doctor` reports nothing that needs fixing.

## 4. GitHub CLI with the workflow scope

Every overnight recipe reruns or disables workflows with `gh`, and the KT pages open PRs with it. The `workflow` scope is the one people find missing at the worst moment:

```bash
# seat: team
gh auth status
```

```console
$ gh auth status
github.com
  ✓ Logged in to github.com account dana-payments (keyring)
  - Active account: true
  - Token scopes: 'gist', 'read:org', 'repo', 'workflow'
```

`'workflow'` in the scopes line is the check. If it's absent, `gh auth refresh -s workflow` adds it without logging you out.

- [ ] **Done when** the scopes line includes `repo` and `workflow`.

## 5. A CLAUDE.md with the three sections

`CLAUDE.md` is the file loaded into every session in the repo — the standing orders — and it's the one mechanism you'll edit every week. Two minutes of mechanics: `/init` writes a starter by looking at the repo, and then you replace most of it, because a generated starter describes the repo and the three sections below describe how to *work* in it. Run it from the repo root:

```bash
# seat: team
cd ~/ledger/ledger-api
claude
```

```text
> /init
```

`/init` generates a starter `CLAUDE.md`. Read what it wrote — it's a reasonable inventory of the build and the layout — then open the file and reshape it into the three sections every `CLAUDE.md` on this site has: **what this is**, **how to work here**, **what not to do**. This is the site's template for `ledger-api`, in full:

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

What to edit immediately, and why each section earns its place:

- **What this is** — one paragraph, including what the repo is *not* and where the neighbouring things live. The "never talks to MQ directly" line saves a new hire an hour of searching for queue code that isn't here. Keep the `/init` output's build facts if they're right; cut its prose.
- **How to work here** — the build and test commands exactly as CI runs them, the layout, and the "not found" rule. That last bullet is the single most valuable line in the file: it's what makes "not found in this repo — may be in ledger-core" the default answer instead of an invented class name ([why it works](/start/how-agentic-coding-works/#why-it-makes-things-up)).
- **What not to do** — the things only a human knows: the folder nobody may touch, the dependency rule, the never-invent rule. This is the section to ask Marcus to check in the PR, because it's the one `/init` can't write.

:::note[One line is ahead of you]
`docs/ARCHITECTURE.md` doesn't exist yet — it's tomorrow's [90-minute repo map](/kt/quick-start/), and the `@docs/ARCHITECTURE.md` import with its `STAMPED 2026-09-12 by Priya` note describes the state *after* her review. Today, make the line honest and don't import a file that isn't there: write `Architecture: docs/ARCHITECTURE.md — DRAFT, not yet written; until it is, everything about this repo's architecture is unknown, not inferred.` When the map merges and Priya approves, switch to the `@docs/ARCHITECTURE.md` import with the STAMPED wording and the real date. Never write a stamp that hasn't happened.
:::

The mechanics — how several `CLAUDE.md` files combine, `@` imports, `.claude/rules/` — are one page: [CLAUDE.md: The Standing Orders](/toolkit/claude-md/).

- [ ] **Done when** `CLAUDE.md` has the three sections, the "not found" rule, and an honest architecture line.

## 6. The permissions baseline

`.claude/settings.json` is the repo's permission policy, committed so everyone who clones the repo gets it. This is the site's Day-1 baseline, in full:

```json
{
  "permissions": {
    "defaultMode": "default",
    "allow": ["Read", "Grep", "Glob", "Bash(./mvnw *)", "Bash(git status*)", "Bash(git diff*)", "Bash(git log*)"],
    "deny": ["Bash(rm -rf *)", "Bash(git push --force*)", "Bash(git push -f*)", "Bash(git reset --hard*)", "Read(./.env)", "Read(./.env.*)", "Read(./**/secrets/**)"]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/block-destructive.sh" }]
      }
    ]
  }
}
```

Reading it once: `defaultMode: "default"` means anything not covered by a rule asks you. The `allow` list is the set of things that never need to ask — reading, searching, the Maven wrapper, and the three read-only `git` subcommands — so the session isn't a wall of prompts. The `deny` list is the set of things that are refused whatever the mode and whatever the prompt says: the four destructive commands and the three secret-file reads. The `hooks` block wires a script to run before every `Bash` call; that's step 7. The pattern syntax (`Bash(./mvnw *)`) and the other modes are [Running Claude Unattended](/overnight-qa/running-unattended/)'s subject; for today, the baseline is enough.

:::caution[bypassPermissions]
There's a mode that skips every check. It exists for sandboxes you'd be happy to lose. It has no place on a laptop with a production VPN or on a runner with a credential, and the platform team can switch it off fleet-wide in managed settings (`disableBypassPermissionsMode`). If a tutorial tells you to use it "to save time," it wasn't written for your seat.
:::

- [ ] **Done when** `.claude/settings.json` exists with the baseline above.

## 7. The destructive-command hook

A deny rule matches a pattern; a hook runs a script, sees the full command, and can refuse it with a reason that lands in the run's evidence. The baseline uses both because each catches things the other doesn't — `TRUNCATE settlements` is nobody's deny rule. Create `.claude/hooks/block-destructive.sh`, in full:

```bash
#!/bin/bash
# .claude/hooks/block-destructive.sh — PreToolUse guard on Bash.
# Reads the hook JSON on stdin; denies with a reason. Exit 0 + JSON = decision.
COMMAND=$(jq -r '.tool_input.command // empty')
if echo "$COMMAND" | grep -Eq 'rm -rf|git push --force|git push -f\b|git reset --hard|DROP (TABLE|SCHEMA)|TRUNCATE '; then
  jq -n --arg c "$COMMAND" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:("blocked by policy (.claude/hooks/block-destructive.sh): " + $c)}}'
else
  exit 0
fi
```

Make it executable — a hook that isn't executable silently doesn't run — and test it directly, without Claude Code, by piping it the JSON it would receive:

```bash
# seat: team
chmod +x .claude/hooks/*.sh
echo '{"tool_name":"Bash","tool_input":{"command":"git push --force origin main"}}' | .claude/hooks/block-destructive.sh
echo '{"tool_name":"Bash","tool_input":{"command":"./mvnw -q test"}}' | .claude/hooks/block-destructive.sh; echo "exit=$?"
```

```console
$ echo '{"tool_name":"Bash","tool_input":{"command":"git push --force origin main"}}' | .claude/hooks/block-destructive.sh
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "blocked by policy (.claude/hooks/block-destructive.sh): git push --force origin main"
  }
}
$ echo '{"tool_name":"Bash","tool_input":{"command":"./mvnw -q test"}}' | .claude/hooks/block-destructive.sh; echo "exit=$?"
exit=0
```

The first output is a hook decision, read field by field: `hookEventName` names the event it's answering; `permissionDecision: "deny"` is the verdict; `permissionDecisionReason` is what you'll see in the session and in a headless run's `permission_denials` — the script's name and the exact command, so nobody has to guess what fired. The second command produced no JSON and exited `0`, which means "no opinion, proceed" — the build is allowed through. [Hooks: Guardrails That Don't Rely on Good Behaviour](/toolkit/hooks/) has the input JSON, the other events, and the `updatedInput` form.

Now prove it end to end. The site's rule for every fence is a deliberate violation on the first run: ask Claude Code to run a harmless command that only the hook would catch (the settings deny list has no rule for `TRUNCATE`), without `--bare` (which would skip the hook), and look for the denial:

```bash
# seat: team
claude -p "Run this exact shell command and report its output: echo TRUNCATE settlements_test" \
  --permission-mode dontAsk \
  --allowedTools "Bash(echo *)" \
  --max-turns 3 \
  --output-format json > fence-check.json
jq '{is_error, num_turns, denials: (.permission_denials | length)}' fence-check.json
grep -o 'blocked by policy[^"]*' fence-check.json
rm fence-check.json
```

```console
$ jq '{is_error, num_turns, denials: (.permission_denials | length)}' fence-check.json
{
  "is_error": false,
  "num_turns": 2,
  "denials": 1
}
$ grep -o 'blocked by policy[^"]*' fence-check.json
blocked by policy (.claude/hooks/block-destructive.sh): echo TRUNCATE settlements_test
```

`denials: 1` with the hook's reason is the fence proving itself: `echo` was on the allowlist, the settings had nothing against it, and the hook refused it anyway. If you see `denials: 0` and the result says the command ran, the hook didn't fire in this version's `-p` sessions — stop and find out why before anything on this site relies on it, because the night shift will. That's also the habit: **never trust a fence you haven't watched refuse something.**

- [ ] **Done when** the piped test prints a `deny` decision, and the `-p` test shows one denial with the hook's reason.

## 8. Keep the local files local

`CLAUDE.local.md` is your personal, uncommitted overlay on the standing orders — this week's branch, your own reminders, and, if you're careless, a test database password. `.claude/settings.local.json` is the same for permissions. Both stay on your laptop:

```bash
# seat: team
printf '%s\n' 'CLAUDE.local.md' '.claude/settings.local.json' >> .gitignore
git check-ignore -v CLAUDE.local.md .claude/settings.local.json
```

```console
$ git check-ignore -v CLAUDE.local.md .claude/settings.local.json
.gitignore:14:CLAUDE.local.md	CLAUDE.local.md
.gitignore:15:.claude/settings.local.json	.claude/settings.local.json
```

Two lines back means both patterns match; a missing line means that file would be committed. (`.env` should already be in there — if it isn't, that's a finding about the repo, not about Claude Code.)

- [ ] **Done when** `git check-ignore` reports both files.

## 9. Commit on a branch and open the PR

Everything above is code and gets reviewed like code. Marcus is the reviewer for the *What not to do* section, because it names his folder:

```bash
# seat: team
git checkout -b claude-code-baseline
git add CLAUDE.md .claude/settings.json .claude/hooks/block-destructive.sh .gitignore
git commit -m "Claude Code baseline: CLAUDE.md (three sections), permissions deny list, destructive-command hook"
git push -u origin claude-code-baseline
gh pr create --title "Claude Code baseline for ledger-api" \
  --body "CLAUDE.md with the three sections, the Day-1 permissions baseline, and the PreToolUse hook (tested: refuses git push --force and TRUNCATE). Marcus — please check 'What not to do'; it names src/main/java/com/ledger/api/legacy/." \
  --reviewer marcus-payments
```

```console
$ gh pr create --title "Claude Code baseline for ledger-api" --body "…" --reviewer marcus-payments
Creating pull request for claude-code-baseline into main in payments/ledger-api

https://github.com/payments/ledger-api/pull/412
```

The URL is the artifact. When it merges, every clone of `ledger-api` — including Sam's on Monday and the CI runner's on the first night — loads the same standing orders and the same fences.

- [ ] **Done when** the PR is open with Marcus requested on it.

## 10. The two-minute check, from inside the repo

You ran the [two-minute access check](/start/overview/#before-you-start-a-two-minute-access-check) with `--bare`. Run one more call from the repo *without* it, so the standing orders load, and ask the session what it now knows:

```bash
# seat: team
claude -p "In one sentence, what is this repository, according to CLAUDE.md?" --max-turns 1 --output-format json | jq -r '.result'
```

```console
$ claude -p "In one sentence, what is this repository, according to CLAUDE.md?" --max-turns 1 --output-format json | jq -r '.result'
ledger-api is a Spring Boot 2.7 REST facade in front of ledger-core (the settlement engine), on Java 17, which reaches Oracle only through ledger-core and never talks to MQ directly.
```

That sentence came from your file, not the model's imagination — the "never talks to MQ directly" clause is the tell. If the answer is generic ("a Java project using Maven"), the `CLAUDE.md` isn't being loaded from where you ran the command: check `pwd` and that the file is at the repo root.

- [ ] **Done when** the answer quotes your *What this is* section back to you.

## What to bookmark

Six pages you'll open more than the rest:

- [How Do I…? Solutions Index](/start/solutions-index/) — the task-to-page router.
- [KT on One Page](/kt/cheat-sheet/) and [Overnight QA on One Page](/overnight-qa/cheat-sheet/) — the tables, prompts, checklists, and FAQs.
- [Troubleshooting: Which Lever Failed?](/troubleshooting/overview/) and the [Error Message Index](/troubleshooting/error-index/) — for the day something is wrong and you're entering cold.
- [The Toolkit](/toolkit/overview/), starting with [CLAUDE.md](/toolkit/claude-md/) — the page for the file you'll edit weekly.
- The vendor's own reference at [code.claude.com/docs](https://code.claude.com/docs) — every flag on this site was checked against it, and it's where you go when a flag is rejected.
- [Learning Paths, Track 1](/learning-paths/#1-new-to-agentic-coding) — where this checklist sits in the sequence, and what comes after.

## The checklist, condensed

Paste this into the PR description or your notes and tick it off:

```markdown
# Day-1 Claude Code checklist — ledger-api
- [ ] `claude --version` prints a version in a new terminal (native installer; `~/.local/bin` on PATH)
- [ ] `claude -p "Reply with the single word: ready" --max-turns 1 --bare` prints `ready` on the approved path
- [ ] `/doctor` reports nothing that needs fixing
- [ ] `gh auth status` shows the `repo` and `workflow` scopes
- [ ] `CLAUDE.md` has the three sections, the "not found" rule, and an honest architecture line
- [ ] `.claude/settings.json` is the Day-1 baseline (allow list, deny list, hook wiring)
- [ ] `.claude/hooks/block-destructive.sh` is executable and printed a `deny` decision when piped `git push --force`
- [ ] A `-p` run with a deliberate violation showed `denials: 1` and the hook's reason
- [ ] `.gitignore` has `CLAUDE.local.md` and `.claude/settings.local.json`
- [ ] PR open; Marcus asked to check "What not to do"
- [ ] `claude -p` inside the repo answers "what is this?" from CLAUDE.md
```

## Where next

- **Next in the journey:** [The 90-Minute Repo Map](/kt/quick-start/) — tomorrow's work on this same repo: the `map-repo` skill produces `docs/ARCHITECTURE.md` with citations, Priya stamps it in thirty minutes, and the line you left honest today becomes true.
- **The lateral jump:** if the night shift is your mandate rather than onboarding, [The First Night](/overnight-qa/quick-start/) reuses everything you just built — the same fences, on a runner, read-only, tonight.
