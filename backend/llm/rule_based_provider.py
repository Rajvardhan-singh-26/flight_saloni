"""Deterministic, dependency-free extraction provider.

Used as the default provider so the demo works instantly with no API keys.
Uses regex heuristics tuned for typical charter request phrasing.
"""
from __future__ import annotations

import re
from datetime import date

from backend.llm.base import LLMProvider
from backend.models.schemas import AIExtractionResult

MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9, "oct": 10,
    "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}

WORD_NUMBERS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
    "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
}

CATEGORY_KEYWORDS = [
    ("ultra long range", "Ultra Long Range"),
    ("ultra-long range", "Ultra Long Range"),
    ("heavy jet", "Heavy Jet"),
    ("large jet", "Heavy Jet"),
    ("super midsize", "Super Midsize Jet"),
    ("super-midsize", "Super Midsize Jet"),
    ("midsize", "Midsize Jet"),
    ("mid-size", "Midsize Jet"),
    ("turboprop", "Turboprop"),
    ("turbo prop", "Turboprop"),
    ("light jet", "Light Jet"),
    ("light-jet", "Light Jet"),
]


class RuleBasedProvider(LLMProvider):
    name = "rule_based"

    async def extract(self, text: str) -> AIExtractionResult:
        return AIExtractionResult(
            customer_name=self._extract_customer_name(text),
            company=self._extract_company(text),
            phone=self._extract_phone(text),
            email=self._extract_email(text),
            departure_airport=self._extract_route(text)[0],
            arrival_airport=self._extract_route(text)[1],
            departure_date=self._extract_date(text),
            passengers=self._extract_passengers(text),
            aircraft_category=self._extract_category(text),
            flight_hours=self._extract_hours(text),
            raw_notes=text.strip(),
        )

    @staticmethod
    def _extract_email(text: str) -> str | None:
        m = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
        return m.group(0).rstrip(".,;") if m else None

    @staticmethod
    def _extract_phone(text: str) -> str | None:
        # Optional +country code, then 7-15 digits allowing spaces/dashes/parens.
        m = re.search(r"(\+?\d[\d\s\-()]{6,18}\d)", text)
        if not m:
            return None
        candidate = m.group(1).strip().rstrip(".,;")
        # Reject matches that are really just a long run of digits from
        # something else (e.g. a range in nm) — real numbers have 7+ digits.
        if len(re.sub(r"\D", "", candidate)) < 7:
            return None
        return candidate

    @staticmethod
    def _extract_company(text: str) -> str | None:
        m = re.search(
            r"\b(?:company|organisation|organization|firm|corporate account)\s*(?:name)?\s*[:\-]?\s*"
            r"([A-Z][\w&.'-]*(?:\s+[A-Z][\w&.'-]*)*)",
            text,
        )
        if m:
            return m.group(1).strip().rstrip(".,;:")
        # "... from Acme Industries", "... at Acme Corp" — match a capitalised
        # phrase ending in a common company suffix.
        m = re.search(
            r"\b([A-Z][\w&.'-]*(?:\s+[A-Z][\w&.'-]*)*\s+"
            r"(?:Industries|Corp|Corporation|Inc|Ltd|LLC|LLP|Limited|Holdings|Group|Ventures|Partners|Technologies|Aviation))\b",
            text,
        )
        return m.group(1).strip().rstrip(".,;:") if m else None

    @staticmethod
    def _extract_customer_name(text: str) -> str | None:
        m = re.search(
            r"\b(Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Capt\.?)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)",
            text,
        )
        if m:
            return f"{m.group(1).rstrip('.')} {m.group(2)}"
        m = re.search(r"^([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)\s+(?:requires|needs|wants|is requesting)", text)
        if m:
            return m.group(1)
        return None

    @staticmethod
    def _extract_route(text: str) -> tuple[str | None, str | None]:
        m = re.search(
            r"\bfrom\s+([A-Z][a-zA-Z\s]*?)\s+to\s+([A-Z][a-zA-Z\s]*?)(?:\s+on\b|\s+for\b|\s+with\b|,|\.|$)",
            text,
        )
        if m:
            return m.group(1).strip(), m.group(2).strip()
        return None, None

    @staticmethod
    def _extract_passengers(text: str) -> int | None:
        m = re.search(r"(\d+)\s*(?:passengers?|pax|people|guests?)", text, re.IGNORECASE)
        if m:
            return int(m.group(1))
        m = re.search(
            r"\b(" + "|".join(WORD_NUMBERS.keys()) + r")\s*(?:passengers?|pax|people|guests?)",
            text,
            re.IGNORECASE,
        )
        if m:
            return WORD_NUMBERS[m.group(1).lower()]
        return None

    @staticmethod
    def _extract_category(text: str) -> str | None:
        lowered = text.lower()
        for keyword, category in CATEGORY_KEYWORDS:
            if keyword in lowered:
                return category
        return None

    @staticmethod
    def _extract_hours(text: str) -> float | None:
        m = re.search(
            r"(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b(?:\s+(?:of\s+)?(?:flying|flight)\s*time)?",
            text,
            re.IGNORECASE,
        )
        if m:
            return float(m.group(1))
        return None

    @staticmethod
    def _extract_date(text: str) -> str | None:
        m = re.search(
            r"\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:\s+(\d{4}))?\b",
            text,
        )
        if m:
            day = int(m.group(1))
            month_name = m.group(2).lower()
            if month_name in MONTHS:
                month = MONTHS[month_name]
                year = int(m.group(3)) if m.group(3) else date.today().year
                try:
                    return date(year, month, day).isoformat()
                except ValueError:
                    return None
        m = re.search(r"\b([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b", text)
        if m:
            month_name = m.group(1).lower()
            if month_name in MONTHS:
                month = MONTHS[month_name]
                day = int(m.group(2))
                year = int(m.group(3)) if m.group(3) else date.today().year
                try:
                    return date(year, month, day).isoformat()
                except ValueError:
                    return None
        return None
