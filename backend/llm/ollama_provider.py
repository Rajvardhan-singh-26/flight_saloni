"""Ollama-backed extraction provider for local/self-hosted models."""
from __future__ import annotations

import json
import os
import re

import httpx

from backend.llm.base import LLMProvider, extraction_system_prompt
from backend.models.schemas import AIExtractionResult


class OllamaProvider(LLMProvider):
    name = "ollama"

    def __init__(self) -> None:
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.model = os.getenv("OLLAMA_MODEL", "llama3.1")

    async def extract(self, text: str) -> AIExtractionResult:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "stream": False,
                    "format": "json",
                    "messages": [
                        {"role": "system", "content": extraction_system_prompt()},
                        {"role": "user", "content": text},
                    ],
                },
            )
            response.raise_for_status()
            raw = response.json()["message"]["content"]

        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
        data = json.loads(json_match.group(0) if json_match else raw)
        return AIExtractionResult(**data, raw_notes=text.strip())
