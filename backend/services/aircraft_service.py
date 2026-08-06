"""Loads and serves the in-memory aircraft catalogue from the sample JSON file."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from backend.models.schemas import Aircraft

DATA_PATH = Path(__file__).resolve().parent.parent / "sample_data" / "aircraft.json"


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
