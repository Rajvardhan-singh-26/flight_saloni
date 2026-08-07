"""Resolves where static assets (aircraft photos, uploaded gallery images)
live and are served from.

In dev, Vite serves the frontend separately from frontend/public, and the
backend reads that same folder directly — so STATIC_DIR points there.

In a built/production deploy, FastAPI serves frontend/dist directly (see
main.py). Vite copies public/ into dist/ at build time, so pointing there
keeps the seed aircraft photos AND lets new uploads land in the exact
directory actually being served, instead of a folder nobody serves.
"""
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
_DIST_DIR = _REPO_ROOT / "frontend" / "dist"
_PUBLIC_DIR = _REPO_ROOT / "frontend" / "public"

STATIC_DIR = _DIST_DIR if _DIST_DIR.is_dir() else _PUBLIC_DIR
