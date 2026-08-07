"""Authentication backed by Supabase Auth, with an approval gate on top.

Signup creates a real Supabase Auth user plus a `profiles` row with
approved = false. Passwords are never stored or hashed by us — Supabase Auth
owns them. A user cannot sign in until a sales executive approves them.

The admin account from backend/.env (SALES_EMAIL / SALES_PASSWORD) is seeded
on first use so there's someone able to approve the very first signup.
"""
from __future__ import annotations

import logging
import os
import secrets
from datetime import datetime, timezone

from backend.db import get_client, is_configured, new_client
from backend.models.schemas import LoginResponse, UserProfile

logger = logging.getLogger(__name__)

# Opaque session token -> the signed-in user's email. Kept in memory: tokens
# are short-lived by nature and a restart simply asks people to sign in again.
_sessions: dict[str, dict] = {}

_admin_seeded = False


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _profile_from_row(row: dict) -> UserProfile:
    return UserProfile(
        id=str(row.get("id", "")),
        email=row.get("email", ""),
        name=row.get("name", "") or "",
        post=row.get("post", "") or "",
        role=row.get("role", "sales") or "sales",
        approved=bool(row.get("approved")),
        created_at=str(row.get("created_at") or ""),
        approved_at=str(row["approved_at"]) if row.get("approved_at") else None,
        approved_by=row.get("approved_by"),
    )


def _find_auth_user_by_email(client, email: str):
    """Supabase's admin API has no direct get-by-email, so page through users."""
    email = email.strip().lower()
    page = 1
    while page <= 20:  # generous ceiling; avoids an unbounded loop
        resp = client.auth.admin.list_users(page=page, per_page=200)
        users = resp if isinstance(resp, list) else getattr(resp, "users", []) or []
        if not users:
            return None
        for user in users:
            if (getattr(user, "email", "") or "").strip().lower() == email:
                return user
        if len(users) < 200:
            return None
        page += 1
    return None


def ensure_admin_seeded() -> None:
    """Creates the .env admin as an approved user if they don't exist yet, so
    there's always someone who can approve the first real signup."""
    global _admin_seeded
    if _admin_seeded or not is_configured():
        return

    email = os.getenv("SALES_EMAIL", "").strip().lower()
    password = os.getenv("SALES_PASSWORD", "")
    if not email or not password:
        _admin_seeded = True
        return

    client = get_client()
    try:
        existing = client.table("profiles").select("*").eq("email", email).limit(1).execute()
        if existing.data:
            # Keep the bootstrap account usable as an approver...
            client.table("profiles").update({"role": "admin", "approved": True}).eq("email", email).execute()
            # ...and keep SALES_PASSWORD authoritative. Supabase Auth stores
            # the password set when the user was created, so without this a
            # changed SALES_PASSWORD is silently ignored and the admin is
            # locked out with a confusing "invalid password".
            try:
                client.auth.admin.update_user_by_id(existing.data[0]["id"], {"password": password})
            except Exception:
                logger.exception("Could not sync the admin password from SALES_PASSWORD")
            _admin_seeded = True
            return

        auth_user = _find_auth_user_by_email(client, email)
        if auth_user is None:
            created = client.auth.admin.create_user(
                {"email": email, "password": password, "email_confirm": True}
            )
            auth_user = created.user
        else:
            # Auth user exists but has no profile — reset to the configured
            # password so the two can't drift apart.
            client.auth.admin.update_user_by_id(str(auth_user.id), {"password": password})

        client.table("profiles").upsert(
            {
                "id": str(auth_user.id),
                "email": email,
                "name": os.getenv("SALES_NAME", "Sales Executive"),
                "post": "Sales Executive",
                "role": "admin",
                "approved": True,
                "approved_at": _now(),
                "approved_by": "system",
            }
        ).execute()
        logger.info("Seeded admin account %s", email)
        _admin_seeded = True
    except Exception:
        # Deliberately do NOT set _admin_seeded here: a transient failure
        # (network blip, cold project) should be retried on the next attempt
        # rather than leaving the app permanently without an admin.
        logger.exception("Could not seed the admin account; will retry")


class AuthError(Exception):
    """Login/signup failure with a message safe to show the user."""

    def __init__(self, message: str, *, pending: bool = False):
        super().__init__(message)
        self.message = message
        self.pending = pending


def sign_up(*, name: str, post: str, email: str, password: str) -> None:
    """Creates the auth user and an unapproved profile. Raises AuthError if
    the email is already registered."""
    ensure_admin_seeded()
    client = get_client()
    email = email.strip().lower()

    existing = client.table("profiles").select("id").eq("email", email).limit(1).execute()
    if existing.data:
        raise AuthError("An account with that email already exists.")

    try:
        created = client.auth.admin.create_user(
            {"email": email, "password": password, "email_confirm": True}
        )
    except Exception as exc:  # noqa: BLE001 - surfaced to the user as-is
        raise AuthError("Could not create that account. Try a different email.") from exc

    client.table("profiles").insert(
        {
            "id": str(created.user.id),
            "email": email,
            "name": name.strip(),
            "post": post.strip(),
            "role": "sales",
            "approved": False,
        }
    ).execute()


def authenticate(email: str, password: str) -> LoginResponse:
    """Verifies credentials with Supabase Auth, then enforces the approval
    gate. Raises AuthError on any failure."""
    ensure_admin_seeded()
    email = email.strip().lower()

    # Password check runs on a throwaway client — see new_client()'s docstring:
    # signing in downgrades that client's DB access to the user's own JWT, so
    # the shared service-role client must not be used for it.
    try:
        new_client().auth.sign_in_with_password({"email": email, "password": password})
    except Exception as exc:  # noqa: BLE001 - never leak which half was wrong
        raise AuthError("Invalid email or password.") from exc

    client = get_client()
    result = client.table("profiles").select("*").eq("email", email).limit(1).execute()
    if not result.data:
        raise AuthError("No profile found for that account. Contact your administrator.")

    profile = _profile_from_row(result.data[0])
    if not profile.approved:
        raise AuthError(
            "Your account is still awaiting approval by a sales executive.",
            pending=True,
        )

    token = secrets.token_urlsafe(32)
    _sessions[token] = {"email": profile.email, "role": profile.role, "name": profile.name}
    return LoginResponse(
        token=token,
        name=profile.name or profile.email,
        email=profile.email,
        role=profile.role,
        post=profile.post,
    )


def get_session(token: str) -> dict | None:
    return _sessions.get(token)


def is_valid_token(token: str) -> bool:
    return token in _sessions


def list_profiles(*, pending_only: bool = False) -> list[UserProfile]:
    client = get_client()
    query = client.table("profiles").select("*").order("created_at", desc=True)
    if pending_only:
        query = query.eq("approved", False)
    return [_profile_from_row(row) for row in query.execute().data or []]


def set_approval(user_id: str, *, approved: bool, approved_by: str) -> UserProfile | None:
    client = get_client()
    payload = {
        "approved": approved,
        "approved_at": _now() if approved else None,
        "approved_by": approved_by if approved else None,
    }
    result = client.table("profiles").update(payload).eq("id", user_id).execute()
    return _profile_from_row(result.data[0]) if result.data else None


def delete_profile(user_id: str) -> bool:
    """Rejects a signup outright — removes both the profile and the auth user."""
    client = get_client()
    result = client.table("profiles").delete().eq("id", user_id).execute()
    if not result.data:
        return False
    try:
        client.auth.admin.delete_user(user_id)
    except Exception:
        logger.exception("Profile %s deleted but its auth user could not be removed", user_id)
    return True
