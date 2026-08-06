"""Abstract base class every LLM extraction provider must implement."""
from __future__ import annotations

from abc import ABC, abstractmethod

from backend.models.schemas import AIExtractionResult


class LLMProvider(ABC):
    """Common interface so the extraction endpoint can swap providers freely."""

    name: str = "base"

    @abstractmethod
    async def extract(self, text: str) -> AIExtractionResult:
        """Extract structured charter details from free-form request text."""
        raise NotImplementedError


EXTRACTION_SYSTEM_PROMPT = """You are a flight operations assistant for a private jet charter \
company. Extract structured booking details from the customer's free-form request.

Return ONLY a JSON object with these exact keys (use null for anything not mentioned):
- customer_name (string)
- departure_airport (string, city or airport name)
- arrival_airport (string, city or airport name)
- departure_date (string, formatted YYYY-MM-DD if a year is inferable, otherwise as written)
- passengers (integer)
- aircraft_category (one of: "Light Jet", "Turboprop", "Midsize Jet", "Super Midsize Jet", \
"Heavy Jet", "Ultra Long Range", or null if not mentioned)
- flight_hours (number, estimated flying time in hours)

Do not include any commentary, markdown, or explanation - JSON only.
"""


def extraction_system_prompt() -> str:
    """System prompt with today's date so relative dates resolve to the right year."""
    from datetime import date

    return EXTRACTION_SYSTEM_PROMPT + f"\nToday's date is {date.today().isoformat()}."
