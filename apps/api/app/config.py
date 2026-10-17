import os
from pathlib import Path

DB_PATH = Path(os.environ.get("THINXEA_DB", "/opt/thinxea/data/thinxea.db"))
MODEL_PATH = Path(os.environ.get("THINXEA_MODEL_PATH", "/opt/thinxea/web-data/model.json"))
WORKDIR = Path(os.environ.get("THINXEA_WORKDIR", "/opt/thinxea/work"))

PROVIDER = os.environ.get("THINXEA_PROVIDER", "stub")  # stub | claude_cli | ollama
CLI_MODEL = os.environ.get("THINXEA_CLI_MODEL", "")  # empty = CLI default
CLI_TIMEOUT = int(os.environ.get("THINXEA_CLI_TIMEOUT", "180"))
CLI_CONCURRENCY = int(os.environ.get("THINXEA_CLI_CONCURRENCY", "2"))
OLLAMA_MODEL = os.environ.get("THINXEA_OLLAMA_MODEL", "qwen3.5:9b")
OLLAMA_URL = os.environ.get("THINXEA_OLLAMA_URL", "http://127.0.0.1:11434")

DAILY_REQUESTS = int(os.environ.get("THINXEA_DAILY_REQUESTS", "40"))
DAILY_TOKENS = int(os.environ.get("THINXEA_DAILY_TOKENS", "200000"))
GLOBAL_DAILY_REQUESTS = int(os.environ.get("THINXEA_GLOBAL_DAILY_REQUESTS", "300"))
SESSION_DAYS = int(os.environ.get("THINXEA_SESSION_DAYS", "7"))
ACCOUNT_DEFAULT_DAYS = int(os.environ.get("THINXEA_ACCOUNT_DAYS", "14"))
