"""FastAPI entrypoint for the Carewell Aviation Charter Quotation MVP backend."""
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load secrets (sales credentials, Supabase keys, OpenRouter key) from backend/.env
load_dotenv(Path(__file__).resolve().parent / ".env")

from backend.api.routes import router  # noqa: E402 - needs env loaded first

app = FastAPI(
    title="Carewell Aviation Charter Quotation API",
    description="Backend for the private charter flight quotation MVP.",
    version="1.0.0",
)

# The frontend is deployed separately (Vercel), so it calls this API cross-origin.
# CORS_ORIGINS is a comma-separated allowlist, e.g.
#   https://carewell.vercel.app,https://carewell-git-main-you.vercel.app
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
