"""Loads and serves the in-memory aircraft catalogue from the sample JSON file."""
from __future__ import annotations

import json
import re
import threading
from functools import lru_cache
from pathlib import Path

from backend.models.schemas import Aircraft, AircraftCreateRequest

DATA_PATH = Path(__file__).resolve().parent.parent / "sample_data" / "aircraft.json"
_write_lock = threading.Lock()


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    return slug or "aircraft"


@lru_cache(maxsize=1)
def get_all_aircraft() -> list[Aircraft]:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return [Aircraft(**item) for item in raw]


def get_aircraft_by_id(aircraft_id: str) -> Aircraft | None:
    for aircraft in get_all_aircraft():
        if aircraft.id == aircraft_id:
            return aircraft
    return None


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
    """Applies a partial update to one aircraft's fields and persists the
    full catalogue back to aircraft.json, so the change is shared across
    every future quote and page load. Raises KeyError if the id is unknown."""
    updates = {
        "name": name,
        "manufacturer": manufacturer,
        "category": category,
        "hourly_rate": hourly_rate,
        "max_passengers": max_passengers,
        "max_range_nm": max_range_nm,
        "cruise_speed_kt": cruise_speed_kt,
        "description": description,
        "image": image,
        "gallery": gallery,
    }
    with _write_lock:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            raw = json.load(f)

        target = next((item for item in raw if item["id"] == aircraft_id), None)
        if target is None:
            raise KeyError(aircraft_id)

        for key, value in updates.items():
            if value is not None:
                target[key] = value

        tmp_path = DATA_PATH.with_suffix(".json.tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(raw, f, indent=2, ensure_ascii=False)
            f.write("\n")
        tmp_path.replace(DATA_PATH)

        get_all_aircraft.cache_clear()
        return Aircraft(**target)


def create_aircraft(payload: AircraftCreateRequest) -> Aircraft:
    """Adds a brand-new aircraft to the fleet catalogue, generating a unique
    id from its name, and persists it to aircraft.json."""
    with _write_lock:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            raw = json.load(f)

        existing_ids = {item["id"] for item in raw}
        base_slug = _slugify(payload.name)
        new_id = base_slug
        suffix = 2
        while new_id in existing_ids:
            new_id = f"{base_slug}-{suffix}"
            suffix += 1

        record = {"id": new_id, **payload.model_dump()}
        raw.append(record)

        tmp_path = DATA_PATH.with_suffix(".json.tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(raw, f, indent=2, ensure_ascii=False)
            f.write("\n")
        tmp_path.replace(DATA_PATH)

        get_all_aircraft.cache_clear()
        return Aircraft(**record)
