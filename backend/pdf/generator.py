"""Generates the A4 charter quotation PDF, matching the dashboard's quote sheet design:
serif brand header, gold section headings, aircraft photo, three-column cost table,
and an authorised-signature block.
"""
from __future__ import annotations

import io
import os
from datetime import date
from html import escape
from pathlib import Path

import httpx
from PIL import Image as PILImage, ImageOps, UnidentifiedImageError
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    HRFlowable,
    KeepTogether,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from backend.models.schemas import Aircraft, PricingBreakdown, QuoteRequest
from backend.paths import STATIC_DIR

NAVY = colors.HexColor("#122441")
NAVY_DEEP = colors.HexColor("#0b1730")
GOLD = colors.HexColor("#c9a24b")
GREY = colors.HexColor("#5a6472")
GREY_LIGHT = colors.HexColor("#9aa3af")
LIGHT_BG = colors.HexColor("#f4f6f9")
INK = colors.HexColor("#1a2233")

PAGE_W, PAGE_H = A4
MARGIN = 16 * mm

# Resolves to frontend/public in dev, frontend/dist in a production deploy —
# whichever one is actually being served — so images always exist where this
# code looks for them. See backend/paths.py.
PHOTO_DIR = STATIC_DIR

SERIF = "Times-Roman"
SERIF_BOLD = "Times-Bold"

# The ✈ character isn't in the PDF's core fonts (Helvetica/Times only cover
# WinAnsiEncoding). If a symbol font that actually contains it is installed
# on the host (Segoe UI Symbol ships with Windows), register it so the header
# can draw the real glyph; otherwise fall back to a hand-drawn vector plane.
_SYMBOL_FONT_NAME = "SegoeSymbol"
_SYMBOL_FONT_AVAILABLE = False
for _candidate in (
    Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "seguisym.ttf",
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),  # common on Linux, no ✈ glyph but safe no-op if missing
):
    try:
        if _candidate.is_file():
            pdfmetrics.registerFont(TTFont(_SYMBOL_FONT_NAME, str(_candidate)))
            _SYMBOL_FONT_AVAILABLE = True
            break
    except Exception:
        continue

# Mirrors DEFAULT_TERMS_AND_CONDITIONS in frontend/src/types/index.ts — used
# whenever a quote doesn't supply its own terms.
DEFAULT_TERMS = [
    "This quotation is valid for 72 hours from the date of issue.",
    "A 50% deposit is required upon confirmation of booking.",
    "Pricing is subject to change based on fuel price fluctuations beyond ±5%.",
    "Cancellation within 24 hours of departure is non-refundable.",
    "All prices are exclusive of applicable government fees and airport charges unless stated.",
]


def _styles() -> dict[str, ParagraphStyle]:
    return {
        "goldHead": ParagraphStyle("goldHead", fontName="Helvetica-Bold", fontSize=9.5, textColor=GOLD, spaceBefore=7, spaceAfter=4, leading=12),
        "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, textColor=INK, leading=14),
        "kvLabel": ParagraphStyle("kvLabel", fontName="Helvetica", fontSize=9, textColor=GREY, leading=15),
        "kvValue": ParagraphStyle("kvValue", fontName="Helvetica-Bold", fontSize=9, textColor=INK, leading=15),
        "placeholder": ParagraphStyle("placeholder", fontName="Helvetica-Oblique", fontSize=9.5, textColor=GREY_LIGHT, leading=14),
        "terms": ParagraphStyle("terms", fontName="Helvetica", fontSize=8, textColor=GREY, leading=12.5),
        "sigLabel": ParagraphStyle("sigLabel", fontName="Helvetica", fontSize=8.5, textColor=GREY, leading=12),
        "sigName": ParagraphStyle("sigName", fontName=SERIF, fontSize=15, textColor=INK, leading=18),
        "sigRole": ParagraphStyle("sigRole", fontName="Helvetica", fontSize=8, textColor=GREY, leading=11),
        "brandSub": ParagraphStyle("brandSub", fontName="Helvetica", fontSize=8.5, textColor=GREY, leading=12),
        "qMeta": ParagraphStyle("qMeta", fontName="Helvetica", fontSize=9, textColor=GREY, leading=13, alignment=TA_RIGHT),
    }


def _draw_plane_icon(canvas, cx: float, cy: float, size: float, color) -> None:
    """Small paper-plane glyph — the ✈ character used in the web header isn't
    in the PDF's core fonts, so this draws an equivalent vector dart shape,
    rotated diagonally like the web UI's plane icon."""
    canvas.saveState()
    canvas.translate(cx, cy)
    canvas.rotate(45)
    canvas.setFillColor(color)
    path = canvas.beginPath()
    path.moveTo(size, 0)
    path.lineTo(-size * 0.55, size * 0.4)
    path.lineTo(-size * 0.2, 0)
    path.lineTo(-size * 0.55, -size * 0.4)
    path.close()
    canvas.drawPath(path, fill=1, stroke=0)
    canvas.restoreState()


def _header_footer(canvas, doc):
    canvas.saveState()
    # Brand header (white sheet, plane icon + serif wordmark, gold divider below).
    # The icon is NAVY, matching the web header where it's plain text color
    # (only the "AVIATION" half of the wordmark is gold) — not the vector
    # fallback's earlier gold tint.
    icon_size = 3.4 * mm
    if _SYMBOL_FONT_AVAILABLE:
        canvas.setFillColor(NAVY)
        canvas.setFont(_SYMBOL_FONT_NAME, 13)
        canvas.drawString(MARGIN, PAGE_H - 18 * mm + 1, "✈")
        text_x = MARGIN + canvas.stringWidth("✈ ", _SYMBOL_FONT_NAME, 13)
    else:
        _draw_plane_icon(canvas, MARGIN + icon_size * 0.55, PAGE_H - 18 * mm + 5, icon_size, NAVY)
        text_x = MARGIN + icon_size * 1.9

    canvas.setFillColor(NAVY)
    canvas.setFont(SERIF_BOLD, 19)
    brand_left = "CAREWELL "
    canvas.drawString(text_x, PAGE_H - 18 * mm, brand_left)
    w = canvas.stringWidth(brand_left, SERIF_BOLD, 19)
    canvas.setFillColor(GOLD)
    canvas.drawString(text_x + w, PAGE_H - 18 * mm, "AVIATION")
    canvas.setFillColor(GREY)
    canvas.setFont("Helvetica", 8.5)
    canvas.drawString(text_x, PAGE_H - 23 * mm, "Charter Operations · Executive Aviation Services · The Wings of Imagination")

    canvas.setFillColor(NAVY)
    canvas.setFont(SERIF_BOLD, 21)
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 16.5 * mm, "QUOTATION")
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(GREY)
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 21.5 * mm, doc.quote_id)
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 25.5 * mm, date.today().strftime("%d %B %Y"))

    canvas.setFillColor(GOLD)
    canvas.rect(MARGIN, PAGE_H - 29 * mm, PAGE_W - 2 * MARGIN, 0.8 * mm, fill=1, stroke=0)

    # Footer strip
    canvas.setFillColor(NAVY_DEEP)
    canvas.rect(0, 0, PAGE_W, 12 * mm, fill=1, stroke=0)
    canvas.setFont(SERIF_BOLD, 9)
    canvas.setFillColor(colors.white)
    canvas.drawString(MARGIN, 4.8 * mm, "CAREWELL")
    w = canvas.stringWidth("CAREWELL ", SERIF_BOLD, 9)
    canvas.setFillColor(GOLD)
    canvas.drawString(MARGIN + w, 4.8 * mm, "AVIATION")
    canvas.setFillColor(colors.whitesmoke)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawCentredString(PAGE_W / 2, 4.8 * mm, "carewellaviation.com  ·  commercials@carewellaviation.com  ·  +91 98741 64445")
    canvas.drawRightString(PAGE_W - MARGIN, 4.8 * mm, doc.quote_id)
    canvas.restoreState()


# Rupee (INR) and Dirham (AED) glyphs aren't in the core PDF fonts' base-14
# encoding, so those two fall back to an ASCII prefix to avoid rendering as
# a blank box; the other symbols are all present in WinAnsiEncoding.
_CURRENCY_SYMBOLS = {
    "USD": "$",
    "INR": "Rs. ",
    "JPY": "¥",
    "EUR": "€",
    "GBP": "£",
    "AED": "AED ",
    "SGD": "S$",
}


def _money(v: float, currency: str = "USD") -> str:
    symbol = _CURRENCY_SYMBOLS.get(currency, currency + " ")
    return f"{symbol}{v:,.0f}"


GALLERY_DPI = 150


def _load_image(path_or_url: str) -> PILImage.Image | None:
    """Loads and decodes an image from either a local /aircraft/... path
    (resolved against PHOTO_DIR) or a remote http(s) URL. Returns None on
    any failure — no path set, missing file, dead link, or bytes that aren't
    actually a decodable image (e.g. someone pasted a search-results page
    URL instead of a direct image link) — so a bad or absent entry just
    drops from the PDF instead of crashing generation entirely."""
    if not path_or_url:
        return None

    if path_or_url.startswith("http://") or path_or_url.startswith("https://"):
        try:
            resp = httpx.get(path_or_url, timeout=5.0, follow_redirects=True)
            resp.raise_for_status()
            data = resp.content
        except Exception:
            return None
    else:
        local_path = PHOTO_DIR / path_or_url.lstrip("/")
        try:
            if not local_path.is_file():
                return None
            data = local_path.read_bytes()
        except OSError:
            return None

    try:
        img = PILImage.open(io.BytesIO(data))
        img.load()
        return img.convert("RGB")
    except (UnidentifiedImageError, OSError):
        return None


class RoundedImage(Flowable):
    """An image flowable, optionally clipped to a rounded rectangle (radius=0,
    the default, draws plain square corners)."""

    def __init__(self, jpeg_bytes: bytes, width: float, height: float, radius: float = 0):
        super().__init__()
        self.reader = ImageReader(io.BytesIO(jpeg_bytes))
        self.width = width
        self.height = height
        self.radius = min(radius, width / 2, height / 2)

    def wrap(self, avail_width, avail_height):
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.saveState()
        path = c.beginPath()
        path.roundRect(0, 0, self.width, self.height, self.radius)
        c.clipPath(path, stroke=0)
        c.drawImage(self.reader, 0, 0, width=self.width, height=self.height, mask="auto")
        c.restoreState()


def _kv_rows(pairs: list[tuple[str, str]], styles) -> Table:
    data = [[Paragraph(k, styles["kvLabel"]), Paragraph(v, styles["kvValue"])] for k, v in pairs]
    t = Table(data, colWidths=[26 * mm, 55 * mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def generate_quote_pdf(quote: QuoteRequest, aircraft: Aircraft | None, pricing: PricingBreakdown, quote_id: str) -> bytes:
    pdf_buf = io.BytesIO()
    styles = _styles()

    doc = BaseDocTemplate(
        pdf_buf, pagesize=A4,
        topMargin=33 * mm, bottomMargin=15 * mm, leftMargin=MARGIN, rightMargin=MARGIN,
        title=f"Charter Quotation {quote_id}",
    )
    doc.quote_id = quote_id
    # Zero frame padding: ReportLab defaults to 6pt on every side, which would
    # inset all body content 6pt right of the header/footer (drawn on the raw
    # canvas at MARGIN) and leave full-width tables overflowing the frame.
    # With no padding the body starts exactly at MARGIN and is exactly
    # content_w wide, so every element shares one left and right edge.
    frame = Frame(
        MARGIN, 14 * mm, PAGE_W - 2 * MARGIN, PAGE_H - 47 * mm, id="body",
        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
    )
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=_header_footer)])

    story = []
    cust, flight = quote.customer, quote.flight
    content_w = PAGE_W - 2 * MARGIN

    # PREPARED FOR | FLIGHT SUMMARY
    if cust.customer_name or cust.company or cust.email or cust.phone:
        left_cell = _kv_rows(
            [(k, v) for k, v in [
                ("Client", cust.customer_name or "—"),
                ("Company", cust.company or "—"),
                ("Phone", cust.phone or "—"),
                ("Email", cust.email or "—"),
            ]],
            styles,
        )
    else:
        left_cell = Paragraph("Client details will appear here", styles["placeholder"])

    right_cell = _kv_rows(
        [
            ("Route", f"{flight.departure_airport or '—'}  →  {flight.arrival_airport or '—'}"),
            ("Date", flight.departure_date or "—"),
            ("Passengers", str(flight.passengers) if flight.passengers else "—"),
            ("Aircraft", aircraft.name if aircraft else "—"),
            ("Category", aircraft.category if aircraft else "—"),
        ],
        styles,
    )

    two_col = Table(
        [
            [Paragraph("PREPARED FOR", styles["goldHead"]), Paragraph("FLIGHT SUMMARY", styles["goldHead"])],
            [left_cell, right_cell],
        ],
        colWidths=[content_w / 2, content_w / 2],
    )
    two_col.hAlign = "LEFT"
    two_col.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(two_col)
    story.append(Spacer(1, 6))

    # Aircraft photo band with category caption
    if aircraft:
        hero_img = _load_image(aircraft.image)
        if hero_img is not None:
            iw, ih = hero_img.size
            target_w = content_w
            target_h = min(target_w * ih / iw, 47 * mm)
            hero_buf = io.BytesIO()
            hero_img.save(hero_buf, format="JPEG", quality=90)

            # Photo and its caption bar live in ONE single-column table, so
            # they're structurally locked to the same width with no seam —
            # as separate flowables they could drift apart horizontally
            # (Flowable defaults to hAlign LEFT, Table to CENTER).
            band = Table(
                [
                    [RoundedImage(hero_buf.getvalue(), width=target_w, height=target_h)],
                    [Paragraph(f'<font color="#c9a24b"><b>{aircraft.category.upper()}</b></font>&nbsp;&nbsp;'
                               f'<font color="#ffffff"><b>{aircraft.manufacturer} {aircraft.name}</b></font>&nbsp;&nbsp;'
                               f'<font color="#c8d0dc">{aircraft.max_passengers} pax · {aircraft.max_range_nm:,} nm · {aircraft.cruise_speed_kt} kt</font>',
                               styles["body"])],
                ],
                colWidths=[content_w],
            )
            band.hAlign = "LEFT"
            band.setStyle(TableStyle([
                # Photo cell: zero padding so the image fills the full width.
                ("LEFTPADDING", (0, 0), (0, 0), 0),
                ("RIGHTPADDING", (0, 0), (0, 0), 0),
                ("TOPPADDING", (0, 0), (0, 0), 0),
                ("BOTTOMPADDING", (0, 0), (0, 0), 0),
                # Caption cell: navy band, inset text.
                ("BACKGROUND", (0, 1), (0, 1), NAVY_DEEP),
                ("LEFTPADDING", (0, 1), (0, 1), 8),
                ("RIGHTPADDING", (0, 1), (0, 1), 8),
                ("TOPPADDING", (0, 1), (0, 1), 5),
                ("BOTTOMPADDING", (0, 1), (0, 1), 5),
            ]))
            story.append(band)
        story.append(Spacer(1, 4))

        # Gallery row: up to 4 additional aircraft photos, each auto-cropped
        # to fill an identical fixed-size box (like CSS object-fit: cover),
        # so the row always looks uniform regardless of source aspect ratio.
        # Only shown when there's an even number of loadable images (2 or 4) —
        # an odd count (e.g. 1 or 3, whether from the source data or a broken
        # link dropping out) is skipped entirely rather than shown lopsided.
        # The whole block flows like any other content — if it doesn't fit on
        # the current page, ReportLab automatically continues it onto the next.
        loaded = [(img, item.caption) for item in aircraft.gallery[:4] if (img := _load_image(item.url)) is not None]
        if len(loaded) >= 2 and len(loaded) % 2 == 0:
            gutter = 3 * mm
            n = len(loaded)
            # Column widths must sum to exactly content_w so this row lines up
            # flush with the hero band above it. The gutter lives as right
            # padding inside all but the last column, so the images themselves
            # are img_w wide and the outer edges stay on the margins.
            img_w = (content_w - gutter * (n - 1)) / n
            col_widths = [img_w + gutter] * (n - 1) + [img_w]
            thumb_h = 26 * mm
            box_w_px = max(1, round(img_w / 72 * GALLERY_DPI))
            box_h_px = max(1, round(thumb_h / 72 * GALLERY_DPI))
            caption_style = ParagraphStyle(
                "galleryCaption", fontName="Helvetica", fontSize=7.5, textColor=GREY, alignment=TA_CENTER, leading=10,
            )
            has_captions = any(caption.strip() for _, caption in loaded)

            image_cells = []
            caption_cells = []
            for img, caption in loaded:
                cropped = ImageOps.fit(img, (box_w_px, box_h_px), method=PILImage.LANCZOS)
                thumb_buf = io.BytesIO()
                cropped.save(thumb_buf, format="JPEG", quality=85)
                image_cells.append(RoundedImage(thumb_buf.getvalue(), width=img_w, height=thumb_h))
                if has_captions:
                    caption_cells.append(Paragraph(caption.strip(), caption_style))

            rows = [image_cells, caption_cells] if has_captions else [image_cells]
            gallery_row = Table(rows, colWidths=col_widths)
            gallery_row.hAlign = "LEFT"
            style_cmds = [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("TOPPADDING", (0, 0), (-1, 0), 0),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 0),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                # Gutter between columns only — never after the last one, or
                # the row would end short of the right margin.
                ("RIGHTPADDING", (0, 0), (-2, -1), gutter),
            ]
            if has_captions:
                style_cmds.append(("TOPPADDING", (0, 1), (-1, 1), 3))
            gallery_row.setStyle(TableStyle(style_cmds))
            story.append(gallery_row)
            story.append(Spacer(1, 4))

    # COST BREAKDOWN
    story.append(Paragraph("COST BREAKDOWN", styles["goldHead"]))
    currency = quote.charges.currency
    hours_detail = f"{flight.flight_hours:g} hrs × {_money(quote.charges.hourly_rate, currency)}/hr"
    rows = [
        ("Charter Flight Cost", hours_detail, _money(pricing.flight_cost, currency)),
        ("Landing Charges", "Per sector", _money(pricing.landing_charges, currency)),
        ("Handling Charges", "Ground services", _money(pricing.handling_charges, currency)),
        ("Fuel Surcharge", f"{flight.flight_hours:g} hrs", _money(pricing.fuel_charges, currency)),
        ("Parking", "Overnight", _money(pricing.parking_charges, currency)),
    ]
    if pricing.discount:
        rows.append(("Discount", "Negotiated", f"− {_money(pricing.discount, currency)}"))
    rows.append((f"Taxes & Levies", f"{quote.charges.gst_percent:g}% applicable", _money(pricing.gst_amount, currency)))

    data = [["Description", "Details", "Amount"]] + [list(r) for r in rows]
    col_w = [content_w * 0.42, content_w * 0.33, content_w * 0.25]
    t = Table(data, colWidths=col_w)
    t.hAlign = "LEFT"
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 1), (1, -1), "Helvetica"),
        ("FONTNAME", (2, 1), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("TEXTCOLOR", (0, 1), (0, -1), INK),
        ("TEXTCOLOR", (1, 1), (1, -1), GREY),
        ("TEXTCOLOR", (2, 1), (2, -1), INK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ("ALIGN", (2, 0), (2, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
        ("TOPPADDING", (0, 0), (-1, -1), 4.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t)

    total = Table(
        [[Paragraph('<font color="#ffffff" size="11"><b>GRAND TOTAL</b></font>', styles["body"]),
          Paragraph(f'<font color="#c9a24b" size="14" face="{SERIF_BOLD}"><b>{_money(pricing.grand_total, currency)}</b></font>',
                    ParagraphStyle("gt", alignment=TA_RIGHT, leading=17))]],
        colWidths=[content_w * 0.6, content_w * 0.4],
    )
    total.hAlign = "LEFT"
    total.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY_DEEP),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(total)

    if quote.notes:
        story.append(Paragraph("SPECIAL REQUIREMENTS", styles["goldHead"]))
        story.append(Paragraph(quote.notes, styles["body"]))

    # TERMS & CONDITIONS — editable per quote; falls back to the standard five.
    terms_lines = [line.strip() for line in (quote.terms or "").splitlines() if line.strip()]
    if not terms_lines:
        terms_lines = DEFAULT_TERMS
    terms_html = "<br/>".join(f"{i}. {escape(line)}" for i, line in enumerate(terms_lines, start=1))

    # Prefer the name of whoever's actually signed in and generating this
    # quote, so the PDF matches the live preview panel — SALES_NAME is only
    # a fallback for the rare case no session name was sent.
    sales_name = (quote.prepared_by or "").strip() or os.getenv("SALES_NAME", "Charter Consultant")
    sig = Table(
        [
            [Paragraph("Authorised Signature", styles["sigLabel"]), Paragraph("Client Acceptance", styles["sigLabel"])],
            [Paragraph(sales_name, styles["sigName"]), Spacer(1, 14)],
            [Paragraph("Charter Consultant · Carewell Aviation", styles["sigRole"]),
             Paragraph("Signature &amp; Date", styles["sigLabel"])],
        ],
        colWidths=[content_w / 2, content_w / 2],
    )
    sig.hAlign = "LEFT"
    sig.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("LINEBELOW", (0, 1), (0, 1), 0.5, GREY_LIGHT),
        ("LINEBELOW", (1, 1), (1, 1), 0.5, GREY_LIGHT),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 3),
    ]))

    # Terms + signature block kept together as one unit — if it doesn't fit
    # in the space left on the current page, the whole block (not just part
    # of the signature table) moves down to a fresh page instead of splitting.
    # The divider above the signatures spans the full content width, matching
    # the border-top rule the web preview draws in the same spot.
    story.append(KeepTogether([
        Paragraph("TERMS &amp; CONDITIONS", styles["goldHead"]),
        Paragraph(terms_html, styles["terms"]),
        Spacer(1, 10),
        HRFlowable(width=content_w, thickness=0.75, color=colors.HexColor("#e0e4ea"), spaceAfter=8),
        sig,
    ]))

    doc.build(story)
    return pdf_buf.getvalue()
