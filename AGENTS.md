# Agent Contract for This Repository

- Propose, never merge. All agent work arrives as a pull request.
- Generated data is never hand-edited: `apps/web/public/data/` and
  `apps/web/public/views/` come from `tools/export_read_model.py`.
- The AI layer's grounding rule is load-bearing: every factual claim
  in an AI answer carries an artifact citation, and the citation
  check in `apps/api/app/main.py` is not to be weakened.
- No credentials, provider keys, or account data in this repository.
  Host configuration lives in `/opt/thinxea/thinxea.env` on the host.
- Nothing in this repository names or derives from any employer's
  material. The demo record is fictional.
