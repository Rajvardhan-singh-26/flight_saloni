"""Minimal salesperson auth for the MVP.

Credentials live in backend/.env (never in code). Sessions are opaque
random tokens held in memory - enough to demo a login flow without a
database or JWT infrastructure.
"""
from __future__ import annotations

import hmac
import os
import secrets

from backend.models.schemas import LoginResponse

# token -> salesperson email
_sessions: dict[str, str] = {}


def authenticate(email: str, password: str) -> LoginResponse | None:
    expected_email = os.getenv("SALES_EMAIL", "")
    expected_password = os.getenv("SALES_PASSWORD", "")
    if not expected_email or not expected_password:
        return None

    email_ok = hmac.compare_digest(email.strip().lower(), expected_email.strip().lower())
    password_ok = hmac.compare_digest(password, expected_password)
    if not (email_ok and password_ok):
        return None

    token = secrets.token_urlsafe(32)
    _sessions[token] = expected_email
    return LoginResponse(
        token=token,
        name=os.getenv("SALES_NAME", "Sales Executive"),
        email=expected_email,
    )


def is_valid_token(token: str) -> bool:
    return token in _sessions
