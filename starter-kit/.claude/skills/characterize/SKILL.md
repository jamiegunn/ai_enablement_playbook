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
