#!/usr/bin/env python3
"""Static server for the ThinxEA web build, with SPA fallback.

    python3 serve_spa.py [port] [directory]

Serves files from the directory; any path that does not resolve to a
file returns index.html so client-side routes work. Standard library
only. API paths (/api/*) return 404 here: in production they are
routed to the API service by the tunnel ingress.
"""
import http.server
import os
import sys
from pathlib import Path

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8940
ROOT = Path(sys.argv[2] if len(sys.argv) > 2 else ".").resolve()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/"):
            self.send_error(404)
            return
        candidate = ROOT / self.path.lstrip("/").split("?")[0]
        if not candidate.is_file():
            self.path = "/index.html"
        super().do_GET()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    os.chdir(ROOT)
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
