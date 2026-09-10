# Integration fact sheet — verified 2026-09-10

Everything the site says about Atlassian, Confluence, Slack, Teams, GitHub
Actions, Playwright, inventory tools, test-quality tools, and scanners was
checked against the sources listed here on the date above. Re-verify before
publishing changes to any of these.

## 1. Atlassian Rovo MCP Server (Confluence + Jira — Cloud only)

Verified at: https://support.atlassian.com/atlassian-ai-gateway/docs/get-started-with-the-atlassian-remote-mcp-server/ · https://support.atlassian.com/atlassian-ai-gateway/docs/supported-tools/ · https://support.atlassian.com/atlassian-ai-gateway/docs/set-up-ides/ · https://github.com/atlassian/atlassian-mcp-server

- Endpoints: `https://mcp.atlassian.com/v1/sse` — **retired 30 Jun 2026, do not teach**. `https://mcp.atlassian.com/v1/mcp` still supported. **Current: `https://mcp.atlassian.com/v2/mcp`** (transport `http`); `?tools=all` for a flat tool list instead of discovery.
- Auth: OAuth 2.1 in the browser (`/mcp` in Claude Code after `claude mcp add`). Optional API-token auth if the org admin enables it: `Authorization: Basic base64(email:api_token)` or `Bearer <service-account key>`; some tools unavailable with token auth.
- Claude Code (verbatim from Atlassian): `claude mcp add --transport http atlassian https://mcp.atlassian.com/v2/mcp` then `/mcp` to authenticate.
- v2 Confluence tools (renamed from v1 `*Page` → `*Content`): `getConfluenceContent`, `createConfluenceContent`, `updateConfluenceContent`, `searchConfluence` (CQL). Deferred via `discover` + `executeRead`/`executeWrite`: `listConfluenceSpaces`, `getConfluenceSpace`, `listConfluenceContent`, `listConfluenceComments`, `listConfluenceContentVersions`, `diffConfluenceContentVersions`, `exportConfluenceContent`, `createConfluenceComment`, `addLabelsToConfluenceContent`, `archiveConfluenceContent`, `moveConfluenceContent`.
- Jira: `getJiraIssue`, `createJiraIssue`, `editJiraIssue`, `transitionJiraIssue`, `addOrEditJiraIssueComment`, `searchJiraIssuesUsingJql`.
- v2 contract: reads need `detail="full"` for the body; edits require the `snapshotToken` from the preceding read; create/update take a `parent` object, `contentType`, and body `{format, value}`.
- Deployment: Cloud only. No Data Center/Server support.
- Rate limits (marketing page only): Free 500 calls/hour; Standard 1,000/hour; Premium/Enterprise 1,000/hour + 20 per user up to 10,000/hour. `search` may consume Rovo credits.

Community alternative for Data Center/Server: `sooperset/mcp-atlassian` (MIT, not official). Image `ghcr.io/sooperset/mcp-atlassian:latest`, or `uvx mcp-atlassian`. Supports Confluence Server/DC 6.0+ and Jira Server/DC 8.14+.

- Env: `CONFLUENCE_URL`; Cloud `CONFLUENCE_USERNAME` + `CONFLUENCE_API_TOKEN`; DC `CONFLUENCE_PERSONAL_TOKEN`; `CONFLUENCE_SSL_VERIFY=false`; `CONFLUENCE_SPACES_FILTER=DEV,TEAM`; `JIRA_PROJECTS_FILTER`; `READ_ONLY_MODE=true`; `ENABLED_TOOLS=confluence_search,confluence_get_page`.
- Tools: `confluence_search`, `confluence_get_page`, `confluence_create_page`, `confluence_update_page`, `confluence_add_comment`, `jira_search`, `jira_get_issue`, `jira_create_issue`, `jira_update_issue`, `jira_transition_issue`.

```json
{ "mcpServers": { "mcp-atlassian": { "command": "docker", "args": ["run", "--rm", "-i", "--env-file", "/path/to/mcp-atlassian.env", "ghcr.io/sooperset/mcp-atlassian:latest"] } } }
```

Verified at: https://github.com/sooperset/mcp-atlassian · https://mcp-atlassian.soomiles.com/docs/configuration

## 2. Confluence REST API from CI

### 2a. Cloud v2

Field names cross-checked against three clients generated from Atlassian's OpenAPI spec (confluence.js 3.2.0, go-atlassian, atlassian-python-api 5.0.4); the reference page itself is JS-rendered. High confidence, not verbatim.

- Auth: Basic `email:api_token` (tokens at https://id.atlassian.com/manage-profile/security/api-tokens). Verified at https://developer.atlassian.com/cloud/confluence/basic-auth-for-rest-apis/
- Space id: `GET /wiki/api/v2/spaces?keys=KEY` → `results[0].id`
- Find page: `GET /wiki/api/v2/pages?title=<title>&space-id=<id>`
- Create: `POST /wiki/api/v2/pages` with `spaceId`, `status` (`current`|`draft`), `title`, optional `parentId`, `body: {representation: "storage"|"atlas_doc_format"|"wiki", value}`
- Update: `PUT /wiki/api/v2/pages/{id}` with `id`, `status`, `title`, `body`, `version: {number: current+1, message}`

```bash
SPACE_ID=$(curl -s -u "$CONFLUENCE_EMAIL:$CONFLUENCE_TOKEN" \
  "https://$CONFLUENCE_SITE.atlassian.net/wiki/api/v2/spaces?keys=PAY" | jq -r '.results[0].id')
curl -s -u "$CONFLUENCE_EMAIL:$CONFLUENCE_TOKEN" -X POST \
  "https://$CONFLUENCE_SITE.atlassian.net/wiki/api/v2/pages" \
  -H 'Content-Type: application/json' -d @- <<EOF
{"spaceId":"$SPACE_ID","status":"current","title":"Morning Report 2026-09-10","parentId":"123456",
 "body":{"representation":"storage","value":"<p>Hello</p>"}}
EOF
```

### 2b. Data Center / Server v1 (verbatim from Atlassian's DC examples)

Verified at: https://developer.atlassian.com/server/confluence/confluence-rest-api-examples/ · https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html

```bash
curl -H "Authorization: Bearer $CONFLUENCE_PAT" -X POST -H 'Content-Type: application/json' \
  -d '{"type":"page","title":"new page","ancestors":[{"id":456}],"space":{"key":"TST"},
       "body":{"storage":{"value":"<p>This is a new page</p>","representation":"storage"}}}' \
  https://confluence.example.com/rest/api/content/
```

Update: `PUT /rest/api/content/{id}` with `id`, `type: page`, `title`, `space.key`, `body`, `version.number` (+1). PATs: avatar → Settings → Personal access tokens (Confluence 7.9+; default max expiry 365 days).

### 2c. Markdown → Confluence

- **`kovetskiy/mark`** — actively maintained (v16.19.0, 2026-09-09). Works on Cloud and Server/DC. Header comments at the top of the markdown: `<!-- Space: KEY -->`, `<!-- Parent: Title -->` (repeatable), `<!-- Title: ... -->`, `<!-- Label: ... -->`, `<!-- Attachment: path -->`, `<!-- Layout: article|plain -->`. Install: `brew tap kovetskiy/mark && brew install mark`, `go install github.com/kovetskiy/mark/v16/cmd/mark@latest`, or `docker run --rm -i kovetskiy/mark:latest mark ...`. Flags/env: `-f/--files` (`MARK_FILES`, globs), `-u` (`MARK_USERNAME`), `-p` (`MARK_PASSWORD` — a PAT works alone, username optional), `-b/--base-url` (`MARK_BASE_URL`), `--space`, `--parents`, `--title-from-h1`, `--dry-run`, `--compile-only`, `--ci`, `--changes-only`, `--minor-edit`, `--version-message`, `--output-format url|json|github`. No official GitHub Action; the README's CI recipe runs the `kovetskiy/mark` container: `mark --output-format github --files "docs/**/*.md"`. Verified at https://github.com/kovetskiy/mark
- `markdown-confluence/publish-action@v5` (Cloud, ADF-based; `@markdown-confluence/cli` 7.0.0, 2026-09-08). Inputs: `confluenceBaseUrl`, `confluenceParentId`, `atlassianUserName`, `atlassianApiToken`, `folderToPublish`, `contentRoot`.
- `md2cf` — dormant since 2023; don't recommend.

## 3. Slack from GitHub Actions — `slackapi/slack-github-action@v4`

Verified at: https://github.com/slackapi/slack-github-action · https://docs.slack.dev/tools/slack-github-action/sending-data-slack-incoming-webhook/ · https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/

Current major **v4** (v4.0.0, 2026-07-15, Node 24; stricter YAML — indent multi-line values). Inputs: `api`, `errors`, `method`, `payload`, `payload-delimiter`, `payload-file-path`, `payload-templated`, `proxy`, `retries`, `token`, `webhook`, `webhook-type`. Outputs: `ok`, `response`, `time`, `channel_id`, `thread_ts`, `ts`.

```yaml
- uses: slackapi/slack-github-action@v4
  with:
    webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
    webhook-type: incoming-webhook
    payload: |
      text: "Morning report: ${{ job.status }}"
      blocks:
        - type: "section"
          text:
            type: "mrkdwn"
            text: "*Morning report* — ${{ job.status }}\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|open the run>"
```

Bot-token variant: `method: chat.postMessage`, `token: ${{ secrets.SLACK_BOT_TOKEN }}`, payload with `channel:` and `text:` (scope `chat:write`). Webhook creation: app → Incoming Webhooks → Activate → Add New Webhook to Workspace → choose channel → Authorize. URL shape `https://hooks.slack.com/services/T.../B.../...`; channel/username/icon cannot be overridden per message.

## 4. Microsoft Teams from CI

Verified at: https://devblogs.microsoft.com/microsoft365dev/retirement-of-office-365-connectors-within-microsoft-teams/ · https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook · https://support.microsoft.com/en-us/office/create-incoming-webhooks-with-workflows-for-microsoft-teams-8ae491c7-0394-4861-ba59-055e33f75498

Office 365 / Microsoft 365 Connectors (including the classic Incoming Webhook) were retired; final removal rolled out 18–22 May 2026. Replacement: the **Workflows** app (Power Automate) with the trigger "When a Teams webhook request is received". Setup: channel **… → Workflows → "Send webhook alerts to a channel"** → Save → copy the webhook URL. POST only; Adaptive Cards (message cards render without buttons). Supported actions: `Action.OpenUrl`, `Action.ShowCard`, `Action.ToggleVisibility`.

```json
{"type":"message","attachments":[{"contentType":"application/vnd.microsoft.card.adaptive","contentUrl":null,
 "content":{"$schema":"http://adaptivecards.io/schemas/adaptive-card.json","type":"AdaptiveCard","version":"1.2",
 "body":[{"type":"TextBlock","text":"Morning report: 2 failures, 1 needs a human","wrap":true}],
 "actions":[{"type":"Action.OpenUrl","title":"Open the run","url":"https://github.com/org/repo/actions/runs/1"}]}}]}
```

```bash
curl -sS -H 'Content-Type: application/json' -d @card.json "$TEAMS_WEBHOOK_URL"
```

## 5. GitHub Actions for scheduled jobs

Verified at: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule · .../workflow-syntax · .../workflow-commands#adding-a-job-summary · .../security/secrets · https://github.com/actions/* tags · gh 2.100.0 `--help`

- `on: schedule: - cron: "15 4 * * *"` — POSIX cron, **UTC by default**; optional `timezone: "America/New_York"` alongside the cron (IANA name). Runs on the default branch's latest commit. Minimum interval 5 minutes. Can be delayed under load ("start of every hour" is worst); queued jobs may be dropped — schedule at odd minutes.
- Public repos: scheduled workflows auto-disable after 60 days without repository activity; forks have them disabled by default.
- `workflow_dispatch: inputs:` with `type: choice|boolean|environment|string|number`; read via `${{ inputs.name }}`; `gh workflow run nightly.yml -f scope=full`.
- `concurrency: { group: nightly-${{ github.workflow }}, cancel-in-progress: false }`; new `queue:` property.
- `timeout-minutes:` default 360.
- Job summary: `echo "..." >> "$GITHUB_STEP_SUMMARY"` — GitHub-flavored Markdown, 1 MiB per step, 20 summaries shown per job.
- Artifacts: `actions/upload-artifact@v7` (`retention-days: 1–90`, default 90), `actions/download-artifact@v8`.
- Current action majors: `actions/checkout@v7` (v6 fine), `actions/setup-node@v7`, `actions/setup-java@v6`, `actions/setup-dotnet@v6`, `actions/setup-python@v7`, `actions/cache@v6`, `actions/github-script@v9`. All node24.
- `gh issue create --title "..." --body-file report.md --label nightly`; `gh pr create --draft`; `gh pr list --search "created:>=2026-09-09" --state all --json number,title,url,author`; `gh repo list ORG --limit 500 --json name,pushedAt,primaryLanguage,isArchived`.
- `permissions:` — specifying any key sets all others to `none`. Keys include `contents`, `issues`, `pull-requests`, `id-token`, `actions`, `security-events`, `checks`.
- Services: Postgres `image: postgres` + `options: >- --health-cmd pg_isready ...`; Oracle `image: gvenzl/oracle-free:latest` with `ORACLE_RANDOM_PASSWORD: true`, `APP_USER`, `APP_USER_PASSWORD`, port 1521, `--health-cmd healthcheck.sh`, service `FREEPDB1`. Linux runners only.
- Self-hosted: `runs-on: [self-hosted, linux]` (`self-hosted` first).
- `environment:` gates a job on protection rules. Secrets are masked in logs; `::add-mask::` for ad-hoc values; 48 KB per secret.
- Report steps: prefer `if: ${{ !cancelled() }}` over `if: always()` so cancelled runs don't hang on the report.

## 6. Playwright MCP and test agents

Verified at: https://github.com/microsoft/playwright-mcp · https://playwright.dev/docs/test-agents

- `@playwright/mcp` 0.0.80 (Node 18+). `claude mcp add playwright npx @playwright/mcp@latest`.
- Flags: `--headless`, `--browser chrome|firefox|webkit|msedge` (`chromium` accepted), `--isolated`, `--storage-state <path>`, `--output-dir <path>`, `--caps vision,pdf,devtools` (also `config`, `network`, `storage`, `testing`), `--viewport-size`, `--timeout-action 5000`, `--timeout-navigation 60000`, `--allowed-origins`/`--blocked-origins`, `--secrets`. **`--save-trace` is gone** — use `browser_start_tracing`/`browser_stop_tracing` under `--caps devtools`.
- Tools: `browser_navigate`, `browser_snapshot` (accessibility tree — preferred over screenshots), `browser_click`, `browser_type`, `browser_fill_form`, `browser_find`, `browser_take_screenshot`, `browser_press_key`, `browser_select_option`, `browser_hover`, `browser_wait_for`, `browser_tabs`, `browser_evaluate`, `browser_console_messages`, `browser_network_requests`, `browser_file_upload`, `browser_handle_dialog`, `browser_close`.
- Docker: `mcr.microsoft.com/playwright/mcp` with `--headless --browser chromium --no-sandbox --port 8931 --host 0.0.0.0`.
- Test agents (Playwright ≥ 1.56; current `@playwright/test` 1.63): `npx playwright init-agents --loop=claude` writes `.claude/agents/` for 🎭 planner, generator, healer; layout `specs/`, `tests/seed.spec.ts`, generated `tests/**/*.spec.ts`. Also `npx playwright init-skills --loop=claude`.

## 7. Code-inventory tools

- `scc` 4.1.0 — `brew install scc` / `go install github.com/boyter/scc/v4@latest`; `scc --by-file --format json -o counts.json`. https://github.com/boyter/scc
- `tokei` 15 — `tokei --output json`. `cloc` 2.10 — `cloc --by-file --json`.
- Author concentration: `git log --format='%aN' | sort | uniq -c | sort -rn`
- Per-file top-author share (bus factor proxy): `for f in $(git ls-files); do git log --format='%aN' -- "$f" | sort | uniq -c | sort -rn | awk -v f="$f" 'NR==1{top=$1} {sum+=$1} END{printf "%.2f %s\n", top/sum, f}'; done | sort -rn`
- `code-maat` 1.0.4: `git log --all --numstat --date=short --pretty=format:'--%h--%ad--%aN' --no-renames --after=2024-01-01 > git.log` then `java -jar code-maat-1.0.4-standalone.jar -l git.log -c git2 -a revisions|main-dev|entity-ownership|coupling`. https://github.com/adamtornhill/code-maat
- Clone an org: `ghorg clone ORG --token=...` or `gh repo list ORG --limit 500 --json nameWithOwner -q '.[].nameWithOwner' | xargs -n1 gh repo clone`.
- Dependency graphs: `npx depcruise src --output-type json|dot|mermaid` (dependency-cruiser 18); `jdeps -verbose:class -R --dot-output out/ app.jar`; `mvn dependency:tree -DoutputType=json -DoutputFile=deps.json` (plugin 3.11; json since 3.7); .NET `dotnet list package --include-transitive --format json` (`dotnet package list` on .NET 10).
- Architecture tests: ArchUnit 1.5 (`com.tngtech.archunit:archunit`), jQAssistant 2.9.

## 8. Test-quality tools

- PIT 1.30: `mvn test-compile org.pitest:pitest-maven:mutationCoverage` → `target/pit-reports/`; JUnit 5 needs `pitest-junit5-plugin`. https://pitest.org/quickstart/maven/
- Stryker.NET 4.14: `dotnet tool install -g dotnet-stryker`; `dotnet stryker -r json -r html` → `StrykerOutput/`. https://stryker-mutator.io/docs/stryker-net/configuration/
- StrykerJS 10: `npm init stryker@latest`; `npx stryker run`.
- ApprovalTests (Java 31, .NET 7) — https://approvaltests.com/
- Characterization tests: Feathers — "document your system's actual behavior, not check for the behavior you wish your system had." https://michaelfeathers.silvrback.com/characterization-testing
- Gradle `org.gradle.test-retry` 1.6.6: `retry { maxRetries = 2; failOnPassedAfterRetry = true }`.
- JUnit `@RepeatedTest(value = 8, failureThreshold = 2)`. Playwright `retries: 3` (flaky = failed then passed). `pytest-randomly`, `pytest-flakefinder --flake-runs=N`.
- `git bisect run <cmd>` — exit 0 good, 1–127 bad, 125 skip.

## 9. Security scanners — machine-readable output

- Trivy 0.74: `trivy fs --format json -o trivy.json .` / `--format sarif`; `--scanners vuln,misconfig,secret,license`; `--exit-code 1`; `--severity HIGH,CRITICAL`.
- Semgrep 1.176: `semgrep scan --config auto --json -o semgrep.json` / `--sarif -o semgrep.sarif`.
- Gitleaks 8.30: `gitleaks git --report-format json --report-path gitleaks.json .` (or `gitleaks dir`); `detect`/`protect` deprecated.
- CodeQL CLI: `codeql database create db --language=java-kotlin --source-root .` then `codeql database analyze db --format=sarif-latest --output=results.sarif`.
- `npm audit --json --audit-level=high`; `pip-audit -f json -o audit.json`; `dotnet list package --vulnerable --include-transitive --format json`; OWASP `dependency-check.sh --project app --scan . --format JSON --format SARIF --out reports/ --nvdApiKey $KEY --failOnCVSS 7`.

## 10. Claude Code security review

Verified at: https://github.com/anthropics/claude-code-security-review · https://code.claude.com/docs/en/commands · https://www.anthropic.com/news/claude-code-security

- `/security-review` — built-in skill: "Check the current diff for security vulnerabilities". Customize by copying `.claude/commands/security-review.md` from the action repo.
- `anthropics/claude-code-security-review` GitHub Action — no version tags; pin a SHA or use `@main`. Inputs: `claude-api-key` (required), `comment-pr`, `exclude-directories`, `claude-model`, `claudecode-timeout` (min, default 20), `run-every-commit`, `false-positive-filtering-instructions`, `custom-security-scan-instructions`. Outputs: `findings-count`, `results-file`. Permissions `pull-requests: write`, `contents: read`.
- "Claude Code Security" (Feb 2026) — web research preview for Enterprise/Team; dashboard, not a CI action.

## Could not verify — phrase cautiously

- Rovo MCP rate limits (marketing page only)
- Confluence Cloud v2 field names are from OpenAPI-generated clients, not the rendered reference
- Whether Teams Workflows requires `type: "message"` exactly (it's the documented shape)
- `gh repo list --limit` upper bound

## Addendum — 2026-09-10 (review pass)

- `github/codeql-action/upload-sarif`: the site mentions SARIF upload as a destination but does NOT pin a major or assert input names — not verified against docs.github.com in this pass. Verify before turning that paragraph into a copy-paste recipe.
- GitHub issue search: there is no `fp:` qualifier. To find a fingerprint written into an issue body, search the bare value with `in:body` (`gh issue list --search "<sha256> in:body" --state all`).
- Playwright `retries` is **off by default**; the docs' own example uses `retries: 3`. This site chooses `retries: 2` for promoted specs and says so as a choice, not as a documented default.
- Issue cap: standardized at **10 per night** across every page (`MAX_ISSUES` in `scripts/file-findings.sh`).
