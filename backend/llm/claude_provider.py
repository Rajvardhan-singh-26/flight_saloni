"""Claude-backed extraction provider. Requires ANTHROPIC_API_KEY."""
from __future__ import annotations

import json
import os
import re

from backend.llm.base import LLMProvider, extraction_system_prompt
from backend.models.schemas import AIExtractionResult


class ClaudeProvider(LLMProvider):
    name = "claude"

    def __init__(self) -> None:
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        self.model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5")

    async def extract(self, text: str) -> AIExtractionResult:
        import anthropic  # imported lazily so the package is optional

        client = anthropic.AsyncAnthropic(api_key=self.api_key)
        message = await client.messages.create(
            model=self.model,
            max_tokens=512,
            system=extraction_system_prompt(),
            messages=[{"role": "user", "content": text}],
        )
        raw = message.content[0].text
        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
        data = json.loads(json_match.group(0) if json_match else raw)
        return AIExtractionResult(**data, raw_notes=text.strip())
