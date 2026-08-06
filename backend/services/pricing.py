"""Pricing engine for charter quotes."""
from __future__ import annotations

from backend.models.schemas import Charges, FlightInfo, PricingBreakdown


def calculate_pricing(flight: FlightInfo, charges: Charges) -> PricingBreakdown:
    flight_cost = round(flight.flight_hours * charges.hourly_rate, 2)

    subtotal = round(
        flight_cost
        + charges.landing_charges
        + charges.handling_charges
        + charges.fuel_charges
        + charges.parking_charges,
        2,
    )

    discounted_subtotal = max(subtotal - charges.discount, 0)
    gst_amount = round(discounted_subtotal * (charges.gst_percent / 100), 2)
    grand_total = round(discounted_subtotal + gst_amount, 2)

    return PricingBreakdown(
        flight_cost=flight_cost,
        landing_charges=charges.landing_charges,
        handling_charges=charges.handling_charges,
        fuel_charges=charges.fuel_charges,
        parking_charges=charges.parking_charges,
        subtotal=subtotal,
        gst_amount=gst_amount,
        discount=charges.discount,
        grand_total=grand_total,
    )
