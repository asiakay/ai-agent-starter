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
