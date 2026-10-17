# ThinxEA: React Scaffold Plan

Companion to CONCEPT_BRIEF.md. Implementation-ready; Phase 1 scope
unless marked otherwise. Prepared 2026-10-17.

## Decisions taken

| Concern | Decision | Why |
|---------|----------|-----|
| App repo | `jdlongmire/thinxea` (new, public, MIT) | Public code for a public tool; name verified free 2026-10-17 |
| Framework | Vite + React + TypeScript | JD's direction; fast build, static output, no server framework lock-in for Phase 1 |
| Routing | React Router | Client-side routes mirror the repository structure |
| Styling | Plain CSS with custom properties; navy `#1e2456` + amber `#e9a13b` | Matches Thinx-Tank branding; no CSS framework dependency for a read-mostly app |
| Data | Static read model JSON + generated SVGs, produced by an exporter script | The repo stays the record; the app renders a projection of it |
| Exporter | Python 3 stdlib script in this repo (`tools/export_read_model.py`) | Reuses the template's machinery (verify.py --emit-json, tomllib catalog/views parsing); proven against the live template 2026-10-17 |
| Hosting | PeakAI: systemd services serving the built app and the API from `/opt/thinxea`, Cloudflare Tunnel to ea.thinxai.net | JD's decision; no open inbound ports |
| API | FastAPI (Python) service beside the static app | Direct reuse of the Python tool machinery (verify, OPA, renderer); hosts AI endpoints from Phase 1 |
| AI layer | Model-agnostic provider interface, server-side only; retrieval over the read model and repo files; tools = verify, OPA, renderer, graph traversal, git/PR (Phase 2) | AI-enabled by design (JD's direction); keys never reach the browser; the model is replaceable without product changes |
| AI grounding rule | Every factual claim in an AI answer carries an artifact id citation; ungrounded questions answer "not in the record" | Keeps AI output honest against the record; enforced in the prompt contract and tested |
| Model tier | Frontier-class model via the provider interface, for all AI features | JD's direction: robust back end; quality is the product, access is the control |
| Primary provider | The host's existing **Claude Code CLI** (v2.1.145, verified on PeakAI 2026-10-17), invoked headless (`claude -p --output-format json`) by the API | JD's direction: leverage the CLI interfaces the server already has; no new API keys for the primary path; JSON output carries usage/cost for the ledger |
| Local tier | **Ollama** on the same host (verified: qwen3.6:35b, qwen3.5:9b, nomic-embed-text, others) | Embeddings for retrieval, light summaries, offline fallback when the CLI tier is capped; zero marginal cost |
| Access | No public signup. Landing page public; the app and all AI endpoints require an issued individual account (request -> JD approves -> credentials issued, 14-day default expiry, revocable) | Demo access by request, per JD; individual accounts keep usage attributable; same credential-gate pattern as JD's other PeakAI-hosted tool |
| Overuse protection | Per-account daily request + token quotas, per-request token ceilings, global daily cap with circuit breaker, usage ledger | Enforced in the API, tested in CI-style checks; the record stays readable when AI pauses |

Local toolchain verified: Node v24.20.0, npm 10.9.4 on the build VM.

## Repository layout

```
thinxea/
  apps/
    web/                  Vite React TS app
      public/
        data/model.json   generated read model (built, not committed by hand)
        views/*.svg       generated view evidence, copied by the exporter
      src/
        main.tsx
        App.tsx
        routes/
          Dashboard.tsx   SARS grid + counts + gate status
          Catalog.tsx     element/relation browser
          Artifact.tsx    one artifact: header, body, relations, backlinks
          Views.tsx       view register list
          ViewDetail.tsx  one view: SVG, Mermaid source, flags, elements
          Standards.tsx   standards register + enforcement + bindings
          Roadmap.tsx     roadmaps + work packages timeline
          Evidence.tsx    snapshots + drift register
          Ask.tsx         Ask ThinxEA: grounded Q&A with citations
          Impact.tsx      impact analysis for one element (Phase 2 drafting entry)
          Agents.tsx      agent console: lanes, runs, proposals (Phase 3 surface, stubbed Phase 1)
          Login.tsx       sign-in for issued demo accounts
          RequestAccess.tsx  access request form (name, email, org, purpose)
        components/
          SarsGrid.tsx, ElementChip.tsx, RelationList.tsx,
          GateBadge.tsx, ViewFrame.tsx, AskBar.tsx, Citation.tsx,
          ProtectedRoute.tsx  redirects to /login without a session
        lib/
          model.ts        read-model types + loader
          sars.ts         level/focus derivation (mirrors exporter rules)
          ai.ts           API client for /api/ask and /api/impact
          auth.ts         session state + login/logout
      index.html
      vite.config.ts
      tsconfig.json
      package.json
    api/                  FastAPI service (AI layer + tool runs)
      app/
        main.py           routes: /api/health, /api/auth/*, /api/access-requests,
                          /api/ask, /api/impact, /api/runs (AI routes need a session)
        auth.py           accounts (argon2 hashes, SQLite on the host), sessions,
                          expiry + revoke; demo accounts only, no public signup
        quotas.py         per-account daily request/token quotas, per-request
                          ceilings, global daily cap + circuit breaker, usage ledger
        ai/
          provider.py     provider interface + adapters: claude_cli (subprocess,
                          JSON output, usage parsed for the ledger), ollama
                          (embeddings + light tasks), http (future API keys)
          queue.py        CLI invocation queue: concurrency cap, timeouts,
                          service-account cwd, tool allowlist per feature
          retrieval.py    structured retrieval over the read model + artifact
                          bodies; embeddings via local nomic-embed-text
          tools.py        verify / OPA / render / graph traversal adapters
          prompts/        prompt contracts (grounding, drafting, impact)
        runs.py           run records: prompt, tools called, output, citations
      requirements.txt    fastapi, uvicorn, argon2-cffi, httpx
  tools/
    export_read_model.py  EA repo checkout -> apps/web/public/data/model.json + views
    thinxea_admin.py      operator CLI: approve access request, create/revoke/expire
                          accounts, print the usage ledger (run on the host)
    README.md             exporter contract and the read-model schema
  deploy/
    thinxea.service       systemd unit (static server on 127.0.0.1:8940)
    thinxea-api.service   systemd unit (FastAPI on 127.0.0.1:8941)
    cloudflared.yml       tunnel ingress: ea.thinxai.net -> 8940; ea.thinxai.net/api/* -> 8941
    thinxea.env.example   provider + quota config shape (provider=claude_cli, model,
                          CLI concurrency + timeout, per-account daily requests/tokens,
                          global daily cap); any future API keys root-only on host
    README.md             deploy + rollback steps for the PeakAI host
  docs/
    CONCEPT_BRIEF.md
    SCAFFOLD_PLAN.md
  README.md
  LICENSE (MIT)
  AGENTS.md               propose via PR; generated data is never hand-edited
```

## The read-model contract

The exporter reads an EA repository checkout and emits one JSON
document. The React app knows only this contract; any repository
following the meta-model can feed it. A sample generated from the
live template ships with this plan (`sample-read-model.json`):

- `artifacts[]`: every typed header (from verify.py --emit-json):
  id, type, name, level, owner, status, plus type extras (interfaces,
  standards, enforcement, system, data_classification).
- `catalog.elements[]` / `catalog.relations[]`: from catalog.toml.
- `views[]`: register entries plus resolved output paths
  (`/views/<id>.svg`, `/views/<id>.mmd`) and completeness flags.
- `standards[]`: derived: enforcement mode, policy file when
  policy-enforced, bound elements (from `bound-by` relations).
- `sarsGrid`: derived grid, level x focus, artifact ids per cell.
  Derivation v1: by artifact type (strategy/requirement -> Strategy;
  capability/system/interface/decision/solution -> Architecture;
  roadmap/work-package -> Roadmaps; standard -> Standards). The
  exporter owns this mapping; the UI never re-derives it silently.
- `provenance`: source repository, commit sha, generation time. Every
  AI answer and every page can show exactly which record it rests on.
- `searchIndex[]`: per-artifact chunks (id, title, body text, source
  path) for retrieval. Phase 1 retrieval is structured (id/type/
  relation lookup plus full-text over chunks); embeddings come from
  the host's local nomic-embed-text via Ollama, so semantic retrieval
  is available in Phase 1 without any external service.

Phase 1 demo numbers (fictional claims example): 15 artifacts, 15
elements, 15 relations, 6 views, 2 standards.

## Scaffold steps (Phase 1 build order)

1. Create `jdlongmire/thinxea` (public, MIT), seed README, LICENSE,
   AGENTS.md, docs.
2. Scaffold the app:
   `npm create vite@latest apps/web -- --template react-ts`
   Add `react-router-dom`. Pin versions in package-lock.
3. Write `tools/export_read_model.py` (stdlib only: subprocess to the
   EA repo's verify.py, tomllib for catalog/views). Unit check:
   exporter against a checkout of ea-repository-template reproduces
   the sample's counts exactly.
4. Build the routes against the sample read model first (no live
   exporter dependency during UI work).
5. Wire the build: `npm run build` in apps/web; exporter runs before
   it in CI and in the deploy script; generated `model.json` and
   `views/*.svg` are build outputs, gitignored in the app repo.
6. Build the API service: FastAPI app with the provider interface
   (claude_cli adapter first), structured retrieval over the read
   model, and `/api/ask` enforcing the grounding rule (citations
   required; a citation-check pass rejects answers citing ids that do
   not exist). `/api/impact` computes the affected set by graph
   traversal and narrates it. Run records stored per call. First
   smoke test: a headless CLI call under the service account returns
   parseable JSON with usage fields; the ledger records it.
7. Build access and protection: accounts + sessions (argon2, SQLite
   at /opt/thinxea/data), the login and request-access routes,
   ProtectedRoute around the app, quotas and the global circuit
   breaker, the usage ledger, and `tools/thinxea_admin.py` for
   approvals and revocation. Tests: anonymous AI call -> 401; quota
   exhausted -> 429 with the record still readable; expired account
   -> login refused.
8. Deploy: rsync build output to PeakAI `/opt/thinxea`, install both
   systemd units (static file server on 8940, API on 8941), provider
   key in the root-only env file, verify on the tailnet address
   first, including an Ask round-trip against the demo record and a
   login with a test demo account.
9. Public cutover (JD's step): Cloudflare Tunnel ingress +
   `ea` DNS record for thinxai.net; verify https://ea.thinxai.net
   returns the public landing page, the login wall holds, and the
   demo works with an issued account; link it from the blog series
   and the template README.

## Phase 2 hooks (design now, build later)

- Tool runs over the API: verify/OPA/render against a connected repo
  checkout, gate evidence returned; branches and PRs created through
  the GitHub API under the repository owner's token.
- Auth: GitHub OAuth; a user connects their own EA repository.
  ThinxEA stores no architecture content server-side beyond caches.
- Drafting endpoints: `/api/draft` (artifact, ADR, roadmap update,
  policy draft) producing schema-valid drafts that run the gates
  before display; accept = create PR, never direct write.
- Agent lanes: the API exposes a proposal queue; lanes the operator
  already runs (bridge-based) pick up drafting, regeneration, and
  reconciliation work and return PRs. Verification lanes review
  proposals they did not author. The agent console shows lane, run
  record, gate evidence, and ratification state per proposal.
- AI cost and safety controls: per-provider config on the host, the
  quota and circuit-breaker layer from step 7 extended to drafting
  endpoints (drafts cost more than answers, so they carry lower
  per-account daily counts), request logging with token counts, and
  the citation check on every answer.

## Risks and open items

- PeakAI is a shared box (Ologos and Peak-team workloads): keep the
  footprint to one static service in Phase 1; no databases.
- The apex thinxai.net 502 is unrelated (separate origin); the `ea`
  subdomain rides the tunnel, not the apex origin.
- DNS/tunnel changes wait for JD's explicit word, per standing rule.
- PR #1 on ea-repository-template (v2 catalog/views) should merge
  first: the demo reads much better on the v2 tree.
- Model choice is deliberately not hard-coded: the provider interface
  takes whatever frontier model JD configures on the host. The
  protection is access and quotas, not a weaker model: no anonymous
  calls, issued accounts only, per-account budgets, and the global
  cap. Credential issuance is manual at first (JD approves each
  request); the admin CLI keeps that to one command per person, and
  14-day default expiry keeps the account list self-cleaning.
- CLI capacity is shared capacity: the Claude CLI on PeakAI also
  serves JD's other work on that box, and CLI usage has its own
  limits (JD's standing experience on thinx-003). The queue,
  concurrency cap, and circuit breaker exist for this as much as for
  cost; the Ollama tier absorbs light traffic and keeps basic Ask
  alive when the CLI tier is paused.

Human-Curated, AI-Enabled (HCAE)
