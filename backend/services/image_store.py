"""Where uploaded aircraft photos are stored.

Locally there's a single repo checkout, so writing into frontend/public keeps
the dev server serving them straight away.

In production the frontend (Vercel) and backend (Render) are separate hosts:
files written to Render's disk aren't served by Vercel, and Render's filesystem
is wiped on every deploy — so uploads would vanish. Supabase Storage is used
instead, returning a public https URL that both the browser and the PDF
generator can load from anywhere.
"""
from __future__ import annotations

import logging
import os
import uuid

from backend.db import get_client, is_configured
from backend.paths import STATIC_DIR

logger = logging.getLogger(__name__)

BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "aircraft")
_bucket_ready = False


def _ensure_bucket() -> None:
    """Creates the public bucket on first upload if it doesn't exist yet."""
    global _bucket_ready
    if _bucket_ready:
        return
    client = get_client()
    try:
        existing = {b.name for b in client.storage.list_buckets()}
        if BUCKET not in existing:
            client.storage.create_bucket(
                BUCKET, options={"public": True, "file_size_limit": 5 * 1024 * 1024}
            )
            logger.info("Created public storage bucket %r", BUCKET)
    except Exception:
        # Most likely it already exists (races between workers) — uploading
        # will surface any genuine problem.
        logger.exception("Could not verify storage bucket %r", BUCKET)
    _bucket_ready = True


def use_remote_storage() -> bool:
    """Remote storage whenever Supabase is configured; local disk otherwise."""
    return is_configured()


def save_aircraft_image(aircraft_id: str, jpeg_bytes: bytes) -> str:
    """Persists an uploaded photo and returns the path/URL to reference it by.

    Returns a public https URL when using Supabase Storage, or a site-relative
    /aircraft/gallery/... path in local development.
    """
    filename = f"{aircraft_id}-{uuid.uuid4().hex[:8]}.jpg"

    if use_remote_storage():
        _ensure_bucket()
        client = get_client()
        key = f"gallery/{filename}"
        client.storage.from_(BUCKET).upload(
            key,
            jpeg_bytes,
            {"content-type": "image/jpeg", "cache-control": "31536000"},
        )
        return client.storage.from_(BUCKET).get_public_url(key)

    gallery_dir = STATIC_DIR / "aircraft" / "gallery"
    gallery_dir.mkdir(parents=True, exist_ok=True)
    (gallery_dir / filename).write_bytes(jpeg_bytes)
    return f"/aircraft/gallery/{filename}"
