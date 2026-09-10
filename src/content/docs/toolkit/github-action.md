---
title: "The Claude Code GitHub Action"
description: Run Claude Code as a workflow step — answering @claude on issues and pull requests, or on a cron with a prompt — with the inputs, the permissions block, and the honest trade against the raw CLI.
keywords:
  - claude code github action
  - anthropics/claude-code-action@v1
  - claude github action schedule cron
  - "@claude mention pull request review"
  - claude_args github action
  - github action permissions id-token write
  - claude code action bedrock oidc
  - /install-github-app
  - claude code action vs claude -p
  - claude code action outputs
sidebar:
  order: 8
---

The GitHub Action is Claude Code packaged as a workflow step. `anthropics/claude-code-action@v1` installs Claude Code on the runner, authenticates it with the credential you give it, hands it the event that triggered the workflow — a pull request, an issue comment, a cron — and runs it. Everything it does on GitHub afterwards it does as the Claude GitHub App: a review comment, a reply on an issue, a branch with a commit on it. That's why it's the right tool for work that *lives on GitHub* and the wrong tool for work that needs a result file back. As of September 2026 the tag is `@v1`; `@beta` is deprecated and this site's lint refuses it.

**Lever: tools.** It's the same loop as your laptop. The `permissions:` block and the `claude_args` string are the line between *can* and *may*, exactly as [the three flags are in headless mode](/toolkit/headless-and-sdk/#the-three-flags-that-make-it-safe-in-ci). The proof is what it leaves on GitHub: a comment that cites `path:line`, a diff a human reads.

## The two modes

| Mode | How you get it | Fires on | What comes out |
|---|---|---|---|
| **Mention** | omit `prompt` | `@claude` in an issue or PR comment (`trigger_phrase` changes the word) | a reply in the thread; a branch or commit if the comment asked for one |
| **Automation** | set `prompt` | any event the workflow declares — `pull_request`, `schedule`, `workflow_dispatch` | whatever the prompt says, with the tools `claude_args` allows |

Mention mode is a colleague in the thread: Sam writes "@claude where is the settlement fee rounded?" under a PR and gets an answer with citations. Automation mode is what the playbooks use, because nobody types `@claude` at 02:37. Same Action, one input present or absent; a repo carries both — one workflow for mentions, one per scheduled or PR-time job.

## The inputs

As of September 2026, from the vendor's reference:

| Input | What it does |
|---|---|
| `anthropic_api_key` · `claude_code_oauth_token` | The credential, one or the other, from repository secrets; neither on the Bedrock, Vertex, or Foundry paths |
| `prompt` | Present → automation mode; absent → mention mode |
| `claude_args` | Any CLI flag, passed straight through — the bounds live here |
| `trigger_phrase` | The mention to respond to, if not `@claude` |
| `settings` | Settings for the run, in the `.claude/settings.json` shape — how `settings.night.json` reaches an Action job |
| `plugins` · `plugin_marketplaces` | Plugins to load for the run |
| `use_bedrock` · `use_vertex` · `use_foundry` | The provider path; the credential is then the cloud's |
| `allowed_non_write_users` · `allowed_bots` | Who may trigger it beyond people with write access; leave empty without a reason |
| `github_token` | Override the App's token; you normally don't |
| `anthropic_federation_rule_id` · `anthropic_organization_id` · `anthropic_service_account_id` · `anthropic_workspace_id` | OIDC federation straight to Anthropic; the platform team gives you the four values |

## `claude_args`: the passthrough

Every bound that matters — the model, the turn cap, the budget, the tool allowlist — is a CLI flag, and `claude_args` takes any of them as one string, so an Action job is bounded exactly the way [the wrapper bounds a headless run](/toolkit/headless-and-sdk/#the-flags). **A flag missing from `claude_args` is that bound at its default, and for a budget the default is none.** A review job on this site always carries at least:

```text
--model sonnet --max-turns 30 --max-budget-usd 5 --allowedTools "Read,Grep,Glob,Bash(gh pr diff*),Bash(gh pr comment*)"
```

## The permissions block

Naming any key in `permissions:` sets every other key to `none`, so name all of them, and name the narrowest that works:

| Key | You need it when |
|---|---|
| `contents: read` | Always — the checkout |
| `contents: write` | The job commits or pushes. A job whose prompt says "don't edit" doesn't get it: the key is the fence, the sentence isn't |
| `pull-requests: write` | It comments on, opens, or labels pull requests |
| `issues: write` | It comments on, opens, or labels issues |
| `id-token: write` | OIDC — Bedrock or Vertex through a cloud role, or the federation inputs above |
| `actions: read` | It reads another run's artifacts — last night's report |

## Setup: `/install-github-app`

The App is installed on the repository once and the credential stored as a secret. Inside a session, `/install-github-app` walks through both and writes a starter workflow; it needs someone who can approve an App install — a repo admin, or in some orgs the platform team.

```bash
# seat: team — needs a repo admin to approve the App install and the CI credential to store as a secret
claude
```

```console
> /install-github-app
Repository: payments/payments-api
Opening the browser to install the Claude GitHub App on this repository…
Store ANTHROPIC_API_KEY as a repository secret? Yes
Wrote .github/workflows/claude.yml — commit it to enable @claude on issues and pull requests.
```

The wording varies by version; the three things it does are the App install, the secret, and the starter workflow. The manual route is the App at [github.com/apps/claude](https://github.com/apps/claude) plus a secret you add yourself.

## The example: a PR-time review

The review job from [Review & Security](/overnight-qa/review-and-security/), at the site's per-PR budget from the [numbers table](/overnight-qa/cheat-sheet/) — $5 and 30 turns:

```yaml
# .github/workflows/claude-review.yml
name: Claude review (PR-time)

on:
  pull_request:
    types: [opened, synchronize, ready_for_review]   # every push re-reviews; drafts wait

permissions:
  contents: read           # the review reads; it never pushes
  pull-requests: write     # to leave the review comment
  issues: write            # only because the prompt may label the PR; drop it otherwise
  id-token: write          # Bedrock/Vertex via OIDC only — delete this line on the API-key path

concurrency:
  group: claude-review-${{ github.event.pull_request.number }}
  cancel-in-progress: true # a new push supersedes a review in progress; don't pay for both

jobs:
  review:
    runs-on: ubuntu-latest
    timeout-minutes: 20    # the backstop; the turn cap and budget below stop the agent first
    steps:
      - uses: actions/checkout@v7

      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}   # seat: team — needs the CI credential from the platform team
          prompt: |
            Review pull request #${{ github.event.pull_request.number }} to payments-api.
            Read the diff with `gh pr diff ${{ github.event.pull_request.number }}`.
            Report only what you can point at: every finding cites path:line and says
            what would fail. Do not edit files. Leave exactly one comment with
            `gh pr comment`; if there is nothing to report, say so in one line.
          claude_args: >-
            --model sonnet
            --max-turns 30
            --max-budget-usd 5
            --allowedTools "Read,Grep,Glob,Bash(gh pr diff*),Bash(gh pr comment*)"
```

The line to read is `claude_args`: everything the prompt promises ("do not edit files") is also a bound the prompt can't talk its way out of — no `Edit` in the allowlist, no `contents: write` in the permissions. The PR number is the only `${{ }}` inside the prompt, and a number isn't an injection vector. Never put a PR title or body in there.

## On a cron

Automation mode doesn't care what triggered it, so the same shape runs on `schedule:` — the nightly review sweep in [Review & Security](/overnight-qa/review-and-security/), which catches PRs the PR-time job never saw; the PR-time doc update in [Keeping It True](/kt/living-docs/) is the same shape on `pull_request`. Only the trigger and the prompt change:

```yaml
# .github/workflows/nightly-review.yml — the trigger and the step; the review page has the whole file
on:
  schedule:
    - cron: "37 6 * * 1-5"   # 02:37 America/New_York on weekdays; the odd minute is deliberate
  workflow_dispatch:         # rerun by hand: gh workflow run nightly-review.yml

# … permissions (contents: read, pull-requests: write), concurrency, runs-on, timeout-minutes, checkout as above …

      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            List open pull requests to payments-api updated since yesterday
            (`date -u -d yesterday +%F` gives the date; use it in
            `gh pr list --state open --search "updated:>=DATE" --json number,title,url`).
            Review each one that has no comment from you, as the PR-time job does,
            and leave one comment per PR citing path:line. Skip drafts.
          claude_args: >-
            --model sonnet
            --max-turns 30
            --max-budget-usd 5
            --allowedTools "Read,Grep,Glob,Bash(date *),Bash(gh pr list*),Bash(gh pr diff*),Bash(gh pr comment*)"
```

A scheduled job has no PR in its context, so the prompt has to *find* its work with `gh` — which is why `Bash(gh pr list*)` is in this allowlist and not the one above. UTC, the odd minute, the 60-day rule on public repos, and what to do when it didn't fire are on [The Night Failed](/troubleshooting/the-night-failed/#the-schedule-never-fired).

## Bedrock, Vertex, and Foundry

`use_bedrock: "true"` (or `use_vertex`, `use_foundry`) switches the Action to the provider path. The credential is then a cloud identity — for Bedrock, the AWS role the platform team publishes, assumed through OIDC, which needs `id-token: write` and their credentials step ahead of the Action's. The `env:` block — `AWS_REGION`, the `ANTHROPIC_DEFAULT_*_MODEL` pins — is the one [the enterprise page](/toolkit/enterprise-and-cost/#the-three-deployment-paths) shows for the CLI. The prompt and `claude_args` don't change.

## Used by

- [Keeping It True](/kt/living-docs/) — automation mode on `pull_request`, keeping `ARCHITECTURE.md` honest at PR time.
- [Review & Security](/overnight-qa/review-and-security/) — the PR-time review above and the nightly sweep.
- [Running Claude Unattended](/overnight-qa/running-unattended/#the-action-the-cli-or-the-sdk) — the decision between this page and the wrapper, made job by job.

## The Action or the raw CLI

| | The Action | `claude -p` behind `scripts/run-claude.sh` |
|---|---|---|
| **What you gain** | GitHub auth for free (the App's token), install and `PATH` handled, PR and issue context injected, `@claude` on threads | `night.json` — `total_cost_usd`, `num_turns`, `permission_denials`, `error` — as a file the next step reads; your own exit-code handling; `--json-schema` reports; the same script on a laptop |
| **What you pay** | No result file: the product is the comment, the budget ledger is the step log, and `permissions:` must allow writes on GitHub | The install step, the wrapper, and `gh` calls for anything you want said on GitHub |

**If the next step needs to read what the agent found, use the CLI; if the agent's job is to say it on GitHub, use the Action.** Triage and characterization are the first kind; review and the doc update are the second.

## The mistakes people make

**`permissions:` too wide.** The starter workflow and most examples carry `contents: write`; copied onto a review job, that makes "do not edit files" a request rather than a fence — the agent *can* push, and one bad night it will. Fix: the table above, per job, every key named.

**Forgetting `id-token: write` for OIDC.** On the Bedrock or Vertex path the credentials step fails before Claude starts, complaining it can't request an ID token, and the run looks like an auth failure. Fix: the key in `permissions:` on the job that runs the Action — and naming one key zeroes the rest.

**Expecting outputs.** As of September 2026 the Action documents no step outputs; a `${{ steps.claude.outputs.result }}` you reach for is empty by design. It comments, it doesn't return. Fix: if a later step needs the finding, or a ledger needs `total_cost_usd`, that job belongs on the CLI path, where the JSON is a file you already have.

The vendor's reference is [code.claude.com/docs/en/github-actions](https://code.claude.com/docs/en/github-actions).
