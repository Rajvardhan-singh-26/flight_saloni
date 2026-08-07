"""OpenRouter-backed extraction provider.

OpenRouter exposes an OpenAI-compatible chat completions API, giving access to
many models with one key. Configure via .env:
    OPENROUTER_API_KEY=sk-or-...
    OPENROUTER_MODEL=openai/gpt-4o-mini   (optional)
"""
from __future__ import annotations

import json
import os
import re

import httpx

from backend.llm.base import LLMProvider, extraction_system_prompt
from backend.models.schemas import AIExtractionResult

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


class OpenRouterProvider(LLMProvider):
    name = "openrouter"

    def __init__(self) -> None:
        self.api_key = os.getenv("OPENROUTER_API_KEY", "")
        self.model = os.getenv("OPENROUTER_MODEL", "openrouter/free")

    async def extract(self, text: str) -> AIExtractionResult:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "Carewell Aviation Quotation",
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": extraction_system_prompt()},
                        {"role": "user", "content": text},
                    ],
                },
            )
            response.raise_for_status()
            raw = response.json()["choices"][0]["message"]["content"] or ""

        return _parse_extraction(raw, text)


def _parse_extraction(raw: str, original_text: str) -> AIExtractionResult:
    """Robustly parse model output: free models often wrap JSON in fences or prose."""
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start == -1 or end <= start:
        raise ValueError(f"No JSON object in model output: {cleaned[:120]!r}")
    data = json.loads(cleaned[start : end + 1])

    allowed = {
        "customer_name", "company", "phone", "email",
        "departure_airport", "arrival_airport",
        "departure_date", "passengers", "aircraft_category", "flight_hours",
    }
    fields: dict = {k: v for k, v in data.items() if k in allowed}

    # Coerce numeric fields - weaker models sometimes return them as strings.
    for key, caster in (("passengers", int), ("flight_hours", float)):
        value = fields.get(key)
        if isinstance(value, str):
            try:
                fields[key] = caster(re.sub(r"[^\d.]", "", value))
            except ValueError:
                fields[key] = None

    # Weaker models often anchor dates to their training year. Charter requests
    # are always future-dated, so roll past dates forward to the next occurrence.
    from datetime import date

    raw_date = fields.get("departure_date")
    if isinstance(raw_date, str):
        m = re.match(r"(\d{4})-(\d{2})-(\d{2})", raw_date)
        if m:
            year, month, day = int(m.group(1)), int(m.group(2)), int(m.group(3))
            today = date.today()
            try:
                when = date(year, month, day)
                while when < today:
                    year += 1
                    when = date(year, month, day)
                fields["departure_date"] = when.isoformat()
            except ValueError:
                pass

    return AIExtractionResult(**fields, raw_notes=original_text.strip())
