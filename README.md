# Carewell Aviation — Private Charter Flight Quotation Platform (MVP)

*The Wings of Imagination.* A premium demo web app for a private charter
aviation company: a salesperson signs in, pastes a client's request, AI
extracts the details, picks an aircraft, watches the quote build itself live,
and exports a client-ready A4 PDF — all in under a minute.

**Flow:** Sales Login → Customer Request → AI Extraction → Review & Edit →
Aircraft Selection → Price Calculation → Live Quote Preview → Professional PDF

## Tech Stack

| Layer    | Stack |
|----------|-------|
| Frontend | React 19 · TypeScript · Vite · Material UI · Framer Motion · React Hook Form · Axios |
| Backend  | FastAPI · Pydantic · ReportLab (PDF) |
| AI       | **OpenRouter** (default when key set) · OpenAI · Claude · Ollama · rule-based fallback |
| Canvas   | `figma-make/` — self-contained Tailwind v4 edition for Figma Make |

No database — aircraft live in a JSON file, quotes and sessions in memory.
All secrets (sales credentials, API keys) live in `backend/.env`.

## Quick Start

### 1. Backend (port 8000)

```bash
# from the project root
python -m venv backend/.venv
backend\.venv\Scripts\activate        # Windows
pip install -r backend/requirements.txt
copy backend\.env.example backend\.env   # then edit credentials/keys
uvicorn backend.main:app --port 8000 --reload
```

API docs: http://127.0.0.1:8000/docs

### 2. Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — Vite proxies `/api/*` to the backend, so no CORS
setup is needed in dev.

## Demo Script (< 1 minute)

1. Landing page → **Generate Charter Quote** → sign in
   (default demo login: `sales@carewellaviation.com` / `carewell123`, set in `backend/.env`).
2. **AI Request** tab → click the sample sentence → **Extract with AI**.
   The form fills itself, and a matching aircraft is auto-selected.
3. **Manual Entry** tab → tweak anything; the right-hand preview updates on
   every keystroke.
4. Click a different **aircraft card** — hourly rate and pricing re-compute
   instantly.
5. **Generate Quote** → embedded PDF viewer → **Download** or **Print**.


## AI Provider Configuration

**OpenRouter is the primary provider**: set `OPENROUTER_API_KEY` and the
backend uses it automatically (one key, any model — get one at
https://openrouter.ai/keys). With no key configured, a zero-config rule-based
extractor handles typical charter phrasing so the demo still works. Any
provider failure also falls back to rule-based, so the demo never breaks.

Other providers via `LLM_PROVIDER`:

| Provider | Env vars |
|----------|----------|
| OpenRouter | `OPENROUTER_API_KEY`, optional `OPENROUTER_MODEL` (default `openai/gpt-4o-mini`) |
| OpenAI   | `LLM_PROVIDER=openai`, `OPENAI_API_KEY`, optional `OPENAI_MODEL` — plus `pip install openai` |
| Claude   | `LLM_PROVIDER=claude`, `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL` — plus `pip install anthropic` |
| Ollama   | `LLM_PROVIDER=ollama`, optional `OLLAMA_BASE_URL`, `OLLAMA_MODEL` |

## Figma Make canvas edition

`figma-make/src/App.tsx` is a fully self-contained Tailwind v4 version of the
whole app (login → landing → quote generator → print-to-PDF) for pasting into
a Figma Make project — see `figma-make/README.md`.

## Project Structure

```
backend/
  api/routes.py            # All REST endpoints
  llm/                     # base.py + rule_based / openai / claude / ollama providers + factory.py
  models/schemas.py        # Pydantic models
  pdf/generator.py         # ReportLab A4 quotation renderer
  sample_data/aircraft.json# Fleet catalogue (7 aircraft)
  services/                # pricing.py, ai_extraction.py, aircraft_service.py, quote_store.py
  main.py                  # FastAPI app
frontend/
  src/
    api/client.ts          # Axios client + payload mapping
    components/            # AircraftCard, ManualEntryForm, AIRequestForm,
                           # QuotePreview, PdfViewerDialog, JetIllustration, BrandLogo
    hooks/usePricing.ts    # Client-side pricing mirror for instant preview
    pages/                 # LandingPage, QuoteGeneratorPage
    theme.ts               # Navy/gold luxury MUI theme + glassmorphism helper
    types/index.ts         # Shared domain types
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Salesperson login (validated against `.env`) |
| GET  | `/api/aircraft` | Fleet catalogue |
| POST | `/api/ai/extract` | `{text}` → structured charter details |
| POST | `/api/pricing/calculate` | Quote payload → pricing breakdown |
| POST | `/api/quotes/pdf` | Quote payload → A4 PDF (returns `X-Quote-Id` header) |
| GET  | `/api/quotes/{id}/pdf` | Re-fetch a generated PDF |

## Pricing Model

```
Flight Cost   = Flight Hours × Hourly Rate
Subtotal      = Flight Cost + Landing + Handling + Fuel + Parking
GST           = (Subtotal − Discount) × GST% 
Grand Total   = (Subtotal − Discount) + GST
```
