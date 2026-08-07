"""Pydantic models shared across the API."""
from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class GalleryImage(BaseModel):
    url: str
    caption: str = ""


class Aircraft(BaseModel):
    id: str
    name: str
    manufacturer: str
    category: str
    hourly_rate: float
    max_passengers: int
    max_range_nm: int
    cruise_speed_kt: int
    image: str
    accent: str
    description: str
    gallery: list[GalleryImage] = Field(default_factory=list)


class AircraftUpdateRequest(BaseModel):
    name: Optional[str] = None
    manufacturer: Optional[str] = None
    category: Optional[str] = None
    hourly_rate: Optional[float] = None
    max_passengers: Optional[int] = None
    max_range_nm: Optional[int] = None
    cruise_speed_kt: Optional[int] = None
    description: Optional[str] = None
    image: Optional[str] = None
    gallery: Optional[list[GalleryImage]] = None


class AircraftCreateRequest(BaseModel):
    name: str
    manufacturer: str = ""
    category: str = ""
    hourly_rate: float = 0
    max_passengers: int = 1
    max_range_nm: int = 0
    cruise_speed_kt: int = 0
    description: str = ""
    image: str = ""
    accent: str = "#2d67b2"
    gallery: list[GalleryImage] = Field(default_factory=list)


class AircraftImageUploadResponse(BaseModel):
    path: str


class CustomerInfo(BaseModel):
    customer_name: str = ""
    company: str = ""
    phone: str = ""
    email: str = ""


class FlightInfo(BaseModel):
    departure_airport: str = ""
    arrival_airport: str = ""
    departure_date: Optional[str] = None
    passengers: int = 1
    aircraft_category: str = ""
    flight_hours: float = 1.0


class Charges(BaseModel):
    hourly_rate: float = 0
    landing_charges: float = 0
    handling_charges: float = 0
    fuel_charges: float = 0
    parking_charges: float = 0
    gst_percent: float = 5
    discount: float = 0
    currency: str = "USD"


class QuoteRequest(BaseModel):
    customer: CustomerInfo
    flight: FlightInfo
    charges: Charges
    aircraft_id: Optional[str] = None
    notes: str = ""
    terms: Optional[str] = None
    prepared_by: Optional[str] = None


class PricingBreakdown(BaseModel):
    flight_cost: float
    landing_charges: float
    handling_charges: float
    fuel_charges: float
    parking_charges: float
    subtotal: float
    gst_amount: float
    discount: float
    grand_total: float


class AIExtractionRequest(BaseModel):
    text: str = Field(..., min_length=5)


class AIExtractionResult(BaseModel):
    customer_name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    departure_airport: Optional[str] = None
    arrival_airport: Optional[str] = None
    departure_date: Optional[str] = None
    passengers: Optional[int] = None
    aircraft_category: Optional[str] = None
    flight_hours: Optional[float] = None
    raw_notes: Optional[str] = None


class GeneratePdfRequest(BaseModel):
    quote: QuoteRequest
    quote_id: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    name: str
    email: str
    role: str = "sales"


class CustomerRecord(BaseModel):
    id: str
    name: str
    company: str = ""
    phone: str = ""
    email: str = ""
    status: str = "New"
    quote_count: int = 0
    total_value: float = 0
    currency: str = "USD"
    last_quote_date: str = ""


class CustomerUpdateRequest(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None
    quote_count: Optional[int] = None
    total_value: Optional[float] = None
    currency: Optional[str] = None
    last_quote_date: Optional[str] = None


class CustomerCreateRequest(BaseModel):
    """Adding a customer by hand from the Customers page, with no quote behind it."""
    name: str
    company: str = ""
    phone: str = ""
    email: str = ""
    status: str = "New"


class CustomerFromQuoteRequest(BaseModel):
    """Explicitly add the customer behind a just-generated quote to the
    directory — the salesperson opts in from the quote page."""
    customer: CustomerInfo
    total_value: float = 0
    currency: str = "USD"
