---
title: Wrong Repo, Wrong Branch, Wrong File
description: Find out in two commands why the edits landed in the wrong repository, branch, or directory, and put the fence in place — one repo per session, the branch before the agent, and a hook that refuses writes outside the allowed path.
keywords:
  - claude edited the wrong repo
  - claude code multi repo workspace
  - agent committed to the wrong branch
  - test file written under src/main
  - --add-dir wrong directory
  - write-scope hook permission_denials
  - claude code worktree isolation
  - git branch --show-current before agent step
  - nightly job wrote to main
sidebar:
  order: 4
---

**Symptom:** the diff is in `ledger-core` and you were working on `ledger-api`. Or the night's characterization tests were committed to `main` — or onto yesterday's `nightly/characterize-` branch. Or a generated test turned up under `src/main/java/…` next to the class it tests. The model did exactly what it was asked, in exactly the place it happened to be standing, because nothing told it where the edges were.

## Step zero: where is the session, really?

Two commands, before any theory, in the shell the session runs from:

```bash
# seat: team
pwd && git branch --show-current
git status --short | head
```

```console
$ pwd && git branch --show-current
/home/dana/ledger
main
$ git status --short | head
 M ledger-core/src/main/java/com/ledger/core/settle/SettlementService.java
?? ledger-core/src/main/java/com/ledger/core/settle/SettlementServiceCharacterizationTest.java
```

Read all three literally. `/home/dana/ledger` is the workspace, not a repo — so `ledger-api`'s `CLAUDE.md` was never loaded, and "the repo" from the model's side was twenty-three of them. `main` is where every commit will land. And the two status lines are the incident: a change and a new test file, both in `ledger-core`, the test under `src/main`. Had `pwd` said `/home/dana/ledger/ledger-api` and the branch `sam/fx-lookup`, you'd be on a different page.

For a night, the same facts come from the step log — and from `permission_denials`, where the write-scope hook leaves its reasons:

```bash
# seat: team
jq '.permission_denials | length' night.json
grep -o 'write outside src/test/ blocked by policy[^"]*' night.json
```

```console
$ jq '.permission_denials | length' night.json
2
$ grep -o 'write outside src/test/ blocked by policy[^"]*' night.json
write outside src/test/ blocked by policy (.claude/hooks/write-scope.sh): src/main/java/com/ledger/shared/MoneyMath.java
write outside src/test/ blocked by policy (.claude/hooks/write-scope.sh): docs/notes.md
```

Two denials with the hook's reason is the fence *working*: the agent wanted to write outside `src/test/` twice and was refused twice, and the evidence says so. Zero denials on a night whose PR touches `src/main` is the dangerous reading — nothing refused it because nothing was there to.

## Causes, ranked by likelihood

### 1. A workspace-level session with --add-dir on everything

Starting `claude` in `~/ledger/` — or in one repo with `--add-dir ../ledger-core --add-dir ../ledger-shared` — gives the session twenty-three repos' worth of files and one repo's standing orders, or none. Ask where FX is applied and it finds `FxApplier.java` in `ledger-core`; ask it to fix something and it edits it there, in a checkout you weren't working in, on whatever branch that checkout was left on. The model has no notion of "my repo". It has a set of readable directories. **One repo per session, unless the job is mapping the system** — and the system-mapping job reads maps, not code, and never writes.

### 2. No branch step before the agent

The writing job's settings deny `Bash(git checkout*)`, `Bash(git commit*)`, and `Bash(git push*)`: the agent never holds the power to move branches or push; the workflow does. So if the night's tests landed on `main`, the *workflow* committed them there, because checkout left the runner on the default branch and nothing created the night's branch before the agent ran. The branch step goes before the agent, not after — after is when the files already exist on the wrong branch. An excerpt of the shape:

```yaml
      - uses: actions/checkout@v7

      - name: Create the night's branch BEFORE the agent runs
        run: |
          git checkout -b "nightly/characterize-$(date -u +%F)"
          git branch --show-current              # in the log: proof of where the writes will land
      # … toolchain setup, then the agent step with --settings .claude/settings.night.json
      # … then, as workflow steps and never the agent: git add src/test && git commit && git push, gh pr create --draft
```

The branch pattern is `nightly/characterize-<YYYY-MM-DD>`; the whole workflow is on [Characterization Tests](/overnight-qa/characterization-tests/).

### 3. No write-scope hook

`--permission-mode acceptEdits` lets edits through without a prompt — that's what a writing job needs — and on its own it draws no line about *where*. The line is the hook: `.claude/hooks/write-scope.sh` runs before every `Edit` or `Write`, allows paths under `src/test/`, and denies everything else with the reason you saw above. Without it, a test under `src/main` is one plausible tool call away.

## The fix

**One repo per session.** `cd ~/ledger/ledger-api && claude`, with that repo's `CLAUDE.md` loaded and nothing added. When a question genuinely spans repos — "who publishes to `LEDGER.SETTLE.OUT`?" — answer it with a read-only session over the *maps* ([Mapping the System](/kt/mapping-the-system/)), or open a second session in the second repo. The trade: you'll change directories more often; you'll never edit the wrong checkout.

**The branch before the agent, in the workflow**, as above — with the workflow, not the agent, doing `git add src/test`, the commit, the push, and `gh pr create --draft`. That's the site's rule for every writing job, and it's why the deny list in `.claude/settings.night.json` covers every `git` write.

**The write-scope hook**, in full, wired from `.claude/settings.night.json` on `Edit|Write`:

```bash
#!/bin/bash
# .claude/hooks/write-scope.sh — PreToolUse guard on Edit|Write.
# The characterization job may create or change files under src/test/ only.
# Anything else is denied with a reason that lands in the run's permission_denials.
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"
case "$FILE" in
  "")                                exit 0 ;;   # not a file write; nothing to judge
  "$ROOT"/src/test/*|src/test/*)     exit 0 ;;   # inside the fence
  *)
    jq -n --arg f "$FILE" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:("write outside src/test/ blocked by policy (.claude/hooks/write-scope.sh): " + $f)}}'
    exit 0 ;;
esac
```

Prove it before you rely on it — pipe it the JSON it would receive:

```bash
# seat: team
chmod +x .claude/hooks/write-scope.sh
echo '{"tool_name":"Write","tool_input":{"file_path":"src/main/java/com/ledger/shared/MoneyMath.java"}}' | .claude/hooks/write-scope.sh
echo '{"tool_name":"Write","tool_input":{"file_path":"src/test/java/com/ledger/shared/MoneyMathCharacterizationTest.java"}}' | .claude/hooks/write-scope.sh; echo "exit=$?"
```

```console
$ echo '{"tool_name":"Write","tool_input":{"file_path":"src/main/java/com/ledger/shared/MoneyMath.java"}}' | .claude/hooks/write-scope.sh
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "write outside src/test/ blocked by policy (.claude/hooks/write-scope.sh): src/main/java/com/ledger/shared/MoneyMath.java"
  }
}
$ echo '{"tool_name":"Write","tool_input":{"file_path":"src/test/java/…"}}' | .claude/hooks/write-scope.sh; echo "exit=$?"
exit=0
```

A `deny` for the `src/main` path and a silent `exit=0` for the `src/test` path is the fence proving itself. Then the first real night gets a deliberate violation and you look for it in `permission_denials` — [Blast Radius](/overnight-qa/blast-radius/) makes that the rule for every fence, and [Hooks](/toolkit/hooks/) owns the JSON.

**Isolation, when you want a clean checkout per run:** `claude --worktree <branch>` runs the session in its own git worktree, so its edits can't land in the checkout you're working in.

## Which lever failed

Tools. The model could see enough and nobody's check was missing; the problem was that it *could* write anywhere it could read, and nothing narrowed "could" to "may". A `CLAUDE.md` line saying "only edit this repo" is a request. The hook and the deny list are the fence.

## Escalation

This page is almost entirely yours: the session's directory, the workflow's step order, the hook, the deny list. Escalate only if a fence you've proven with the piped test does *not* fire in a real `-p` run — `denials: 0` where the step log shows a write outside `src/test/`. Bring `claude --version`, the exact command with `--settings` and `--permission-mode`, the hook, and the JSON. That's a platform (or vendor) question, and it's the one case where "the fence didn't work" is a fact rather than a theory.

## Prevention

- `pwd && git branch --show-current` as the first line of every job's log and the first thing you look at in every session.
- One repo per session; maps, not code, for cross-repo questions.
- Every writing workflow: checkout → branch → agent → commit-and-PR steps, in that order, with the agent's settings denying every `git` write.
- The write-scope hook in every repo the night writes to, tested with the piped JSON *and* with a deliberate violation on the first night.
