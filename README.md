# ThinxEA

**Enterprise Architecture as Code.** A web-based, AI-enabled
enterprise architecture system. Strategy, Architecture, Roadmaps, and
Standards are held in a Git repository as typed artifacts, a catalog
of elements and relations, registered views, and compiled policies.
ThinxEA is the hosted face of that record: it renders the record,
runs the gates, answers questions about it with citations, and gives
agents a governed surface to propose change while humans ratify.

The demo record is the fictional claims-processing example from
[jdlongmire/ea-repository-template](https://github.com/jdlongmire/ea-repository-template),
the public template that implements the repository structure. Start
there to create an architecture repository of your own; ThinxEA
renders any repository that follows the same meta-model.

## Pieces

| Path | What |
|------|------|
| `apps/web/` | React + TypeScript app (Vite). Renders the read model: SARS dashboard, catalog, artifacts, generated views, standards register, roadmaps, evidence, Ask, agent console. |
| `apps/api/` | FastAPI service: issued-account auth, quotas and a usage ledger, grounded Ask and impact analysis, access requests, run records. |
| `tools/export_read_model.py` | Turns an EA repository checkout into the read model (`model.json` + view outputs) the web app renders. |
| `tools/thinxea_admin.py` | Operator CLI: approve access requests, issue/revoke accounts, print the usage ledger. |
| `deploy/` | systemd units, tunnel ingress, env template, and the deploy/rollback runbook for the host. |
| `docs/` | The concept brief and the scaffold plan this repo was built from. |

## AI, governed

The AI layer runs a frontier model through the host's existing CLI
(`claude -p`, headless) behind a provider interface, with a local
Ollama tier for embeddings and fallback. Every AI output is one of
two things: an answer grounded in the record with artifact citations,
or a proposal that lands as a pull request for human ratification.
Access is by issued account only: no public signup, per-account
quotas, a global daily cap, and a usage ledger.

## Quickstart (local)

1. Export the demo read model:
   `python3 tools/export_read_model.py --ea-repo /path/to/ea-repository-template`
2. Web: `cd apps/web && npm install && npm run build` (or `npm run dev`).
3. API: `python3 -m venv .venv && .venv/bin/pip install -r apps/api/requirements.txt`,
   set `THINXEA_MODEL_PATH` to the exported `model.json`, and run
   `.venv/bin/uvicorn app.main:app --app-dir apps/api --port 8941`.
   The default provider is `stub` (deterministic, model-free grounded
   answers). Set `THINXEA_PROVIDER=claude_cli` on a host with the
   Claude Code CLI for the real model.
4. Issue yourself an account: `tools/thinxea_admin.py create-user you`.

## License

MIT.

Human-Curated, AI-Enabled (HCAE)
