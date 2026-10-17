import json
import re
from datetime import datetime, timezone

from fastapi import Cookie, Depends, FastAPI, Response
from pydantic import BaseModel

from . import auth, config, quotas
from .ai import retrieval
from .ai.provider import GROUNDING_SYSTEM, get_provider
from .db import db

app = FastAPI(title="ThinxEA API")


class LoginIn(BaseModel):
    username: str
    password: str


class AccessRequestIn(BaseModel):
    name: str
    email: str
    org: str = ""
    purpose: str = ""


class AskIn(BaseModel):
    question: str


class ImpactIn(BaseModel):
    element_id: str


@app.get("/api/health")
def health():
    return {"ok": True, "provider": config.PROVIDER}


@app.post("/api/access-requests", status_code=201)
def access_request(body: AccessRequestIn):
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO access_requests (name, email, org, purpose, created_at) VALUES (?, ?, ?, ?, ?)",
            (body.name, body.email, body.org, body.purpose, datetime.now(timezone.utc).isoformat()),
        )
        return {"id": cur.lastrowid, "status": "pending"}


@app.post("/api/auth/login")
def login(body: LoginIn, response: Response):
    user = auth.verify_login(body.username, body.password)
    token = auth.create_session(body.username)
    response.set_cookie(
        "thinxea_session", token, httponly=True, samesite="lax", path="/api",
        max_age=config.SESSION_DAYS * 86400,
    )
    return user


@app.post("/api/auth/logout")
def logout(response: Response, thinxea_session: str | None = Cookie(default=None)):
    auth.revoke_session(thinxea_session)
    response.delete_cookie("thinxea_session", path="/api")
    return {"ok": True}


@app.get("/api/auth/me")
def me(user: dict = Depends(auth.current_user)):
    return user


async def run_ai(username: str, feature: str, system: str, prompt: str, question: str) -> tuple[str, str, list[str]]:
    quotas.check_quota(username)
    provider = get_provider()
    result = await provider.complete(system, prompt, question)
    known = retrieval.known_ids()
    citations = [c for c in retrieval.extract_ids(result.text) if c in known]
    if provider.name != "stub-grounded" and not citations:
        retry = await provider.complete(
            system,
            prompt + "\n\nYour previous answer cited no artifact ids. Answer again, citing the artifact id for every factual claim, or state that the record does not say.",
            question,
        )
        result = retry
        citations = [c for c in retrieval.extract_ids(result.text) if c in known]
        if not citations:
            result.text = "The record does not support a grounded answer to that question."
    quotas.record_usage(username, feature, result.tokens_in, result.tokens_out, result.cost_usd)
    quotas.record_run(username, feature, result.provider, question, result.text, citations)
    return result.text, result.provider, citations


@app.post("/api/ask")
async def ask(body: AskIn, user: dict = Depends(auth.current_user)):
    picked = retrieval.match_artifacts(body.question)
    context = retrieval.context_block(picked)
    prompt = f"Record context:\n\n{context}\n\nQuestion: {body.question}"
    text, provider_name, citations = await run_ai(user["username"], "ask", GROUNDING_SYSTEM, prompt, body.question)
    return {"answer": text, "citations": citations, "provider": provider_name}


@app.post("/api/impact")
async def impact(body: ImpactIn, user: dict = Depends(auth.current_user)):
    by_id = retrieval.artifacts_by_id()
    el = by_id.get(body.element_id)
    if el is None:
        return {"element": body.element_id, "affected": [], "narrative": "No such element in the record.", "provider": "none"}
    affected = retrieval.impact_set(body.element_id)
    rels = [r for r in retrieval.relations() if r["source"] == body.element_id or r["target"] == body.element_id]
    context = retrieval.context_block([el] + [by_id[a] for a in affected[:5] if a in by_id])
    prompt = (
        f"Record context:\n\n{context}\n\nElement {body.element_id} ({el['name']}) has these direct relations: "
        f"{json.dumps(rels)}. Its full affected set is: {', '.join(affected)}. "
        f"Write a short impact narrative: what changes if {body.element_id} changes, what is bound to it, "
        "and which views and roadmaps would need review. Cite artifact ids for every factual claim."
    )
    text, provider_name, _ = await run_ai(user["username"], "impact", GROUNDING_SYSTEM, prompt, body.element_id)
    return {"element": body.element_id, "affected": affected, "narrative": text, "provider": provider_name}


@app.get("/api/runs")
def runs(user: dict = Depends(auth.current_user)):
    with db() as conn:
        rows = conn.execute(
            "SELECT id, username, feature, provider, citations, created_at FROM runs ORDER BY id DESC LIMIT 50"
        ).fetchall()
    return [
        {**dict(r), "citations": json.loads(r["citations"])} for r in rows
    ]
