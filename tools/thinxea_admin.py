#!/usr/bin/env python3
"""ThinxEA operator CLI. Run on the host (or anywhere THINXEA_DB points).

    python3 tools/thinxea_admin.py list-requests
    python3 tools/thinxea_admin.py approve REQUEST_ID USERNAME [--days 14]
    python3 tools/thinxea_admin.py create-user USERNAME [--days 14]
    python3 tools/thinxea_admin.py revoke USERNAME
    python3 tools/thinxea_admin.py list-users
    python3 tools/thinxea_admin.py ledger [--days 7]

Passwords are generated and printed exactly once, at issuance.
"""
import argparse
import secrets
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

for _candidate in (
    Path(__file__).resolve().parent.parent / "apps" / "api",  # repo layout
    Path("/opt/thinxea/api"),  # host layout
):
    if _candidate.is_dir():
        sys.path.insert(0, str(_candidate))
        break

from app.auth import create_account  # noqa: E402
from app.db import db  # noqa: E402


def gen_password() -> str:
    return secrets.token_urlsafe(12)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("list-requests")
    p = sub.add_parser("approve"); p.add_argument("request_id", type=int); p.add_argument("username"); p.add_argument("--days", type=int, default=14)
    p = sub.add_parser("create-user"); p.add_argument("username"); p.add_argument("--days", type=int, default=14)
    p = sub.add_parser("revoke"); p.add_argument("username")
    sub.add_parser("list-users")
    p = sub.add_parser("ledger"); p.add_argument("--days", type=int, default=7)
    args = ap.parse_args()

    if args.cmd == "list-requests":
        with db() as conn:
            for r in conn.execute("SELECT * FROM access_requests ORDER BY id DESC LIMIT 50"):
                print(f"#{r['id']} [{r['status']}] {r['name']} <{r['email']}> {r['org']} :: {r['purpose'][:80]}")
    elif args.cmd in ("approve", "create-user"):
        password = gen_password()
        days = args.days
        expires = create_account(args.username, password, days=days)
        if args.cmd == "approve":
            with db() as conn:
                conn.execute("UPDATE access_requests SET status = 'approved' WHERE id = ?", (args.request_id,))
        print(f"username: {args.username}")
        print(f"password: {password}")
        print(f"expires:  {expires}")
    elif args.cmd == "revoke":
        with db() as conn:
            conn.execute("UPDATE accounts SET revoked = 1 WHERE username = ?", (args.username,))
            conn.execute("DELETE FROM sessions WHERE username = ?", (args.username,))
        print(f"revoked {args.username}")
    elif args.cmd == "list-users":
        with db() as conn:
            for r in conn.execute("SELECT username, created_at, expires_at, revoked FROM accounts ORDER BY username"):
                print(f"{r['username']}  created {r['created_at'][:10]}  expires {r['expires_at'][:10] if r['expires_at'] else '-'}  revoked {r['revoked']}")
    elif args.cmd == "ledger":
        since = (datetime.now(timezone.utc) - timedelta(days=args.days)).date().isoformat()
        with db() as conn:
            for r in conn.execute(
                "SELECT username, day, COUNT(*) n, SUM(tokens_in + tokens_out) tokens, SUM(cost_usd) cost FROM usage WHERE day >= ? GROUP BY username, day ORDER BY day DESC",
                (since,),
            ):
                print(f"{r['day']}  {r['username']}  requests {r['n']}  tokens {r['tokens']}  est ${r['cost']:.4f}")


if __name__ == "__main__":
    main()
