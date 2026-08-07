"""Customer directory, persisted in Supabase.

Records are keyed by a stable generated id (not by email/phone) so contact
details can be edited freely without orphaning the row; matching an incoming
quote to an existing customer is done by email, falling back to phone.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date

from backend.db import get_client
from backend.models.schemas import CustomerInfo

DEFAULT_STATUS = "New"
_TABLE = "customers"


@dataclass
class Customer:
    id: str
    name: str
    company: str = ""
    phone: str = ""
    email: str = ""
    status: str = DEFAULT_STATUS
    quote_count: int = 0
    # Total business done — the summed grand total of this customer's quotes,
    # expressed in `currency`.
    total_value: float = 0.0
    currency: str = "USD"
    last_quote_date: str = ""


_FIELDS = {f for f in Customer.__dataclass_fields__}


def _row_to_customer(row: dict) -> Customer:
    return Customer(**{k: v for k, v in row.items() if k in _FIELDS})


def _find_match(email: str, phone: str) -> Customer | None:
    client = get_client()
    email_key = email.strip().lower()
    phone_key = phone.strip()

    if email_key:
        found = client.table(_TABLE).select("*").ilike("email", email_key).limit(1).execute()
        if found.data:
            return _row_to_customer(found.data[0])
    if phone_key:
        found = client.table(_TABLE).select("*").eq("phone", phone_key).limit(1).execute()
        if found.data:
            return _row_to_customer(found.data[0])
    return None


def record_quote(info: CustomerInfo, *, total_value: float = 0.0, currency: str = "USD") -> Customer | None:
    """Adds (or updates) a customer from a generated quote. Returns None if
    the quote carries nothing identifiable to key a record on."""
    if not (info.customer_name.strip() or info.email.strip() or info.phone.strip()):
        return None

    client = get_client()
    today = date.today().isoformat()
    existing = _find_match(info.email, info.phone)

    if existing:
        # Summing across currencies would be meaningless, so a currency switch
        # restarts the running total rather than mixing units.
        new_total = total_value if currency != existing.currency else existing.total_value + total_value
        payload = {
            "name": info.customer_name or existing.name,
            "company": info.company or existing.company,
            "phone": info.phone or existing.phone,
            "email": info.email or existing.email,
            "quote_count": existing.quote_count + 1,
            "total_value": new_total,
            "currency": currency,
            "last_quote_date": today,
        }
        result = client.table(_TABLE).update(payload).eq("id", existing.id).execute()
        return _row_to_customer(result.data[0]) if result.data else existing

    payload = {
        "id": uuid.uuid4().hex[:10],
        "name": info.customer_name or "Unnamed Client",
        "company": info.company,
        "phone": info.phone,
        "email": info.email,
        "status": DEFAULT_STATUS,
        "quote_count": 1,
        "total_value": total_value,
        "currency": currency,
        "last_quote_date": today,
    }
    result = client.table(_TABLE).insert(payload).execute()
    return _row_to_customer(result.data[0])


def create_customer(
    *, name: str, company: str = "", phone: str = "", email: str = "", status: str = DEFAULT_STATUS
) -> Customer:
    """Adds a customer entered by hand — no quote, so no value or count yet."""
    payload = {
        "id": uuid.uuid4().hex[:10],
        "name": name.strip() or "Unnamed Client",
        "company": company.strip(),
        "phone": phone.strip(),
        "email": email.strip(),
        "status": status,
        "quote_count": 0,
        "total_value": 0,
        "currency": "USD",
        "last_quote_date": "",
    }
    result = get_client().table(_TABLE).insert(payload).execute()
    return _row_to_customer(result.data[0])


def get_all_customers() -> list[Customer]:
    result = get_client().table(_TABLE).select("*").order("last_quote_date", desc=True).execute()
    return [_row_to_customer(row) for row in result.data or []]


def get_customer(customer_id: str) -> Customer | None:
    result = get_client().table(_TABLE).select("*").eq("id", customer_id).limit(1).execute()
    return _row_to_customer(result.data[0]) if result.data else None


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
    payload = {
        key: value
        for key, value in (
            ("name", name),
            ("company", company),
            ("phone", phone),
            ("email", email),
            ("status", status),
            ("quote_count", quote_count),
            ("total_value", total_value),
            ("currency", currency),
            ("last_quote_date", last_quote_date),
        )
        if value is not None
    }
    if not payload:
        return get_customer(customer_id)

    result = get_client().table(_TABLE).update(payload).eq("id", customer_id).execute()
    return _row_to_customer(result.data[0]) if result.data else None


def delete_customer(customer_id: str) -> bool:
    result = get_client().table(_TABLE).delete().eq("id", customer_id).execute()
    return bool(result.data)
