---
title: "Tests You'd Actually Keep: Characterization Tests for Legacy Code"
description: Have the night pin the current behaviour of the legacy code you're about to change — as a mutation-checked draft PR a human reviews in thirty minutes, not a suite someone has to find a week to write.
keywords:
  - characterization tests for legacy code
  - ai generated tests for code with no tests
  - tests before refactoring legacy java
  - pit mutation testing maven mutation score
  - generated test kills no mutants
  - claude code write tests overnight draft pr
  - stryker.net legacy .net framework tests
  - nightly characterize workflow github actions
  - flaky generated tests three runs
  - agent weakened an assertion
sidebar:
  order: 6
---

You are here if: a legacy module with no tests is about to be changed — Sam's first real ticket lands in `ledger-shared`'s `MoneyMath`, or the Java 17 cutover is next quarter — and you want the safety net built while you sleep, as a draft PR you review, rather than a suite someone has to find a week to write.

This is level 2 of [the maturity ladder](/overnight-qa/overview/#the-maturity-ladder): the first night on this site that *writes* anything. That moves the blast radius from "none" to "a branch and a draft PR", so it also changes the permission mode, adds a hook, and gives the workflow — never the agent — the power to commit. If the flags in the workflow below are new to you, [Running Claude Unattended](/overnight-qa/running-unattended/) explains each bound once; this page is about what to generate, how to know it's worth keeping, and what to do at 9:15.

## What a characterization test is, and why legacy code gets those

A **characterization test** records what the code does today, whatever that is. Michael Feathers, who named the technique, says its job is to "document your system's actual behavior, not check for the behavior you wish your system had" ([Characterization Testing](https://michaelfeathers.silvrback.com/characterization-testing)). A unit test says *this is correct*; a characterization test says *this is what happens*. The difference is everything when nobody alive can tell you which of the two you're looking at.

That's `ledger-shared`. Forty classes nobody has opened since 2018, and one — `MoneyMath` — that every Java repo in the estate routes money through. Priya knows why it rounds the way it rounds; she is retiring next year and has six spare hours a week. If the night wrote *unit* tests, it would have to decide what `MoneyMath.round` *should* return for a yen amount, it would decide by guessing, and a guess with an assertion around it is worse than no test because it looks like knowledge. If it writes characterization tests, it records that yen amounts are truncated while everything else rounds half-even, cites the line, flags it as surprising, and leaves the question for Priya. Sam changes the class on Monday knowing exactly which behaviours moved; Priya answers one question about truncation instead of reviewing a diff she has no time for.

**A characterization test may encode a bug. That is the point: it makes the bug visible and stops it moving silently.** Every generated test method on this site carries a comment saying so, and every surprising behaviour goes into a file the reviewer reads *before* the tests.

The trade against the alternatives is worth stating. Approval tests (golden-file, snapshot-style) capture more per test, but a reviewer can't tell from a golden file *what* was pinned. A hand-written suite built with Priya is better than either — if someone has the week. The night's tests are the net you can afford now, not the suite you'd write with an expert's help. Keep both ideas.

## The night's job

One question per job. This one's is: **"What does this code do today — pinned well enough that tomorrow's change shows exactly what moved?"** The evidence is a set of tests that pass three times in a row and kill mutants. The blast radius is a branch and a draft PR.

Two target sets, chosen by the workflow and never by the agent:

- **Files under `src/main/` changed in the last commit on `main`.** Yesterday's merge is the code most likely to be touched again tomorrow and least likely to have tests if it's in the legacy estate. With squash-merges, "the last commit" is "the last PR"; if the team merges several a day, the report says how many candidates were skipped.
- **A class named by hand.** `gh workflow run nightly-characterize.yml -f targets=src/main/java/com/ledger/shared/MoneyMath.java` on Friday, so Sam's Monday starts with a net under the class he's about to change.

Then: the agent writes tests under `src/test/` only, runs them, drops what fails, runs the survivors twice more and drops anything that changed its mind, and writes a summary with a citation on every line. The workflow mutation-tests what's left, deletes any test that proves nothing, and opens **one draft PR** labelled `nightly` and `needs-human`. At most five target classes a night, so the PR fits the thirty-minute review a human will actually give it.

## The skill

The prompt for this job is a skill — a procedure invoked by name, stored as a markdown file whose frontmatter names the tools it may use ([Skills](/toolkit/skills/) owns the mechanics). It lives in the repo, so the night and a developer typing `/characterize` at a keyboard run the identical procedure:

```markdown
---
name: characterize
description: Write characterization tests that pin the CURRENT behaviour of recently changed or untested code under src/test/ only, run them, and report — never touch src/main, never weaken an existing test.
disable-model-invocation: true
allowed-tools: Read Grep Glob Edit Write Bash(./mvnw *) Bash(git diff *) Bash(git status *)
---
You are writing characterization tests (Feathers: tests that document what the
system actually does, not what anyone wishes it did) for the targets listed in
`night/targets.txt` — one file per line, chosen by the workflow.

Rules that override everything else:
1. Write only under `src/test/`. If you believe `src/main/` needs a change, write
   it into `night/needs-human.md` instead and continue.
2. Never modify or delete an existing test, and never weaken an assertion.
3. Every generated test method carries the comment
   `// characterization: pins current behaviour as of <date>; may encode a bug`
   and asserts the OBSERVED output — including outputs that look wrong. Do not
   "fix" surprising behaviour by asserting what would be correct; record it in
   `night/surprises.md` with a `path:line` and move on.
4. Run `./mvnw -q test -Dtest=<the new classes>` after writing. Remove any test
   that does not pass. Then run the same command twice more; remove any test
   whose result changed between runs and note it in `night/flaky.md`.
5. Prefer many small tests over one large one; keep each class under 200 lines.
6. Finish by writing `night/summary.md`: targets, tests written, tests kept,
   tests dropped (and why), surprises, needs-human — every item with `path:line`.
```

Each rule exists because of a specific way this job goes wrong:

1. **Write only under `src/test/`.** The hook enforces this structurally (below); the rule tells the model what to do *instead* when it wants to touch `src/main/` — write the need down and carry on — so it doesn't burn twenty turns arguing with a denial. A rule and a fence aren't redundant: the rule shapes behaviour, the fence guarantees it.
2. **Never modify an existing test, never weaken an assertion.** The failure is [The Night the Agent Fixed the Test by Deleting It](/blog/the-night-the-agent-fixed-the-test-by-deleting-it/): a model that can't make a new test pass will, if allowed, make an old one stop failing. The night's settings deny `rm`; this rule covers the edit that isn't a delete.
3. **The comment, and assert what you observed.** The comment turns a wrong-looking assertion from an embarrassment into evidence — a reviewer meeting `assertEquals(new BigDecimal("1200"), MoneyMath.round(jpy))` must know instantly that nobody is claiming this is *right*. The surprises go to their own file with a `path:line` because they're the most valuable thing the night produces and shouldn't be buried in test bodies.
4. **Run, drop failures, run twice more, drop anything that changed.** One run proves a test passes; two more prove it passes *deterministically*. A flaky generated test costs a human an afternoon and then gets deleted anyway; three runs of a few classes cost seconds. This is the flake gate, and it lives in the skill rather than the workflow so it also applies when a developer runs `/characterize` by hand.
5. **Many small tests, classes under 200 lines.** Mutation testing credits kills per test, a reviewer reads intent per method name, and a 900-line generated class gets skimmed and merged. Small is what makes the next two gates work.
6. **A summary with a `path:line` on every item.** It becomes the PR body. The reviewer checks evidence, not prose — the same rule as the KT playbook's [review gate](/kt/mapping-a-repo/#the-review-gate).

## The workflow

`nightly-characterize.yml` follows the triage workflow's shape ([The First Night](/overnight-qa/quick-start/)) with three additions: a step that picks the targets, a branch the agent works on without knowing it, and the git steps the workflow runs *after* the agent has exited. It is shown for `ledger-shared`; the only repo-specific lines are the Java version and PIT's package pattern.

```yaml
# .github/workflows/nightly-characterize.yml — seat: team — needs the CI credential (platform) and the labels nightly + needs-human in the repo
name: Nightly characterization tests (writes to a branch)

on:
  schedule:
    - cron: "27 6 * * 1-5"   # 02:27 America/New_York on weekdays — ten minutes after triage, odd minute on purpose.
                             # Done by ~02:55, before the 03:00 settlement batch this job must never overlap.
  workflow_dispatch:         # by hand, for a named class:
    inputs:                  #   gh workflow run nightly-characterize.yml -f targets=src/main/java/com/ledger/shared/MoneyMath.java
      targets:
        description: Extra target files, one repo-relative path per line
        default: ""
        type: string
      budget_usd:
        description: Cost ceiling for the agent step (USD)
        default: "8"
        type: string

permissions:
  contents: write            # push the night's branch. Branch protection on main is the backstop — see Blast Radius.
  pull-requests: write       # open the draft PR

concurrency:
  group: nightly-characterize
  cancel-in-progress: false  # a manual run queues behind the scheduled one; two nights never write the same branch

jobs:
  characterize:
    runs-on: ubuntu-latest
    timeout-minutes: 45      # the backstop: budget and turns cap the agent; this caps everything, PIT included
    env:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}   # or CLAUDE_CODE_USE_BEDROCK=1 + AWS_REGION via OIDC
      NIGHT_BUDGET_USD: ${{ inputs.budget_usd || '8' }}    # above triage's 3: the agent writes code and runs the suite three times
      NIGHT_MAX_TURNS: "60"                                 # write, run, drop, rerun twice, summarise fits in 60; 100 is a loop
      TARGETS: ${{ inputs.targets }}                        # into an env var, never inline in a script: inputs are untrusted text
      GH_TOKEN: ${{ github.token }}
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 2     # HEAD~1 must exist for "what changed in the last commit"; the default depth of 1 has no parent

      - uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: "17"   # what CI runs for ledger-shared; the jdk8 profile is legacy
          cache: maven

      - name: Choose the targets — last commit's main-source changes, plus anything named by hand
        id: targets
        run: |
          mkdir -p night
          git diff --name-only HEAD~1 -- 'src/main/**/*.java' > night/candidates.txt
          if [ -n "$TARGETS" ]; then printf '%s\n' "$TARGETS" >> night/candidates.txt; fi
          grep -v '^$' night/candidates.txt | sort -u | head -n 5 > night/targets.txt || true   # five a night: a 30-minute review
          echo "count=$(wc -l < night/targets.txt)" >> "$GITHUB_OUTPUT"
          echo "targets tonight: $(wc -l < night/targets.txt) of $(sort -u night/candidates.txt | grep -c . || true) candidates"
          cat night/targets.txt

      - name: Start the night's branch — the agent never runs checkout, commit, or push
        if: ${{ steps.targets.outputs.count != '0' }}
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git checkout -b "nightly/characterize-$(date -u +%F)"

      - name: Install Claude Code
        if: ${{ steps.targets.outputs.count != '0' }}
        run: |
          curl -fsSL https://claude.ai/install.sh | bash -s stable
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"

      - name: Agent phase — the skill is the prompt
        id: agent
        if: ${{ steps.targets.outputs.count != '0' }}
        continue-on-error: true            # the gate and report steps must still run; the last step re-raises the failure
        run: |
          printf '/characterize\n' > /tmp/prompt.md   # a skill invocation must be the first thing the model receives
          CODE=0
          scripts/run-claude.sh /tmp/prompt.md night.json \
            --settings .claude/settings.night.json \
            --permission-mode acceptEdits \
            --model sonnet || CODE=$?
          # NOT --bare: this job needs CLAUDE.md (what not to touch), the skill, and the hooks in settings.night.json to load.
          # No --allowedTools here on purpose: the allow list AND the deny list live together in settings.night.json,
          # so there is one place to read and one place to review. See /overnight-qa/running-unattended/.
          echo "exit=$CODE" >> "$GITHUB_OUTPUT"
          exit $CODE

      - name: Quality gate — mutation-test the new tests; drop any that kill nothing
        id: pit
        if: ${{ steps.targets.outputs.count != '0' }}
        continue-on-error: true            # a PIT failure (no tests, no mutants) must not lose the night's work
        run: |
          NEW_TESTS=$(git ls-files --others --exclude-standard src/test | grep 'Test\.java$' || true)
          if [ -z "$NEW_TESTS" ]; then echo "no new tests survived the agent's own gate" >> night/summary.md; exit 0; fi
          ./mvnw -q test-compile org.pitest:pitest-maven:mutationCoverage \
            -DtargetClasses='com.ledger.shared.*' -DtargetTests='com.ledger.shared.*Characterization*'
          KILLED=$(grep -c 'status=.KILLED.' target/pit-reports/mutations.xml || true)
          TOTAL=$(grep -c '<mutation ' target/pit-reports/mutations.xml || true)
          for f in $NEW_TESTS; do
            CLASS=$(basename "$f" .java)
            if ! grep -q "$CLASS" target/pit-reports/mutations.xml; then   # never credited with a kill: the test proves nothing
              rm -f "$f"; echo "- dropped \`$f\` — killed no mutants (PIT)" >> night/dropped.md
            fi
          done
          SCORE=$(( TOTAL > 0 ? 100 * KILLED / TOTAL : 0 ))
          { echo; echo "## Mutation score (PIT, com.ledger.shared.*)"; echo "- $KILLED of $TOTAL mutants killed — ${SCORE}%";
            [ -f night/dropped.md ] && cat night/dropped.md; } >> night/summary.md
          echo "score=$SCORE" >> "$GITHUB_OUTPUT"

      - name: Commit, push, open ONE draft PR — the workflow holds the git power, not the agent
        id: pr
        if: ${{ steps.targets.outputs.count != '0' }}
        run: |
          git add src/test night/
          if git diff --cached --quiet -- src/test; then
            echo "no tests survived both gates tonight — no PR" | tee -a night/summary.md; exit 0
          fi
          BRANCH="nightly/characterize-$(date -u +%F)"
          git commit -q -m "nightly: characterization tests for $(tr '\n' ' ' < night/targets.txt)"
          git push -u origin "$BRANCH"
          gh pr create --draft --base main --head "$BRANCH" \
            --title "Characterization tests — $(date -u +%F)" \
            --label nightly --label needs-human \
            --body-file night/summary.md | tee night/pr-url.txt

      - name: Publish — job summary and artifact
        if: ${{ !cancelled() }}
        run: |
          if [ ! -f night/summary.md ] && [ -f night.json ]; then
            jq -r '.result // "# Characterization — ledger-shared\n**Verdict:** RED — the agent produced no summary (see the run-claude line above)"' night.json > night/summary.md
          elif [ ! -f night/summary.md ]; then
            printf '# Characterization — ledger-shared — %s\n**Verdict:** GREEN — nothing changed in src/main since the last commit; no targets\n' "$(date -u +%F)" > night/summary.md
          fi
          cat night/summary.md >> "$GITHUB_STEP_SUMMARY"

      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: nightly-characterize
          path: |
            night/
            night.json
            target/pit-reports/
            target/surefire-reports/
          retention-days: 30

      - name: Build the Slack payload
        if: ${{ !cancelled() }}
        env:
          SCORE: ${{ steps.pit.outputs.score }}
        run: |
          # The headline is assembled from the workflow's own numbers and the PR URL — never from model output via ${{ }}.
          RUN_URL="${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
          HEADLINE="$(wc -l < night/targets.txt) targets · PR: $(cat night/pr-url.txt 2>/dev/null || echo none) · mutation score ${SCORE:-n/a}%"
          jq -n --arg h "$HEADLINE" --arg u "$RUN_URL" \
            '{text: ("Characterization · ledger-shared · " + $h),
              blocks: [
                {type: "section", text: {type: "mrkdwn", text: ("*Characterization · ledger-shared*\n" + $h)}},
                {type: "actions", elements: [{type: "button", text: {type: "plain_text", text: "Open the run"}, url: $u}]}
              ]}' > slack.json

      - name: Post to #payments-nightly
        if: ${{ !cancelled() }}
        uses: slackapi/slack-github-action@v4
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK_URL }}   # seat: team — an incoming webhook you create for the channel
          webhook-type: incoming-webhook
          payload-file-path: ./slack.json

      - name: Re-raise the agent's failure so the run shows red
        if: ${{ steps.agent.outputs.exit != '0' && steps.agent.outputs.exit != '' }}
        run: |
          echo "agent exited ${{ steps.agent.outputs.exit }} (0 ok · 1 error · 2 budget/auth partial)"
          exit 1
```

Three things to notice, because they're the design and not just plumbing.

**The agent never holds the git power.** Its settings file, `.claude/settings.night.json`, denies `git push`, `git commit`, `git checkout`, `git reset`, and `rm` outright — the deny list is in [Running Claude Unattended](/overnight-qa/running-unattended/) — and the write-scope hook `.claude/hooks/write-scope.sh` denies any `Edit` or `Write` outside `src/test/`, shown in full and read field by field in [Blast Radius](/overnight-qa/blast-radius/). The agent edits files on a branch it didn't create; the workflow commits, pushes, and opens the PR in steps that run after the agent has exited. Even a model that decided to "helpfully" push its work has no tool that can.

**No `--bare`.** The triage job runs bare because a read-only interpreter of surefire XML needs nothing from the repo. This job needs three things the repo provides: `CLAUDE.md` (the standing orders — for `ledger-shared`, which classes are scheduled for deletion and mustn't be characterized), the skill itself, and the hooks. Dropping `--bare` costs a few seconds of startup and some tokens of context; it's the price of the fence.

**The gates run in order, and each one deletes.** The agent's own gate (rule 4) removes tests that fail or flake. PIT removes tests that kill nothing. Then the commit step checks whether anything survived — a night where every test was dropped opens no PR, writes why into the summary, and posts a one-line headline. A PR with zero useful tests is worse than no PR; it spends a reviewer's attention to teach them the night is noise.

The PIT step needs the plugin in `ledger-shared`'s `pom.xml` — `org.pitest:pitest-maven`, plus `pitest-junit5-plugin` because the generated tests are JUnit 5 — configured once from the [PIT Maven quickstart](https://pitest.org/quickstart/maven/). Both labels must exist in the repo before the first night (`gh label create` makes them); `gh pr create` fails on a label it can't find.

### Reading a night's output

The PR body is `night/summary.md`, and it's the first thing you read in the morning. A representative one, the night after `MoneyMath` was named by hand:

```markdown
# Characterization — ledger-shared — 2026-09-12
## Targets
- src/main/java/com/ledger/shared/MoneyMath.java (named by hand)
- src/main/java/com/ledger/shared/RoundingPolicy.java (changed in 4f2c9e1)
## Tests written / kept / dropped
- written: 23 — MoneyMathCharacterizationTest (17), RoundingPolicyCharacterizationTest (6)
- kept: 21 — passed 3 of 3 runs
- dropped: 2 — MoneyMathCharacterizationTest#allocate_threeWays_orderOfShares varied between runs
  (night/flaky.md; likely HashMap iteration order at src/main/java/com/ledger/shared/MoneyMath.java:231 — inference)
## Surprises (pinned, not fixed)
- round() truncates JPY amounts and rounds HALF_EVEN for every other currency
  (src/main/java/com/ledger/shared/MoneyMath.java:142-149) — pinned by round_jpy_truncatesNotRounds
- convert() returns ZERO, not an exception, when the rate is null
  (src/main/java/com/ledger/shared/MoneyMath.java:203) — pinned by convert_nullRate_returnsZero
## Needs a human
- [ ] Is JPY truncation intended, or a 2016 bug nobody hit? — CODEOWNERS for src/main/java/com/ledger/shared/: Priya

## Mutation score (PIT, com.ledger.shared.*)
- 121 of 143 mutants killed — 84%
```

The line to read first is under **Surprises**: every entry has a `path:line` and names the test that pins it, so checking one takes twenty seconds. The **dropped** line is labelled *inference* because the agent didn't prove the cause — it saw two different results and removed the test, which is exactly the behaviour rule 4 asks for. The last section was appended by the workflow, not the agent.

The run's own numbers come from the JSON the wrapper leaves next to it:

```bash
# seat: team
gh run download --name nightly-characterize -D last-night/
jq '{is_error, num_turns, total_cost_usd, duration_ms, denials: (.permission_denials | length)}' last-night/night.json
```

```console
{
  "is_error": false,
  "num_turns": 41,
  "total_cost_usd": 2.63,
  "duration_ms": 611204,
  "denials": 0
}
```

`denials: 0` is the number that matters on an ordinary night. A non-zero count means the agent tried to write outside `src/test/` or run something the deny list catches, and the hook stopped it — read the entries with `jq '.permission_denials' last-night/night.json`, because a night that keeps hitting the fence is a prompt problem worth ten minutes.

## Prove the fence before the first night

Whether hooks configured in a settings file fire in a `-p` session is not something the docs state explicitly as of September 2026, and a fence you haven't tested is a hope. So the first thing to do with `settings.night.json` is to try to break it — on your laptop, in a clone of `ledger-shared`, with a prompt that asks for exactly what the hook forbids:

```bash
# seat: team
claude -p "Create src/main/java/com/ledger/shared/Probe.java containing one comment line." \
  --settings .claude/settings.night.json \
  --permission-mode acceptEdits \
  --allowedTools "Write" \
  --max-turns 3 \
  --output-format json > probe.json
jq '.permission_denials | length' probe.json
grep -c 'write-scope.sh' probe.json
```

```console
$ jq '.permission_denials | length' probe.json
1
$ grep -c 'write-scope.sh' probe.json
1
```

The `1` on the first line says the write was denied; the `1` on the second says the reason string came from `write-scope.sh` — the hook fired, not some other refusal. (The fields inside each denial entry aren't documented, so count and grep rather than hardcoding names.) Then `ls src/main/java/com/ledger/shared/Probe.java` to confirm nothing was written. Do this once per repo that gets the job, and keep `probe.json` with the workflow's PR as evidence for [the security review](/overnight-qa/blast-radius/#the-security-review-evidence-pack).

## Mutation testing: the quality gate

**Defined.** A mutation-testing tool makes small deliberate changes to the code under test — flips a `<` to `<=`, deletes a statement, returns a constant — each change a *mutant*, and runs your tests against every one. A test that still passes against a mutant didn't notice the change; the mutant *survived*. The **mutation score** is the share of mutants your tests killed. It's the one number that says whether a test *asserts* anything: a test with no assertion has full line coverage and kills nothing. For generated tests it's the difference between a net and a decoration.

**Observed.** PIT is the tool for Java. The workflow ran it; run it yourself when reviewing the PR:

```bash
# seat: team
git fetch origin && git checkout nightly/characterize-2026-09-12
./mvnw -q test-compile org.pitest:pitest-maven:mutationCoverage \
  -DtargetClasses='com.ledger.shared.*' -DtargetTests='com.ledger.shared.*Characterization*'
grep -c 'status=.KILLED.' target/pit-reports/mutations.xml
grep -c '<mutation ' target/pit-reports/mutations.xml
```

```console
$ grep -c 'status=.KILLED.' target/pit-reports/mutations.xml
121
$ grep -c '<mutation ' target/pit-reports/mutations.xml
143
```

121 of 143 is the 84% in the PR body. For the *which*, open `target/pit-reports/index.html` in a browser: it lists every class with its score and, per line, which mutants survived — a survivor on `MoneyMath.java:147` means the generated tests never exercised the JPY branch with a value that would notice the change, which is a specific, fixable gap. The XML is what the workflow reads: one `<mutation>` element per mutant, with its status and, for kills, the test that killed it.

**Decided.** Three rules, in order of how mechanical they are:

- **A generated test that kills no mutants is deleted before the PR.** The workflow does this without asking; a test PIT never credited with a kill has, by definition, no assertion that matters. The dropped list is in the PR body so you can disagree.
- **The score goes in the PR body, and below the floor the PR is still opened — flagged.** `ledger-shared` has no tests today, so there is no baseline to set a floor from. The honest first version is the fallback ladder's third rung: *count for two weeks before setting a target* (write that down next to the workflow with a TODO). What to expect meanwhile: a pure-function class like `MoneyMath` tends to score high because its outputs are concrete; a class full of side effects scores low, and that's a finding about the class, not the tests.
- **A low score on a high-value class is a reason to add a target, not to merge less.** Name the class again with `-f targets=` and let the next night try; the second pass reads the first night's tests and fills the gaps.

The same gate for `ledger-web` is Stryker.NET: `dotnet tool install -g dotnet-stryker` once, then `dotnet stryker -r json -r html` in the test project, which writes to `StrykerOutput/` — configuration on [stryker-mutator.io](https://stryker-mutator.io/docs/stryker-net/configuration/). A .NET version of the skill swaps `./mvnw -q test -Dtest=` for `dotnet test --filter`, the `src/test/` fence for the test project's directory, and nothing else; the decision rules above are identical. Do it on the .NET 8 migration branch first, where the tooling is current, before the .NET Framework 4.8 tree.

## The morning review checklist

The PR is a draft with `needs-human` on it. Thirty minutes, in this order — copy it into the PR template:

```markdown
- [ ] **Surprises first.** Read night/surprises.md. For each: is it a bug we're pinning or behaviour we rely on? Either answer is fine; "I don't know" goes to the CODEOWNER as one question.
- [ ] **Does each test assert behaviour or the bug — and say which?** Every method has the `// characterization:` comment; the surprising ones name the surprise. A test asserting a "correct" value nobody has verified is deleted, not merged.
- [ ] **Is the surprises list plausible?** Spot-check two citations: does `MoneyMath.java:142-149` do what the line says? Twenty seconds each.
- [ ] **Does the class run in under 30 seconds?** `./mvnw -q test -Dtest=MoneyMathCharacterizationTest` — slow generated tests get skipped by the next person, then deleted.
- [ ] **Is the mutation score above the floor** (or, in the counting weeks, recorded)? Survivors on the lines you care about are the next night's targets.
- [ ] **Anything dropped for flakiness** (night/flaky.md) that names shared state — a static, a clock, a map order — is a finding about `src/main`, not the test. File it.
- [ ] Merge as-is, or close with a comment saying why. Never edit generated tests in the PR: rerun the night with the class named instead.
```

The rule behind the last item: **a human editing a generated test is the expensive path.** If a test is wrong, the class is a better target tomorrow with a better `CLAUDE.md` line today.

:::danger[Three ways this job produces harm instead of a safety net]
**Asserting the bug as correct without the comment.** A generated test that pins JPY truncation with no `// characterization:` comment reads, six months from now, as a specification. Someone "fixes" the rounding, the test fails, they conclude the fix is wrong. The comment isn't decoration — it's the difference between a record and a claim. Rule 3 requires it; the review checklist checks it; a `grep -L 'characterization:' src/test/**/*Characterization*.java` in the PIT step would make it structural if you find one missing.

**The agent "fixing" a failing test by loosening it.** A test that expected `1200` and got `1200.4` becomes `assertTrue(result.compareTo(ZERO) > 0)` — still green, now meaningless. Rule 2 forbids it; PIT catches it (a loosened test kills fewer mutants); the Field Note [The Night the Agent Fixed the Test by Deleting It](/blog/the-night-the-agent-fixed-the-test-by-deleting-it/) is what happens when neither exists. If you see a generated assertion that would accept almost anything, that's the tell.

**Three hundred tests in one PR.** A night pointed at "everything changed this quarter" produces a diff nobody reviews and everybody merges, and a suite that pins accidents and bugs alike with no human having read a line. The `head -n 5` in the targets step is the bound; the thirty-minute review is the reason. If a PR would take longer than that, it's two nights' work.
:::

## Cost shape

The arithmetic is the same as every job on this site — read `total_cost_usd`, don't estimate ([Cost and Governance](/overnight-qa/cost-and-governance/) has the ledger) — but the *shape* is different from triage. Triage is input-heavy: it reads surefire output and a few source files and writes a page. This job reads the target classes plus what it needs to understand them (callers, the DTOs, `RoundingPolicy` when `MoneyMath` depends on it) and the console output of three test runs, then **writes code — and generated code is all output tokens, the expensive kind.** Expect a night with two targets to cost several times a triage night, which is why the default budget is $8 against triage's $3, and 60 turns against 25: write, run, drop, rerun twice, summarise doesn't fit in 25.

The lever when a night runs hot is fewer targets, not a cheaper model — `head -n 5` is already the cap; lower it before touching `--model`. Sonnet writes tests well, and the class the tests pin doesn't get cheaper to understand with a smaller model; it gets pinned worse. When a night hits the budget and exits 2, the tests it had already written are still on disk and still go through the PIT gate and the PR — the wrapper always writes the JSON, and the workflow's later steps don't depend on the agent's exit code. Read the partial summary the same way, and rerun with the missing class named.

## Where next

- **Next in the journey:** [Clicking Through Staging](/overnight-qa/exploratory-and-e2e/) — the night that looks at the running application instead of the code, with a browser agent and a screenshot per step.
- **The lateral jump:** [The First Two Weeks](/kt/onboarding-track/) — where these PRs become Sam's safety net for his first real change, and the reason this job runs on Friday with `MoneyMath` named.
