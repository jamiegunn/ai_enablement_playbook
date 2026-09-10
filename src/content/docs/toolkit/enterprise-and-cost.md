---
title: "Enterprise Setup, Models, and Cost Arithmetic"
description: Which of the three deployment paths your shop is on and what a CI job sets to take it, how to read the platform team's managed settings, which model alias goes in which job, and how to read a run's cost instead of estimating it.
keywords:
  - claude code bedrock setup CLAUDE_CODE_USE_BEDROCK
  - claude code managed settings location
  - managed-settings.json precedence
  - claude code model alias vs model id
  - ANTHROPIC_DEFAULT_SONNET_MODEL
  - how much does claude code cost per run
  - total_cost_usd
  - claude code prompt caching
  - /cost /usage /context /compact
  - claude code apiKeyHelper
sidebar:
  order: 9
---

"Enterprise setup", from your seat, is a short list. The platform team chose how Claude Code reaches a model — Anthropic's API directly, through Amazon Bedrock, Google Vertex AI, or Microsoft Foundry — and pushed a managed settings file to every laptop that says so. You don't run any of that. You need three things from it: which environment variables a CI job sets to take the same path, how to read their file when something on your laptop is refused, and which model alias belongs in which job. The fourth thing is money: what a run costs, how to read that number instead of estimating it, and which flags make it smaller.

**Lever: tools — mostly theirs.** The deployment path and the managed settings are the outermost fence, the one you can read and never override. The budget flags are the bound you own. The proof is a number the tool prints: `total_cost_usd`.

## The three deployment paths

| Path | The job's `env:` | The credential in CI | Who owns what |
|---|---|---|---|
| Anthropic API direct | `ANTHROPIC_API_KEY` | a key in repository secrets, with a spend limit set on it | platform issues the key; you store it |
| Amazon Bedrock (this shop, `us-east-1`) | `CLAUDE_CODE_USE_BEDROCK=1`, `AWS_REGION`, the `ANTHROPIC_DEFAULT_*_MODEL` pins | an AWS role assumed through OIDC — no static key anywhere | platform: the role, the region, the model IDs |
| Google Vertex AI | `CLAUDE_CODE_USE_VERTEX=1` plus the project and region variables they name | a GCP identity through OIDC | platform |
| Microsoft Foundry | `CLAUDE_CODE_USE_FOUNDRY=1` | an Azure identity | platform |

The CLI reads the same variables wherever it runs, so a job takes the Bedrock path with an `env:` block and nothing else — `scripts/run-claude.sh` only checks that *one* of the three is set, and `--model sonnet` stays as it is:

```yaml
# seat: team — needs the platform team's OIDC role and their Bedrock model IDs, published as org variables
permissions:
  id-token: write          # lets the job mint an OIDC token to assume the role; without it their credentials step fails before Claude starts
  contents: read
env:
  CLAUDE_CODE_USE_BEDROCK: "1"
  AWS_REGION: us-east-1
  ANTHROPIC_DEFAULT_SONNET_MODEL: ${{ vars.BEDROCK_SONNET_MODEL_ID }}   # what `--model sonnet` resolves to on Bedrock
  ANTHROPIC_DEFAULT_OPUS_MODEL: ${{ vars.BEDROCK_OPUS_MODEL_ID }}
  ANTHROPIC_DEFAULT_HAIKU_MODEL: ${{ vars.BEDROCK_HAIKU_MODEL_ID }}
```

The pins are org-level Actions variables rather than strings in your workflow because the provider's ID for a model is the platform team's fact, not yours: when they move `sonnet` to a newer ID they change one variable and every job follows. Their credentials step — their role ARN, their action — runs before the Claude step and is why `id-token: write` is in the block. On the API-key path the whole thing collapses to `ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}`, as in [the triage workflow](/overnight-qa/quick-start/).

## Reading the managed settings

The platform team's policy is a file at `/etc/claude-code/managed-settings.json` on Linux, `/Library/Application Support/ClaudeCode/managed-settings.json` on macOS, and `C:\Program Files\ClaudeCode\managed-settings.json` on Windows — or the same keys pushed by MDM or the console. It sits at the top of [the precedence order](/toolkit/overview/#settings-precedence): nothing in `--settings`, `.claude/settings.json`, or your home directory overrides a key set there. Read it before you file a ticket:

```bash
# seat: platform — shown so you can read THEIR config, you won't run it
cat /etc/claude-code/managed-settings.json
```

```json
{
  "permissions": {
    "deny": ["Bash(curl *)", "Bash(wget *)", "Read(./**/.env)", "Read(./**/secrets/**)"],
    "defaultMode": "default"
  },
  "disableBypassPermissionsMode": "disable",
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "AWS_REGION": "us-east-1",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-5",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-5",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-haiku-4-5-20251001"
  }
}
```

Four keys explain most surprises. `permissions.deny` is why `curl` is refused with nothing in your own settings; `disableBypassPermissionsMode` is why `--permission-mode bypassPermissions` doesn't exist on your laptop, and it's meant not to; `env` is the deployment path and the pins (Anthropic's IDs are shown so you can see which alias each line moves — on Bedrock the values are the provider's own ID strings, which is precisely why the file is theirs to write); and `apiKeyHelper`, on the API-key path, names a script whose output is the credential, so no static key sits in a file. **Anything in that file is a fact about your environment, not a bug.** The asks that change it are on [Working Within Policy](/start/working-within-policy/#the-four-asks).

## Models: aliases and IDs

An alias tracks the vendor's current model; an ID is a fixed string that doesn't move. As of September 2026:

| Alias | Resolves to | Window | The site uses it for |
|---|---|---|---|
| `sonnet` | `claude-sonnet-5` | 1M, native | mapping, triage, generation, characterization — the default everywhere |
| `opus` | `claude-opus-5` | 1M | the cross-repo synthesis in [Mapping the System](/kt/mapping-the-system/); the review job |
| `haiku` | `claude-haiku-4-5-20251001` | 200K | classification and labelling passes |
| `best` | whatever is strongest today | — | nothing scheduled; it moves |
| `sonnet[1m]` · `opus[1m]` | the 1M window as an add-on where it isn't native | 1M | rarely needed now that `sonnet` is 1M natively |

**Aliases in commands and skills; IDs only where you pin, and pin only in the platform team's file or variables.** What you gain with an alias: the vendor's improvements arrive without a PR. What you pay: the model under a scheduled job can change on a Tuesday, which is why every night reads `total_cost_usd` rather than assuming last month's number. A pin buys reproducibility and costs you a deprecation you have to notice yourself.

The 1M window is not free context. Everything in the window is input tokens on every turn — cache reads for the part that hasn't changed, full rate for the rest — so a session that has loaded 600k tokens of `ledger-core` pays for that on each turn it stays loaded. That's why the KT playbook fans out with [subagents](/toolkit/subagents/) instead of filling one window.

## Watching spend in a session

Four slash commands: `/cost` shows what this session has spent; `/usage` shows the same against your plan's limits; `/context` shows how full the window is and with what ([Context Exhausted](/troubleshooting/context-exhausted/) reads it in detail); `/compact` summarises the conversation into a shorter one — the lever when `/context` is mostly tool output you no longer need.

```console
> /cost
Total cost:            $0.41
Total duration (API):  3m 32s
Total duration (wall): 11m 08s
```

The layout varies by version; the first line is the one you read, and it's the interactive twin of `total_cost_usd`.

## Prompt caching

Caching is on by default, and it's why the biggest number in a run's `usage` block is usually the cheapest. In plain terms: the model re-uses the part of the context that is byte-for-byte what it saw on the previous turn, and bills those tokens as *cache reads* at a fraction of the input rate. The re-usable part is a prefix — the system prompt, the tool list, `CLAUDE.md`, the conversation so far — so anything that changes the *front* of the context starts the cache over, while a new message at the end doesn't. Read it off a night's JSON:

```bash
# seat: team
jq '.usage' night.json
```

```json
{
  "input_tokens": 1200,
  "output_tokens": 5300,
  "cache_creation_input_tokens": 50000,
  "cache_read_input_tokens": 940000
}
```

`cache_read_input_tokens` far above `cache_creation_input_tokens` is a healthy run. A job where creation is close to reads night after night is paying full rate for the same context repeatedly, and the question is what's changing at the front of the prompt between turns. `DISABLE_PROMPT_CACHING=1` turns caching off; you'll almost never set it, and a provider-path job with zero cache reads is a reason to ask the platform team whether it's in the managed `env`. `CLAUDE_CODE_MAX_OUTPUT_TOKENS` caps what one response may emit — the lever for a labelling pass that should return ten lines, not forty pages.

## The cost arithmetic

No prices on this page — they change, and the vendor's docs carry the current ones. The shape doesn't:

```text
cost ≈ input_tokens                × rate_in
     + output_tokens               × rate_out           (the highest rate per token; usually the fewest tokens)
     + cache_creation_input_tokens × rate_cache_write
     + cache_read_input_tokens     × rate_cache_read    (a fraction of rate_in; usually the most tokens)
```

Worked example, from the `usage` block above: the 940,000 cache reads are 94% of the tokens and the cheapest per token; the 5,300 output tokens are the most expensive per token and half a percent of the volume. Which is why the two levers that matter most are the model (every rate scales with it) and how much you write. Don't multiply it out — the tool did:

```bash
# seat: team
jq '.total_cost_usd' night.json
```

```console
0.41
```

That's [the triage night's number](/overnight-qa/quick-start/): $0.41 × 21 weekday nights ≈ $8.61 a month, against a worst case of the ceiling every night, $3 × 21 = $63. The worst case is the number to put in the budget ledger, and the difference between the two is what governance is for. A month of nights is one loop over the artifacts:

```bash
# seat: team
for id in $(gh run list --workflow nightly-triage.yml --limit 21 --json databaseId -q '.[].databaseId'); do
  gh run download "$id" -n morning-report -D "runs/$id"
done
jq -s 'map(.total_cost_usd) | add' runs/*/night.json
```

```console
8.61
```

**Read `total_cost_usd`; never estimate it.** An estimate is a token count times a rate you remembered from a page that has since changed.

## The cost levers

In the order they pay off:

| Lever | Where | What it does |
|---|---|---|
| The model per job | `--model` in the workflow; `model:` in a skill | The biggest single lever: `haiku` for labelling, `sonnet` by default, `opus` only where synthesis needs it |
| `--max-budget-usd` | `scripts/run-claude.sh` | The ceiling — exit 2 when hit, `result` partial |
| `--max-turns` | `scripts/run-claude.sh` | Stops a loop the budget can't, because a loop can be cheap per turn |
| Subagents for verbose work | `.claude/agents/` | Tool output stays in the child's window; only the summary comes back |
| `.claude/rules/` | path-scoped instructions | Standing orders load only for the files being worked on, so the cached prefix stays small |
| `--bare` | CI jobs | Skips `CLAUDE.md`, hooks, and skills discovery — a smaller front for a job that doesn't need them |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | `env` | Caps the expensive token kind |

## What to ask the platform team

Three asks, with the evidence to attach, in the [policy page's format](/start/working-within-policy/#the-four-asks): a spend limit on the CI credential — the key's cap on the direct path, a budget on the role's account on Bedrock — with the number written down; the OIDC role for Bedrock and the three model IDs as org variables, so no workflow ever carries an ID string; and, only if a night shows zero cache reads, whether `DISABLE_PROMPT_CACHING` is set in managed settings.

## Used by

- [Working Within Policy](/start/working-within-policy/#the-three-deployment-paths) — the decision side of the paths table and the asks.
- [Cost & Governance](/overnight-qa/cost-and-governance/) — the budget ledger the loop above feeds.
- [Measurement & Governance](/kt/measurement-and-governance/) — the KT budgets (`map-repo` $8, `system-map` $12) and what they buy.
- [Running Claude Unattended](/overnight-qa/running-unattended/) — where the two budget flags live.

## The mistakes people make

**Pinning an alias.** A workflow that says `--model sonnet` is pinned to a name, not a model; the night it starts behaving differently is the night the alias moved, and the sign is a cost or `num_turns` that changed with no diff in the repo. Fix: expect it, read `total_cost_usd` nightly, and if a job needs reproducibility, pin the ID in the platform team's variable, not in the workflow.

**Estimating instead of reading.** "About a dollar a night" becomes a budget request, and then the platform team reads the real bill. Fix: the loop above, once a month, into the ledger.

**Opus for a labelling pass.** Classifying 940 Confluence pages as `current`/`stale`/`wrong` is a one-line-per-page job; running it on `opus` pays the highest rate for the least reasoning. Fix: `haiku` for classification, `sonnet` for anything that has to read code, `opus` only for synthesis across repos and the review job — the split in [the numbers table](/overnight-qa/cheat-sheet/).

The vendor's references are [model configuration](https://code.claude.com/docs/en/model-config) and [managing costs](https://code.claude.com/docs/en/costs), which links the current pricing.
