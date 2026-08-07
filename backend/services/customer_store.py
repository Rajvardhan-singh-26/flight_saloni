"""In-memory customer directory. No database needed for the MVP.

Records are keyed by a stable generated id (not by email/phone) so a
salesperson can freely edit contact details without orphaning the record;
matching an incoming quote to an existing customer is done by scanning for
a matching email, falling back to phone.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import date

from backend.models.schemas import CustomerInfo

DEFAULT_STATUS = "New"


@dataclass
class Customer:
    id: str
    name: str
    company: str = ""
    phone: str = ""
    email: str = ""
    status: str = DEFAULT_STATUS
    quote_count: int = 0
    # Total business done — the summed grand total of every quote recorded
    # against this customer, in `currency`.
    total_value: float = 0.0
    currency: str = "USD"
    last_quote_date: str = field(default="")


_store: dict[str, Customer] = {}


def _find_match(email: str, phone: str) -> Customer | None:
    email_key = email.strip().lower()
    phone_key = phone.strip()
    for customer in _store.values():
        if email_key and customer.email.strip().lower() == email_key:
            return customer
        if phone_key and customer.phone.strip() == phone_key:
            return customer
    return None


def record_quote(info: CustomerInfo, *, total_value: float = 0.0, currency: str = "USD") -> Customer | None:
    """Adds (or updates) a customer from a generated quote. Returns None if
    the quote carries nothing identifiable to key a record on."""
    if not (info.customer_name.strip() or info.email.strip() or info.phone.strip()):
        return None

    today = date.today().isoformat()
    existing = _find_match(info.email, info.phone)
    if existing:
        existing.name = info.customer_name or existing.name
        existing.company = info.company or existing.company
        existing.phone = info.phone or existing.phone
        existing.email = info.email or existing.email
        existing.quote_count += 1
        # Summing across currencies would be meaningless, so a currency
        # switch restarts the running total rather than mixing units.
        if currency != existing.currency:
            existing.currency = currency
            existing.total_value = total_value
        else:
            existing.total_value += total_value
        existing.last_quote_date = today
        return existing

    customer = Customer(
        id=uuid.uuid4().hex[:10],
        name=info.customer_name or "Unnamed Client",
        company=info.company,
        phone=info.phone,
        email=info.email,
        quote_count=1,
        total_value=total_value,
        currency=currency,
        last_quote_date=today,
    )
    _store[customer.id] = customer
    return customer


def create_customer(
    *, name: str, company: str = "", phone: str = "", email: str = "", status: str = DEFAULT_STATUS
) -> Customer:
    """Adds a customer entered by hand — no quote, so no value or count yet."""
    customer = Customer(
        id=uuid.uuid4().hex[:10],
        name=name.strip() or "Unnamed Client",
        company=company.strip(),
        phone=phone.strip(),
        email=email.strip(),
        status=status,
        last_quote_date="",
    )
    _store[customer.id] = customer
    return customer


def get_all_customers() -> list[Customer]:
    return sorted(_store.values(), key=lambda c: c.last_quote_date, reverse=True)


def get_customer(customer_id: str) -> Customer | None:
    return _store.get(customer_id)


def update_customer(
    customer_id: str,
    *,
    name: str | None = None,
    company: str | None = None,
    phone: str | None = None,
    email: str | None = None,
    status: str | None = None,
    quote_count: int | None = None,
    total_value: float | None = None,
    currency: str | None = None,
    last_quote_date: str | None = None,
) -> Customer | None:
    customer = _store.get(customer_id)
    if customer is None:
        return None
    for attr, value in (
        ("name", name),
        ("company", company),
        ("phone", phone),
        ("email", email),
        ("status", status),
        ("quote_count", quote_count),
        ("total_value", total_value),
        ("currency", currency),
        ("last_quote_date", last_quote_date),
    ):
        if value is not None:
            setattr(customer, attr, value)
    return customer


def delete_customer(customer_id: str) -> bool:
    return _store.pop(customer_id, None) is not None
