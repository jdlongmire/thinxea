import json
import re
from functools import lru_cache

from .. import config

ID_RE = re.compile(r"[A-Z]{2,5}(?:-[A-Z0-9]+)*-\d{3}")


@lru_cache(maxsize=1)
def load_model() -> dict:
    return json.loads(config.MODEL_PATH.read_text())


def known_ids() -> set[str]:
    m = load_model()
    return {a["id"] for a in m["artifacts"]}


def artifacts_by_id() -> dict[str, dict]:
    m = load_model()
    return {a["id"]: a for a in m["artifacts"]}


def relations() -> list[dict]:
    return load_model()["catalog"]["relation"]


def extract_ids(text: str) -> list[str]:
    return sorted(set(ID_RE.findall(text or "")))


def match_artifacts(question: str, limit: int = 6) -> list[dict]:
    """Structured retrieval: explicit ids first, then keyword overlap
    over the search index, then type keywords."""
    m = load_model()
    by_id = artifacts_by_id()
    picked: list[dict] = []
    for aid in extract_ids(question):
        if aid in by_id and by_id[aid] not in picked:
            picked.append(by_id[aid])
    words = {w.lower() for w in re.findall(r"[a-zA-Z]{3,}", question)}
    scored = []
    for chunk in m["searchIndex"]:
        text = (chunk["title"] + " " + chunk["type"] + " " + chunk["text"]).lower()
        score = sum(1 for w in words if w in text)
        if score:
            scored.append((score, chunk["id"]))
    for _, aid in sorted(scored, reverse=True):
        if by_id[aid] not in picked:
            picked.append(by_id[aid])
        if len(picked) >= limit:
            break
    return picked[:limit]


def context_block(artifacts: list[dict]) -> str:
    rels = relations()
    parts = []
    for a in artifacts:
        lines = [
            f"[{a['id']}] type={a['type']} level={a['level']} status={a['status']} name={a['name']}",
            (a.get("body") or "")[:1200],
        ]
        for r in rels:
            if r["source"] == a["id"]:
                lines.append(f"relation: {a['id']} {r['relation']} {r['target']}")
            if r["target"] == a["id"]:
                lines.append(f"relation: {r['source']} {r['relation']} {a['id']}")
        parts.append("\n".join(lines))
    return "\n\n".join(parts)


def impact_set(element_id: str) -> list[str]:
    rels = relations()
    seen: set[str] = set()
    queue = [element_id]
    while queue:
        cur = queue.pop(0)
        for r in rels:
            if r["source"] == cur and r["target"] not in seen:
                seen.add(r["target"])
                queue.append(r["target"])
            if r["target"] == cur and r["source"] not in seen:
                seen.add(r["source"])
                queue.append(r["source"])
    seen.discard(element_id)
    return sorted(seen)


def grounded_stub_answer(question: str) -> tuple[str, list[str]]:
    """Deterministic, model-free answer from structured retrieval.
    Used by the stub provider and as the offline fallback."""
    picked = match_artifacts(question)
    if not picked:
        return ("The record does not say. No artifacts in the demo record match that question.", [])
    rels = relations()
    lines = []
    citations: list[str] = []
    for a in picked[:4]:
        citations.append(a["id"])
        lines.append(f"**{a['id']}: {a['name']}** ({a['type']}, {a['level']}, {a['status']}).")
        body = " ".join((a.get("body") or "").split())[:280]
        if body:
            lines.append(body)
        for r in rels:
            if r["source"] == a["id"]:
                lines.append(f"- {a['id']} {r['relation']} {r['target']}")
                if r["target"] not in citations:
                    citations.append(r["target"])
            if r["target"] == a["id"]:
                lines.append(f"- {r['source']} {r['relation']} {a['id']}")
                if r["source"] not in citations:
                    citations.append(r["source"])
    return ("\n\n".join(lines), citations)
