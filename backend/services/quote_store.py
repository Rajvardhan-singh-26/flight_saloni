"""In-memory store for generated quotes/PDFs. No database needed for the MVP."""
from __future__ import annotations

import uuid
from dataclasses import dataclass

from backend.models.schemas import PricingBreakdown, QuoteRequest


@dataclass
class StoredQuote:
    quote_id: str
    quote: QuoteRequest
    pricing: PricingBreakdown
    pdf_bytes: bytes


_store: dict[str, StoredQuote] = {}


def new_quote_id() -> str:
    """Matches the design's reference format, e.g. QT-2026-0042."""
    from datetime import date

    seq = int(uuid.uuid4().hex[:4], 16) % 9000 + 1000
    return f"QT-{date.today().year}-{seq}"


def save_quote(quote_id: str, quote: QuoteRequest, pricing: PricingBreakdown, pdf_bytes: bytes) -> StoredQuote:
    record = StoredQuote(quote_id=quote_id, quote=quote, pricing=pricing, pdf_bytes=pdf_bytes)
    _store[quote_id] = record
    return record


def get_quote(quote_id: str) -> StoredQuote | None:
    return _store.get(quote_id)
