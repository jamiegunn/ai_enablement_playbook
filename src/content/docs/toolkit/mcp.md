---
title: "MCP: Giving the Model Eyes on Confluence, GitHub, and the Browser"
description: Connect Claude Code to Confluence, GitHub, or a browser through MCP servers — the add command, scopes, .mcp.json, OAuth, headless flags, and allowlisting exactly the two tools a job needs.
keywords:
  - what is mcp model context protocol
  - claude mcp add --transport http --scope project
  - .mcp.json example
  - atlassian mcp server claude code confluence
  - mcp.atlassian.com/v2/mcp
  - playwright mcp claude code headless
  - mcp__server__tool allowedTools
  - --mcp-config --strict-mcp-config headless
  - MCP_TIMEOUT server failed to start
  - teammates don't see my mcp server
sidebar:
  order: 6
---

MCP — the Model Context Protocol — is the standard way to connect the model to something outside the repo. An MCP *server* exposes a set of tools (`searchConfluence`, `browser_click`, `list_commits`); Claude Code connects to it and offers those tools to the model exactly as it offers `Read` or `Bash`. The model asks for a Confluence search, the server runs it, the result lands in the context window. Nothing about the loop changes; what changes is what the model can reach. Confluence space `LEDGER`, the GitHub org, and a headless Chromium are all "outside the repo", and all three are one server entry away.

It pulls the **context** lever — a page fetched over MCP is context the model didn't have — and, because every server *adds tools*, it pulls the **tools** lever too. That second half is the one people forget: a Confluence server with write tools is a way to edit Confluence, and the allowlist has to say otherwise.

## Adding a server

Two transports as of September 2026: `http` for a hosted server you reach by URL, `stdio` for a process Claude Code starts locally. Three scopes decide who else gets it:

| Scope | Stored in | Who gets it |
|---|---|---|
| `user` | `~/.claude.json` | You, in every repo — nobody else |
| `project` | `.mcp.json` at the repo root, committed | Everyone who clones the repo — the site's default |
| `local` | Your machine, this repo only | You, here |

```bash
# seat: team — needs the Atlassian MCP endpoint allowlisted by the platform team (Ask 2 on the policy page)
claude mcp add --transport http --scope project atlassian https://mcp.atlassian.com/v2/mcp
claude mcp add --scope project playwright -- npx -y @playwright/mcp@latest --headless --browser chromium --isolated --output-dir pw-out
claude mcp list
```

```console
$ claude mcp list
Checking MCP server health...

atlassian: https://mcp.atlassian.com/v2/mcp (HTTP) - ✓ Connected
playwright: npx -y @playwright/mcp@latest --headless --browser chromium --isolated --output-dir pw-out - ✓ Connected
```

The line to look at is the status after each name. A server that fails to start or connect shows it here, before you've spent a session on it; [MCP Won't Connect](/troubleshooting/mcp-wont-connect/) starts from this output. For a server that wants a static credential, `--header "Authorization: Bearer $TOKEN"` on the `add` command sets it. `claude mcp get <name>` shows one entry, `claude mcp remove <name>` deletes it, and `claude mcp login <name>` / `claude mcp logout <name>` (v2.1.185+) manage a server's sign-in from the command line.

## `.mcp.json`

The two `add` commands above produce this file — the site's project-scoped servers, committed so every teammate and every workflow gets the same two:

```json
{
  "mcpServers": {
    "atlassian": {
      "type": "http",
      "url": "https://mcp.atlassian.com/v2/mcp"
    },
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--headless", "--browser", "chromium", "--isolated", "--output-dir", "pw-out"]
    }
  }
}
```

`${ENV_VAR}` expands inside the file, which is how a credential stays out of the repo. The GitHub server, if you add it, reads its token from the environment:

```json
"github": { "type": "http", "url": "https://mcp.github.com", "headers": { "Authorization": "Bearer ${GITHUB_TOKEN}" } }
```

The night shift on this site files issues with plain `gh` in a separate workflow step rather than through this server — fewer tools in the agent's reach is a smaller blast radius, and `gh issue create --body-file` is easy to audit. [Running Claude Unattended](/overnight-qa/running-unattended/) makes that trade explicitly.

## In a session, and in headless mode

Inside a session, `/mcp` shows the configured servers and is where a server that authenticates with OAuth — Atlassian's does — opens the browser sign-in. Headless, a run takes its servers from `--mcp-config <file|json>`; add `--strict-mcp-config` so the run uses *only* those and ignores anything configured in user or project scope on the runner — a night should not inherit a server someone left on a self-hosted machine. `MCP_TIMEOUT=60000` (milliseconds) lengthens the startup timeout for a slow server such as a first `npx` fetch.

Every MCP tool has a fully qualified name, `mcp__<server>__<tool>`, and that's the name permissions use. A job that searches Confluence and reads pages gets exactly two:

```bash
# seat: team — needs the Atlassian server allowlisted and a completed /mcp sign-in on this machine
claude -p "/confluence-triage" \
  --mcp-config .mcp.json --strict-mcp-config \
  --permission-mode dontAsk \
  --allowedTools "Read,Grep,Glob,mcp__atlassian__searchConfluence,mcp__atlassian__getConfluenceContent" \
  --max-turns 40 --max-budget-usd 5 --output-format json > triage.json
```

Anything else the server offers — `createConfluenceContent`, `updateConfluenceContent`, `archiveConfluenceContent` — is denied without a prompt, and each denial is listed in `permission_denials`.

## The Atlassian entry

As of September 2026 the Atlassian Rovo MCP Server's current endpoint is `https://mcp.atlassian.com/v2/mcp`, transport `http`; Atlassian's own instruction for Claude Code is the `claude mcp add` line above followed by `/mcp` to authenticate. It's OAuth 2.1 in the browser by default; API-token auth (`Authorization: Basic base64(email:api_token)`, or `Bearer` with a service-account key) is optional and only if your org admin enables it, and some tools are unavailable with token auth. Append `?tools=all` to the URL for a flat tool list instead of the discovery model. The v2 Confluence tools are `searchConfluence` (CQL), `getConfluenceContent` (pass `detail="full"` for the body), `createConfluenceContent`, and `updateConfluenceContent` (edits need the `snapshotToken` from the preceding read); a longer list — spaces, comments, versions, labels, archive, move — is reached through `discover` plus `executeRead`/`executeWrite`. Atlassian's original streaming endpoint was retired on 30 June 2026 and the `v1` tool names went with it.

**Cloud only.** If your Confluence is Data Center or Server, the hosted server can't see it. The community alternative is `sooperset/mcp-atlassian` (MIT, not official): a container (`ghcr.io/sooperset/mcp-atlassian:latest`) or `uvx mcp-atlassian`, run as a `stdio` server with `CONFLUENCE_URL`, a `CONFLUENCE_PERSONAL_TOKEN`, `READ_ONLY_MODE=true`, `CONFLUENCE_SPACES_FILTER=LEDGER`, and `ENABLED_TOOLS=confluence_search,confluence_get_page` so the model has two tools and one space. Its tool names differ (`confluence_search`, `confluence_get_page`), so allowlists differ too. [Confluence](/kt/confluence/) has the full entry and the hosted-versus-community trade.

## The Playwright entry

`@playwright/mcp` gives the model a browser. The flags that matter for a night: `--headless`; `--browser chromium`; `--isolated` (a fresh profile every run); `--storage-state auth.json` (a signed-in session generated by a deterministic script, never a real person's); `--output-dir pw-out` (where screenshots land); `--caps vision` for screenshot-based reading; `--allowed-origins https://ledger-staging.internal` so the agent physically cannot leave staging; `--timeout-action 5000` and `--timeout-navigation 60000`; and `--secrets` for values that must not reach the transcript. The tool the prompts should prefer is `browser_snapshot` — the accessibility tree, cheap in tokens — with `browser_take_screenshot` reserved for evidence. Tracing is `browser_start_tracing`/`browser_stop_tracing` under `--caps devtools`. [Exploratory & E2E](/overnight-qa/exploratory-and-e2e/) is the recipe.

## Used by

- [Confluence: Mining a Graveyard for the Living](/kt/confluence/) — the hosted server, the Data Center container, and the triage pass.
- [Inventory the Estate](/kt/inventory-the-estate/) — `searchConfluence` with CQL to score 940 pages by last edit.
- [Exploratory & E2E](/overnight-qa/exploratory-and-e2e/) — Playwright on a self-hosted runner against staging.
- [Working Within Policy](/start/working-within-policy/#ask-2-allowlist-the-atlassian-mcp-server) — the ask that has to land first.
- [MCP Won't Connect](/troubleshooting/mcp-wont-connect/) — when `claude mcp list` doesn't say Connected.

## The mistakes people make

**`--transport sse`.** Older tutorials add hosted servers with the streaming transport; as of September 2026 it's deprecated in Claude Code and Atlassian's streaming endpoint is gone. Use `--transport http` and the `/v2/mcp` URL; if a page tells you otherwise, check its date.

**User-scope servers that teammates don't get.** `claude mcp add` without `--scope project` writes to `~/.claude.json` — the server works on your laptop and nowhere else, and the workflow that runs on Monday can't find it. Add with `--scope project`, commit `.mcp.json`, and let each person do their own `/mcp` sign-in; credentials are per person, the server list is per repo.

**Allowlisting the whole server when the job needs two tools.** An allowlist that covers every tool a server exposes turns a read-only triage into a job that can create, update, and archive Confluence pages if the model decides that's helpful. Name the tools: `mcp__atlassian__searchConfluence,mcp__atlassian__getConfluenceContent` for a reader, and nothing more. Then read `permission_denials` after the first run — if the model wanted a write tool, you'll see which, and you'll be glad it didn't get it.

The vendor's reference for the `add` command, scopes, `.mcp.json`, and the headless flags: [code.claude.com/docs/en/mcp-quickstart](https://code.claude.com/docs/en/mcp-quickstart). Atlassian's own setup page for the hosted server: [support.atlassian.com — Atlassian Remote MCP Server](https://support.atlassian.com/atlassian-ai-gateway/docs/get-started-with-the-atlassian-remote-mcp-server/).
