"""Provider factory. Swap providers via the LLM_PROVIDER env var.

Values: "openrouter", "openai", "claude", "ollama", "rule_based".
If LLM_PROVIDER is unset, OpenRouter is used automatically when
OPENROUTER_API_KEY exists in the environment/.env; otherwise the
zero-config rule-based extractor is used. Any misconfiguration falls
back to rule_based so the demo never breaks.
"""
from __future__ import annotations

import os

from backend.llm.base import LLMProvider
from backend.llm.rule_based_provider import RuleBasedProvider

_provider: LLMProvider | None = None


def _resolve_name() -> str:
    explicit = os.getenv("LLM_PROVIDER", "").lower().strip()
    if explicit:
        return explicit
    if os.getenv("OPENROUTER_API_KEY"):
        return "openrouter"
    return "rule_based"


def get_llm_provider() -> LLMProvider:
    global _provider
    if _provider is not None:
        return _provider

    provider_name = _resolve_name()

    try:
        if provider_name == "openrouter" and os.getenv("OPENROUTER_API_KEY"):
            from backend.llm.openrouter_provider import OpenRouterProvider

            _provider = OpenRouterProvider()
        elif provider_name == "openai" and os.getenv("OPENAI_API_KEY"):
            from backend.llm.openai_provider import OpenAIProvider

            _provider = OpenAIProvider()
        elif provider_name == "claude" and os.getenv("ANTHROPIC_API_KEY"):
            from backend.llm.claude_provider import ClaudeProvider

            _provider = ClaudeProvider()
        elif provider_name == "ollama":
            from backend.llm.ollama_provider import OllamaProvider

            _provider = OllamaProvider()
        else:
            _provider = RuleBasedProvider()
    except ImportError:
        _provider = RuleBasedProvider()

    return _provider
