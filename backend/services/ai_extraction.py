"""Extraction orchestration: calls the configured provider with a safe fallback."""
from __future__ import annotations

import logging

from backend.llm.factory import get_llm_provider
from backend.llm.rule_based_provider import RuleBasedProvider
from backend.models.schemas import AIExtractionResult

logger = logging.getLogger(__name__)

_fallback = RuleBasedProvider()


async def extract_charter_details(text: str) -> AIExtractionResult:
    provider = get_llm_provider()
    try:
        return await provider.extract(text)
    except Exception:  # noqa: BLE001 - any provider failure should not break the demo
        logger.exception("LLM provider '%s' failed, falling back to rule-based extraction", provider.name)
        return await _fallback.extract(text)
