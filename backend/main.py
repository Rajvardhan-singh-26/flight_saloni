"""FastAPI entrypoint for the Carewell Aviation Charter Quotation MVP backend."""
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load secrets (sales credentials, OpenRouter key) from backend/.env
load_dotenv(Path(__file__).resolve().parent / ".env")

from backend.api.routes import router  # noqa: E402 - needs env loaded first

app = FastAPI(
    title="Carewell Aviation Charter Quotation API",
    description="Backend for the private charter flight quotation MVP.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
