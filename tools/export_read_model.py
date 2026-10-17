#!/usr/bin/env python3
"""Export an EA repository checkout into the ThinxEA read model.

Usage:
    python3 tools/export_read_model.py --ea-repo /path/to/ea-repo [--out apps/web/public]

Reads the EA repository (typed artifact headers via its own verify.py
--emit-json, catalog.toml, views.toml, artifact bodies, the drift
register) and writes:

    <out>/data/model.json   the read model the web app renders
    <out>/views/*           the generated view outputs (SVG + Mermaid)

Standard library only. The web app knows only the emitted JSON
contract, documented in tools/README.md.
"""
import argparse
import json
import shutil
import subprocess
import sys
import tempfile
import tomllib
from datetime import datetime, timezone
from pathlib import Path

AREAS = ["01-enterprise", "02-systems", "03-solutions", "04-work-packages"]
FOCUS = {
    "strategy": "strategy", "requirement": "strategy",
    "capability": "architecture", "system": "architecture",
    "interface": "architecture", "decision": "architecture",
    "solution": "architecture",
    "roadmap": "roadmaps", "work-package": "roadmaps",
    "standard": "standards",
}


def parse_front_matter(text):
    if not text.startswith("---\n"):
        return None, text
    end = text.find("\n---", 4)
    if end == -1:
        return None, text
    fields = {}
    for line in text[4:end].splitlines():
        if not line.strip() or ":" not in line:
            continue
        key, _, value = line.partition(":")
        key, value = key.strip(), value.strip()
        if value.startswith("[") and value.endswith("]"):
            inner = value[1:-1].strip()
            fields[key] = [v.strip() for v in inner.split(",")] if inner else []
        else:
            fields[key] = value
    return fields, text[end + 4:].lstrip("\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ea-repo", required=True)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()
    ea = Path(args.ea_repo).resolve()
    root = Path(__file__).resolve().parent.parent
    out = Path(args.out).resolve() if args.out else root / "apps" / "web" / "public"

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
        tmp = tf.name
    subprocess.run(
        [sys.executable, str(ea / "00-meta-model" / "verify.py"), "--emit-json", tmp],
        cwd=ea, check=True, capture_output=True, text=True,
    )
    artifacts = json.loads(Path(tmp).read_text())["artifacts"]

    bodies = {}
    for area in AREAS:
        base = ea / area
        if not base.is_dir():
            continue
        for md in sorted(base.rglob("*.md")):
            if md.name == "README.md":
                continue
            fields, body = parse_front_matter(md.read_text())
            if fields and "id" in fields:
                bodies[fields["id"]] = {"path": str(md.relative_to(ea)), "body": body.strip()}
    for a in artifacts:
        info = bodies.get(a["id"], {})
        a["path"] = info.get("path", "")
        a["body"] = info.get("body", "")

    catalog = tomllib.loads((ea / "00-meta-model" / "catalog.toml").read_text())
    register = tomllib.loads((ea / "00-meta-model" / "views.toml").read_text())
    rels = catalog.get("relation", [])

    views = []
    for v in register.get("view", []):
        stem = v["id"].lower()
        views.append({**v, "svg": f"/views/{stem}.svg", "mmd": f"/views/{stem}.mmd"})

    standards = []
    for a in artifacts:
        if a["type"] == "standard":
            bound = sorted({r["source"] for r in rels if r["relation"] == "bound-by" and r["target"] == a["id"]})
            standards.append({
                "id": a["id"], "name": a["name"], "enforcement": a.get("enforcement"),
                "policyFile": f"policies/{a['id'].lower()}.rego" if a.get("enforcement") == "policy" else None,
                "boundElements": bound,
            })

    grid = {}
    for a in artifacts:
        lvl = a["level"] if a["level"] in ("enterprise", "systems", "solutions") else "cross-cutting"
        grid.setdefault(lvl, {}).setdefault(FOCUS[a["type"]], []).append(a["id"])

    drift = ea / "05-evidence" / "drift-register.md"
    snaps_dir = ea / "05-evidence" / "snapshots"
    model = {
        "product": "ThinxEA",
        "provenance": {
            "repository": "jdlongmire/ea-repository-template",
            "example": "claims-processing-platform (fictional)",
            "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        },
        "counts": {
            "artifacts": len(artifacts),
            "elements": len(catalog.get("element", [])),
            "relations": len(rels),
            "views": len(views),
        },
        "artifacts": artifacts,
        "catalog": catalog,
        "views": views,
        "standards": standards,
        "sarsGrid": grid,
        "evidence": {
            "driftRegister": drift.read_text() if drift.exists() else "",
            "snapshots": sorted(p.name for p in snaps_dir.glob("*.md")) if snaps_dir.is_dir() else [],
        },
        "searchIndex": [
            {"id": a["id"], "title": a["name"], "type": a["type"], "path": a["path"], "text": a["body"]}
            for a in artifacts
        ],
    }

    (out / "data").mkdir(parents=True, exist_ok=True)
    (out / "data" / "model.json").write_text(json.dumps(model, indent=2))
    views_src = ea / "05-evidence" / "views"
    views_dst = out / "views"
    views_dst.mkdir(parents=True, exist_ok=True)
    copied = 0
    if views_src.is_dir():
        for f in views_src.iterdir():
            if f.suffix in (".svg", ".mmd"):
                shutil.copy2(f, views_dst / f.name)
                copied += 1
    print(f"model.json: {model['counts']}; copied {copied} view outputs -> {out}")


if __name__ == "__main__":
    main()
