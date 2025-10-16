# AI Agent Starter Repo

A modular Cloudflare Worker setup for automating research, content creation, and workflow optimization.

### Structure
- **worker/**: Core logic for each agent (Scout, Scribe, Engineer)
- **frontend/**: Minimal dashboard for triggering tasks
- **data/**: Prompts, schema, and config files
- **scripts/**: Deployment and cron automation scripts

### Run Locally
```bash
npm install
npx wrangler dev
```

### Deploy
```bash
npx wrangler publish
```

### Codex Agent API

The Worker now exposes a `/api/codex-agent` endpoint that coordinates Codex-driven
repository updates.

- `GET /api/codex-agent` returns metadata and available helper routes.
- `POST /api/codex-agent` accepts a JSON payload with an `instruction` string and
  optional `repoUrl`, `branch`, and `dryRun` flag. When `dryRun` is `true` the
  Worker responds with the generated shell script without contacting GitHub.
- For live runs the Worker forwards the request to the GitHub repository by
  invoking the `repository_dispatch` API with the `codex-agent-run` event.

Set the following bindings in your Wrangler configuration to enable dispatching
Codex jobs:

| Variable | Purpose |
| --- | --- |
| `GITHUB_TOKEN` | GitHub personal access token with `repo` scope. |
| `GITHUB_OWNER` | Repository owner/organization (e.g. `asiakay`). |
| `GITHUB_REPO_NAME` | Repository name (e.g. `ai-agent-starter`). |
| `GITHUB_REPO` | Optional full clone URL used when `repoUrl` is not supplied. |

Combine this with a GitHub Action that triggers on the `codex-agent-run`
dispatch event to run the shell script using your preferred execution
environment.

### Codex Agent Terminal Helper

Use the bundled CLI to generate the same command sequence directly in your
terminal without hitting the Worker:

```bash
npm run codex-agent -- --instruction "Add a dashboard page to display logs" --repo https://github.com/asiakay/ai-agent-starter.git
```

- Omitting `--repo` falls back to the `GITHUB_REPO` environment variable.
- Pass `--branch feature-branch` to target a non-default branch.
- Append `--execute` to run each command locally; otherwise the script prints the
  steps you can copy into your terminal.
