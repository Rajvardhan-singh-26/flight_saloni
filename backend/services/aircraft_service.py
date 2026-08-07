"""Aircraft fleet catalogue, persisted in Supabase.

On first use the table is seeded from backend/sample_data/aircraft.json so a
fresh database starts with the demo fleet. That JSON file is now only a seed —
edits are written to Supabase, which matters on hosts like Render where the
filesystem is ephemeral and wouldn't keep them.
"""
from __future__ import annotations

import json
import re
import threading
from pathlib import Path

from backend.db import get_client
from backend.models.schemas import Aircraft, AircraftCreateRequest

SEED_PATH = Path(__file__).resolve().parent.parent / "sample_data" / "aircraft.json"
_TABLE = "aircraft"
_seed_lock = threading.Lock()
_seeded = False


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    return slug or "aircraft"


def _row_to_aircraft(row: dict) -> Aircraft:
    return Aircraft(**{k: v for k, v in row.items() if k != "created_at"})


def _ensure_seeded() -> None:
    """Loads the demo fleet into an empty aircraft table, once per process."""
    global _seeded
    if _seeded:
        return
    with _seed_lock:
        if _seeded:
            return
        client = get_client()
        existing = client.table(_TABLE).select("id").limit(1).execute()
        if not existing.data and SEED_PATH.is_file():
            with open(SEED_PATH, "r", encoding="utf-8") as f:
                raw = json.load(f)
            if raw:
                client.table(_TABLE).insert(raw).execute()
        _seeded = True


def get_all_aircraft() -> list[Aircraft]:
    _ensure_seeded()
    result = get_client().table(_TABLE).select("*").order("hourly_rate").execute()
    return [_row_to_aircraft(row) for row in result.data or []]


def get_aircraft_by_id(aircraft_id: str) -> Aircraft | None:
    _ensure_seeded()
    result = get_client().table(_TABLE).select("*").eq("id", aircraft_id).limit(1).execute()
    return _row_to_aircraft(result.data[0]) if result.data else None


def update_aircraft(
    aircraft_id: str,
    *,
    name: str | None = None,
    manufacturer: str | None = None,
    category: str | None = None,
    hourly_rate: float | None = None,
    max_passengers: int | None = None,
    max_range_nm: int | None = None,
    cruise_speed_kt: int | None = None,
    description: str | None = None,
    image: str | None = None,
    gallery: list[dict] | None = None,
) -> Aircraft:
    """Applies a partial update to one aircraft. Raises KeyError if unknown."""
    _ensure_seeded()
    payload = {
        key: value
        for key, value in (
            ("name", name),
            ("manufacturer", manufacturer),
            ("category", category),
            ("hourly_rate", hourly_rate),
            ("max_passengers", max_passengers),
            ("max_range_nm", max_range_nm),
            ("cruise_speed_kt", cruise_speed_kt),
            ("description", description),
            ("image", image),
            ("gallery", gallery),
        )
        if value is not None
    }
    if not payload:
        current = get_aircraft_by_id(aircraft_id)
        if current is None:
            raise KeyError(aircraft_id)
        return current

    result = get_client().table(_TABLE).update(payload).eq("id", aircraft_id).execute()
    if not result.data:
        raise KeyError(aircraft_id)
    return _row_to_aircraft(result.data[0])


def create_aircraft(payload: AircraftCreateRequest) -> Aircraft:
    """Adds a new aircraft, generating a unique id from its name."""
    _ensure_seeded()
    client = get_client()

    existing = client.table(_TABLE).select("id").execute()
    taken = {row["id"] for row in existing.data or []}
    base_slug = _slugify(payload.name)
    new_id = base_slug
    suffix = 2
    while new_id in taken:
        new_id = f"{base_slug}-{suffix}"
        suffix += 1

    record = {"id": new_id, **payload.model_dump()}
    # gallery is a list of GalleryImage models — send plain dicts to Postgres.
    record["gallery"] = [dict(g) for g in record.get("gallery", [])]
    result = client.table(_TABLE).insert(record).execute()
    return _row_to_aircraft(result.data[0])
