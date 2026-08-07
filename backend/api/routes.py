"""All API routes for the charter quotation MVP."""
from __future__ import annotations

import io

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image as PILImage

from backend.models.schemas import (
    AIExtractionRequest,
    AIExtractionResult,
    Aircraft,
    AircraftCreateRequest,
    AircraftImageUploadResponse,
    AircraftUpdateRequest,
    CustomerCreateRequest,
    CustomerFromQuoteRequest,
    CustomerRecord,
    CustomerUpdateRequest,
    GeneratePdfRequest,
    LoginRequest,
    LoginResponse,
    PricingBreakdown,
    QuoteRequest,
    SignupRequest,
    SignupResponse,
    UserProfile,
)
from backend.services.auth import (
    AuthError,
    authenticate,
    delete_profile,
    get_session,
    list_profiles,
    set_approval,
    sign_up,
)
from backend.pdf.generator import generate_quote_pdf
from backend.services.aircraft_service import create_aircraft, get_aircraft_by_id, get_all_aircraft, update_aircraft
from backend.services.ai_extraction import extract_charter_details
from backend.services.image_store import save_aircraft_image
from backend.services.customer_store import (
    create_customer,
    delete_customer,
    get_all_customers,
    record_quote,
    update_customer,
)
from backend.services.pricing import calculate_pricing
from backend.services.quote_store import get_quote, new_quote_id, save_quote

router = APIRouter()

MAX_GALLERY_IMAGES = 4
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def require_admin(authorization: str = Header(default="")) -> dict:
    """Guards the approval endpoints — only an approved admin may manage users."""
    token = authorization.removeprefix("Bearer ").strip()
    session = get_session(token) if token else None
    if not session:
        raise HTTPException(status_code=401, detail="Sign in to continue")
    if session.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only a sales executive can manage approvals")
    return session


@router.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    try:
        return authenticate(payload.email, payload.password)
    except AuthError as exc:
        # 403 for "waiting on approval" so the UI can tell it apart from a
        # plain bad-credentials 401 and show the right message.
        raise HTTPException(status_code=403 if exc.pending else 401, detail=exc.message) from exc


@router.post("/auth/signup", response_model=SignupResponse)
def signup(payload: SignupRequest) -> SignupResponse:
    try:
        sign_up(
            name=payload.name,
            post=payload.post,
            email=str(payload.email),
            password=payload.password,
        )
    except AuthError as exc:
        raise HTTPException(status_code=400, detail=exc.message) from exc
    return SignupResponse(email=str(payload.email))


@router.get("/auth/users", response_model=list[UserProfile])
def list_users(pending_only: bool = False, _admin: dict = Depends(require_admin)) -> list[UserProfile]:
    return list_profiles(pending_only=pending_only)


@router.post("/auth/users/{user_id}/approve", response_model=UserProfile)
def approve_user(user_id: str, admin: dict = Depends(require_admin)) -> UserProfile:
    updated = set_approval(user_id, approved=True, approved_by=admin["email"])
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated


@router.post("/auth/users/{user_id}/revoke", response_model=UserProfile)
def revoke_user(user_id: str, admin: dict = Depends(require_admin)) -> UserProfile:
    if admin.get("email") and admin["email"] == _email_of(user_id):
        raise HTTPException(status_code=400, detail="You cannot revoke your own access")
    updated = set_approval(user_id, approved=False, approved_by=admin["email"])
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated


@router.delete("/auth/users/{user_id}", status_code=204)
def reject_user(user_id: str, admin: dict = Depends(require_admin)) -> Response:
    if admin.get("email") and admin["email"] == _email_of(user_id):
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    if not delete_profile(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return Response(status_code=204)


def _email_of(user_id: str) -> str | None:
    """Used to stop an admin locking themselves out."""
    return next((p.email for p in list_profiles() if p.id == user_id), None)


@router.get("/aircraft", response_model=list[Aircraft])
def list_aircraft() -> list[Aircraft]:
    return get_all_aircraft()


@router.get("/aircraft/{aircraft_id}", response_model=Aircraft)
def read_aircraft(aircraft_id: str) -> Aircraft:
    aircraft = get_aircraft_by_id(aircraft_id)
    if not aircraft:
        raise HTTPException(status_code=404, detail="Aircraft not found")
    return aircraft


@router.post("/aircraft", response_model=Aircraft)
def add_aircraft(payload: AircraftCreateRequest) -> Aircraft:
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    if len(payload.gallery) > MAX_GALLERY_IMAGES:
        raise HTTPException(status_code=400, detail=f"Gallery is limited to {MAX_GALLERY_IMAGES} images")
    return create_aircraft(payload)


@router.patch("/aircraft/{aircraft_id}", response_model=Aircraft)
def patch_aircraft(aircraft_id: str, payload: AircraftUpdateRequest) -> Aircraft:
    if not get_aircraft_by_id(aircraft_id):
        raise HTTPException(status_code=404, detail="Aircraft not found")
    if payload.gallery is not None and len(payload.gallery) > MAX_GALLERY_IMAGES:
        raise HTTPException(status_code=400, detail=f"Gallery is limited to {MAX_GALLERY_IMAGES} images")
    gallery = [g.model_dump() for g in payload.gallery] if payload.gallery is not None else None
    return update_aircraft(
        aircraft_id,
        name=payload.name,
        manufacturer=payload.manufacturer,
        category=payload.category,
        hourly_rate=payload.hourly_rate,
        max_passengers=payload.max_passengers,
        max_range_nm=payload.max_range_nm,
        cruise_speed_kt=payload.cruise_speed_kt,
        description=payload.description,
        image=payload.image,
        gallery=gallery,
    )


@router.post("/aircraft/{aircraft_id}/images", response_model=AircraftImageUploadResponse)
async def upload_aircraft_image(aircraft_id: str, file: UploadFile = File(...)) -> AircraftImageUploadResponse:
    if not get_aircraft_by_id(aircraft_id):
        raise HTTPException(status_code=404, detail="Aircraft not found")
    if file.content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WEBP or GIF images are allowed")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds the 5MB upload limit")

    try:
        image = PILImage.open(io.BytesIO(contents))
        image.load()
        image = image.convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image")

    # Downsize before saving so gallery photos stay small in storage and in the PDF.
    image.thumbnail((1600, 1600))
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=85)

    try:
        path = save_aircraft_image(aircraft_id, buf.getvalue())
    except Exception as exc:  # noqa: BLE001 - surfaced as a clean 502
        raise HTTPException(status_code=502, detail="Could not store the uploaded image") from exc

    return AircraftImageUploadResponse(path=path)


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
    # The customer is NOT auto-added here — the salesperson is prompted on the
    # quote page and opts in via POST /customers/from-quote.

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


@router.get("/customers", response_model=list[CustomerRecord])
def list_customers() -> list[CustomerRecord]:
    return [CustomerRecord(**vars(c)) for c in get_all_customers()]


@router.post("/customers", response_model=CustomerRecord)
def add_customer(payload: CustomerCreateRequest) -> CustomerRecord:
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    created = create_customer(
        name=payload.name,
        company=payload.company,
        phone=payload.phone,
        email=payload.email,
        status=payload.status,
    )
    return CustomerRecord(**vars(created))


@router.post("/customers/from-quote", response_model=CustomerRecord)
def add_customer_from_quote(payload: CustomerFromQuoteRequest) -> CustomerRecord:
    created = record_quote(payload.customer, total_value=payload.total_value, currency=payload.currency)
    if not created:
        raise HTTPException(status_code=400, detail="Quote has no customer name, email or phone to save")
    return CustomerRecord(**vars(created))


@router.patch("/customers/{customer_id}", response_model=CustomerRecord)
def patch_customer(customer_id: str, payload: CustomerUpdateRequest) -> CustomerRecord:
    updated = update_customer(
        customer_id,
        name=payload.name,
        company=payload.company,
        phone=payload.phone,
        email=payload.email,
        status=payload.status,
        quote_count=payload.quote_count,
        total_value=payload.total_value,
        currency=payload.currency,
        last_quote_date=payload.last_quote_date,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Customer not found")
    return CustomerRecord(**vars(updated))


@router.delete("/customers/{customer_id}", status_code=204)
def remove_customer(customer_id: str) -> Response:
    if not delete_customer(customer_id):
        raise HTTPException(status_code=404, detail="Customer not found")
    return Response(status_code=204)
