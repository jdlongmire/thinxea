from datetime import datetime, timezone

from fastapi import HTTPException

from . import config
from .db import db


def today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def check_quota(username: str) -> None:
    """Raise 429 before an AI call if the account or the global cap is spent."""
    day = today()
    with db() as conn:
        user_count, user_tokens = conn.execute(
            "SELECT COUNT(*), COALESCE(SUM(tokens_in + tokens_out), 0) FROM usage WHERE username = ? AND day = ?",
            (username, day),
        ).fetchone()
        global_count = conn.execute(
            "SELECT COUNT(*) FROM usage WHERE day = ?", (day,)
        ).fetchone()[0]
    if user_count >= config.DAILY_REQUESTS:
        raise HTTPException(429, "daily request quota reached for this account")
    if user_tokens >= config.DAILY_TOKENS:
        raise HTTPException(429, "daily token budget reached for this account")
    if global_count >= config.GLOBAL_DAILY_REQUESTS:
        raise HTTPException(429, "global daily AI cap reached; AI features resume tomorrow")


def record_usage(username: str, feature: str, tokens_in: int, tokens_out: int, cost_usd: float) -> None:
    with db() as conn:
        conn.execute(
            "INSERT INTO usage (username, day, feature, tokens_in, tokens_out, cost_usd, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (username, today(), feature, tokens_in, tokens_out, cost_usd, datetime.now(timezone.utc).isoformat()),
        )


def record_run(username: str, feature: str, provider: str, prompt: str, output: str, citations: list[str]) -> None:
    import json

    with db() as conn:
        conn.execute(
            "INSERT INTO runs (username, feature, provider, prompt, output, citations, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (username, feature, provider, prompt, output, json.dumps(citations), datetime.now(timezone.utc).isoformat()),
        )
