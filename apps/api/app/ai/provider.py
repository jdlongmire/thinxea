import asyncio
import json

import httpx

from .. import config
from .retrieval import grounded_stub_answer

GROUNDING_SYSTEM = (
    "You are ThinxEA, answering questions about an enterprise architecture record. "
    "Use only the record context provided. Cite the artifact id (for example SYS-014) for "
    "every factual claim. If the record does not support an answer, say the record does not "
    "say. Be concise and concrete."
)


class ProviderResult:
    def __init__(self, text: str, provider: str, tokens_in: int = 0, tokens_out: int = 0, cost_usd: float = 0.0):
        self.text = text
        self.provider = provider
        self.tokens_in = tokens_in
        self.tokens_out = tokens_out
        self.cost_usd = cost_usd


class StubProvider:
    """Model-free grounded answers (structured retrieval). Also the
    offline fallback when the CLI tier is unavailable."""

    name = "stub-grounded"

    async def complete(self, system: str, prompt: str, question: str) -> ProviderResult:
        text, _ = grounded_stub_answer(question)
        return ProviderResult(text=text, provider=self.name)


class ClaudeCliProvider:
    """The host's Claude Code CLI, headless. Runs under the service
    account in a restricted working directory; Ask is read-only, so
    no tools are permitted at all (--tools "")."""

    name = "claude-cli"
    _sem: asyncio.Semaphore | None = None

    @classmethod
    def sem(cls) -> asyncio.Semaphore:
        if cls._sem is None:
            cls._sem = asyncio.Semaphore(config.CLI_CONCURRENCY)
        return cls._sem

    async def complete(self, system: str, prompt: str, question: str) -> ProviderResult:
        config.WORKDIR.mkdir(parents=True, exist_ok=True)
        args = ["claude", "-p", prompt, "--output-format", "json", "--max-turns", "1",
                "--system-prompt", system, "--tools", ""]
        if config.CLI_MODEL:
            args += ["--model", config.CLI_MODEL]
        async with self.sem():
            proc = await asyncio.create_subprocess_exec(
                *args,
                cwd=str(config.WORKDIR),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                out, _ = await asyncio.wait_for(proc.communicate(), timeout=config.CLI_TIMEOUT)
            except asyncio.TimeoutError:
                proc.kill()
                raise RuntimeError("model call timed out")
        data = json.loads(out.decode())
        if data.get("is_error"):
            raise RuntimeError("model call failed")
        usage = data.get("usage", {})
        return ProviderResult(
            text=data.get("result", ""),
            provider=self.name,
            tokens_in=usage.get("input_tokens", 0),
            tokens_out=usage.get("output_tokens", 0),
            cost_usd=float(data.get("total_cost_usd", 0.0)),
        )


class OllamaProvider:
    name = "ollama"

    async def complete(self, system: str, prompt: str, question: str) -> ProviderResult:
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(
                f"{config.OLLAMA_URL}/api/generate",
                json={"model": config.OLLAMA_MODEL, "system": system, "prompt": prompt, "stream": False},
            )
            r.raise_for_status()
            data = r.json()
        return ProviderResult(
            text=data.get("response", ""),
            provider=self.name,
            tokens_in=data.get("prompt_eval_count", 0),
            tokens_out=data.get("eval_count", 0),
        )


def get_provider() -> StubProvider | ClaudeCliProvider | OllamaProvider:
    if config.PROVIDER == "claude_cli":
        return ClaudeCliProvider()
    if config.PROVIDER == "ollama":
        return OllamaProvider()
    return StubProvider()
