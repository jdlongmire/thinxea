# Tools

## export_read_model.py

Reads an EA repository checkout (one that follows the
ea-repository-template meta-model) and emits the ThinxEA read model:

- `apps/web/public/data/model.json`: artifacts (typed headers plus
  body and source path), the catalog (elements and relations), the
  view register (with resolved SVG/Mermaid paths), the standards
  register (derived enforcement and bindings), the SARS grid
  (derived by artifact type), evidence (drift register text and
  snapshot names), provenance, and a per-artifact search index.
- `apps/web/public/views/`: the generated view outputs, copied.

Both outputs are build artifacts (gitignored). The web app renders
only this JSON contract; the API's retrieval reads the same file.

## thinxea_admin.py

Operator CLI for accounts and access requests, against the API's
SQLite store (`THINXEA_DB`). Approving a request or creating a user
generates a password and prints it once. See the module docstring.
