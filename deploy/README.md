# Deploying ThinxEA on the PeakAI host

Layout on the host:

- `/opt/thinxea/web/` — the built web app (`apps/web/dist` contents)
- `/opt/thinxea/api/` — the FastAPI service (`apps/api` contents)
- `/opt/thinxea/api-venv/` — Python venv for the API
- `/opt/thinxea/data/` — SQLite (accounts, sessions, usage, runs)
- `/opt/thinxea/work/` — restricted working directory for CLI calls
- `/opt/thinxea/thinxea.env` — service config (mode 600), from
  `thinxea.env.example`
- `/opt/thinxea/serve_spa.py` — the static server

Steps:

1. Build: `python3 tools/export_read_model.py --ea-repo <ea checkout>`
   then `cd apps/web && npm install && npm run build`.
2. Copy `apps/web/dist/` to `/opt/thinxea/web/`, `apps/api/` to
   `/opt/thinxea/api/`, `deploy/serve_spa.py` to `/opt/thinxea/`.
3. `python3 -m venv /opt/thinxea/api-venv` and
   `/opt/thinxea/api-venv/bin/pip install -r /opt/thinxea/api/requirements.txt`.
4. Install `deploy/thinxea.env.example` as `/opt/thinxea/thinxea.env`
   (edit values; mode 600), and the two systemd units into
   `/etc/systemd/system/`; `systemctl daemon-reload`,
   `systemctl enable --now thinxea-web thinxea-api`.
5. Verify on the host: `curl localhost:8940/` (the app),
   `curl localhost:8941/api/health` (provider should read
   `claude_cli`).
6. Issue accounts with `tools/thinxea_admin.py` (run with the API
   venv's Python and `THINXEA_DB=/opt/thinxea/data/thinxea.db`).

Public cutover is a separate, operator-approved step: add the
ingress from `deploy/cloudflared.yml` to the host's cloudflared
configuration and create the `ea` DNS record for thinxai.net. Until
then the system is reachable only on the host and the tailnet.

Rollback: `systemctl disable --now thinxea-web thinxea-api`. The EA
record itself is never on this host's disk as a write target; the web
tier is a projection and can be removed without touching it.
