---
title: "MCP Won't Connect: Atlassian, GitHub, Playwright"
description: Get a dead MCP server back — startup failures, OAuth that never finishes, the retired Atlassian endpoint, the renamed v2 tools, allowlists, and Playwright on a runner.
keywords:
  - mcp server failed to start
  - claude mcp list failed to connect
  - atlassian mcp oauth never completes
  - mcp.atlassian.com v2 endpoint
  - confluence tool not found
  - mcp allowlist managed settings
  - strict-mcp-config
  - playwright mcp headless runner
  - target page context or browser has been closed
  - claude mcp add scope project
sidebar:
  order: 6
---

<!-- lint: allow-deprecated -->

**Symptom:** the Confluence search comes back "I don't have access to that", the browser tools aren't offered, or a night's report says it couldn't reach anything. MCP — the protocol Claude Code uses to talk to servers like Atlassian, GitHub, and Playwright ([Toolkit: MCP](/toolkit/mcp/)) — either connected or it didn't, and the model rarely says which. Most cases here are the **tools** lever: the server isn't up, isn't authenticated, or isn't allowed. A few are **context**: it's up, and your prompt names a tool that no longer exists.

## Step zero: what does `claude mcp list` say?

One command orients you. Run it from the repo, because project-scoped servers live in the repo's `.mcp.json`:

```bash
# seat: team
cd ~/src/ledger-api && claude mcp list
```

```console
Checking MCP server health...

atlassian: https://mcp.atlassian.com/v2/mcp (HTTP) - ✗ failed to connect
playwright: npx -y @playwright/mcp@latest --headless --browser chromium --isolated --output-dir pw-out - ✓ connected
```

Read the marks literally. `✗ failed to connect` means the server never came up — none of its tools exist in the session, so a prompt that depends on it improvises around the gap rather than stopping. `✓ connected` means the process started and answered; it does **not** mean you're authenticated, and it does not mean the tool you want is allowed.

:::note[A server missing from the list entirely]
If `atlassian` isn't listed at all, nothing failed — nothing was configured. Either you're in the wrong directory (the `.mcp.json` is in `ledger-api`; you're in `ledger-core`), or it was added at user scope on someone else's laptop: [Scope: your server, not your team's](#scope-your-server-not-your-teams).
:::

## Symptom → section

| You're seeing… | Go to |
|---|---|
| `✗ failed to connect` right at startup | [The server shows as failed at startup](#the-server-shows-as-failed-at-startup) |
| A browser tab that opens and nothing happens after | [The OAuth flow never completes](#the-oauth-flow-never-completes) |
| A retirement or 404 message naming `/v1/sse` | [You're on the retired endpoint](#youre-on-the-retired-endpoint) |
| "No such tool" for a Confluence tool that used to work | [The tool names changed in v2](#the-tool-names-changed-in-v2) |
| Connected, authenticated, and the model still won't call it | [The tool isn't in the allowlist](#the-tool-isnt-in-the-allowlist) |
| Works on your laptop, no servers at all in CI | [Strict MCP config hides servers you configured elsewhere](#strict-mcp-config-hides-servers-you-configured-elsewhere) |
| Nothing you can fix from the repo | [The managed-settings allowlist](#the-managed-settings-allowlist) · [Data Center can't use the hosted server](#data-center-cant-use-the-hosted-server) |
| The browser agent dies mid-scenario | [Playwright: headless, origins, and a closed browser](#playwright-headless-origins-and-a-closed-browser) |

## The server shows as failed at startup

Read the config before you change it — `claude mcp get` prints what Claude Code actually loaded, including which scope it came from:

```bash
# seat: team
claude mcp get atlassian
```

```console
atlassian:
  Scope: Project (.mcp.json)
  Type: http
  URL: https://mcp.atlassian.com/v2/mcp
  Auth: not authenticated
```

Three failures produce the same `✗`. **A slow start:** a `stdio` server that pulls a container or an `npx` package can exceed the default startup timeout, which is what `MCP_TIMEOUT` (milliseconds) exists for — `MCP_TIMEOUT=60000 claude` gives it a minute. **No Node:** the `playwright` entry runs `npx`, so a runner without Node fails instantly; `ubuntu-latest` has it, a `[self-hosted, linux, payments]` box may not, and the fix is `actions/setup-node@v7` before the agent step. **A URL that isn't reachable** from where you are — a proxy or an egress rule, which is a platform question, not a config one.

**Lever: tools.** Nothing is wrong with the prompt.

## The OAuth flow never completes

The Atlassian server authenticates with OAuth in a browser, and the flow starts from *inside* a session, not from the CLI: type `/mcp`, pick the server, finish in the tab that opens. As of September 2026 there is also a CLI path, `claude mcp login atlassian`. Either way the browser must be on the machine you're sitting at — in a session on a remote box or a container, the URL opens somewhere you can't see it, and it looks like a hang.

```bash
# seat: team — needs your Atlassian account to have access to the LEDGER space
claude mcp login atlassian
claude mcp list
```

```console
atlassian: https://mcp.atlassian.com/v2/mcp (HTTP) - ✓ connected
```

Do the login on your laptop, in the repo, once; the token persists. If the work genuinely has to happen on a remote box, the alternative is API-token auth (an `Authorization: Basic` or `Bearer` header on the server entry) — **the trade:** it skips the browser entirely, your Atlassian org admin has to enable it, and some tools aren't available on token auth.

**Lever: tools.**

## You're on the retired endpoint

Atlassian retired `https://mcp.atlassian.com/v1/sse` on **30 June 2026**, and Claude Code deprecated `--transport sse` separately. A config carrying either used to work and now can't. Find it in both places it hides, then replace it:

```bash
# seat: team
grep -n 'mcp.atlassian.com' .mcp.json ~/.claude.json
claude mcp remove atlassian
claude mcp add --transport http --scope project atlassian https://mcp.atlassian.com/v2/mcp
```

```console
.mcp.json:4:      "url": "https://mcp.atlassian.com/v1/sse"
Removed MCP server "atlassian" from project config
Added HTTP MCP server "atlassian" to project config (.mcp.json)
```

Then `/mcp` in a session to authenticate the new entry — removing the server removed its token too. The canonical `.mcp.json` is in [Toolkit: MCP](/toolkit/mcp/#the-atlassian-entry).

**Lever: tools.**

## The tool names changed in v2

This one connects, authenticates, and still finds nothing, because the failure is in your text. Rovo MCP v2 renamed the Confluence tools: `getConfluencePage` became `getConfluenceContent`, `searchConfluenceUsingCql` became `searchConfluence`. A prompt, a skill, or an `--allowedTools` list still carrying a v1 name is naming a tool that isn't there — those names survive only as search synonyms, which is why the model finds the *concept* and calls nothing.

```bash
# seat: team
grep -rn 'ConfluencePage\|UsingCql' prompts/ .claude/ .github/workflows/
```

Two v2 behaviours look like failures and aren't: a read returns a page with no body unless you ask for full detail, and an update is rejected unless it carries the `snapshotToken` from the read before it. Both are the contract, not a broken server.

**Lever: context** — the model can see a name that no longer maps to anything.

## The tool isn't in the allowlist

An unattended run can't be prompted, so a tool that isn't pre-approved is refused silently and recorded rather than raised. MCP tools are named `mcp__<server>__<tool>`:

```bash
# seat: team — needs the atlassian server authenticated
claude -p "Find the Settlement Flow page in the LEDGER space and print its last-edited date." \
  --permission-mode dontAsk \
  --allowedTools "Read,Grep,Glob,mcp__atlassian__searchConfluence,mcp__atlassian__getConfluenceContent" \
  --output-format json > confluence.json
jq '.permission_denials' confluence.json
```

```console
[
  {
    "tool_name": "mcp__atlassian__listConfluenceSpaces"
  }
]
```

An empty `[]` with a bad answer means nothing was refused — a different problem. A non-empty array names exactly what to add. Read it with `jq`; don't script against the field names, which aren't documented.

**Lever: tools.**

## Strict MCP config hides servers you configured elsewhere

If the night has no MCP tools while your laptop is fine, look for `--strict-mcp-config` beside `--mcp-config .mcp.json` in the workflow. It tells the run to use *only* the servers in that file and ignore everything configured at user scope. That's not a bug to remove — it's what makes a night's tool surface identical on every runner and reviewable in a PR. Add the server to `.mcp.json`; keep the flag.

**Lever: tools.**

## Scope: your server, not your team's

`claude mcp add` without `--scope` writes to your own `~/.claude.json`, where it works beautifully for you and doesn't exist for Priya, Sam, or CI. `--scope project` writes `.mcp.json` at the repo root, which you commit and every checkout gets for free. That's why every MCP command here uses it.

## The managed-settings allowlist

If the tool is in your `--allowedTools` and still refused on a managed laptop, the decision was made above you. Managed settings take precedence over everything you can edit, and MCP tools appear there by their full name:

```bash
# seat: platform — shown so you can read THEIR config, you won't run it
jq '.permissions' /etc/claude-code/managed-settings.json
```

```json
{
  "allow": ["Read", "Grep", "Glob", "Bash(git *)", "mcp__github__list_commits"],
  "deny": ["Bash(rm *)", "Bash(git push --force)"],
  "defaultMode": "plan"
}
```

No `mcp__atlassian__*` entry means Confluence is off on every managed machine, whatever your `.mcp.json` says. (On macOS: `/Library/Application Support/ClaudeCode/managed-settings.json`.) **The ask is small and specific, which is why it usually lands:** two read-only tools — `mcp__atlassian__searchConfluence` and `mcp__atlassian__getConfluenceContent` — scoped to the `LEDGER` space, for drafts engineers review. Bring the [data-boundary evidence](/start/working-within-policy/) with it.

## Data Center can't use the hosted server

The Atlassian hosted MCP server is Cloud-only, so if your Confluence is Data Center or Server, no amount of endpoint fixing helps. The answer is the community server `sooperset/mcp-atlassian` in a container, with `READ_ONLY_MODE=true` and `CONFLUENCE_SPACES_FILTER=LEDGER` so a wrong prompt can neither write nor wander. It's MIT-licensed and not an Atlassian product — a conversation to have before you depend on it. Full entry and trade: [Mining Confluence](/kt/confluence/#connect-the-hosted-server-or-the-community-one).

## Playwright: headless, origins, and a closed browser

Three failures cover nearly every browser night:

- **It never starts on a runner.** Without `--headless` the server waits for a display that isn't there — which is why the canonical entry pins `--headless --browser chromium --isolated --output-dir pw-out` ([Toolkit: MCP](/toolkit/mcp/#the-playwright-entry)).
- **A navigation goes nowhere.** `--allowed-origins` is an allowlist, and a login that redirects through an SSO host you didn't list dies at the redirect, not at the URL you typed. List every origin the flow touches, or you've fenced the front door.
- **`Target page, context or browser has been closed`.** The agent called `browser_close` and then reached for another browser tool — usually because one scenario ended with "close the browser" and the next assumed a live page. Fix it in the prompt: close once, at the end.

**Lever: tools**, then **context** for the third — the agent is reasoning about a browser that no longer exists.

:::caution[Don't debug a browser night on shared staging]
`ledger-staging.internal` holds other people's test data. Reproducing an overnight failure at 09:30 means clicking through someone's manual test window. Use `--isolated` and your own seeded data — see [Exploratory and E2E](/overnight-qa/exploratory-and-e2e/#test-data-and-auth).
:::

## Escalation: what to bring the platform team

Everything above the `.mcp.json` line is theirs: the allowlist, network reachability, whether an org admin will enable token auth. Escalate with:

- `claude mcp get <name>` output and `claude --version`.
- The endpoint and transport you're on, and what `claude mcp list` says.
- The `jq '.permission_denials' night.json` output — the tool names in it *are* the request.
- Which checks above you've run, and what each said.

The [escalation boundary](/troubleshooting/overview/#the-escalation-boundary) has the full yours-versus-theirs table, and the [Error Message Index](/troubleshooting/error-index/) decodes the string before you send it.
