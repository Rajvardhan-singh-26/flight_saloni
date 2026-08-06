"""All API routes for the charter quotation MVP."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from backend.models.schemas import (
    AIExtractionRequest,
    AIExtractionResult,
    Aircraft,
    GeneratePdfRequest,
    LoginRequest,
    LoginResponse,
    PricingBreakdown,
    QuoteRequest,
)
from backend.services.auth import authenticate
from backend.pdf.generator import generate_quote_pdf
from backend.services.aircraft_service import get_aircraft_by_id, get_all_aircraft
from backend.services.ai_extraction import extract_charter_details
from backend.services.pricing import calculate_pricing
from backend.services.quote_store import get_quote, new_quote_id, save_quote

router = APIRouter()


@router.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    session = authenticate(payload.email, payload.password)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return session


@router.get("/aircraft", response_model=list[Aircraft])
def list_aircraft() -> list[Aircraft]:
    return get_all_aircraft()


@router.get("/aircraft/{aircraft_id}", response_model=Aircraft)
def read_aircraft(aircraft_id: str) -> Aircraft:
    aircraft = get_aircraft_by_id(aircraft_id)
    if not aircraft:
        raise HTTPException(status_code=404, detail="Aircraft not found")
    return aircraft


@router.post("/ai/extract", response_model=AIExtractionResult)
async def ai_extract(payload: AIExtractionRequest) -> AIExtractionResult:
    return await extract_charter_details(payload.text)


@router.post("/pricing/calculate", response_model=PricingBreakdown)
def calculate(quote: QuoteRequest) -> PricingBreakdown:
    return calculate_pricing(quote.flight, quote.charges)


@router.post("/quotes/pdf")
def generate_pdf(payload: GeneratePdfRequest):
    quote = payload.quote
    pricing = calculate_pricing(quote.flight, quote.charges)
    aircraft = get_aircraft_by_id(quote.aircraft_id) if quote.aircraft_id else None
    quote_id = payload.quote_id or new_quote_id()

    pdf_bytes = generate_quote_pdf(quote=quote, aircraft=aircraft, pricing=pricing, quote_id=quote_id)
    save_quote(quote_id, quote, pricing, pdf_bytes)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="Quote-{quote_id}.pdf"',
            "X-Quote-Id": quote_id,
        },
    )


@router.get("/quotes/{quote_id}/pdf")
def fetch_pdf(quote_id: str):
    record = get_quote(quote_id)
    if not record:
        raise HTTPException(status_code=404, detail="Quote not found")
    return Response(
        content=record.pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="Quote-{quote_id}.pdf"'},
    )
