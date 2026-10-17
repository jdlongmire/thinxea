import secrets
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Cookie, HTTPException

from . import config
from .db import db

ph = PasswordHasher()


def now() -> datetime:
    return datetime.now(timezone.utc)


def create_account(username: str, password: str, days: int | None = None) -> str:
    expires = now() + timedelta(days=config.ACCOUNT_DEFAULT_DAYS if days is None else days)
    with db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO accounts (username, password_hash, created_at, expires_at, revoked) VALUES (?, ?, ?, ?, 0)",
            (username, ph.hash(password), now().isoformat(), expires.isoformat()),
        )
    return expires.isoformat()


def verify_login(username: str, password: str) -> dict:
    with db() as conn:
        row = conn.execute("SELECT * FROM accounts WHERE username = ?", (username,)).fetchone()
    if row is None or row["revoked"]:
        raise HTTPException(401, "invalid credentials")
    if row["expires_at"] and datetime.fromisoformat(row["expires_at"]) < now():
        raise HTTPException(401, "account expired")
    try:
        ph.verify(row["password_hash"], password)
    except VerifyMismatchError:
        raise HTTPException(401, "invalid credentials")
    return {"username": username, "expires_at": row["expires_at"]}


def create_session(username: str) -> str:
    token = secrets.token_urlsafe(32)
    expires = now() + timedelta(days=config.SESSION_DAYS)
    with db() as conn:
        conn.execute(
            "INSERT INTO sessions (token, username, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, username, now().isoformat(), expires.isoformat()),
        )
    return token


def current_user(thinxea_session: str | None = Cookie(default=None)) -> dict:
    if not thinxea_session:
        raise HTTPException(401, "sign in required")
    with db() as conn:
        row = conn.execute("SELECT * FROM sessions WHERE token = ?", (thinxea_session,)).fetchone()
        if row is None or datetime.fromisoformat(row["expires_at"]) < now():
            raise HTTPException(401, "session expired")
        acct = conn.execute("SELECT * FROM accounts WHERE username = ?", (row["username"],)).fetchone()
        if acct is None or acct["revoked"]:
            raise HTTPException(401, "account unavailable")
        return {"username": row["username"], "expires_at": acct["expires_at"]}


def revoke_session(token: str | None) -> None:
    if token:
        with db() as conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
