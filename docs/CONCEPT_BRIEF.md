# ThinxEA: Concept Brief

James (JD) Longmire, 2026-10-17. Status: concept, pre-build.

## The idea

ThinxEA is a web-based, AI-enabled enterprise architecture system.
Not another modeling database: the architecture record stays in a Git
repository as typed artifacts, a catalog of elements and relations,
registered views, and compiled policies. ThinxEA is the hosted face
of that repository: it renders the record for readers, runs the
back-end tools for practitioners, answers questions over the record
with citations, and gives agents a governed surface to propose change
while humans ratify.

Tagline: **Enterprise Architecture as Code.**
Strategy, Architecture, Roadmaps, Standards. In Git. Operated by
agents. Ratified by humans.

## Why it exists

The Thinx-Tank series (Agentic Enterprise Architecture; The
Architecture Repository; Own the Core, Synthesize the Rest) argues
that EA fails as documents in a tool database and works as code in a
repository with gates. The ea-repository-template proved the
repository mechanics. ThinxEA is the next step: the same record,
hosted, browsable, and operable from the web, so the practice is a
system people use rather than a structure people admire.

## Principles

1. **Git is the system of record.** The web app reads and proposes;
   it never becomes a second record. Every change lands as a pull
   request and is ratified through CODEOWNERS review.
2. **Views are projections, not illustrations.** Every diagram is
   generated from the catalog and registered in the view register.
   If it is not in the catalog, it is not in the picture.
3. **Standards are executable.** Policy-enforced standards compile to
   OPA and run in CI; the UI shows enforcement state, not intentions.
4. **Agents propose, humans ratify.** Agent lanes draft artifacts,
   regenerate views, reconcile observed state, and file drift as
   defects. Nothing merges on an agent's word.
5. **AI is an operator, not a chatbot bolt-on.** Every AI capability
   works on the record itself: answers are grounded in the catalog
   and cite the artifacts they rest on; analysis runs over the
   relation graph; drafting produces schema-valid artifacts that must
   pass the same verifier and policy gates as human work. An AI
   output is always one of two things: an answer with citations, or a
   proposal awaiting ratification. There is no third, silent kind.
6. **Own the core, synthesize the rest.** React for the face, the
   existing Python verifier/renderer and OPA for the gates, open
   source throughout. No EA platform license, no vendor record store.
7. **A robust model, rationed.** The AI layer runs a frontier-class
   model, not a cut-down demo model: drafting and analysis quality is
   the product. Access to it is rationed by design (see Access and
   model protection), so capability never becomes an open meter.

## What it does (capabilities by phase)

Phase 1, public read-only tool:
- SARS dashboard: Strategy, Architecture, Roadmaps, Standards across
  Enterprise, Systems, and Solutions levels, from the catalog.
- Catalog browser: elements, relations, typed artifact pages with
  cross-references resolved.
- Generated views: the six registered views rendered as SVG with
  their Mermaid sources, each labeled with viewpoint, level, focus,
  and completeness flags.
- Standards register: enforcement mode per standard, compiled policy
  state, and what binds to each standard.
- Evidence: observed-state snapshots and the drift register.
- Public demo on the fictional claims example, so anyone can see the
  whole machine working with nothing confidential in it.
- **Ask ThinxEA:** natural-language questions over the record ("what
  binds SYS-014?", "which standards are review-enforced?", "what
  realizes the claims capability?"), answered from the read model
  with citations to artifact ids on every claim.
- **Deterministic insights, no model required:** impact sets computed
  by graph traversal, unbound-standard and orphan-element findings,
  drift summaries. These are computed, not generated, and they are
  labeled as such.

Phase 2, hosted working system:
- GitHub sign-in; connect a repository built from the template (or
  any repository following the meta-model).
- Back-end tool runs on demand and on push: layout/header/reference
  verification, policy evaluation, view regeneration, read-model
  rebuild. Results shown as gate evidence in the UI.
- Change proposals: edit or draft an artifact in the browser, or hand
  the work to an agent lane; either way the output is a pull request
  against the connected repository.
- Reconciliation loop: scheduled observed-state snapshots, drift
  filed automatically, drift items tracked to closure.
- **Drafting copilot:** describe the change; the AI drafts a typed
  artifact (front matter valid by construction), a roadmap update, an
  ADR, or a standard-to-policy draft. The draft runs the verifier and
  OPA before it is ever shown as a proposal; gate output travels with
  the pull request.
- **Impact analysis:** select an element; the graph computes the
  affected set deterministically and the AI writes the narrative:
  what breaks, what is bound, which roadmaps and views change.
- **View assistant:** ask for a picture in words; the AI proposes a
  view register entry (viewpoint, level, focus, elements). The
  renderer draws it. AI never draws directly.
- **Standards assistant:** explains any standard, its enforcement, and
  its bindings; flags systems that should bind and do not.

Phase 3, practice operations:
- Agent console: the queue and activity surface. What was proposed,
  by which lane, gate results, ratification state. Independent
  verification lanes review proposals they did not author, under the
  same governed-execution discipline as JD's existing agent lanes
  (bootstrap contract, capability matrix, HCAE attribution, audit
  trail filed as evidence).
- Multi-repository federation: an authority repository owns shared
  standards and contracts; downstream repositories pin versions.
- Reporting: portfolio views across connected repositories, with
  AI-written summaries grounded in the portfolio read models.

## Access and model protection

The public sees a showcase; the live system is gated.

- **Public showcase (no login):** a landing page with the concept,
  screenshots, and sample AI outputs. No live model calls, no record
  access beyond the fictional demo highlights.
- **Live demo (issued account):** the app and every AI feature sit
  behind the front-end login, the same credential-gate pattern as
  JD's other hosted tools on this server. There is no public signup.
  A visitor requests access (name, email, organization, purpose);
  JD approves; the system issues an **individual** username and
  password per person, never a shared demo password, so usage is
  attributable and any account can be revoked or expired on its own.
  Default demo accounts expire in 14 days.
- **Model protection, enforced server-side:**
  - No anonymous AI calls: every AI endpoint requires a session.
  - Per-account quotas: daily request count and daily token budget,
    sized for evaluation, not production use.
  - Per-request ceilings: maximum context and output tokens per call.
  - A global daily cap across all accounts with a circuit breaker:
    when the cap is hit, AI features pause until the next day; the
    read-only record stays up.
  - A usage ledger per account (requests, tokens, cost estimate,
    feature used), visible in the agent console, so overuse is a
    report, not a surprise bill.
  - Passwords stored hashed (argon2); sessions expire; JD can revoke
    an account in one command.
  - CLI-specific controls, because the primary provider is a CLI:
    invocations are queued with a low concurrency cap (they are
    heavyweight), each runs with a timeout, under the service
    account, in a restricted working directory, with a tool allowlist
    (Ask runs read-only; no shell or write tools for demo accounts).
    The quotas protect the CLI's own usage limits as much as cost.

## Hosting

- **PeakAI server** (JD's hosted box) runs the system as systemd
  services from /opt/thinxea: the built React app and a small API
  service, on localhost ports. The API hosts the AI layer behind a
  model-agnostic provider interface, and the primary provider is one
  the server already has: the **Claude Code CLI** (verified on the
  host, v2.1.145, configured and in use), invoked headless by the API
  as a subprocess. No new API keys to manage for the primary path.
  A local tier rides along for free: **Ollama** on the same box
  (verified models include a 35B and a 9B Qwen, plus nomic-embed-text)
  covers embeddings for retrieval, light summaries, and an offline
  fallback when the CLI tier is capped. Model access is server-side
  only: nothing model-related ever reaches the browser or the repo.
- Public ingress through a Cloudflare Tunnel to
  **ea.thinxai.net** (no open inbound ports; the same pattern family
  as JD's other hosted services). The DNS record is added when JD
  gives the word.
- Public code repository: **jdlongmire/thinxea** (does not exist yet;
  name is free). The demo data repository is the existing public
  **jdlongmire/ea-repository-template**.

## What it is not

- Not a general-purpose modeling tool; it renders and operates one
  disciplined repository structure, on purpose.
- Not a replacement for the repository: delete ThinxEA and the record
  still stands, complete, in Git.
- Not affiliated with any employer or program. The demo content is
  fictional; the method comes from JD's public writing and papers.

## Success criteria for Phase 1

- ea.thinxai.net serves the React app from the PeakAI host.
- The demo renders the full claims example: 15 artifacts, 15 catalog
  elements, 15 relations, 6 generated views, 2 standards (one
  policy-enforced), drift register visible.
- Every number and picture on the site traces to the read model,
  which traces to the repository. No hand-entered content in the UI.
- A reader can go from any view element to its artifact, its
  relations, and its source file in the public repository in two
  clicks.
- Ask ThinxEA answers questions over the demo record with an artifact
  citation on every factual claim, and says it does not know when the
  record does not say. No uncited architecture facts.
- The AI endpoints refuse anonymous calls (401), an account that
  exhausts its daily quota is cut off until reset, and the global cap
  pauses AI features without taking the record offline. All three
  states are tested, not assumed.

Human-Curated, AI-Enabled (HCAE)
