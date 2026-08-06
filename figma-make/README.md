# Carewell Aviation — Figma Make canvas edition

A fully self-contained version of the charter quotation MVP for pasting into a
**Figma Make** project (React + Tailwind CSS v4 + lucide-react — all already
available there, nothing to install).

## How to use

Copy `src/App.tsx` over the `src/App.tsx` of your Figma Make project. That's it —
the always-running Vite dev server hot-reloads and the app appears in the preview.

## What's inside (one file)

- Landing page, salesperson login, and the two-column quote generator
- Manual Entry + AI Request tabs (extraction runs in-browser — same rules as
  the backend's fallback provider, since Figma Make can't reach the FastAPI/OpenRouter backend)
- 7-aircraft fleet with SVG artwork, live pricing, and a live A4-style preview
- "Download PDF" / "Print" use the browser's print-to-PDF: print styles hide
  everything except the quotation sheet and format it as a clean A4 page

## Demo login

- Email: `sales@carewellaviation.com`
- Password: `carewell123`

(Credentials are hardcoded here for the canvas demo only; the full-stack app in
this repo validates against `backend/.env` and calls OpenRouter for real AI extraction.)
