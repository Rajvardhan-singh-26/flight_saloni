"""Pydantic models shared across the API."""
from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


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
