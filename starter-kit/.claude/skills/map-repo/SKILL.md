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
