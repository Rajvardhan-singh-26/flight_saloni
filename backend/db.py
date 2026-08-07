"""Supabase client.

The backend is the only thing that talks to Supabase, and it does so with the
service-role key — which bypasses Row Level Security. That key must never
reach the browser; the frontend only ever calls this FastAPI app.

If the credentials are missing the app still boots (so the PDF/quote demo and
the API docs keep working); anything that needs the database raises a clear
error instead of failing with an obscure NoneType crash.
"""
from __future__ import annotations

import os
from functools import lru_cache

from supabase import Client, create_client


class SupabaseNotConfigured(RuntimeError):
    """Raised when a DB-backed feature is used without credentials set."""

    def __init__(self) -> None:
        super().__init__(
            "Supabase is not configured. Set SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY in backend/.env "
            "(Supabase dashboard → Project Settings → API)."
        )


def is_configured() -> bool:
    return bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_ROLE_KEY"))


@lru_cache(maxsize=1)
def get_client() -> Client:
    """Long-lived service-role client used for all database access."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SupabaseNotConfigured
    return create_client(url, key)


def new_client() -> Client:
    """A throwaway client, deliberately NOT cached.

    signing in with a password mutates the client's auth state — the PostgREST
    sub-client swaps the service-role key for the user's own JWT, at which
    point Row Level Security applies and every query silently returns nothing.
    Password checks therefore run on their own short-lived client so the
    shared service-role client above is never downgraded.
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SupabaseNotConfigured
    return create_client(url, key)
