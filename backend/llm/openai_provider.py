"""OpenAI-backed extraction provider. Requires OPENAI_API_KEY."""
from __future__ import annotations

import json
import os

from backend.llm.base import LLMProvider, extraction_system_prompt
from backend.models.schemas import AIExtractionResult


class OpenAIProvider(LLMProvider):
    name = "openai"

    def __init__(self) -> None:
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    async def extract(self, text: str) -> AIExtractionResult:
        from openai import AsyncOpenAI  # imported lazily so the package is optional

        client = AsyncOpenAI(api_key=self.api_key)
        response = await client.chat.completions.create(
            model=self.model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": extraction_system_prompt()},
                {"role": "user", "content": text},
            ],
        )
        data = json.loads(response.choices[0].message.content)
        return AIExtractionResult(**data, raw_notes=text.strip())
