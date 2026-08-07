"""Generated quotes, persisted in Supabase.

The PDF bytes are stored base64-encoded so a shared quote link keeps working
after a restart or redeploy (previously these lived in memory and died with
the process, breaking every link that had been sent out).
"""
from __future__ import annotations

import base64
import uuid
from dataclasses import dataclass
from datetime import date

from backend.db import get_client
from backend.models.schemas import PricingBreakdown, QuoteRequest

_TABLE = "quotes"


@dataclass
class StoredQuote:
    quote_id: str
    quote: QuoteRequest
    pricing: PricingBreakdown
    pdf_bytes: bytes


def new_quote_id() -> str:
    """Matches the design's reference format, e.g. QT-2026-0042."""
    seq = int(uuid.uuid4().hex[:4], 16) % 9000 + 1000
    return f"QT-{date.today().year}-{seq}"


def save_quote(quote_id: str, quote: QuoteRequest, pricing: PricingBreakdown, pdf_bytes: bytes) -> StoredQuote:
    get_client().table(_TABLE).upsert(
        {
            "quote_id": quote_id,
            "quote": quote.model_dump(mode="json"),
            "pricing": pricing.model_dump(mode="json"),
            "pdf_base64": base64.b64encode(pdf_bytes).decode("ascii"),
        }
    ).execute()
    return StoredQuote(quote_id=quote_id, quote=quote, pricing=pricing, pdf_bytes=pdf_bytes)


def get_quote(quote_id: str) -> StoredQuote | None:
    result = get_client().table(_TABLE).select("*").eq("quote_id", quote_id).limit(1).execute()
    if not result.data:
        return None
    row = result.data[0]
    return StoredQuote(
        quote_id=row["quote_id"],
        quote=QuoteRequest(**row["quote"]),
        pricing=PricingBreakdown(**row["pricing"]),
        pdf_bytes=base64.b64decode(row.get("pdf_base64") or ""),
    )
