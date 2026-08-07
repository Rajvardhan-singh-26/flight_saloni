"""FastAPI entrypoint for the Carewell Aviation Charter Quotation MVP backend."""
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load secrets (sales credentials, Supabase keys, OpenRouter key) from backend/.env
load_dotenv(Path(__file__).resolve().parent / ".env")

from backend.api.routes import router  # noqa: E402 - needs env loaded first

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("carewell.startup")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Seed/refresh the admin account at boot and report the outcome.

    Doing this at startup (rather than lazily on first login) means the
    deployment logs say plainly whether the admin exists and which email it
    uses — otherwise a mismatched SALES_EMAIL just looks like a bad password.
    """
    from backend.db import is_configured
    from backend.services.auth import ensure_admin_seeded

    if not is_configured():
        logger.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — the database is unavailable")
    else:
        email = os.getenv("SALES_EMAIL", "").strip().lower()
        if not email or not os.getenv("SALES_PASSWORD"):
            logger.error("SALES_EMAIL / SALES_PASSWORD are not set — no admin account can be created")
        else:
            logger.info("Seeding admin account for %s ...", email)
            try:
                ensure_admin_seeded()
                logger.info("Admin ready: sign in as %s with the configured SALES_PASSWORD", email)
            except Exception:
                logger.exception("Admin seeding failed")
    yield


app = FastAPI(
    title="Carewell Aviation Charter Quotation API",
    description="Backend for the private charter flight quotation MVP.",
    version="1.0.0",
    lifespan=lifespan,
)

# The frontend is deployed separately (Vercel), so it calls this API cross-origin.
# CORS_ORIGINS is a comma-separated allowlist. For this project that is:
#   https://flightcarewell.vercel.app
# Per-deployment URLs (flightcarewell-<hash>-<scope>.vercel.app) don't need
# listing — the *.vercel.app regex below covers previews.
# A wildcard is only used when nothing is configured (local dev): the CORS spec
# forbids "*" together with credentials, and browsers reject that pairing, so
# allow_credentials is switched off in that case rather than silently breaking.
_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    # Vercel preview deploys get a new subdomain each time; this keeps them working.
    allow_origin_regex=r"https://.*\.vercel\.app" if _origins else None,
    allow_credentials=bool(_origins),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Quote-Id"],
)

app.include_router(router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
